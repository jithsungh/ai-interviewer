import asyncio
import json

import pytest

try:
    import websockets
except Exception:  # pragma: no cover - developer environment may need dependency
    websockets = None


@pytest.mark.skipif(websockets is None, reason="websockets library not installed")
@pytest.mark.asyncio
async def test_inprocess_signaling_broker_relay():
    """Validate the in-process signaling broker relays messages between publisher and watcher.

    This test assumes the backend is running locally at ws://localhost:8000 and that the
    broker endpoints added under `/api/v1/proctoring/signaling/publish/{id}` and
    `/api/v1/proctoring/signaling/watch/{id}` are registered.
    """

    base = "ws://localhost:8000"
    submission_id = 99999
    pub_url = f"{base}/api/v1/proctoring/signaling/publish/{submission_id}"
    watch_url = f"{base}/api/v1/proctoring/signaling/watch/{submission_id}"

    async with websockets.connect(pub_url) as pub, websockets.connect(watch_url) as watch:
        # The watcher may receive an initial broker_ready message; drain until we see the broker_ready
        try:
            msg = await asyncio.wait_for(watch.recv(), timeout=1)
            # ignore broker_ready or other startup messages
        except asyncio.TimeoutError:
            # no startup message - continue
            pass

        # Publisher -> Watcher (offer)
        offer = {"type": "offer", "sdp": {"type": "offer", "sdp": "dummy-offer"}}
        await pub.send(json.dumps(offer))

        # Watcher should receive the offer
        recv = await asyncio.wait_for(watch.recv(), timeout=2)
        try:
            data = json.loads(recv)
        except Exception:
            pytest.fail(f"Watcher received non-json: {recv}")
        assert data.get("type") == "offer", f"expected offer, got: {data}"

        # Watcher -> Publisher (answer)
        answer = {"type": "answer", "sdp": {"type": "answer", "sdp": "dummy-answer"}}
        await watch.send(json.dumps(answer))

        # Publisher should receive the answer
        recv2 = await asyncio.wait_for(pub.recv(), timeout=2)
        try:
            data2 = json.loads(recv2)
        except Exception:
            pytest.fail(f"Publisher received non-json: {recv2}")
        assert data2.get("type") == "answer", f"expected answer, got: {data2}"

        # Verify candidate/ice relay direction: publisher sends candidate, watcher receives
        candidate = {"type": "candidate", "candidate": {"candidate": "cand1"}}
        await pub.send(json.dumps(candidate))
        recv3 = await asyncio.wait_for(watch.recv(), timeout=2)
        data3 = json.loads(recv3)
        assert data3.get("type") == "candidate" and "candidate" in data3

        # And watcher candidate -> publisher
        watcher_cand = {"type": "candidate", "candidate": {"candidate": "cand2"}}
        await watch.send(json.dumps(watcher_cand))
        recv4 = await asyncio.wait_for(pub.recv(), timeout=2)
        data4 = json.loads(recv4)
        assert data4.get("type") == "candidate" and "candidate" in data4
