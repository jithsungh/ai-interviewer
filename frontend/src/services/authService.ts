// =============================================
// Auth Service — login, logout, token management
// =============================================

import { apiClient, setAccessToken } from '@/services/apiClient';
import { setUnauthorizedHandler } from '@/services/apiClient';
import type { LoginRequest, LoginResponse, CandidateRegistrationRequest, RegistrationResponse } from '@/types/api';

const TOKEN_KEY = 'ai_interviewer_access_token';
const REFRESH_KEY = 'ai_interviewer_refresh_token';

function clearAuthSession() {
  setAccessToken(null);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    setAccessToken(token);
  }

  setUnauthorizedHandler(() => {
    clearAuthSession();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  });
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  setAccessToken(response.access_token);
  localStorage.setItem(TOKEN_KEY, response.access_token);
  localStorage.setItem(REFRESH_KEY, response.refresh_token);
  return response;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  clearAuthSession();

  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Best-effort — token may already be revoked
    }
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const response = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('/auth/refresh', { refresh_token: refreshToken });

    setAccessToken(response.access_token);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(REFRESH_KEY, response.refresh_token);
    return response.access_token;
  } catch {
    await logout();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export async function registerCandidate(data: CandidateRegistrationRequest): Promise<RegistrationResponse> {
  return apiClient.post<RegistrationResponse>('/auth/register/candidate', data);
}
