"""
ORM Model — Proctoring Events

Maps the ``proctoring_events`` table. Events are immutable once created.
No UPDATE operations allowed (audit trail integrity).
"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.persistence.postgres.base import Base


class ProctoringEventModel(Base):
    """ORM model for ``proctoring_events``."""

    __tablename__ = "proctoring_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    interview_submission_id = Column(
        BigInteger,
        ForeignKey("interview_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(Text, nullable=False)
    severity = Column(
        Enum("low", "medium", "high", "critical", name="proctoring_severity", create_type=False),
        nullable=False,
    )
    risk_weight = Column(Numeric, nullable=False, server_default=text("1.0"))
    evidence = Column(JSONB, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = ({"extend_existing": True},)

    def __repr__(self) -> str:
        return (
            f"<ProctoringEvent id={self.id} type={self.event_type!r} "
            f"severity={self.severity!r}>"
        )


class ProctoringRecordingModel(Base):
    """ORM model for persisted screen recording artifacts."""

    __tablename__ = "proctoring_recordings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    interview_submission_id = Column(
        BigInteger,
        ForeignKey("interview_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_id = Column(Text, nullable=False, unique=True)
    storage_path = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False, server_default=text("'video/webm'"))
    file_size_bytes = Column(BigInteger, nullable=False)
    upload_started_at = Column(DateTime(timezone=True), nullable=True)
    upload_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    def __repr__(self) -> str:
        return f"<ProctoringRecording id={self.id} artifact={self.artifact_id!r}>"
