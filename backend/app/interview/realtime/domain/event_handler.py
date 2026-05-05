"""
Realtime Event Handler

Business logic for processing WebSocket events during live interviews.
Orchestrates between session management, exchange creation, and question sequencing.

Responsibilities:
- join_session: Load session state, validate submission, return progress
- request_next_question: Resolve next question from template, load content
- submit_answer: Create exchange via orchestration, advance sequence
- submit_code: Create code exchange via orchestration
- heartbeat: Refresh Redis TTL

Dependencies (injected, not imported directly for DB/Redis):
- SubmissionRepository (read session state)
- ExchangeCoordinator (question sequencing, exchange creation)
- ConnectionManager (Redis heartbeat, send events)
- QuestionModel / CodingProblemModel (question content loading)

Invariants enforced:
- Exchange immutability (delegates to ExchangeCoordinator)
- One exchange per question per submission (delegates to RaceResolver)
- Template immutability (reads snapshot, never modifies)
- Submission must be IN_PROGRESS for any exchange operation
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, List

import asyncio

from sqlalchemy.orm import Session

from app.admin.persistence.models import CodingProblemModel, InterviewTemplateModel, QuestionModel
from app.interview.orchestration.contracts import (
    CodeCompletionSignal,
    NextQuestionResult,
    OrchestrationConfig,
    ProgressUpdate,
    TemplateSnapshot,
    TextResponseSignal,
)
from app.interview.orchestration.exchange_coordinator import ExchangeCoordinator
from app.interview.orchestration.question_sequencer import (
    get_total_questions,
    resolve_next_question,
    validate_template_snapshot,
)
from app.interview.realtime.contracts.events import (
    AnswerAcceptedEvent,
    CodeSubmissionAcceptedEvent,
    ErrorEvent,
    HeartbeatAckEvent,
    InterviewCompletedEvent,
    ClarificationResponseEvent,
    IntentDecisionEvent,
    ProgressUpdateEvent,
    QuestionPayloadEvent,
    SessionJoinedEvent,
)
from app.interview.session.domain.state_machine import SubmissionStatus
from app.interview.session.persistence.models import InterviewSubmissionModel
from app.interview.session.persistence.repository import SubmissionRepository
from app.shared.errors import (
    BaseError,
    InterviewNotActiveError,
    NotFoundError,
    ValidationError,
)
from app.shared.observability import get_context_logger

logger = get_context_logger()


class RealtimeEventHandler:
    """
    Stateless event processor for a single WebSocket connection.

    Created per-connection with injected DB session and Redis client.
    All methods return server event dicts ready for JSON serialization.

    Example:
        handler = RealtimeEventHandler(db=db, redis=redis, submission_id=123)
        response = handler.handle_join_session(candidate_id=42)
        await manager.send_event(123, response)
    """

    def __init__(
        self,
        db: Session,
        redis: Any,
        submission_id: int,
        connection_id: str,
    ) -> None:
        self._db = db
        self._redis = redis
        self._submission_id = submission_id
        self._connection_id = connection_id
        self._submission_repo = SubmissionRepository(db)
        self._coordinator = ExchangeCoordinator(db=db, redis=redis)

    # ──────────────────────────────────────────────────────────────
    # join_session
    # ──────────────────────────────────────────────────────────────

    def handle_join_session(self, candidate_id: int) -> Dict[str, Any]:
        """
        Handle join_session event.

        Loads current submission state and returns SessionJoinedEvent.
        If submission is completed/expired, returns InterviewCompletedEvent.

        Args:
            candidate_id: Authenticated candidate's user ID.

        Returns:
            Server event dict.

        Raises:
            NotFoundError: Submission not found or not owned by candidate.
            InterviewNotActiveError: Submission not in valid state.
        """
        submission = self._submission_repo.get_by_id_for_candidate(
            self._submission_id, candidate_id
        )
        if submission is None:
            raise NotFoundError(
                resource_type="InterviewSubmission",
                resource_id=self._submission_id,
            )

        status = submission.status

        # If completed or expired, send completion event
        if status in (
            SubmissionStatus.COMPLETED.value,
            SubmissionStatus.EXPIRED.value,
            SubmissionStatus.REVIEWED.value,
        ):
            total_q = self._get_total_questions(submission)
            exchange_count = len(submission.exchanges) if submission.exchanges else 0
            return InterviewCompletedEvent(
                submission_id=self._submission_id,
                completion_reason="submitted" if status == SubmissionStatus.COMPLETED.value else "expired",
                submitted_at=(
                    submission.submitted_at.isoformat()
                    if submission.submitted_at
                    else None
                ),
                exchanges_completed=exchange_count,
                total_questions=total_q,
            ).model_dump()

        # Submission must be in_progress
        if status != SubmissionStatus.IN_PROGRESS.value:
            raise InterviewNotActiveError(submission_id=self._submission_id)

        # Build session state
        total_q = self._get_total_questions(submission)
        current_seq = submission.current_exchange_sequence or 0
        progress_pct = (current_seq / total_q * 100.0) if total_q > 0 else 0.0

        # Time remaining
        time_remaining = self._compute_time_remaining(submission)

        return SessionJoinedEvent(
            submission_id=self._submission_id,
            submission_status=status,
            current_sequence=current_seq,
            total_questions=total_q,
            progress_percentage=round(progress_pct, 1),
            time_remaining_seconds=time_remaining,
            started_at=(
                submission.started_at.isoformat() if submission.started_at else None
            ),
            expires_at=(
                submission.scheduled_end.isoformat()
                if submission.scheduled_end
                else None
            ),
        ).model_dump()

    # ──────────────────────────────────────────────────────────────
    # request_next_question
    # ──────────────────────────────────────────────────────────────

    def handle_request_next_question(self) -> Dict[str, Any]:
        """
        Handle request_next_question event.

        Resolves next question from template snapshot, loads question content,
        and returns QuestionPayloadEvent.

        Returns:
            QuestionPayloadEvent dict, or InterviewCompletedEvent if no more questions.
        """
        try:
            # Get next question from orchestration
            next_q = self._coordinator.get_next_question(self._submission_id)
        except InterviewNotActiveError:
            submission = self._submission_repo.get_by_id(self._submission_id)
            if submission and submission.status in (
                SubmissionStatus.COMPLETED.value,
                SubmissionStatus.EXPIRED.value,
                SubmissionStatus.REVIEWED.value,
            ):
                return self._build_interview_completed(submission)
            raise

        if next_q is None:
            # All questions answered — send interview_completed
            return self._build_interview_completed()

        # Load question content from DB
        question_content = self._load_question_content(
            question_id=next_q.question_id,
            section_name=next_q.section_name,
        )

        return QuestionPayloadEvent(
            exchange_id=next_q.sequence_order,  # Protocol-level correlation
            sequence_order=next_q.sequence_order,
            question_text=question_content["question_text"],
            question_type=question_content["question_type"],
            question_difficulty=question_content["difficulty"],
            section_name=next_q.section_name,
            time_limit_seconds=question_content.get("time_limit_seconds"),
            is_final_question=next_q.is_final_question,
            starter_code=question_content.get("starter_code"),
            test_cases=question_content.get("test_cases"),
        ).model_dump()

    # ──────────────────────────────────────────────────────────────
    # submit_answer
    # ──────────────────────────────────────────────────────────────

    def handle_submit_answer(
        self,
        exchange_id: int,
        response_text: str,
        response_time_ms: int,
    ) -> Dict[str, Any]:
        """
        Handle submit_answer event.

        Creates exchange via ExchangeCoordinator from text signal.
        exchange_id is the sequence_order from the QuestionPayloadEvent.

        Args:
            exchange_id: Sequence order (protocol-level correlation).
            response_text: Candidate's text response.
            response_time_ms: Time taken in milliseconds.

        Returns:
            AnswerAcceptedEvent dict.
        """
        sequence_order = exchange_id

        # Load submission to get template snapshot for question resolution
        submission = self._load_active_submission()

        # Resolve question info for this sequence
        snapshot = validate_template_snapshot(
            submission.template_structure_snapshot, self._submission_id
        )
        question_result = self._resolve_question_at_sequence(snapshot, sequence_order)

        # Load question content for exchange creation
        question_content = self._load_question_content(
            question_id=question_result.question_id,
            section_name=question_result.section_name,
        )

        # Build text response signal
        signal = TextResponseSignal(
            submission_id=self._submission_id,
            sequence_order=sequence_order,
            response_text=response_text,
            response_time_ms=response_time_ms,
        )

        # Create exchange via coordinator
        exchange_model, progress = self._coordinator.create_exchange_from_text(
            signal=signal,
            question_text=question_content["question_text"],
            question_difficulty=question_content["difficulty"],
            expected_answer=question_content.get("answer_text"),
        )

        # Determine next sequence
        total_q = get_total_questions(snapshot)
        next_seq = sequence_order + 1 if sequence_order < total_q else None

        return AnswerAcceptedEvent(
            exchange_id=exchange_model.id,
            sequence_order=sequence_order,
            next_sequence=next_seq,
            progress_percentage=progress.progress_percentage,
        ).model_dump()

    # ──────────────────────────────────────────────────────────────
    # submit_code
    # ──────────────────────────────────────────────────────────────

    def handle_submit_code(
        self,
        exchange_id: int,
        response_code: str,
        response_language: str,
        response_time_ms: int,
    ) -> Dict[str, Any]:
        """
        Handle submit_code event.

        Creates code exchange via ExchangeCoordinator.
        Actual code execution is triggered asynchronously.

        Args:
            exchange_id: Sequence order (protocol-level correlation).
            response_code: Candidate's source code.
            response_language: Programming language.
            response_time_ms: Time taken in milliseconds.

        Returns:
            CodeSubmissionAcceptedEvent dict.
        """
        sequence_order = exchange_id

        # Load submission and resolve question
        submission = self._load_active_submission()
        snapshot = validate_template_snapshot(
            submission.template_structure_snapshot, self._submission_id
        )
        question_result = self._resolve_question_at_sequence(snapshot, sequence_order)

        # Load coding problem content
        question_content = self._load_question_content(
            question_id=question_result.question_id,
            section_name=question_result.section_name,
        )

        coding_problem_id = question_content.get("coding_problem_id")

        # Build code completion signal
        signal = CodeCompletionSignal(
            submission_id=self._submission_id,
            sequence_order=sequence_order,
            code_submission_id=None,  # Will be assigned by coding module
            code=response_code,
            language=response_language,
            execution_status="pending",
            response_time_ms=response_time_ms,
        )

        # Create exchange via coordinator
        exchange_model, progress = self._coordinator.create_exchange_from_code(
            signal=signal,
            question_text=question_content["question_text"],
            question_difficulty=question_content["difficulty"],
            coding_problem_id=coding_problem_id,
            expected_answer=question_content.get("answer_text"),
        )

        return CodeSubmissionAcceptedEvent(
            exchange_id=exchange_model.id,
            code_submission_id=None,
            execution_status="pending",
        ).model_dump()

    # ──────────────────────────────────────────────────────────────
    # intent_gap
    # ──────────────────────────────────────────────────────────────

    async def handle_intent_gap(
        self,
        exchange_id: int,
        question: str,
        previous_answer: str,
        last_answer: str,
        gap_ms: int,
        response_time_ms: int,
    ) -> List[Dict[str, Any]]:
        """
        Handle intent_gap event.

        Runs intent classification and decides the next action.
        Returns a list of server events to send in order.
        """
        from app.config import settings as global_settings

        intent_logger = get_context_logger(
            connection_id=self._connection_id,
            submission_id=self._submission_id,
        )

        threshold_ms = 3000
        if global_settings is not None:
            threshold_ms = global_settings.audio.silence_threshold_ms

        intent_logger.info(
            "Intent gap received",
            event_type="intent_gap.received",
            metadata={
                "exchange_id": exchange_id,
                "gap_ms": gap_ms,
                "response_time_ms": response_time_ms,
                "question_len": len(question),
                "previous_answer_len": len(previous_answer),
                "last_answer_len": len(last_answer),
            },
        )

        if gap_ms < threshold_ms:
            intent_logger.info(
                "Intent gap below threshold",
                event_type="intent_gap.wait",
                metadata={
                    "exchange_id": exchange_id,
                    "gap_ms": gap_ms,
                    "threshold_ms": threshold_ms,
                },
            )
            return [
                IntentDecisionEvent(
                    exchange_id=exchange_id,
                    intent="THINKING",
                    confidence=0.0,
                    action="wait",
                    gap_ms=gap_ms,
                ).model_dump()
            ]

        # normalized_answer = last_answer.strip().lower()
        # clarification_phrases = (
        #     "clarify",
        #     "clarification",
        #     "please clarify",
        #     "can you clarify",
        #     "need more clarification",
        #     "more clarification",
        #     "not clear",
        #     "unclear",
        #     "what do you mean",
        # )
        # if normalized_answer and any(phrase in normalized_answer for phrase in clarification_phrases):
        #     intent_logger.info(
        #         "Clarification phrase override",
        #         event_type="intent_gap.clarification_override",
        #         metadata={
        #             "exchange_id": exchange_id,
        #             "gap_ms": gap_ms,
        #         },
        #     )
        #     events: List[Dict[str, Any]] = [
        #         IntentDecisionEvent(
        #             exchange_id=exchange_id,
        #             intent="CLARIFICATION",
        #             confidence=1.0,
        #             action="clarify",
        #             gap_ms=gap_ms,
        #         ).model_dump()
        #     ]
        #     clarification = await self._generate_clarification(
        #         question=question,
        #         candidate_request=last_answer,
        #     )
        #     intent_logger.info(
        #         "Clarification generated",
        #         event_type="intent_gap.clarification_generated",
        #         metadata={
        #             "exchange_id": exchange_id,
        #             "clarification_len": len(clarification),
        #         },
        #     )
        #     events.append(
        #         ClarificationResponseEvent(
        #             exchange_id=exchange_id,
        #             clarification_text=clarification,
        #         ).model_dump()
        #     )
        #     return events
        
        # Clarification override disabled; rely on model output.

        intent, confidence = await self._classify_intent(
            question=question,
            previous_answer=previous_answer,
            last_answer=last_answer,
        )

        action = _map_intent_to_action(intent)
        previous_empty = not previous_answer.strip()
        intent_logger.info(
            "Intent classified",
            event_type="intent_gap.classified",
            metadata={
                "exchange_id": exchange_id,
                "intent": intent,
                "confidence": confidence,
                "action": action,
                "gap_ms": gap_ms,
                "previous_empty": previous_empty,
            },
        )
        events: List[Dict[str, Any]] = [
            IntentDecisionEvent(
                exchange_id=exchange_id,
                intent=intent,
                confidence=confidence,
                action=action,
                gap_ms=gap_ms,
            ).model_dump()
        ]

        if action == "clarify":
            clarification = await self._generate_clarification(
                question=question,
                candidate_request=last_answer,
            )
            intent_logger.info(
                "Clarification generated",
                event_type="intent_gap.clarification_generated",
                metadata={
                    "exchange_id": exchange_id,
                    "clarification_len": len(clarification),
                },
            )
            events.append(
                ClarificationResponseEvent(
                    exchange_id=exchange_id,
                    clarification_text=clarification,
                ).model_dump()
            )

        if action == "advance":
            response_text = last_answer.strip() or "[NO_ANSWER]"
            accepted = self.handle_submit_answer(
                exchange_id=exchange_id,
                response_text=response_text,
                response_time_ms=response_time_ms,
            )
            intent_logger.info(
                "Auto-advance triggered",
                event_type="intent_gap.advance",
                metadata={
                    "exchange_id": exchange_id,
                    "response_len": len(response_text),
                },
            )
            events.append(accepted)
            events.append(self.handle_request_next_question())

        return events

    # ──────────────────────────────────────────────────────────────
    # heartbeat
    # ──────────────────────────────────────────────────────────────

    def handle_heartbeat(self) -> Dict[str, Any]:
        """
        Handle heartbeat event.

        Refreshes Redis TTL and returns HeartbeatAckEvent with server time.

        Returns:
            HeartbeatAckEvent dict.
        """
        # TTL refresh done by ConnectionManager; handler returns ack
        submission = self._submission_repo.get_by_id(self._submission_id)
        time_remaining = (
            self._compute_time_remaining(submission) if submission else None
        )

        return HeartbeatAckEvent(
            server_time=_now_iso(),
            time_remaining_seconds=time_remaining,
        ).model_dump()

    # ──────────────────────────────────────────────────────────────
    # Progress helpers
    # ──────────────────────────────────────────────────────────────

    def build_progress_event(self, progress: ProgressUpdate) -> Dict[str, Any]:
        """Build ProgressUpdateEvent from orchestration ProgressUpdate."""
        return ProgressUpdateEvent(
            current_sequence=progress.current_sequence,
            total_questions=progress.total_questions,
            progress_percentage=progress.progress_percentage,
        ).model_dump()

    def build_error_event(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Build ErrorEvent from error info."""
        return ErrorEvent(
            error_code=error_code,
            message=message,
            details=details,
            timestamp=_now_iso(),
        ).model_dump()

    async def _classify_intent(
        self,
        question: str,
        previous_answer: str,
        last_answer: str,
    ) -> Tuple[str, float]:
        """Classify intent using the local model (non-blocking)."""
        text = f"[Q] {question} [A_prev] {previous_answer} [A_last] {last_answer}"

        try:
            from app.ml.inference import LABELS, classify_probabilities
            from app.ml.model import get_intent_model

            model = get_intent_model()
            probabilities = await asyncio.to_thread(model.predict, text)
            if len(probabilities) == len(LABELS):
                probabilities = _apply_intent_prior(
                    probabilities=probabilities,
                    labels=LABELS,
                    previous_empty=not previous_answer.strip(),
                )
            result = classify_probabilities(probabilities)
            return result["intent"], float(result["confidence"])
        except Exception:
            logger.error("Intent classification failed", exc_info=True)
            return "THINKING", 0.0

    async def _generate_clarification(
        self,
        question: str,
        candidate_request: str,
    ) -> str:
        """Generate a policy-compliant clarification response."""
        from app.ai.llm import LLMRequest
        from app.ai.llm.provider_factory import get_default_provider
        from app.config import settings as global_settings
        from app.interview.exchanges.clarification_policy import (
            CLARIFICATION_PROMPT_CONSTRAINTS,
        )

        if global_settings is None:
            return _fallback_clarification(question)

        provider = get_default_provider()
        system_prompt = (
            "You are an interview assistant. Provide a concise clarification of the "
            "question without hints, solution steps, or algorithm suggestions. "
            "Do not include chain-of-thought, reasoning, or tags like <think>. "
            "Return only the clarification text. Do not start with filler like "
            "'This question is asking'."
        )
        user_prompt_text = (
            "Question:\n"
            f"{question}\n\n"
            "Candidate request:\n"
            f"{candidate_request}\n\n"
            "Constraints:\n"
            "- No hints, solutions, or algorithm suggestions.\n"
            "- Keep it concise and neutral.\n"
            "- Max 120 words.\n"
            "- Return only the clarification text (no labels, no analysis).\n"
            "- Do not start with phrases like 'This question is asking you to'.\n"
        )

        try:
            from app.ai.prompts.repository import SqlPromptTemplateRepository
            from app.ai.prompts.service import PromptService

            repo = SqlPromptTemplateRepository(self._db)
            prompt_service = PromptService(repository=repo)
            rendered = prompt_service.get_rendered_prompt(
                prompt_type="clarification",
                variables={
                    "question": question,
                    "candidate_request": candidate_request,
                    "max_words": CLARIFICATION_PROMPT_CONSTRAINTS["MAX_WORDS"],
                },
            )
            system_prompt = rendered.system_prompt or system_prompt
            user_prompt_text = rendered.text
        except Exception as e:
            logger.info(
                "Clarification prompt template unavailable, using inline prompt",
                extra={"error": str(e)},
            )

        system_prompt = (
            f"{system_prompt}\n"
            "Do not include chain-of-thought, reasoning, or <think> tags. "
            "Return only the clarification text."
        )

        model_name = getattr(
            global_settings.llm,
            "llm_model_clarification",
            global_settings.llm.llm_model_evaluation,
        )

        request = LLMRequest(
            prompt=user_prompt_text,
            model=model_name,
            system_prompt=system_prompt,
            temperature=0.0,
            max_tokens=256,
            timeout_seconds=global_settings.llm.llm_timeout_seconds,
            deterministic=True,
        )

        try:
            response = await provider.generate_text(request)
        except Exception as e:
            logger.warning(
                "Clarification generation failed",
                extra={"error": str(e)},
            )
            return _fallback_clarification(question)

        if not response.success or not response.text:
            return _fallback_clarification(question)

        cleaned = _strip_think_tags(response.text.strip())
        cleaned = _strip_leading_phrase(cleaned)
        if not cleaned:
            return _fallback_clarification(question)

        return _trim_words(
            cleaned,
            CLARIFICATION_PROMPT_CONSTRAINTS["MAX_WORDS"],
        )

    # ──────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────

    def _load_active_submission(self) -> InterviewSubmissionModel:
        """Load submission and validate it is IN_PROGRESS."""
        submission = self._submission_repo.get_by_id(self._submission_id)
        if submission is None:
            raise NotFoundError(
                resource_type="InterviewSubmission",
                resource_id=self._submission_id,
            )
        if submission.status != SubmissionStatus.IN_PROGRESS.value:
            raise InterviewNotActiveError(submission_id=self._submission_id)
        return submission

    def _get_total_questions(self, submission: InterviewSubmissionModel) -> int:
        """Get total questions from template snapshot."""
        try:
            snapshot = validate_template_snapshot(
                submission.template_structure_snapshot, self._submission_id
            )
            return get_total_questions(snapshot)
        except Exception:
            return 0

    def _resolve_question_at_sequence(
        self,
        snapshot: TemplateSnapshot,
        sequence_order: int,
    ) -> NextQuestionResult:
        """
        Resolve question details for a given sequence order.

        Flattens the template sections and finds the question at the given position.
        Uses the orchestration question_sequencer logic.
        """
        # resolve_next_question expects current_sequence = completed count
        # Since we're submitting for sequence_order, the previous sequence is complete
        result = resolve_next_question(snapshot, sequence_order - 1)
        if result is None or result.sequence_order != sequence_order:
            raise ValidationError(
                message=f"Could not resolve question at sequence {sequence_order}",
                field="exchange_id",
                metadata={"submission_id": self._submission_id},
            )
        return result

    def _load_question_content(
        self,
        question_id: Optional[int],
        section_name: str,
    ) -> Dict[str, Any]:
        """
        Load question content from the questions or coding_problems table.

        For coding sections, loads from CodingProblemModel.
        For other sections, loads from QuestionModel.

        Returns:
            Dict with question_text, question_type, difficulty, answer_text,
            and optionally starter_code, test_cases, coding_problem_id,
            time_limit_seconds.
        """
        is_coding = section_name.lower() == "coding"

        if is_coding and question_id is not None:
            return self._load_coding_problem(question_id)
        elif question_id is not None:
            return self._load_text_question(question_id)
        else:
            # Fallback: no question_id available
            return {
                "question_text": "Question content unavailable",
                "question_type": "technical",
                "difficulty": "medium",
                "answer_text": None,
            }

    def _load_text_question(self, question_id: int) -> Dict[str, Any]:
        """Load question from questions table."""
        row = (
            self._db.query(QuestionModel)
            .filter(QuestionModel.id == question_id)
            .first()
        )
        if row is None:
            raise NotFoundError(
                resource_type="Question",
                resource_id=question_id,
            )
        return {
            "question_text": row.question_text,
            "question_type": row.question_type,
            "difficulty": row.difficulty,
            "answer_text": row.answer_text,
            "time_limit_seconds": (
                row.estimated_time_minutes * 60
                if row.estimated_time_minutes
                else None
            ),
        }

    def _load_coding_problem(self, question_id: int) -> Dict[str, Any]:
        """Load coding problem from coding_problems table."""
        row = (
            self._db.query(CodingProblemModel)
            .filter(CodingProblemModel.id == question_id)
            .first()
        )
        if row is None:
            raise NotFoundError(
                resource_type="CodingProblem",
                resource_id=question_id,
            )

        # Extract starter code from code_snippets JSONB
        starter_code = None
        if row.code_snippets and isinstance(row.code_snippets, dict):
            # Prefer python starter, then first available
            starter_code = row.code_snippets.get("python") or next(
                iter(row.code_snippets.values()), None
            )

        # Build visible test cases from examples
        test_cases = None
        if row.examples and isinstance(row.examples, list):
            test_cases = [
                {"input": str(ex.get("input", "")), "output": str(ex.get("output", ""))}
                for ex in row.examples
                if isinstance(ex, dict)
            ]

        return {
            "question_text": row.body,
            "question_type": "coding",
            "difficulty": row.difficulty,
            "answer_text": None,
            "coding_problem_id": row.id,
            "starter_code": starter_code,
            "test_cases": test_cases,
            "time_limit_seconds": (
                row.estimated_time_minutes * 60
                if row.estimated_time_minutes
                else None
            ),
        }

    def _compute_time_remaining(
        self, submission: InterviewSubmissionModel
    ) -> Optional[int]:
        """Compute seconds remaining until scheduled_end."""
        now = datetime.now(timezone.utc)
        end = submission.scheduled_end

        duration_end = None
        if submission.started_at and submission.template_id:
            template = (
                self._db.query(InterviewTemplateModel)
                .filter(InterviewTemplateModel.id == submission.template_id)
                .first()
            )
            if template and template.total_estimated_time_minutes:
                duration_end = submission.started_at + timedelta(
                    minutes=template.total_estimated_time_minutes
                )

        if duration_end is not None:
            end = duration_end if end is None else min(end, duration_end)

        if end is None:
            return None
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        remaining = int((end - now).total_seconds())
        return max(remaining, 0)

    def _build_interview_completed(
        self,
        submission: Optional[InterviewSubmissionModel] = None,
    ) -> Dict[str, Any]:
        """Build InterviewCompletedEvent for current submission."""
        if submission is None:
            submission = self._submission_repo.get_by_id(self._submission_id)

        total_q = self._get_total_questions(submission) if submission else 0
        exchange_count = (
            len(submission.exchanges)
            if submission and submission.exchanges
            else 0
        )

        completion_reason = "all_questions_answered"
        submitted_at = _now_iso()

        if submission is not None:
            if submission.status == SubmissionStatus.COMPLETED.value:
                completion_reason = "submitted"
            elif submission.status == SubmissionStatus.EXPIRED.value:
                completion_reason = "expired"
            elif submission.status == SubmissionStatus.CANCELLED.value:
                completion_reason = "cancelled"
            elif submission.status == SubmissionStatus.REVIEWED.value:
                completion_reason = "reviewed"

            if submission.submitted_at:
                submitted_at = submission.submitted_at.isoformat()

        return InterviewCompletedEvent(
            submission_id=self._submission_id,
            completion_reason=completion_reason,
            submitted_at=submitted_at,
            exchanges_completed=exchange_count,
            total_questions=total_q,
        ).model_dump()


