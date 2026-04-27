"""
Proctoring Rule Definitions — Default Rules v1.0.0

Pure data: event-to-severity mapping, base weights, and clustering rules.
No I/O, no database calls, no FastAPI imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final, Optional


# ════════════════════════════════════════════════════════════════════════
# Data classes
# ════════════════════════════════════════════════════════════════════════


@dataclass(frozen=True)
class ProctoringRule:
    """Base rule for a single event type."""

    event_type: str
    base_severity: str  # low, medium, high, critical, info
    base_weight: float  # >= 0.0
    description: str
    rule_version: str = "v1.0.0"


@dataclass(frozen=True)
class ClusteringRule:
    """Rule for escalating severity based on event clustering."""

    event_type: str
    condition_type: str  # "count_in_window" or "consecutive"
    threshold: int
    time_window_seconds: int
    escalated_severity: str
    weight_multiplier: float
    rule_version: str = "v1.0.0"


# ════════════════════════════════════════════════════════════════════════
# Supported event types
# ════════════════════════════════════════════════════════════════════════

ALLOWED_EVENT_TYPES: Final[frozenset[str]] = frozenset(
    {
        # Tab/window events (FR-9.1)
        "tab_switch",
        "window_switch",
        "window_blur",
        "window_focus_lost",
        # Screen recording events (FR-9.2)
        "screen_recording_started",
        "screen_recording_stopped",
        "screen_recording_denied",
        "screen_recording_error",
        "screen_recording_unavailable",
        "screen_recording_persisted",
        "screen_recording_persist_failed",
        "screen_share_not_fullscreen",
        "screen_share_ended",
        # Face detection events (FR-9.3, FR-9.4)
        "face_absent",
        "multiple_faces",
        "no_eye_contact",
        "frequent_head_turn",
        # Audio anomaly events (FR-9.5)
        "multiple_voices",
        "background_noise_spike",
        "microphone_error",
        "microphone_unsupported",
        "microphone_permission_unavailable",
        "microphone_permission_denied",
        "microphone_device_missing",
        # Device events
        "camera_disabled",
        "camera_permission_unavailable",
        "camera_permission_denied",
        "camera_stream_ended",
        "camera_device_missing",
        "microphone_disabled",
        "device_change",
    }
)


# ════════════════════════════════════════════════════════════════════════
# Default base rules (v1.0.0)
# ════════════════════════════════════════════════════════════════════════

DEFAULT_RULES: Final[tuple[ProctoringRule, ...]] = (
    # Low severity (0.5 - 1.0)
    ProctoringRule("tab_switch", "low", 0.5, "Candidate switched browser tab"),
    ProctoringRule("window_switch", "low", 0.5, "Window/application switch detected"),
    ProctoringRule("window_blur", "low", 0.5, "Window lost focus"),
    ProctoringRule("window_focus_lost", "low", 0.5, "Browser window minimized/hidden"),
    ProctoringRule("microphone_disabled", "low", 1.0, "Microphone muted mid-interview"),
    ProctoringRule("device_change", "low", 1.0, "Camera/mic device switched"),
    ProctoringRule("screen_recording_started", "low", 0.0, "Screen recording initiated"),
    ProctoringRule("screen_recording_stopped", "low", 0.0, "Screen recording ended"),
    ProctoringRule("screen_recording_persisted", "low", 0.0, "Screen recording persisted successfully"),
    ProctoringRule("screen_recording_unavailable", "low", 0.5, "Screen recording unavailable in browser"),
    ProctoringRule("microphone_permission_unavailable", "low", 0.5, "Microphone API unavailable"),
    ProctoringRule("camera_permission_unavailable", "low", 0.5, "Camera API unavailable"),
    # Medium severity (1.5 - 2.0)
    ProctoringRule("face_absent", "medium", 1.5, "Face not detected in frame"),
    ProctoringRule("no_eye_contact", "medium", 1.8, "Low eye-contact confidence detected"),
    ProctoringRule("frequent_head_turn", "medium", 2.0, "Frequent head turn/look-away detected"),
    ProctoringRule("camera_disabled", "medium", 2.0, "Camera turned off mid-interview"),
    ProctoringRule("camera_stream_ended", "medium", 2.0, "Camera stream ended during interview"),
    ProctoringRule("camera_permission_denied", "medium", 1.8, "Camera permission denied by user/browser"),
    ProctoringRule("microphone_permission_denied", "medium", 1.8, "Microphone permission denied by user/browser"),
    ProctoringRule("microphone_error", "medium", 1.5, "Microphone recognition error detected"),
    ProctoringRule("microphone_unsupported", "medium", 1.2, "Browser does not support microphone recognition"),
    ProctoringRule("screen_recording_denied", "medium", 1.5, "Screen recording permission denied"),
    ProctoringRule("screen_recording_error", "medium", 1.5, "Screen recording error detected"),
    ProctoringRule("screen_recording_persist_failed", "medium", 1.0, "Screen recording persistence failed"),
    ProctoringRule("screen_share_not_fullscreen", "medium", 1.5, "Candidate shared non-fullscreen surface"),
    ProctoringRule("screen_share_ended", "medium", 1.5, "Screen sharing ended during interview"),
    ProctoringRule("background_noise_spike", "medium", 1.5, "Sudden background noise increase"),
    # High severity (3.0)
    ProctoringRule("multiple_faces", "high", 3.0, "Multiple faces detected"),
    ProctoringRule("multiple_voices", "high", 3.0, "Multiple voices detected"),
    ProctoringRule("camera_device_missing", "high", 3.0, "No camera device detected"),
    ProctoringRule("microphone_device_missing", "high", 3.0, "No microphone device detected"),
)

# Index by event_type for O(1) lookup
DEFAULT_RULE_MAP: Final[dict[str, ProctoringRule]] = {
    rule.event_type: rule for rule in DEFAULT_RULES
}


# ════════════════════════════════════════════════════════════════════════
# Default clustering rules (v1.0.0)
# ════════════════════════════════════════════════════════════════════════

DEFAULT_CLUSTERING_RULES: Final[tuple[ClusteringRule, ...]] = (
    ClusteringRule(
        event_type="tab_switch",
        condition_type="count_in_window",
        threshold=10,
        time_window_seconds=60,
        escalated_severity="medium",
        weight_multiplier=1.5,
    ),
    ClusteringRule(
        event_type="face_absent",
        condition_type="consecutive",
        threshold=3,
        time_window_seconds=30,
        escalated_severity="high",
        weight_multiplier=2.0,
    ),
    ClusteringRule(
        event_type="multiple_faces",
        condition_type="count_in_window",
        threshold=5,
        time_window_seconds=300,
        escalated_severity="critical",
        weight_multiplier=2.5,
    ),
    ClusteringRule(
        event_type="no_eye_contact",
        condition_type="count_in_window",
        threshold=3,
        time_window_seconds=120,
        escalated_severity="high",
        weight_multiplier=1.8,
    ),
    ClusteringRule(
        event_type="frequent_head_turn",
        condition_type="count_in_window",
        threshold=4,
        time_window_seconds=120,
        escalated_severity="high",
        weight_multiplier=2.0,
    ),
)

# Index clustering rules by event_type for lookup
DEFAULT_CLUSTERING_MAP: Final[dict[str, list[ClusteringRule]]] = {}
for _cr in DEFAULT_CLUSTERING_RULES:
    DEFAULT_CLUSTERING_MAP.setdefault(_cr.event_type, []).append(_cr)


# ════════════════════════════════════════════════════════════════════════
# Severity ordering (for comparisons)
# ════════════════════════════════════════════════════════════════════════

SEVERITY_ORDER: Final[dict[str, int]] = {
    "low": 0,
    "medium": 1,
    "high": 2,
    "critical": 3,
}

# Only these severities are stored in the proctoring_severity enum
VALID_SEVERITIES: Final[frozenset[str]] = frozenset({"low", "medium", "high", "critical"})
