"""Intent classifier API routes."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.ml.inference import LABELS, classify_probabilities
from app.ml.intent import IntentRawResponse, IntentRequest, IntentResponse
from app.ml.model import get_intent_model
from app.shared.observability import get_context_logger

logger = get_context_logger(__name__)

router = APIRouter()


@router.post(
    "/predict-intent",
    response_model=IntentResponse,
    summary="Predict user intent",
    description="Predict intent from a question and recent answers.",
)
async def predict_intent(payload: IntentRequest, request: Request) -> IntentResponse:
    text = (
        f"[Q] {payload.question} [A_prev] {payload.previous_answer} "
        f"[A_last] {payload.last_answer}"
    )

    logger.debug(
        "Intent prediction request",
        metadata={
            "question_chars": len(payload.question),
            "previous_answer_chars": len(payload.previous_answer),
            "last_answer_chars": len(payload.last_answer),
        },
    )

    model = getattr(request.app.state, "intent_model", None) or get_intent_model()

    try:
        probabilities = model.predict(text)
        result = classify_probabilities(probabilities)
        confidences = {
            label: float(score)
            for label, score in zip(LABELS, probabilities)
        }
        logger.info(
            "Intent predicted",
            metadata={
                "intent": result["intent"],
                "confidence": result["confidence"],
            },
        )
        return IntentResponse(**result, confidences=confidences)
    except Exception:
        logger.error("Intent prediction failed", exc_info=True)
        return IntentResponse(
            intent="THINKING",
            confidence=0.0,
            confidences=None,
        )


@router.post(
    "/predict-intent-raw",
    response_model=IntentRawResponse,
    summary="Predict intent (raw)",
    description="Return raw intent model probabilities without post-processing.",
)
async def predict_intent_raw(payload: IntentRequest, request: Request) -> IntentRawResponse:
    text = (
        f"[Q] {payload.question} [A_prev] {payload.previous_answer} "
        f"[A_last] {payload.last_answer}"
    )

    logger.debug(
        "Intent raw prediction request",
        metadata={
            "question_chars": len(payload.question),
            "previous_answer_chars": len(payload.previous_answer),
            "last_answer_chars": len(payload.last_answer),
        },
    )

    model = getattr(request.app.state, "intent_model", None) or get_intent_model()

    try:
        probabilities = model.predict(text)
        return IntentRawResponse(
            labels=list(LABELS),
            probabilities=[float(score) for score in probabilities],
        )
    except Exception:
        logger.error("Intent raw prediction failed", exc_info=True)
        return IntentRawResponse(labels=list(LABELS), probabilities=[])