def _now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _map_intent_to_action(intent: str) -> str:
    """Map intent label to a realtime action."""
    if intent == "DONE":
        return "advance"
    if intent == "CLARIFICATION":
        return "clarify"
    if intent == "UNKNOWN":
        return "advance"
    return "wait"


def _trim_words(text: str, max_words: int) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text


def _strip_think_tags(text: str) -> str:
    lowered = text.lower()
    start = lowered.find("<think>")
    end = lowered.find("</think>")
    if start != -1 and end != -1 and end > start:
        stripped = text[:start] + text[end + len("</think>"):]
        return stripped.strip()
    return text


def _strip_leading_phrase(text: str) -> str:
    stripped = text.lstrip()
    lowered = stripped.lower()
    prefixes = (
        "this question is asking",
        "the question is asking",
        "this question asks",
        "the question asks",
    )
    for prefix in prefixes:
        if lowered.startswith(prefix):
            return stripped[len(prefix):].lstrip(" :,-")
    return text
    return " ".join(words[:max_words]).strip()


def _apply_intent_prior(
    probabilities: List[float],
    labels: List[str],
    previous_empty: bool,
    boost: float = 0.1,
) -> List[float]:
    boosted = list(probabilities)
    if previous_empty:
        for label in ("UNKNOWN", "CLARIFICATION"):
            if label in labels:
                boosted[labels.index(label)] = min(1.0, boosted[labels.index(label)] + boost)
    else:
        for label in ("THINKING", "DONE"):
            if label in labels:
                boosted[labels.index(label)] = min(1.0, boosted[labels.index(label)] + boost)

    total = sum(boosted)
    if total <= 0:
        return probabilities
    return [value / total for value in boosted]


def _fallback_clarification(question: str) -> str:
    return (
        "To clarify: focus on the main idea of the question and explain your "
        "reasoning at a high level. Restate any assumptions you are making before "
        "you continue."
    )
