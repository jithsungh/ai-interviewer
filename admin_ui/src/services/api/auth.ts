/**
 * Authentication API endpoints and response mapping
 * 
 * Implements backend contracts from:
 * - backend/app/auth/api/routes.py
 * - backend/app/auth/contracts/schemas.py and responses.py
 * 
 * Handles response mapping: backend contracts -> internal types
 */

import { adminApiClient } from './adminApiClient';
import type {
  BackendLoginResponse,
  BackendRegistrationResponse,
  LoginRequest,
  AdminRegistrationRequest,
  CandidateRegistrationRequest,
  User,
} from '@/types/auth';
import { mapBackendUserProfile } from '@/types/auth';

export const authApi = {
  /**
   * Register admin user linked to existing organization
   * Backend: POST /api/v1/auth/register/admin
   */
  registerAdmin: async (data: {
    email: string;
    password: string;
    fullName: string;
    organizationId: number;
    adminRole: 'admin' | 'read_only';
  }) => {
    const request: AdminRegistrationRequest = {
      email: data.email,
      password: data.password,
      full_name: data.fullName, // Map UI field to backend schema
      organization_id: data.organizationId,
      admin_role: data.adminRole,
    };
    
    return adminApiClient.post<BackendRegistrationResponse>(
      '/api/v1/auth/register/admin',
      request,
    );
  },

  /**
   * Register candidate user with free plan
   * Backend: POST /api/v1/auth/register/candidate
   */
  registerCandidate: async (data: {
    email: string;
    password: string;
    fullName?: string;
  }) => {
    const request: CandidateRegistrationRequest = {
      email: data.email,
      password: data.password,
      full_name: data.fullName,
    };
    
    return adminApiClient.post<BackendRegistrationResponse>(
      '/api/v1/auth/register/candidate',
      request,
    );
  },

  /**
   * Authenticate and receive JWT tokens
   * Backend: POST /api/v1/auth/login
   */
  login: async (data: { email: string; password: string }) => {
    const request: LoginRequest = {
      email: data.email,
      password: data.password,
    };
    
    const response = await adminApiClient.post<BackendLoginResponse>(
      '/api/v1/auth/login',
      request,
    );
    
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
      user: mapBackendUserProfile(response.user), // Map response to internal User type
    };
  },

  /**
   * Exchange refresh token for new access token
   * Backend: POST /api/v1/auth/refresh
   */
  refreshToken: async (refreshToken: string) => {
    const response = await adminApiClient.post<BackendLoginResponse>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
    );
    
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
      user: mapBackendUserProfile(response.user),
    };
  },

  /**
   * Revoke refresh token (logout)
   * Backend: POST /api/v1/auth/logout
   */
  logout: async (refreshToken: string) => {
    return adminApiClient.post(
      '/api/v1/auth/logout',
      { refresh_token: refreshToken },
    );
  },

  /**
   * Get current authenticated user profile
   * Backend: GET /api/v1/auth/me
   */
  getMe: async (token: string): Promise<User> => {
    const response = await adminApiClient.get(
      '/api/v1/auth/me',
      token,
    );
    
    return mapBackendUserProfile(response);
  },
};
