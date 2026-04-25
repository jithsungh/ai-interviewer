// =============================================
// API Client — thin HTTP layer over fetch
// Handles base URL, auth headers, and JSON parsing.
// =============================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

let accessToken: string | null = null;
let unauthorizedHandler: ((status: number) => void | Promise<void>) | null = null;
let handlingUnauthorized = false;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: ((status: number) => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error ${status}`);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    const isUnauthorized = response.status === 401 || response.status === 403;
    const shouldHandleUnauthorized =
      isUnauthorized &&
      !handlingUnauthorized &&
      !path.startsWith('/auth/logout');

    if (shouldHandleUnauthorized && unauthorizedHandler) {
      handlingUnauthorized = true;
      try {
        await unauthorizedHandler(response.status);
      } finally {
        handlingUnauthorized = false;
      }
    }

    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => {
    let fullPath = path;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) fullPath += `?${qs}`;
    }
    return request<T>(fullPath, { method: 'GET' });
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
