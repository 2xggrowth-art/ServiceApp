import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLES, ROLE_LABELS, ROLE_ICONS } from '../lib/constants';
import { config } from '../lib/config';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import Toast from '../components/ui/Toast';
import SwitchMechanicFAB from '../components/mechanic/SwitchMechanicFAB';
import { userService } from '../services/userService';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { isNotificationSupported, getPermissionState, wasPermissionDismissed, dismissPermissionPrompt, requestPermission } from '../lib/notifications';
import {
  LayoutDashboard, Users, UserCheck, Phone, Settings,
  CalendarDays, Timer, CalendarPlus, BarChart3,
  ClipboardList, PlusCircle, Wallet, Wrench, Bell,
  WifiOff, LogOut, CloudOff, Download
} from 'lucide-react';

const ADMIN_NAV = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/assign',    icon: UserCheck,       label: 'Assign' },
  { path: '/admin/team',      icon: Users,           label: 'Team' },
  { path: '/admin/customers', icon: Phone,           label: 'Customers' },
  { path: '/admin/services',  icon: Settings,        label: 'Services' },
];

const NAV_CONFIG: Record<string, typeof ADMIN_NAV> = {
  staff: [
    { path: '/staff/checkin', icon: PlusCircle,     label: 'Check In' },
    { path: '/staff/queue',   icon: ClipboardList,  label: 'Queue' },
    { path: '/staff/pickup',  icon: Wallet,         label: 'Pickup' },
    { path: '/staff/parts',   icon: Wrench,         label: 'Parts' },
  ],
  mechanic: [
    { path: '/mechanic/today',  icon: CalendarDays,  label: 'Today' },
    { path: '/mechanic/active', icon: Timer,         label: 'Active' },
    { path: '/mechanic/new',    icon: CalendarPlus,  label: 'New Service' },
    { path: '/mechanic/stats',  icon: BarChart3,     label: 'Stats' },
  ],
  admin: ADMIN_NAV,
  owner: ADMIN_NAV,
};

const ROLE_ORDER = [ROLES.STAFF, ROLES.MECHANIC, ROLES.ADMIN];

