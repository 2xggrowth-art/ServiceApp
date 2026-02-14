import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './layouts/AppLayout';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Assign from './pages/admin/Assign';
import Team from './pages/admin/Team';
import Customers from './pages/admin/Customers';

// Mechanic pages
import Today from './pages/mechanic/Today';
import ActiveJob from './pages/mechanic/ActiveJob';
import NewService from './pages/mechanic/NewService';
import MyStats from './pages/mechanic/MyStats';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Admin */}
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/assign" element={<Assign />} />
            <Route path="/admin/team" element={<Team />} />
            <Route path="/admin/customers" element={<Customers />} />

            {/* Mechanic */}
            <Route path="/mechanic/today" element={<Today />} />
            <Route path="/mechanic/active" element={<ActiveJob />} />
            <Route path="/mechanic/new" element={<NewService />} />
            <Route path="/mechanic/stats" element={<MyStats />} />

            {/* Default */}
            <Route path="/" element={<Navigate to="/mechanic/today" replace />} />
            <Route path="*" element={<Navigate to="/mechanic/today" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
