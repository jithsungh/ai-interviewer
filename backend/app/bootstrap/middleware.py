"""
Middleware Registration

Registers all middleware in the correct order for proper request processing.

Middleware Order (CRITICAL):
1. Request Context (first - injects request_id, timestamps)
2. Logging (logs all requests with context)
3. CORS (handles preflight, allows origins)
4. GZip Compression (optional performance)
5. Rate Limiting (protects endpoints)
6. Identity Injection (last - requires full context)
"""

import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.shared.observability import get_context_logger
from app.shared.auth_context.middleware import IdentityInjectionMiddleware
from app.shared.auth_context.dependencies import get_token_validator

logger = get_context_logger(__name__)


def _no_response_fallback(request: Request, request_id: str, stage: str) -> Response:
    logger.warning(
        f"{stage}: caught 'No response returned' from downstream handler",
        metadata={"request_id": request_id, "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "http_500",
                "message": "Internal Server Error",
                "request_id": request_id,
                "metadata": {},
            }
        },
        headers={"X-Request-ID": request_id},
    )


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Request Context Middleware (FIRST).
    
    Injects request metadata into request.state for downstream middleware/handlers:
    - request_id: Unique UUID for tracing
    - request_start_time: For latency calculation
    - user_id: Set later by identity middleware
    - organization_id: Set later by identity middleware
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Inject into request.state
        request.state.request_id = request_id
        request.state.request_start_time = time.perf_counter()
        request.state.user_id = None
        request.state.organization_id = None
        
        # Process request
        try:
            response = await call_next(request)
        except RuntimeError as exc:
            if str(exc) == "No response returned.":
                return _no_response_fallback(request, request_id, "RequestContextMiddleware")
            raise
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logging Middleware (SECOND).
    
    Logs all HTTP requests with:
    - Method, path, status code
    - Request ID, user ID (if authenticated)
    - Latency in milliseconds
    
    Redacts sensitive data from logs.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract context from request.state
        request_id = getattr(request.state, "request_id", "unknown")
        start_time = getattr(request.state, "request_start_time", time.perf_counter())
        
        # Process request
        try:
            response = await call_next(request)
        except RuntimeError as exc:
            request_id = getattr(request.state, "request_id", "unknown")
            if str(exc) == "No response returned.":
                return _no_response_fallback(request, request_id, "LoggingMiddleware")
            raise
        
        # Calculate latency
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        
        # Extract identity (set by identity middleware, may be None)
        user_id = getattr(request.state, "user_id", None)
        organization_id = getattr(request.state, "organization_id", None)
        
        # Log request
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code}",
            event_type="http.request",
            latency_ms=latency_ms,
            metadata={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "request_id": request_id,
                "user_id": user_id,
                "organization_id": organization_id,
                "client_host": request.client.host if request.client else None
            }
        )
        
        return response


