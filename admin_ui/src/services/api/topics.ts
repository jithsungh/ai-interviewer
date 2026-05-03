// Topic management API endpoints
import { apiClient } from './client';

export const topicsApi = {
  // List all topics with pagination
  list: (token: string, params?: { page?: number; per_page?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient.get(`/api/v1/admin/topics?${query}`, token);
  },

  // Create new topic
  create: (data: any, token: string) =>
    apiClient.post('/api/v1/admin/topics', data, token),

  // Get single topic by ID
  get: (topicId: string, token: string) =>
    apiClient.get(`/api/v1/admin/topics/${topicId}`, token),

  // Update existing topic
  update: (topicId: string, data: any, token: string) =>
    apiClient.put(`/api/v1/admin/topics/${topicId}`, data, token),
};
