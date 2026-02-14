import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLES, ROLE_LABELS } from '../lib/constants';
import Toast from '../components/ui/Toast';
import {
  LayoutDashboard, Users, UserCheck, Phone,
  CalendarDays, Timer, CalendarPlus, BarChart3,
  Wrench, Bell
} from 'lucide-react';

const NAV_CONFIG = {
  admin: [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/assign',    icon: UserCheck,       label: 'Assign' },
    { path: '/admin/team',      icon: Users,           label: 'Team' },
    { path: '/admin/customers', icon: Phone,           label: 'Customers' },
  ],
  mechanic: [
    { path: '/mechanic/today',   icon: CalendarDays,  label: 'Today' },
    { path: '/mechanic/active',  icon: Timer,         label: 'Active' },
    { path: '/mechanic/new',     icon: CalendarPlus,  label: 'New Service' },
    { path: '/mechanic/stats',   icon: BarChart3,     label: 'Stats' },
  ],
};

export default function AppLayout() {
  const { role, setRole, getDashboardStats, currentMechanicId } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const stats = getDashboardStats();
  const notifCount = stats.qc + stats.partsPending;

  const navItems = NAV_CONFIG[role] || [];

  const switchRole = () => {
    const newRole = role === ROLES.ADMIN ? ROLES.MECHANIC : ROLES.ADMIN;
    setRole(newRole);
    const firstPath = NAV_CONFIG[newRole][0].path;
    navigate(firstPath);
  };

  return (
    <div className="min-h-screen bg-page-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-blue-primary text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold leading-tight">Bharath Cycle Hub</h1>
            <p className="text-xs text-blue-200">{ROLE_LABELS[role]}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-urgent rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </button>
            <button
              className="w-9 h-9 rounded-full bg-white/20 text-sm font-bold flex items-center justify-center hover:bg-white/30 transition-colors"
              onClick={switchRole}
              title="Switch Role"
            >
              {role === ROLES.ADMIN ? 'O' : 'M'}
            </button>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="sticky top-[56px] z-30 bg-white border-b border-grey-border flex overflow-x-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 min-w-0 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 cursor-pointer
                ${isActive ? 'text-blue-primary border-blue-primary' : 'text-grey-muted border-transparent hover:text-grey-text'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Page Content */}
      <main className="px-4 py-4 max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-grey-border flex justify-around py-1.5 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors cursor-pointer
                ${isActive ? 'text-blue-primary' : 'text-grey-light hover:text-grey-muted'}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Toast />
    </div>
  );
}
