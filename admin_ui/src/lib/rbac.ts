/**
 * Role-Based Access Control (RBAC) for admin UI
 * 
 * Enforces action-level permissions based on admin_role:
 * - superadmin: full access
 * - admin: standard CRUD + some sensitive ops
 * - read_only: read-only access (no mutations)
 * 
 * SRS refs: FR-1.3 (RBAC), NFR-7 (security), NR-1 (no autonomous decisions)
 */

import type { AdminRole, User } from '@/types/auth';

export type RbacAction =
  // Template/Question/Rubric/Problem/Topic/Role operations
  | 'create_template'
  | 'edit_template'
  | 'delete_template'
  | 'publish_template'
  | 'archive_template'
  | 'create_question'
  | 'edit_question'
  | 'delete_question'
  | 'publish_question'
  | 'archive_question'
  | 'override_question'
  | 'create_rubric'
  | 'edit_rubric'
  | 'delete_rubric'
  | 'create_problem'
  | 'edit_problem'
  | 'delete_problem'
  | 'create_topic'
  | 'edit_topic'
  | 'delete_topic'
  | 'create_role'
  | 'edit_role'
  | 'delete_role'
  
  // Scheduling/Windows
  | 'create_window'
  | 'edit_window'
  | 'delete_window'
  | 'publish_window'
  | 'close_window'
  
  // Interview Operations
  | 'review_submission'
  | 'override_evaluation'
  | 'mark_reviewed'
  
  // Proctoring
  | 'review_proctoring_event'
  | 'recompute_proctoring_risk'
  
  // Governance/Compliance
  | 'view_audit_logs'
  | 'view_proctoring_queue'
  | 'manage_retention_policy'
  | 'manage_consent_tracking'
  | 'delete_candidate_data'
  | 'export_report'
  
  // Org/Admin Management
  | 'manage_organization'
  | 'manage_admins'
  | 'change_admin_role'
  
  // University Operations (Section B)
  | 'manage_cohorts'
  | 'manage_drives'
  | 'bulk_onboard_candidates'
  | 'bulk_invite'
  | 'manage_eligibility_rules'
  | 'view_recruiter_queue';

/**
 * Permission matrix: role -> allowed actions
 */
const PERMISSION_MATRIX: Record<AdminRole, Set<RbacAction>> = {
  superadmin: new Set([
    // All content operations
    'create_template', 'edit_template', 'delete_template', 'publish_template', 'archive_template',
    'create_question', 'edit_question', 'delete_question', 'publish_question', 'archive_question', 'override_question',
    'create_rubric', 'edit_rubric', 'delete_rubric',
    'create_problem', 'edit_problem', 'delete_problem',
    'create_topic', 'edit_topic', 'delete_topic',
    'create_role', 'edit_role', 'delete_role',
    
    // Scheduling
    'create_window', 'edit_window', 'delete_window', 'publish_window', 'close_window',
    
    // Interview ops
    'review_submission', 'override_evaluation', 'mark_reviewed',
    
    // Proctoring
    'review_proctoring_event', 'recompute_proctoring_risk',
    
    // Governance (full access)
    'view_audit_logs', 'view_proctoring_queue', 'manage_retention_policy', 'manage_consent_tracking', 'delete_candidate_data', 'export_report',
    
    // Org/Admin (full access)
    'manage_organization', 'manage_admins', 'change_admin_role',
    
    // University ops (full access)
    'manage_cohorts', 'manage_drives', 'bulk_onboard_candidates', 'bulk_invite', 'manage_eligibility_rules', 'view_recruiter_queue',
  ]),

  admin: new Set([
    // Content CRUD (no delete for questions/problems by default, can only edit/create)
    'create_template', 'edit_template', 'publish_template', 'archive_template',
    'create_question', 'edit_question', 'publish_question', 'archive_question',
    'create_rubric', 'edit_rubric',
    'create_problem', 'edit_problem',
    'create_topic', 'edit_topic',
    'create_role', 'edit_role',
    
    // Scheduling (can create/edit/publish but not delete)
    'create_window', 'edit_window', 'publish_window', 'close_window',
    
    // Interview ops (can review and mark reviewed, but not override)
    'review_submission', 'mark_reviewed',
    
    // Proctoring (can review events)
    'review_proctoring_event',
    
    // Governance (read-only to audit logs, can export reports)
    'view_audit_logs', 'view_proctoring_queue', 'export_report',
    
    // University ops (full access)
    'manage_cohorts', 'manage_drives', 'bulk_onboard_candidates', 'bulk_invite', 'manage_eligibility_rules', 'view_recruiter_queue',
  ]),

  read_only: new Set([
    // Only viewing permissions
    'view_audit_logs', 'view_proctoring_queue', 'export_report',
  ]),
};

