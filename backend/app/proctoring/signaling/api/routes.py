from __future__ import annotations

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from app.shared.observability import get_context_logger

router = APIRouter()
logger = get_context_logger(__name__)


# Simple in-process signaling broker for development only.
# Maps submission_id -> { publisher: WebSocket | None, watchers: List[WebSocket] }
_BROKER: Dict[int, Dict[str, object]] = {}


def _ensure_entry(submission_id: int) -> None:
    if submission_id not in _BROKER:
        _BROKER[submission_id] = {"publisher": None, "watchers": []}


async def _register_watcher(submission_id: int, websocket: WebSocket) -> None:
    _ensure_entry(submission_id)
    _BROKER[submission_id]["watchers"].append(websocket)
    try:
        await _relay_to_publisher(
            submission_id,
            json.dumps({"type": "watcher_joined", "submission_id": submission_id}),
        )
    except Exception:
        pass


async def _unregister_watcher(submission_id: int, websocket: WebSocket) -> None:
    if submission_id in _BROKER:
        try:
            _BROKER[submission_id]["watchers"].remove(websocket)
        except ValueError:
            pass


async def _set_publisher(submission_id: int, websocket: WebSocket) -> None:
    _ensure_entry(submission_id)
    _BROKER[submission_id]["publisher"] = websocket


async def _clear_publisher(submission_id: int) -> None:
    if submission_id in _BROKER:
        _BROKER[submission_id]["publisher"] = None


async def _relay_to_watchers(submission_id: int, message: str) -> None:
    if submission_id not in _BROKER:
        return
    for ws in list(_BROKER[submission_id]["watchers"]):
        try:
            await ws.send_text(message)
        except Exception:
            # ignore send errors; watcher cleanup will remove closed sockets
            pass


async def _relay_to_publisher(submission_id: int, message: str) -> None:
    if submission_id not in _BROKER:
        return
    pub = _BROKER[submission_id].get("publisher")
    if pub:
        try:
            await pub.send_text(message)
        except Exception:
            pass


@router.websocket("/proctoring/signaling/watch/{submission_id}")
async def proctoring_signaling_watch(websocket: WebSocket, submission_id: int):
    """Watcher endpoint. Forwards messages from publisher to watcher and vice versa."""
    await websocket.accept()
    ws_logger = get_context_logger(submission_id=submission_id)
    ws_logger.info(f"Watcher connected for submission {submission_id}")

    await _register_watcher(submission_id, websocket)

    # Notify watcher of broker presence
    try:
        await websocket.send_text(json.dumps({"type": "broker_ready", "message": "Connected to in-process signaling broker."}))
    except Exception:
        pass

    try:
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect as exc:
                ws_logger.info(f"Watcher websocket disconnected: {exc}")
                break
            except Exception as exc:
                ws_logger.info(f"Watcher receive error: {exc}")
                break

            ws_logger.info(f"Watcher -> broker: {data}")
            # forward watcher messages (e.g., answer/candidate) to publisher
            await _relay_to_publisher(submission_id, data)
    finally:
        await _unregister_watcher(submission_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
        ws_logger.info(f"Watcher disconnected for submission {submission_id}")


@router.websocket("/proctoring/signaling/publish/{submission_id}")
async def proctoring_signaling_publish(websocket: WebSocket, submission_id: int):
    """Publisher endpoint. Candidate (or test publisher) connects here to send offers/ICE to watchers."""
    await websocket.accept()
    ws_logger = get_context_logger(submission_id=submission_id)
    ws_logger.info(f"Publisher connected for submission {submission_id}")

    await _set_publisher(submission_id, websocket)

    try:
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect as exc:
                ws_logger.info(f"Publisher websocket disconnected: {exc}")
                break
            except Exception as exc:
                ws_logger.info(f"Publisher receive error: {exc}")
                break

            ws_logger.info(f"Publisher -> broker: {data}")
            # forward publisher messages (offer/ice) to all watchers
            await _relay_to_watchers(submission_id, data)
    finally:
        await _clear_publisher(submission_id)
        try:
            await websocket.close()
        except Exception:
            pass
        ws_logger.info(f"Publisher disconnected for submission {submission_id}")


@router.get("/proctoring/signaling/status/{submission_id}")
async def proctoring_signaling_status(submission_id: int):
    """Diagnostic endpoint: returns whether a publisher is connected and watcher count."""
    _ensure_entry(submission_id)
    entry = _BROKER.get(submission_id, {"publisher": None, "watchers": []})
    return {
        "submission_id": submission_id,
        "publisher_connected": entry.get("publisher") is not None,
        "watchers_count": len(entry.get("watchers", [])),
    }
