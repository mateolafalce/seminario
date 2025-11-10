import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../auth/context/AuthContext';
import { hasRole } from '../../../shared/utils/permissions';

export default function AdminRoute({ children }) {
  const { isAuthenticated, roles, permissions } = useContext(AuthContext);
  const me = { roles, permissions };
  const isAdmin = hasRole(me, 'admin');

  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;
  return children;
}
