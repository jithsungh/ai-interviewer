"""
Proctoring Risk Model API — Risk Score & Review Queue Endpoints

REST endpoints for risk score queries and admin proctoring review.
Advisory-only: these endpoints OBSERVE, never DECIDE.

Endpoints:
- GET /api/v1/proctoring/risk/{submission_id}           — get risk score
- POST /api/v1/proctoring/risk/{submission_id}/recompute — recompute from scratch
- GET /api/v1/proctoring/events/{submission_id}          — list events for submission
- GET /api/v1/proctoring/review-queue                    — admin review queue
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from app.bootstrap.dependencies import (
    get_db_session,
    get_db_session_with_commit,
    get_identity,
    require_admin,
)
from app.persistence.redis import get_redis_client
from app.proctoring.persistence.repository import ProctoringEventRepository
from app.proctoring.risk_model.contracts.schemas import (
    MonitoringSessionItem,
    MonitoringSessionsResponse,
    ProctoringEventResponse,
    ReviewQueueItem,
    ReviewQueueResponse,
    RiskScoreResponse,
)
from app.proctoring.risk_model.domain.risk_service import RiskModelService
from app.shared.auth_context import IdentityContext
from app.shared.errors import NotFoundError
from app.shared.observability import get_context_logger

logger = get_context_logger(__name__)

router = APIRouter()


def _build_risk_service(session: Session) -> RiskModelService:
    """Factory for RiskModelService with DI."""
    try:
        redis = get_redis_client()
    except Exception:
        redis = None
    return RiskModelService(session=session, redis_client=redis)


# ════════════════════════════════════════════════════════════════════════
# Risk Score Endpoints
# ════════════════════════════════════════════════════════════════════════


@router.get(
    "/risk/{submission_id}",
    response_model=RiskScoreResponse,
    summary="Get risk score for a submission",
    description="Computes and returns the current risk score. Advisory-only.",
)
async def get_risk_score(
    submission_id: int,
    session: Session = Depends(get_db_session),
    identity: IdentityContext = Depends(get_identity),
) -> RiskScoreResponse:
    """Get the current risk score for an interview submission."""
    service = _build_risk_service(session)
    risk = service.compute(submission_id)
    return RiskScoreResponse(
        submission_id=risk.submission_id,
        total_risk=risk.total_risk,
        classification=risk.classification,
        recommended_action=risk.recommended_action,
        event_count=risk.event_count,
        breakdown_by_type=risk.breakdown_by_type,
        top_events=risk.top_events,
        severity_counts=risk.severity_counts,
        computation_algorithm=risk.computation_algorithm,
        computed_at=risk.computed_at,
    )


@router.post(
    "/risk/{submission_id}/recompute",
    response_model=RiskScoreResponse,
    summary="Recompute risk score from scratch (audit)",
    description="Forces full recomputation of risk score. Admin only.",
)
async def recompute_risk_score(
    submission_id: int,
    session: Session = Depends(get_db_session_with_commit),
    identity: IdentityContext = Depends(require_admin),
) -> RiskScoreResponse:
    """Recompute risk score from scratch for audit purposes."""
    service = _build_risk_service(session)
    risk = service.recompute(submission_id)
    return RiskScoreResponse(
        submission_id=risk.submission_id,
        total_risk=risk.total_risk,
        classification=risk.classification,
        recommended_action=risk.recommended_action,
        event_count=risk.event_count,
        breakdown_by_type=risk.breakdown_by_type,
        top_events=risk.top_events,
        severity_counts=risk.severity_counts,
        computation_algorithm=risk.computation_algorithm,
        computed_at=risk.computed_at,
    )


# ════════════════════════════════════════════════════════════════════════
# Event Listing
# ════════════════════════════════════════════════════════════════════════


@router.get(
    "/events/{submission_id}",
    response_model=List[ProctoringEventResponse],
    summary="List proctoring events for a submission",
    description="Returns all proctoring events in chronological order.",
)
async def list_events(
    submission_id: int,
    severity: Optional[str] = Query(None, description="Filter by severity"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    session: Session = Depends(get_db_session),
    identity: IdentityContext = Depends(get_identity),
) -> List[ProctoringEventResponse]:
    """List all proctoring events for a submission."""
    repo = ProctoringEventRepository(session)
    events = repo.get_by_submission(
        submission_id=submission_id,
        severity_filter=severity,
        event_type_filter=event_type,
    )
    return [ProctoringEventResponse.from_model(e) for e in events]


# ════════════════════════════════════════════════════════════════════════
# Admin Review Queue
# ════════════════════════════════════════════════════════════════════════


@router.get(
    "/review-queue",
    response_model=ReviewQueueResponse,
    summary="Admin proctoring review queue",
    description="Returns flagged submissions sorted by risk score (highest first). Admin only.",
)
async def get_review_queue(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_db_session),
    identity: IdentityContext = Depends(require_admin),
) -> ReviewQueueResponse:
    """
    Get the admin proctoring review queue.

    Returns submissions where proctoring_flagged = TRUE,
    sorted by risk score descending.

    Requires admin authentication.
    """
    # Query flagged submissions directly from interview_submissions
    count_result = session.execute(
        sql_text(
            "SELECT COUNT(*) FROM interview_submissions WHERE proctoring_flagged = TRUE"
        )
    ).scalar() or 0

    rows = session.execute(
        sql_text(
            """
            SELECT
                id AS submission_id,
                COALESCE(proctoring_risk_score, 0) AS total_risk,
                COALESCE(proctoring_risk_classification, 'low') AS classification,
                COALESCE(proctoring_flagged, FALSE) AS flagged,
                COALESCE(proctoring_reviewed, FALSE) AS reviewed
            FROM interview_submissions
            WHERE proctoring_flagged = TRUE
            ORDER BY proctoring_risk_score DESC NULLS LAST
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": limit, "offset": offset},
    ).fetchall()

    items = []
    for row in rows:
        # Get event count per submission
        repo = ProctoringEventRepository(session)
        event_count = repo.count_by_submission(row.submission_id)
        items.append(
            ReviewQueueItem(
                submission_id=row.submission_id,
                total_risk=float(row.total_risk),
                classification=row.classification,
                event_count=event_count,
                flagged=bool(row.flagged),
                reviewed=bool(row.reviewed),
            )
        )

    return ReviewQueueResponse(
        total=count_result,
        items=items,
        limit=limit,
        offset=offset,
    )


