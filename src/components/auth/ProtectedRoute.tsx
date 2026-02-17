import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { config } from '../../lib/config';

const ROLE_DEFAULTS = {
  owner: '/admin/dashboard',
  admin: '/admin/dashboard',
  mechanic: '/mechanic/today',
  staff: '/staff/checkin',
};

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  // Mock mode: no protection, pass through
  if (!config.useSupabase) {
    return <Outlet />;
  }

  // Not logged in: show login (AuthGate handles this, but just in case)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Logged in but wrong role: redirect to their default page
  if (!allowedRoles.includes(role)) {
    const defaultPath = ROLE_DEFAULTS[role] || '/staff/checkin';
    return <Navigate to={defaultPath} replace />;
  }

  return <Outlet />;
}
