import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultPath, isOwnerRole } from '@/lib/permissions';

interface OwnerRouteProps {
  children: React.ReactNode;
}

export const OwnerRoute: React.FC<OwnerRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwnerRole(user.role)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
};
