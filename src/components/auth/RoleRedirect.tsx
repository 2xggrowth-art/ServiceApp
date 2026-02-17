import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { config } from '../../lib/config';

const ROLE_DEFAULTS = {
  owner: '/admin/dashboard',
  admin: '/admin/dashboard',
  mechanic: '/mechanic/today',
  staff: '/staff/checkin',
};

export default function RoleRedirect() {
  const { role, isAuthenticated } = useAuth();

  // Mock mode or not authenticated: default to staff check-in
  if (!config.useSupabase || !isAuthenticated) {
    return <Navigate to="/staff/checkin" replace />;
  }

  const path = ROLE_DEFAULTS[role] || '/staff/checkin';
  return <Navigate to={path} replace />;
}
