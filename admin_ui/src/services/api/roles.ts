// Role management API endpoints
import { adminApiClient } from './adminApiClient';
import type { RoleListResponse, RoleResponse } from '@/types/admin-api';

export const rolesApi = {
  // List all roles with pagination
  list: (
    token: string,
    organizationId?: number,
    params?: { page?: number; per_page?: number },
  ): Promise<RoleListResponse> => {
    const query = new URLSearchParams(params as any).toString();
    const endpoint = query ? `/api/v1/admin/roles?${query}` : '/api/v1/admin/roles';
    return adminApiClient.get(endpoint, token, organizationId);
  },

  // Create new role
  create: (data: any, token: string, organizationId?: number): Promise<RoleResponse> =>
    adminApiClient.post('/api/v1/admin/roles', data, token, organizationId),

  // Get single role by ID
  get: (roleId: string, token: string, organizationId?: number): Promise<RoleResponse> =>
    adminApiClient.get(`/api/v1/admin/roles/${roleId}`, token, organizationId),

  // Update existing role
  update: (roleId: string, data: any, token: string, organizationId?: number): Promise<RoleResponse> =>
    adminApiClient.put(`/api/v1/admin/roles/${roleId}`, data, token, organizationId),
};
