// Role management API endpoints
import { apiClient } from './client';

export const rolesApi = {
  // List all roles with pagination
  list: (token: string, params?: { page?: number; per_page?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient.get(`/api/v1/admin/roles?${query}`, token);
  },

  // Create new role
  create: (data: any, token: string) =>
    apiClient.post('/api/v1/admin/roles', data, token),

  // Get single role by ID
  get: (roleId: string, token: string) =>
    apiClient.get(`/api/v1/admin/roles/${roleId}`, token),

  // Update existing role
  update: (roleId: string, data: any, token: string) =>
    apiClient.put(`/api/v1/admin/roles/${roleId}`, data, token),
};
