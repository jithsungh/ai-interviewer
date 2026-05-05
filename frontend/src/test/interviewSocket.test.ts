import { describe, it, expect, vi } from 'vitest';
import { InterviewSocket } from '@/websocket/interviewSocket';

const WS_OPEN_STATE = 1;

if (!globalThis.WebSocket) {
  (globalThis as unknown as { WebSocket: { OPEN: number } }).WebSocket = { OPEN: WS_OPEN_STATE };
}

describe('InterviewSocket intent events', () => {
  it('sends intent_gap payload', () => {
    const socket = new InterviewSocket(1, () => 'token', {});
    const mockWs = { readyState: 1, send: vi.fn() };

    (socket as unknown as { ws: WebSocket | null }).ws = mockWs as unknown as WebSocket;

    socket.sendIntentGap(2, 'Q', 'prev', 'last', 5000, 7000);

    expect(mockWs.send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(payload).toMatchObject({
      event_type: 'intent_gap',
      exchange_id: 2,
      question: 'Q',
      previous_answer: 'prev',
      last_answer: 'last',
      gap_ms: 5000,
      response_time_ms: 7000,
    });
  });

  it('dispatches intent_decision events', () => {
    const onIntentDecision = vi.fn();
    const socket = new InterviewSocket(1, () => 'token', { onIntentDecision });
    const handler = (socket as unknown as { handleMessage: (raw: string) => void }).handleMessage;

    handler(JSON.stringify({
      event_type: 'intent_decision',
      exchange_id: 3,
      intent: 'DONE',
      confidence: 0.9,
      action: 'advance',
      gap_ms: 5200,
    }));

    expect(onIntentDecision).toHaveBeenCalledTimes(1);
    expect(onIntentDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'intent_decision',
        intent: 'DONE',
        action: 'advance',
      }),
    );
  });

  it('dispatches clarification_response events', () => {
    const onClarificationResponse = vi.fn();
    const socket = new InterviewSocket(1, () => 'token', { onClarificationResponse });
    const handler = (socket as unknown as { handleMessage: (raw: string) => void }).handleMessage;

    handler(JSON.stringify({
      event_type: 'clarification_response',
      exchange_id: 4,
      clarification_text: 'Clarify the input constraints.',
    }));

    expect(onClarificationResponse).toHaveBeenCalledTimes(1);
    expect(onClarificationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'clarification_response',
        clarification_text: 'Clarify the input constraints.',
      }),
    );
  });
});
