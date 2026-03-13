import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { ROUTE_PATHS } from '../utils/constants';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return url
    const returnTo = location.pathname + location.search;
    const loginUrl = `${ROUTE_PATHS.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
    
    return <Navigate to={redirectTo || loginUrl} replace />;
  }

  // If authentication is not required but user is authenticated
  // (useful for login/register pages)
  if (!requireAuth && isAuthenticated) {
    return <Navigate to={redirectTo || ROUTE_PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;