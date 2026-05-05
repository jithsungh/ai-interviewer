"""Unit tests for realtime intent gap handling."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.interview.realtime.domain.event_handler import RealtimeEventHandler


@pytest.mark.unit
class TestIntentGapHandler:
    def _handler(self) -> RealtimeEventHandler:
        return RealtimeEventHandler(
            db=MagicMock(),
            redis=MagicMock(),
            submission_id=1,
            connection_id="conn-1",
        )

    def test_gap_below_threshold_returns_wait(self):
        handler = self._handler()
        handler._classify_intent = AsyncMock(side_effect=AssertionError("should not classify"))

        events = asyncio.run(
            handler.handle_intent_gap(
                exchange_id=1,
                question="Explain caching",
                previous_answer="",
                last_answer="I think...",
                gap_ms=500,
                response_time_ms=1200,
            )
        )

        assert events[0]["event_type"] == "intent_decision"
        assert events[0]["intent"] == "THINKING"
        assert events[0]["action"] == "wait"

    def test_done_intent_advances(self):
        handler = self._handler()
        handler._classify_intent = AsyncMock(return_value=("DONE", 0.91))
        handler.handle_submit_answer = MagicMock(return_value={"event_type": "answer_accepted"})
        handler.handle_request_next_question = MagicMock(return_value={"event_type": "question_payload"})

        events = asyncio.run(
            handler.handle_intent_gap(
                exchange_id=2,
                question="Describe a queue",
                previous_answer="",
                last_answer="A queue is FIFO",
                gap_ms=5000,
                response_time_ms=4200,
            )
        )

        assert events[0]["event_type"] == "intent_decision"
        assert events[0]["action"] == "advance"
        assert events[1]["event_type"] == "answer_accepted"
        assert events[2]["event_type"] == "question_payload"

    def test_clarification_intent_returns_response(self):
        handler = self._handler()
        handler._classify_intent = AsyncMock(return_value=("CLARIFICATION", 0.78))
        handler._generate_clarification = AsyncMock(return_value="Clarify the constraints around input size.")

        events = asyncio.run(
            handler.handle_intent_gap(
                exchange_id=3,
                question="Describe a situation where you had to collaborate with team members from different departments or backgrounds.",
                previous_answer="",
                last_answer="We need more clarification on the question.",
                gap_ms=4000,
                response_time_ms=6400,
            )
        )

        assert events[0]["event_type"] == "intent_decision"
        assert events[0]["action"] == "clarify"
        assert events[1]["event_type"] == "clarification_response"
        assert events[1]["clarification_text"]
