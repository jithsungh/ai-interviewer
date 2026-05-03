/**
 * ProtectedAction Component
 * 
 * Wraps admin actions and enforces RBAC gating with user-friendly disabled state
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useCanPerformAction, useRbac } from '@/hooks/useRbac';
import { getActionDescription } from '@/lib/rbac';
import type { RbacAction } from '@/lib/rbac';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProtectedActionProps {
  /**
   * The action being gated by RBAC
   */
  action: RbacAction;

  /**
   * Children to render (typically a Button or action component)
   * Will receive `disabled` prop if action not allowed
   */
  children:
    | React.ReactElement<any>
    | ((props: { disabled: boolean }) => React.ReactElement<any>);

  /**
   * Optional custom message when action is denied
   */
  deniedMessage?: string;

  /**
   * If true, hide the element instead of disabling it (more secure)
   */
  hideIfDenied?: boolean;

  /**
   * Callback when user tries to perform denied action
   */
  onDenied?: () => void;
}

/**
 * Simple permission gate wrapper
 */
export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  action,
  children,
  deniedMessage,
  hideIfDenied = false,
  onDenied,
}) => {
  const canPerform = useCanPerformAction(action);

  if (hideIfDenied && !canPerform) {
    return null;
  }

  const actionDesc = getActionDescription(action);
  const message = deniedMessage || `You don't have permission to ${actionDesc.toLowerCase()}`;

  // If action is allowed, render normally
  if (canPerform) {
    if (typeof children === 'function') {
      return children({ disabled: false });
    }
    return children;
  }

  // Action is denied - wrap with disabled state
  const element =
    typeof children === 'function'
      ? children({ disabled: true })
      : React.cloneElement(children, { disabled: true });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-xs">{message}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Inline permission check component with custom render
 */
export const ActionGate: React.FC<{
  action: RbacAction;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ action, fallback = null, children }) => {
  const canPerform = useCanPerformAction(action);
  return canPerform ? <>{children}</> : <>{fallback}</>;
};
