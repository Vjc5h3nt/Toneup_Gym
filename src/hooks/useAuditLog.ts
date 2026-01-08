import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'view'
  | 'export'
  | 'payment_received'
  | 'membership_created'
  | 'membership_renewed'
  | 'lead_converted'
  | 'attendance_marked';

type EntityType =
  | 'member'
  | 'lead'
  | 'staff'
  | 'membership'
  | 'payment'
  | 'attendance'
  | 'membership_plan'
  | 'settings'
  | 'auth';

interface AuditLogData {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldData?: Json;
  newData?: Json;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async ({ action, entityType, entityId, oldData, newData }: AuditLogData) => {
      if (!user) return;

      try {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_data: oldData ?? null,
          new_data: newData ?? null,
          user_agent: navigator.userAgent,
        }]);
      } catch (error) {
        // Silently fail - don't disrupt user flow for audit logging
        if (import.meta.env.DEV) {
          console.error('Failed to log audit action:', error);
        }
      }
    },
    [user]
  );

  // Convenience methods
  const logCreate = useCallback(
    (entityType: EntityType, entityId: string, newData: Json) =>
      logAction({ action: 'create', entityType, entityId, newData }),
    [logAction]
  );

  const logUpdate = useCallback(
    (
      entityType: EntityType,
      entityId: string,
      oldData: Json,
      newData: Json
    ) => logAction({ action: 'update', entityType, entityId, oldData, newData }),
    [logAction]
  );

  const logDelete = useCallback(
    (entityType: EntityType, entityId: string, oldData: Json) =>
      logAction({ action: 'delete', entityType, entityId, oldData }),
    [logAction]
  );

  const logPayment = useCallback(
    (memberId: string, paymentData: Json) =>
      logAction({
        action: 'payment_received',
        entityType: 'payment',
        entityId: memberId,
        newData: paymentData,
      }),
    [logAction]
  );

  const logLogin = useCallback(
    () => logAction({ action: 'login', entityType: 'auth' }),
    [logAction]
  );

  const logLogout = useCallback(
    () => logAction({ action: 'logout', entityType: 'auth' }),
    [logAction]
  );

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logPayment,
    logLogin,
    logLogout,
  };
}