export default function AppLayout() {
  const { role, setRole, getDashboardStats, isOffline, mechanics, showToast, refreshData } = useApp();
  const { pendingCount, failedCount, syncStatus, retryFailed } = useOfflineStatus();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stats = getDashboardStats();
  const notifCount = stats.qc + stats.partsPending;
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);
  const [dutyToggling, setDutyToggling] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
      showToast('App installed!', 'success');
    }
  };

  // Get current mechanic's duty status
  const currentMechanic = role === ROLES.MECHANIC && auth?.appUser
    ? mechanics.find(m => m.id === auth.appUser.id)
    : null;
  const isOnDuty = currentMechanic?.status === 'on_duty';

  const handleDutyToggle = async () => {
    if (!currentMechanic || dutyToggling) return;
    if (!navigator.onLine) {
      showToast('You are offline — duty status will update when connected', 'warning');
      return;
    }
    const newStatus = isOnDuty ? 'off_duty' : 'on_duty';
    setDutyToggling(true);
    try {
      if (config.useSupabase) {
        await userService.updateMechanicStatus(currentMechanic.id, newStatus);
      }
      showToast(newStatus === 'on_duty' ? 'You are On Duty' : 'You are Off Duty', 'success');
      refreshData();
    } catch (err) {
      console.error('[DutyToggle] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setDutyToggling(false);
    }
  };

  // Show notification permission banner for mechanics who haven't been asked
  const showNotifBanner =
    config.useSupabase &&
    role === ROLES.MECHANIC &&
    isNotificationSupported() &&
    getPermissionState() === 'default' &&
    !wasPermissionDismissed() &&
    !notifBannerDismissed;

  const handleEnableNotifs = async () => {
    await requestPermission();
    setNotifBannerDismissed(true);
  };

  const handleDismissNotifs = () => {
    dismissPermissionPrompt();
    setNotifBannerDismissed(true);
  };

  const navItems = NAV_CONFIG[role] || [];

  // Mock mode: cycle through roles
  const switchRole = () => {
    const idx = ROLE_ORDER.indexOf(role);
    const newRole = ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
    setRole(newRole);
    const firstPath = NAV_CONFIG[newRole][0].path;
    navigate(firstPath);
  };

  // Supabase mode: logout
  const handleLogout = async () => {
    if (auth?.logout) {
      await auth.logout();
    }
  };

  return (
    <div className="min-h-screen max-w-[430px] mx-auto bg-page-bg pb-20 relative shadow-lg">
      {/* Offline Banner — yellow */}
      {isOffline && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5">
          <WifiOff size={14} /> Offline — changes sync when connected
          {pendingCount > 0 && (
            <span className="ml-1 bg-yellow-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">
              {pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* Syncing Banner — blue */}
      {!isOffline && syncStatus === 'syncing' && (
        <div className="bg-blue-50 text-blue-700 text-center py-1 text-xs font-semibold flex items-center justify-center gap-1.5">
          <CloudOff size={12} /> Syncing {pendingCount} offline change{pendingCount > 1 ? 's' : ''}...
        </div>
      )}

      {/* Pending Banner — blue (items waiting but not actively syncing) */}
      {!isOffline && syncStatus === 'pending' && (
        <div className="bg-blue-50 text-blue-700 text-center py-1 text-xs font-semibold flex items-center justify-center gap-1.5">
          <CloudOff size={12} /> {pendingCount} change{pendingCount > 1 ? 's' : ''} pending sync
        </div>
      )}

      {/* Failed Banner — red with retry */}
      {!isOffline && failedCount > 0 && (
        <div className="bg-red-50 text-red-700 text-center py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5">
          <CloudOff size={12} /> {failedCount} action{failedCount > 1 ? 's' : ''} failed
          <button onClick={retryFailed} className="ml-1 underline cursor-pointer font-bold">
            Tap to retry
          </button>
        </div>
      )}

      {/* Notification Permission Banner */}
      {showNotifBanner && (
        <div className="bg-blue-50 text-blue-800 py-2 px-4 text-xs flex items-center justify-between gap-2">
          <span>Enable notifications to get job alerts?</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleDismissNotifs} className="text-blue-400 font-semibold cursor-pointer">Not now</button>
            <button onClick={handleEnableNotifs} className="bg-blue-primary text-white px-2.5 py-1 rounded-lg font-semibold cursor-pointer">Enable</button>
          </div>
        </div>
      )}

      {/* Header — dark slate for admin/owner, blue for others */}
      <header className={`sticky top-0 z-40 text-white px-4 py-3 transition-colors ${
        role === ROLES.OWNER || role === ROLES.ADMIN ? 'bg-admin-dark' : 'bg-blue-primary'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/bchvideowatermarkredandwhite.png" alt="BCH" className="h-9 w-9 rounded-lg bg-white p-0.5 object-contain" />
            <div>
              <h1 className="text-[1.1rem] font-bold leading-tight tracking-tight">Bharath Cycle Hub</h1>
              <p className="text-xs opacity-85 mt-0.5">
                {auth?.appUser ? `${auth.appUser.name} — ${ROLE_LABELS[role]}` : ROLE_LABELS[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mechanic Duty Toggle */}
            {role === ROLES.MECHANIC && currentMechanic && (
              <button
                onClick={handleDutyToggle}
                disabled={dutyToggling}
                className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={isOnDuty ? 'On Duty' : 'Off Duty'}
              >
                <span className="text-[10px] font-semibold opacity-80">
                  {isOnDuty ? 'On' : 'Off'}
                </span>
                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200
                  ${isOnDuty ? 'bg-green-400' : 'bg-white/30'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
                    ${isOnDuty ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            )}

            {/* PWA Install Button */}
            {installPrompt && (
              <button
                onClick={handleInstall}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                title="Install App"
              >
                <Download size={16} />
              </button>
            )}

            <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors cursor-pointer">
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-urgent rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </button>

            {config.useSupabase ? (
              /* Supabase mode: show user avatar + logout */
              <button
                className="w-[34px] h-[34px] rounded-full border-2 border-white/50 text-sm font-bold flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                style={{ backgroundColor: auth?.appUser?.color || 'rgba(255,255,255,0.2)' }}
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            ) : (
              /* Mock mode: role switcher */
              <button
                className="w-[34px] h-[34px] rounded-full bg-white/20 border-2 border-white/50 text-sm font-bold flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                onClick={switchRole}
                title="Switch Role"
              >
                {ROLE_ICONS[role]}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="sticky top-[56px] z-30 bg-white/95 backdrop-blur-sm border-b border-grey-border flex overflow-x-auto scrollbar-hide">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const isAdmin = role === ROLES.OWNER || role === ROLES.ADMIN;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 min-w-0 py-3 text-[0.78rem] font-semibold text-center transition-all duration-200 border-b-[2.5px] cursor-pointer whitespace-nowrap
                ${isActive
                  ? isAdmin ? 'text-grey-text border-grey-text' : 'text-blue-primary border-blue-primary'
                  : 'text-grey-muted border-transparent hover:text-grey-text'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Page Content */}
      <main className="px-4 pt-5 pb-4">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-grey-border flex py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[56px] cursor-pointer transition-colors
                ${isActive ? 'text-blue-primary' : 'text-grey-light hover:text-grey-muted'}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Switch Mechanic FAB — visible only for mechanics */}
      {role === ROLES.MECHANIC && <SwitchMechanicFAB />}

      <Toast />
    </div>
  );
}
