"""Intent classifier model loader and predictor."""

from __future__ import annotations

from pathlib import Path
from threading import Lock
from typing import List

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.shared.observability import get_context_logger

logger = get_context_logger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent / "intent_classifier_model"

_model_lock = Lock()
_model_instance: "IntentModel | None" = None


class IntentModel:
    """Loads and serves the intent classifier model."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(str(_MODEL_DIR))
        self.model = AutoModelForSequenceClassification.from_pretrained(str(_MODEL_DIR))
        self.model.to(self.device)
        self.model.eval()

    def predict(self, text: str, max_length: int = 128) -> List[float]:
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=max_length,
        )
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.no_grad():
            logits = self.model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).squeeze(0).tolist()
        return [float(value) for value in probs]


def get_intent_model() -> IntentModel:
    """Get a singleton instance of the intent model."""
    global _model_instance
    if _model_instance is None:
        with _model_lock:
            if _model_instance is None:
                logger.info("Loading intent classifier model")
                _model_instance = IntentModel()
                logger.info("Intent classifier model loaded")
    return _model_instance

