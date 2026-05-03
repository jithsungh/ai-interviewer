// Health check API endpoints
import { apiClient } from './client';

export const healthApi = {
  // Basic health check
  check: () => apiClient.get('/health'),

  // Database health check with connection pool status
  checkDatabase: () => apiClient.get('/health/database'),
};
