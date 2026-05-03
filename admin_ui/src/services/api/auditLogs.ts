/**
 * Audit Logging Service for Admin UI
 * 
 * Provides client-side and server-side audit trail tracking for admin operations.
 * Logs to backend via /api/v1/admin/audit-logs endpoints.
 * 
 * SRS refs: NFR-11, NFR-11.2, DR-9
 */

import { adminApiClient } from './adminApiClient';
import type { AuditLogListResponse, AuditLogResponse } from '@/types/admin-api';

export interface AdminAuditLogEvent {
  organization_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ACTIVATE' | 'DEACTIVATE';
  entity_type: string;  // 'template', 'question', 'window', etc.
  entity_id?: number;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
}

export interface AuditLogListParams {
  page?: number;
  per_page?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  event_type?: string;
  user_id?: number;
}

/**
 * API client for audit logs
 */
export const auditLogsApi = {
  /**
   * List authentication audit logs
   * GET /api/v1/admin/audit-logs
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: AuditLogListParams,
  ): Promise<AuditLogListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.user_id) query.append('user_id', String(params.user_id));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/audit-logs?${queryString}` : '/api/v1/admin/audit-logs';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * List admin operation audit logs (templates, questions, windows, etc.)
   * GET /api/v1/admin/audit-logs/admin
   */
  listAdminLogs: async (
    token: string,
    organizationId?: number,
    params?: AuditLogListParams,
  ): Promise<AuditLogListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.action) query.append('action', params.action);
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', String(params.entity_id));

    const queryString = query.toString();
    const endpoint = queryString
      ? `/api/v1/admin/audit-logs/admin?${queryString}`
      : '/api/v1/admin/audit-logs/admin';

    return adminApiClient.get(endpoint, token, organizationId);
  },
};

/**
 * In-memory audit trail logger for client-side tracking
 * Tracks operations before they're sent to the server
 */
export class ClientAuditTrail {
  private logs: (AuditLogResponse & { created_at: string })[] = [];
  private maxLogs = 100;

  log(event: Omit<AuditLogResponse, 'id' | 'created_at'>): void {
    const auditEvent: AuditLogResponse & { created_at: string } = {
      ...event,
      id: 0, // Client-generated ID
      created_at: new Date().toISOString(),
    } as any;
    
    this.logs.unshift(auditEvent);
    
    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  logCreate(
    organizationId: number,
    entityType: string,
    entityId: number,
    newValue: Record<string, any>,
  ): void {
    this.log({
      organization_id: organizationId,
      action: 'CREATE',
      entity_type: entityType,
      entity_id: entityId,
      new_value: newValue,
      actor_user_id: undefined,
      old_value: undefined,
      ip_address: undefined,
      user_agent: undefined,
    });
  }

  logUpdate(
    organizationId: number,
    entityType: string,
    entityId: number,
    oldValue: Record<string, any>,
    newValue: Record<string, any>,
  ): void {
    this.log({
      organization_id: organizationId,
      action: 'UPDATE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      actor_user_id: undefined,
      ip_address: undefined,
      user_agent: undefined,
    });
  }

  logDelete(
    organizationId: number,
    entityType: string,
    entityId: number,
    oldValue: Record<string, any>,
  ): void {
    this.log({
      organization_id: organizationId,
      action: 'DELETE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: undefined,
      actor_user_id: undefined,
      ip_address: undefined,
      user_agent: undefined,
    });
  }

  logPublish(
    organizationId: number,
    entityType: string,
    entityId: number,
    metadata?: Record<string, any>,
  ): void {
    this.log({
      organization_id: organizationId,
      action: 'PUBLISH',
      entity_type: entityType,
      entity_id: entityId,
      new_value: metadata,
      actor_user_id: undefined,
      old_value: undefined,
      ip_address: undefined,
      user_agent: undefined,
    });
  }

  getLogs(): (AuditLogResponse & { created_at: string })[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const clientAuditTrail = new ClientAuditTrail();
