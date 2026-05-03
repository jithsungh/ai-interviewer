/**
 * Auth type definitions aligned with backend contracts.
 * 
 * Source: backend/app/auth/contracts/schemas.py, responses.py
 * Synced with backend at April 2026
 */

export type AdminRole = 'superadmin' | 'admin' | 'read_only';
export type UserType = 'admin' | 'candidate';

/**
 * Backend UserProfileResponse
 * Defines what the /auth/me and login endpoints return
 */
export interface BackendUserProfile {
  user_id: number;
  email: string;
  user_type: UserType;
  
  // Admin-specific fields (null for candidates)
  admin_id?: number | null;
  organization_id?: number | null;
  admin_role?: AdminRole | null;
  
  // Candidate-specific fields (null for admins)
  candidate_id?: number | null;
  full_name?: string | null;
}

/**
 * Internal User representation (normalized)
 * Maps backend fields to internal naming conventions
 */
export interface User {
  id: number; // maps to user_id
  email: string;
  type: UserType;
  
  // Admin-specific
  adminId?: number;
  organizationId?: number;
  adminRole?: AdminRole;
  
  // Candidate-specific
  candidateId?: number;
  fullName?: string; // alias: name in UI
}

/**
 * Backend LoginResponse / RegistrationResponse
 */
export interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: BackendUserProfile;
}

export interface BackendRegistrationResponse {
  user_id: number;
  email: string;
  user_type: UserType;
  message: string;
}

/**
 * Request contracts for auth operations
 */
export interface AdminRegistrationRequest {
  email: string;
  password: string;
  full_name?: string; // Optional in backend, derived from UI "name"
  organization_id: number;
  admin_role: 'admin' | 'read_only';
}

export interface CandidateRegistrationRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Conversion helper: backend -> internal
 */
export function mapBackendUserProfile(profile: BackendUserProfile): User {
  return {
    id: profile.user_id,
    email: profile.email,
    type: profile.user_type,
    adminId: profile.admin_id ?? undefined,
    organizationId: profile.organization_id ?? undefined,
    adminRole: profile.admin_role ?? undefined,
    candidateId: profile.candidate_id ?? undefined,
    fullName: profile.full_name ?? undefined,
  };
}

/**
 * Auth state context interface
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

/**
 * Auth context API interface
 */
export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerAdmin: (data: {
    email: string;
    password: string;
    fullName: string;
    organizationId: string;
    adminRole: string;
  }) => Promise<void>;
  registerCandidate: (data: {
    email: string;
    password: string;
    fullName?: string;
  }) => Promise<void>;
}
