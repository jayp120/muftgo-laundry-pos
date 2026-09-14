import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, getDefaultPath, isOwnerRole, type AppSection } from '@/lib/permissions';

interface RoleRouteProps {
  children: React.ReactNode;
  /** Sections the user must have access to (any one grants entry). */
  allow: AppSection | AppSection[];
}

/**
 * Route guard for role-based sections (services, revenue, expenses...).
 * Unauthenticated users go to /login; authenticated users without access go
 * to their role's home screen instead of a dead page.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allow }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const sections = Array.isArray(allow) ? allow : [allow];
  if (!sections.some((s) => canAccess(s, user.role))) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
};

/** Owner-only (superadmin) guard - kept for stores/settings/staff/broadcast. */
export const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwnerRole(user.role)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
};
