/**
 * RBAC Hooks for admin UI components
 * 
 * Provides convenient React hooks for permission checking and action gating
 */

import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction, getAllowedActions, type RbacAction } from '@/lib/rbac';

/**
 * Hook to check if current user can perform an action
 */
export function useCanPerformAction(action: RbacAction): boolean {
  const { user } = useAuth();
  return canPerformAction(user, action);
}

/**
 * Hook to get all actions allowed for current user
 */
export function useAllowedActions(): Set<RbacAction> {
  const { user } = useAuth();
  return getAllowedActions(user);
}

/**
 * Hook to conditionally render content based on permission
 * Returns an object with helper functions
 */
export function useRbac() {
  const { user } = useAuth();
  
  return {
    /**
     * Check if user can perform specific action
     */
    can: (action: RbacAction): boolean => canPerformAction(user, action),
    
    /**
     * Get all allowed actions for user
     */
    getAllowed: (): Set<RbacAction> => getAllowedActions(user),
    
    /**
     * Render component only if user can perform action
     */
    renderIf: (action: RbacAction, component: React.ReactNode): React.ReactNode | null => {
      return canPerformAction(user, action) ? component : null;
    },
    
    /**
     * Get CSS class for disabled state if action not allowed
     */
    getActionClass: (action: RbacAction, enabledClass: string = ''): string => {
      return canPerformAction(user, action) ? enabledClass : 'opacity-50 cursor-not-allowed';
    },
  };
}

/**
 * Hook to conditionally disable button/input based on action permission
 */
export function useActionDisabled(action: RbacAction): boolean {
  const { user } = useAuth();
  return !canPerformAction(user, action);
}