/**
 * Check if user can perform an action
 */
export function canPerformAction(user: User | null, action: RbacAction): boolean {
  if (!user) return false;
  if (user.type !== 'admin') return false; // Only admins can do admin actions
  
  const role = user.adminRole;
  if (!role) return false;
  
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

/**
 * Get all allowed actions for a user
 */
export function getAllowedActions(user: User | null): Set<RbacAction> {
  if (!user || user.type !== 'admin' || !user.adminRole) {
    return new Set();
  }
  
  return PERMISSION_MATRIX[user.adminRole];
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(user: User | null): boolean {
  return user?.type === 'admin' && user?.adminRole === 'superadmin';
}

/**
 * Check if user is admin (superadmin or admin role)
 */
export function isAdmin(user: User | null): boolean {
  return user?.type === 'admin' && (user?.adminRole === 'superadmin' || user?.adminRole === 'admin');
}

/**
 * Check if user is read-only
 */
export function isReadOnly(user: User | null): boolean {
  return user?.type === 'admin' && user?.adminRole === 'read_only';
}

/**
 * Action description for UI warnings
 */
export function getActionDescription(action: RbacAction): string {
  const descriptions: Record<RbacAction, string> = {
    create_template: 'Create interview template',
    edit_template: 'Edit interview template',
    delete_template: 'Delete interview template',
    publish_template: 'Publish interview template',
    archive_template: 'Archive interview template',
    create_question: 'Create question',
    edit_question: 'Edit question',
    delete_question: 'Delete question',
    publish_question: 'Publish question',
    archive_question: 'Archive question',
    override_question: 'Override question (sensitive)',
    create_rubric: 'Create rubric',
    edit_rubric: 'Edit rubric',
    delete_rubric: 'Delete rubric',
    create_problem: 'Create coding problem',
    edit_problem: 'Edit coding problem',
    delete_problem: 'Delete coding problem',
    create_topic: 'Create topic',
    edit_topic: 'Edit topic',
    delete_topic: 'Delete topic',
    create_role: 'Create role',
    edit_role: 'Edit role',
    delete_role: 'Delete role',
    create_window: 'Create submission window',
    edit_window: 'Edit submission window',
    delete_window: 'Delete submission window',
    publish_window: 'Publish submission window',
    close_window: 'Close submission window',
    review_submission: 'Review interview submission',
    override_evaluation: 'Override evaluation (sensitive)',
    mark_reviewed: 'Mark as reviewed',
    review_proctoring_event: 'Review proctoring event',
    recompute_proctoring_risk: 'Recompute proctoring risk',
    view_audit_logs: 'View audit logs',
    view_proctoring_queue: 'View proctoring queue',
    manage_retention_policy: 'Manage data retention policy',
    manage_consent_tracking: 'Manage consent tracking',
    delete_candidate_data: 'Delete candidate data (sensitive)',
    export_report: 'Export report',
    manage_organization: 'Manage organization',
    manage_admins: 'Manage admin users',
    change_admin_role: 'Change admin role',
    manage_cohorts: 'Manage student cohorts',
    manage_drives: 'Manage placement drives',
    bulk_onboard_candidates: 'Bulk onboard candidates',
    bulk_invite: 'Bulk invite candidates',
    manage_eligibility_rules: 'Manage eligibility rules',
    view_recruiter_queue: 'View recruiter queue',
  };
  
  return descriptions[action] || action;
}