# ════════════════════════════════════════════════════════════════════════
# Live Monitoring Sessions
# ════════════════════════════════════════════════════════════════════════


@router.get(
    "/monitoring-sessions",
    response_model=MonitoringSessionsResponse,
    summary="Live monitoring sessions",
    description="Returns in-progress submissions with proctoring status. Admin only.",
)
async def get_monitoring_sessions(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(
        None,
        description="Comma-separated statuses to include (e.g. in_progress,completed)",
    ),
    window_id: Optional[int] = Query(None, description="Filter by interview window id"),
    session: Session = Depends(get_db_session),
    identity: IdentityContext = Depends(require_admin),
) -> MonitoringSessionsResponse:
    """
    List monitoring sessions for live/completed views.

    Includes proctoring risk, status, and window metadata for grouping.
    """
    default_statuses = ["in_progress", "completed", "reviewed"]
    allowed_statuses = {"pending", "in_progress", "completed", "expired", "cancelled", "reviewed"}
    status_list = [s.strip() for s in status.split(",") if s.strip()] if status else default_statuses
    status_list = [s for s in status_list if s in allowed_statuses]

    if not status_list:
        return MonitoringSessionsResponse(total=0, items=[], limit=limit, offset=offset)

    where_clauses = ["s.status::text = ANY(:statuses)"]
    params: dict = {"statuses": status_list, "limit": limit, "offset": offset}
    if window_id is not None:
        where_clauses.append("s.window_id = :window_id")
        params["window_id"] = window_id

    where_sql = " AND ".join(where_clauses)

    count_result = session.execute(
        sql_text(
            f"""
            SELECT COUNT(*)
            FROM interview_submissions s
            WHERE {where_sql}
            """
        ),
        params,
    ).scalar() or 0

    rows = session.execute(
        sql_text(
            f"""
            SELECT
                s.id AS submission_id,
                COALESCE(s.proctoring_risk_score, 0) AS total_risk,
                COALESCE(s.proctoring_risk_classification, 'low') AS classification,
                COALESCE(s.proctoring_flagged, FALSE) AS flagged,
                COALESCE(s.proctoring_reviewed, FALSE) AS reviewed,
                s.status AS submission_status,
                s.window_id AS window_id,
                w.name AS window_name,
                w.start_time AS window_start_time,
                w.end_time AS window_end_time,
                s.started_at AS started_at,
                s.submitted_at AS submitted_at
            FROM interview_submissions s
            LEFT JOIN interview_submission_windows w ON w.id = s.window_id
            WHERE {where_sql}
            ORDER BY s.started_at DESC NULLS LAST, s.id DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()

    repo = ProctoringEventRepository(session)
    items: list[MonitoringSessionItem] = []
    for row in rows:
        event_count = repo.count_by_submission(row.submission_id)
        items.append(
            MonitoringSessionItem(
                submission_id=row.submission_id,
                total_risk=float(row.total_risk),
                classification=row.classification,
                event_count=event_count,
                flagged=bool(row.flagged),
                reviewed=bool(row.reviewed),
                submission_status=row.submission_status,
                window_id=row.window_id,
                window_name=row.window_name,
                window_start_time=row.window_start_time,
                window_end_time=row.window_end_time,
                started_at=row.started_at,
                submitted_at=row.submitted_at,
            )
        )

    return MonitoringSessionsResponse(
        total=count_result,
        items=items,
        limit=limit,
        offset=offset,
    )
