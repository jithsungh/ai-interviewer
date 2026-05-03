import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/api/auth';
import type { User, AuthContextValue } from '@/types/auth';
import { ApiError } from '@/services/api/adminApiClient';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token');
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem('refresh_token');
  });
  const [loading, setLoading] = useState(false);

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  // Verify token validity on mount (non-blocking)
  useEffect(() => {
    const verifyAuth = async () => {
      const storedAccessToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');

      if (!storedAccessToken) {
        return;
      }

      try {
        // Try to get current user profile to verify token is still valid
        const user = await authApi.getMe(storedAccessToken);
        if (user) {
          setUser(user);
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (error: any) {
        const isAuthError = error instanceof ApiError && error.isAuthError();
        
        // Only attempt refresh if it's an auth error (401), not network error
        if (isAuthError && storedRefreshToken) {
          try {
            const result = await authApi.refreshToken(storedRefreshToken);
            if (result?.access_token && result?.refresh_token) {
              setAccessToken(result.access_token);
              setRefreshToken(result.refresh_token);
              setUser(result.user);
              
              localStorage.setItem('access_token', result.access_token);
              localStorage.setItem('refresh_token', result.refresh_token);
              localStorage.setItem('user', JSON.stringify(result.user));
            }
          } catch {
            // Refresh failed, clear auth
            clearAuth();
          }
        } else if (isAuthError) {
          clearAuth();
        }
        // For network errors, keep existing auth state (user stays logged in)
        if (!(error instanceof ApiError)) {
          console.debug('Auth verification skipped (network unavailable)');
        }
      }
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authApi.login({ email, password });
      
      setUser(result.user);
      setAccessToken(result.access_token);
      setRefreshToken(result.refresh_token);
      
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);
      localStorage.setItem('user', JSON.stringify(result.user));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (error) {
        console.error('Logout error (non-blocking):', error);
      }
    }
    clearAuth();
  };

  const registerAdmin = async (data: {
    email: string;
    password: string;
    fullName: string;
    organizationId: string;
    adminRole: string;
  }) => {
    try {
      setLoading(true);
      await authApi.registerAdmin({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        organizationId: parseInt(data.organizationId, 10),
        adminRole: data.adminRole as 'admin' | 'read_only',
      });
    } finally {
      setLoading(false);
    }
  };

  const registerCandidate = async (data: {
    email: string;
    password: string;
    fullName?: string;
  }) => {
    try {
      setLoading(true);
      await authApi.registerCandidate({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        loading,
        login,
        logout,
        registerAdmin,
        registerCandidate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
