"""Inference helpers for intent classification."""

from __future__ import annotations

from typing import Dict, List

LABELS = ["UNKNOWN", "CLARIFICATION", "THINKING", "DONE"]

def classify_probabilities(probabilities: List[float]) -> Dict[str, float | str]:
    if not probabilities or len(probabilities) != len(LABELS):
        return {"intent": "THINKING", "confidence": 0.0}

    best_index = max(range(len(probabilities)), key=probabilities.__getitem__)
    best_label = LABELS[best_index]
    return {"intent": best_label, "confidence": float(probabilities[best_index])}

