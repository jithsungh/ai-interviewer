"""Pydantic schemas for intent inference."""

from pydantic import BaseModel


class IntentRequest(BaseModel):
    question: str
    previous_answer: str
    last_answer: str


class IntentResponse(BaseModel):
    intent: str
    confidence: float
    confidences: dict[str, float] | None = None


class IntentRawResponse(BaseModel):
    labels: list[str]
    probabilities: list[float]

