import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute enforces that only authenticated admin users can access admin_ui
 * 
 * Requirements:
 * - User must be logged in
 * - User must have type='admin' (not 'candidate')
 * - User must have an admin_role assigned
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verify user is admin (not candidate)
  if (user.type !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This admin console is only accessible to admin users. Your account is configured as {user.type}.
            Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Verify admin has a role assigned
  if (!user.adminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your admin account is not configured with a role. Please contact your system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
