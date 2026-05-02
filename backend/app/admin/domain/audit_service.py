"""
Audit Logging Service

Centralised audit trail management for admin operations.
All admin CRUD operations are logged for compliance and debugging.

SRS refs:
  - NFR-11 (maintainability & observability)
  - NFR-11.2 (audit trail hooks)
  - DR-9 (data versioning & provenance)
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone, date, time
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.shared.auth_context import IdentityContext

logger = logging.getLogger(__name__)


class AuditLog:
    """
    Represents an immutable audit trail event for admin operations.
    """

    def __init__(
        self,
        organization_id: int,
        actor_user_id: Optional[int],
        action: str,  # CREATE, UPDATE, DELETE, PUBLISH, etc.
        entity_type: str,  # template, question, rule, etc.
        entity_id: Optional[int],
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        self.organization_id = organization_id
        self.actor_user_id = actor_user_id
        self.action = action
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.old_value = old_value
        self.new_value = new_value
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.created_at = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "organization_id": self.organization_id,
            "actor_user_id": self.actor_user_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat(),
        }


def _serialize_value(value: Any) -> Any:
    """Deep serialize a value for JSON storage."""
    if value is None:
        return None
    # Datetime/date/time -> ISO string
    if isinstance(value, (datetime, date, time)):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize_value(v) for v in value]
    if is_dataclass(value):
        return _serialize_value(asdict(value))
    # Fallback: try str representation
    return str(value)


class AuditLogger:
    """
    Centralized audit logging service for admin operations.

    Usage:
        logger = AuditLogger(session)
        logger.log_create(
            identity=ctx,
            entity_type="template",
            entity_id=new_template.id,
            new_value={"name": "New Template", ...}
        )
    """

    def __init__(self, session: Session):
        self.session = session

    def log_create(
        self,
        identity: IdentityContext,
        entity_type: str,
        entity_id: int,
        new_value: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log a CREATE operation."""
        return self._log(
            identity=identity,
            action="CREATE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=None,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_update(
        self,
        identity: IdentityContext,
        entity_type: str,
        entity_id: int,
        old_value: Dict[str, Any],
        new_value: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log an UPDATE operation."""
        return self._log(
            identity=identity,
            action="UPDATE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_delete(
        self,
        identity: IdentityContext,
        entity_type: str,
        entity_id: int,
        old_value: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log a DELETE operation."""
        return self._log(
            identity=identity,
            action="DELETE",
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=None,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_publish(
        self,
        identity: IdentityContext,
        entity_type: str,
        entity_id: int,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log a PUBLISH operation."""
        return self._log(
            identity=identity,
            action="PUBLISH",
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=None,
            new_value=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def _log(
        self,
        identity: IdentityContext,
        action: str,
        entity_type: str,
        entity_id: Optional[int],
        old_value: Optional[Dict[str, Any]],
        new_value: Optional[Dict[str, Any]],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """
        Internal log method — called by public helper methods.
        Persists audit event to the database.
        """
        # Serialize values
        old_value_serialized = _serialize_value(old_value) if old_value else None
        new_value_serialized = _serialize_value(new_value) if new_value else None

        # Create audit log entry
        audit_log = AuditLog(
            organization_id=identity.organization_id,
            actor_user_id=identity.user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value_serialized,
            new_value=new_value_serialized,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Persist to database via raw SQL to bypass ORM caching
        try:
            self.session.execute(
                """
                INSERT INTO audit_logs 
                (organization_id, actor_user_id, action, entity_type, entity_id, 
                 old_value, new_value, ip_address, user_agent, created_at)
                VALUES 
                (:org_id, :user_id, :action, :entity_type, :entity_id,
                 :old_val, :new_val, :ip, :user_agent, :created_at)
                """,
                {
                    "org_id": audit_log.organization_id,
                    "user_id": audit_log.actor_user_id,
                    "action": audit_log.action,
                    "entity_type": audit_log.entity_type,
                    "entity_id": audit_log.entity_id,
                    "old_val": json.dumps(audit_log.old_value, default=str) if audit_log.old_value else None,
                    "new_val": json.dumps(audit_log.new_value, default=str) if audit_log.new_value else None,
                    "ip": audit_log.ip_address,
                    "user_agent": audit_log.user_agent,
                    "created_at": audit_log.created_at,
                },
            )
            logger.info(
                f"Audit: {audit_log.action} {audit_log.entity_type} {audit_log.entity_id} "
                f"by user {audit_log.actor_user_id} in org {audit_log.organization_id}"
            )
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}", exc_info=True)
            # Don't raise — audit logging should not block operations

        return audit_log
