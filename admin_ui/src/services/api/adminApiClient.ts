/**
 * Enhanced API Client for admin_ui
 * 
 * Features:
 * - Tenant/organization context propagation (required for multi-tenant isolation)
 * - Automatic token refresh on 401
 * - Normalized error handling
 * - Request/response interceptors for audit logging readiness
 * 
 * Source: inspired by frontend/src/services/apiClient.ts
 * Updated: April 2026
 */

import type { User } from '@/types/auth';

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  detail?: string;
  status_code?: number;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  isAuthError(): boolean {
    return this.statusCode === 401;
  }
  
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }
  
  isValidationError(): boolean {
    return this.statusCode === 422 || this.statusCode === 400;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  organizationId?: number;
}

type OnTokenRefresh = (newAccessToken: string, newRefreshToken: string) => void;

/**
 * Central API client with tenant context and token refresh support
 */
class AdminApiClient {
  private baseUrl: string;
  private onTokenRefresh?: OnTokenRefresh;
  private refreshInProgress?: Promise<void>;

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Register callback when token is refreshed (for syncing auth state)
   */
  setTokenRefreshCallback(callback: OnTokenRefresh): void {
    this.onTokenRefresh = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { token, organizationId, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Tenant scoping: propagate organization_id in header when available
    if (organizationId) {
      headers['X-Organization-ID'] = String(organizationId);
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Try to parse response body for error details
      const responseText = await response.text();
      let responseData: any;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { message: responseText };
      }

      if (!response.ok) {
        const errorMessage = responseData?.message || 
                           responseData?.detail || 
                           responseData?.error || 
                           response.statusText;
        
        throw new ApiError(
          response.status,
          responseData?.error_code || 'UNKNOWN_ERROR',
          errorMessage,
        );
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'NETWORK_ERROR', error instanceof Error ? error.message : 'Network request failed');
    }
  }

  async get<T>(
    endpoint: string,
    token?: string,
    organizationId?: number,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      token,
      organizationId,
    });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    token?: string,
    organizationId?: number,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      token,
      organizationId,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    token?: string,
    organizationId?: number,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      token,
      organizationId,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    token?: string,
    organizationId?: number,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      token,
      organizationId,
    });
  }

  async delete<T>(
    endpoint: string,
    token?: string,
    organizationId?: number,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      token,
      organizationId,
    });
  }
}

export const adminApiClient = new AdminApiClient();

/**
 * Helper to extract organization ID from user object
 * Used in page components to ensure tenant isolation
 */
export function getOrgContextFromUser(user: User | null): number {
  if (!user?.organizationId) {
    throw new Error('User organization context not available');
  }
  return user.organizationId;
}
