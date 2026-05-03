/**
 * Form Validation Utilities
 * 
 * Ensures frontend forms comply with backend contracts and database schemas.
 * All validation errors are user-friendly and tied to SRS requirements.
 */

import type { TemplateCreateRequest, InterviewWindowCreateRequest } from '@/types/admin-api';

/**
 * Validates template creation request against schema constraints
 * SRS refs: FR-2.3, DR-1 (data storage requirements)
 */
export function validateTemplateRequest(req: Partial<TemplateCreateRequest>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Name validation
  if (!req.name || req.name.trim().length === 0) {
    errors.name = 'Template name is required';
  } else if (req.name.length > 255) {
    errors.name = 'Template name must be less than 255 characters';
  }

  // Description validation
  if (req.description && req.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }

  // Scope validation (must be one of the enum values)
  if (!req.scope || !['public', 'organization', 'private'].includes(req.scope)) {
    errors.scope = 'Invalid template scope';
  }

  // Template structure validation
  if (!req.template_structure || typeof req.template_structure !== 'object') {
    errors.template_structure = 'Template structure is required and must be valid JSON';
  }

  // Time estimate validation
  if (req.total_estimated_time_minutes) {
    const mins = Number(req.total_estimated_time_minutes);
    if (mins < 1 || mins > 480) {
      errors.total_estimated_time_minutes = 'Estimated duration must be between 1 and 480 minutes';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates interview window creation request
 * SRS refs: FR-2.3 (strict schedule enforcement), FR-2.5 (timezone-safe windows)
 */
export function validateWindowRequest(req: Partial<InterviewWindowCreateRequest>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Name validation
  if (!req.name || req.name.trim().length === 0) {
    errors.name = 'Window name is required';
  } else if (req.name.length > 255) {
    errors.name = 'Window name must be less than 255 characters';
  }

  // Template ID validation
  if (!req.template_id || req.template_id <= 0) {
    errors.template_id = 'Valid template selection is required';
  }

  // Date validation - must be ISO format
  if (!req.start_date) {
    errors.start_date = 'Start date is required';
  } else if (!isValidISODate(req.start_date)) {
    errors.start_date = 'Start date must be a valid date (YYYY-MM-DD)';
  }

  if (!req.end_date) {
    errors.end_date = 'End date is required';
  } else if (!isValidISODate(req.end_date)) {
    errors.end_date = 'End date must be a valid date (YYYY-MM-DD)';
  }

  // Validate start < end
  if (req.start_date && req.end_date) {
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    if (start >= end) {
      errors.end_date = 'End date must be after start date';
    }
  }

  // Max candidates validation
  if (req.max_candidates !== undefined && req.max_candidates !== null) {
    const max = Number(req.max_candidates);
    if (max < 0) {
      errors.max_candidates = 'Max candidates cannot be negative';
    } else if (max > 10000) {
      errors.max_candidates = 'Max candidates cannot exceed 10000';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates candidate email address
 * Uses RFC 5322 simplified regex (not perfect but good for UI validation)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates ISO date format (YYYY-MM-DD)
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  
  // Check if valid date
  const date = new Date(dateString + 'T00:00:00Z');
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates ISO datetime format (RFC 3339)
 */
export function isValidISODateTime(dateTimeString: string): boolean {
  if (!dateTimeString || typeof dateTimeString !== 'string') return false;
  
  const date = new Date(dateTimeString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Converts date object to ISO string (YYYY-MM-DD)
 */
export function toISODate(date: Date | string): string {
  if (typeof date === 'string') {
    // Already a string, validate it
    if (isValidISODate(date)) return date;
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Converts date to user-friendly display format
 */
export function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startStr = start.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = end.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    return `${startStr} – ${endStr}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

/**
 * Validates RBAC action is allowed
 * SRS refs: NFR-7 (security requirements)
 */
export function validateRBACAction(
  userRole: 'superadmin' | 'admin' | 'read_only',
  action: 'create' | 'update' | 'delete' | 'publish' | 'read'
): boolean {
  const rolePermissions: Record<string, string[]> = {
    superadmin: ['create', 'read', 'update', 'delete', 'publish'],
    admin: ['create', 'read', 'update', 'delete', 'publish'],
    read_only: ['read'],
  };

  return rolePermissions[userRole]?.includes(action) ?? false;
}

/**
 * Validates organization scope for tenant isolation
 * SRS refs: NFR-7.1 (tenant isolation)
 */
export function validateOrgScope(
  userOrgId: number,
  resourceOrgId: number,
  isSuperadmin: boolean
): boolean {
  // Superadmin can access any org
  if (isSuperadmin) return true;
  
  // Regular admins can only access their org
  return userOrgId === resourceOrgId;
}
