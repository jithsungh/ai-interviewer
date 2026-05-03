// Audio ingestion API endpoints
import { apiClient } from './client';

export const audioApi = {
  // Start new audio session for exchange
  startSession: (exchangeId: string, data: any, token: string) =>
    apiClient.post(
      `/api/v1/audio/ingestion/exchanges/${exchangeId}/session/start`,
      data,
      token
    ),

  // Control audio session (pause/resume/stop)
  controlSession: (
    exchangeId: string,
    action: 'pause' | 'resume' | 'stop',
    token: string
  ) =>
    apiClient.post(
      `/api/v1/audio/ingestion/exchanges/${exchangeId}/session/control`,
      { action },
      token
    ),

  // Get audio session status
  getSessionStatus: (exchangeId: string, token: string) =>
    apiClient.get(
      `/api/v1/audio/ingestion/exchanges/${exchangeId}/session/status`,
      token
    ),
};
