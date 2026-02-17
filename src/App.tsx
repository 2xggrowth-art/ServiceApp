import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { config } from './lib/config';
import AppLayout from './layouts/AppLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRedirect from './components/auth/RoleRedirect';

// All pages loaded eagerly — ensures offline navigation works
import CheckIn from './pages/staff/CheckIn';
import Queue from './pages/staff/Queue';
import Pickup from './pages/staff/Pickup';
import StaffParts from './pages/staff/Parts';

import Dashboard from './pages/admin/Dashboard';
import Assign from './pages/admin/Assign';
import Team from './pages/admin/Team';
import Customers from './pages/admin/Customers';
import AuditLog from './pages/admin/AuditLog';
import ServiceOptions from './pages/admin/ServiceOptions';

import Today from './pages/mechanic/Today';
import ActiveJob from './pages/mechanic/ActiveJob';
import NewService from './pages/mechanic/NewService';
import MyStats from './pages/mechanic/MyStats';

// Auth pages
import LoginScreen from './pages/auth/LoginScreen';
import LockScreen from './components/auth/LockScreen';

// Gate: shows login or app based on auth state (Supabase mode only)
function AuthGate({ children }) {
  const { isAuthenticated, isLoading, isLocked } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen max-w-[430px] mx-auto bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-grey-muted font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return children;
}

// Core app routes with role-based protection
function AppRoutes() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<AppLayout />}>
        {/* Staff routes — accessible by staff and admin */}
        <Route element={<ProtectedRoute allowedRoles={['staff', 'owner', 'admin']} />}>
          <Route path="/staff/checkin" element={<CheckIn />} />
          <Route path="/staff/queue" element={<Queue />} />
          <Route path="/staff/pickup" element={<Pickup />} />
          <Route path="/staff/parts" element={<StaffParts />} />
        </Route>

        {/* Admin routes — owner and admin only */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/assign" element={<Assign />} />
          <Route path="/admin/team" element={<Team />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/audit" element={<AuditLog />} />
          <Route path="/admin/services" element={<ServiceOptions />} />
        </Route>

        {/* Mechanic routes — mechanics only */}
        <Route element={<ProtectedRoute allowedRoles={['mechanic']} />}>
          <Route path="/mechanic/today" element={<Today />} />
          <Route path="/mechanic/active" element={<ActiveJob />} />
          <Route path="/mechanic/new" element={<NewService />} />
          <Route path="/mechanic/stats" element={<MyStats />} />
        </Route>

        {/* Default: redirect based on role */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<RoleRedirect />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          {config.useSupabase ? (
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          ) : (
            <AppRoutes />
          )}
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