class ErrorFormattingMiddleware(BaseHTTPMiddleware):
    """
    Error Formatting Middleware.
    
    Ensures all error responses follow the structured error format.
    Catches 404 and other error status codes that bypass exception handlers.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = getattr(request.state, "request_id", "unknown")

        try:
            response = await call_next(request)
        except RuntimeError as exc:
            if str(exc) == "No response returned.":
                return _no_response_fallback(request, request_id, "ErrorFormattingMiddleware")
            raise
        
        # Reformat 404 responses to match structured error format
        if response.status_code == 404:
            # Copy headers but drop headers that describe the original
            # payload size/encoding. Forwarding these can confuse clients
            # when we replace the body (for example a stale
            # Content-Encoding header causes Chrome to attempt to
            # decompress an uncompressed payload and fail with
            # ERR_CONTENT_DECODING_FAILED).
            forwarded_headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
            }
            return JSONResponse(
                status_code=404,
                content={
                    "error": {
                        "code": "http_404",
                        "message": "Not Found",
                        "request_id": request_id,
                        "metadata": {}
                    }
                },
                headers=forwarded_headers,
            )
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate Limiting Middleware (FIFTH).
    
    Protects endpoints from abuse using Redis-backed rate limiting.
    
    TODO: Implement Redis-based rate limiting
    - Track requests per user/IP
    - Apply different limits per endpoint group
    - Return 429 when limit exceeded
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # TODO: Implement rate limiting logic
        # For now, pass through
        try:
            response = await call_next(request)
        except RuntimeError as exc:
            request_id = getattr(request.state, "request_id", "unknown")
            if str(exc) == "No response returned.":
                return _no_response_fallback(request, request_id, "RateLimitMiddleware")
            raise
        return response


def register_middleware(app: FastAPI) -> None:
    """
    Register all middleware in the correct order.
    
    Args:
        app: FastAPI application instance
    
    Order matters! Do not change without careful review.
    """
    
    logger.info("Registering middleware...", event_type="middleware.registration.begin")
    
    # ⚠️ IMPORTANT: Middleware added with add_middleware() executes in REVERSE order
    # Last added = First executed. CORS must be added LAST so it executes FIRST.
    
    # 7. Identity Injection (Last to be processed)
    token_validator = get_token_validator()
    app.add_middleware(
        IdentityInjectionMiddleware,
        token_validator=token_validator,
        require_authentication=False  # Allow public endpoints
    )
    logger.debug("✓ IdentityInjectionMiddleware registered")
    
    # 6. Rate Limiting (protects endpoints)
    app.add_middleware(RateLimitMiddleware)
    logger.debug("✓ RateLimitMiddleware registered (stub)")
    
    # 5. GZip Compression (optional performance)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    logger.debug("✓ GZipMiddleware registered")
    
    # 4. Error Formatting (reformats error responses)
    app.add_middleware(ErrorFormattingMiddleware)
    logger.debug("✓ ErrorFormattingMiddleware registered")
    
    # 3. Logging (logs all requests)
    app.add_middleware(LoggingMiddleware)
    logger.debug("✓ LoggingMiddleware registered")
    
    # 2. Request Context (needed by all subsequent middleware)
    app.add_middleware(RequestContextMiddleware)
    logger.debug("✓ RequestContextMiddleware registered")
    
    # Determine allowed origins. Avoid wildcard when using credentials.
    allowed_origins = [
        settings.app.base_url or "",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # In development, allow all ngrok URLs (*.ngrok*.dev, *.ngrok.io, etc.)
    if settings.app.app_env == "dev":
        allowed_origins.extend([
            "https://localhost:8081",
            "http://localhost:8082",
            "https://localhost:3000",
            "https://localhost:5173",
        ])
        # For ngrok support: allow any ngrok domain since URLs are temporary in dev
        # This is safe in dev-only mode
        allow_all_ngrok = True
    else:
        allow_all_ngrok = False
    
    # Deduplicate and filter empty values
    allowed_origins = list({o for o in allowed_origins if o})
    
    logger.debug(f"CORS allowed origins: {allowed_origins}, allow_all_ngrok={allow_all_ngrok}")

    # 1. CORS (MUST be first! Added last so it executes first)
    if allow_all_ngrok:
        # In development, use a more permissive CORS setup to support ngrok tunneling
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:8081",
                "http://localhost:8082",
                "http://127.0.0.1:8081",
                "http://127.0.0.1:8082",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://localhost:8081",
                "https://localhost:8082",
                "https://localhost:3000",
                "https://localhost:5173",
            ],
            allow_origin_regex=r"https?://.*\.ngrok.*\.dev.*|https?://.*\.ngrok\.io.*",
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID", "Content-Type"],
            max_age=3600,
        )
        logger.debug("✓ CORSMiddleware registered with ngrok support (FIRST to execute)")
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID", "Content-Type"],
            max_age=3600,
        )
        logger.debug("✓ CORSMiddleware registered (FIRST to execute)")

    logger.info(
        "✅ Middleware registration complete",
        event_type="middleware.registration.complete",
        metadata={"middleware_count": 7}
    )
