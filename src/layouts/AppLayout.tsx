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
  WifiOff, LogOut, CloudOff, Download, ShieldCheck
} from 'lucide-react';

const ADMIN_NAV = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/assign',    icon: UserCheck,       label: 'Assign' },
  { path: '/admin/team',      icon: Users,           label: 'Team' },
  { path: '/staff/qc',        icon: ShieldCheck,     label: 'QC' },
  { path: '/admin/services',  icon: Settings,        label: 'Services' },
  { path: '/admin/customers', icon: Phone,           label: 'Customers' },
];

const NAV_CONFIG: Record<string, typeof ADMIN_NAV> = {
  staff: [
    { path: '/staff/checkin',    icon: PlusCircle,     label: 'Check In' },
    { path: '/staff/queue',      icon: ClipboardList,  label: 'Queue' },
    { path: '/staff/pickup',     icon: Wallet,         label: 'Pickup' },
    { path: '/staff/parts',      icon: Wrench,         label: 'Parts' },
    { path: '/staff/qc',         icon: ShieldCheck,    label: 'QC' },
    { path: '/staff/customers',  icon: Phone,          label: 'Customers' },
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
    (role === ROLES.MECHANIC || role === ROLES.STAFF) &&
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
  const isMechanic = role === ROLES.MECHANIC;

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

      {/* Header — clean white for staff, dark slate for admin/owner, blue gradient for mechanic */}
      <header className={`sticky top-0 z-40 px-4 py-3 transition-colors ${
        role === ROLES.OWNER || role === ROLES.ADMIN
          ? 'bg-admin-dark text-white'
          : role === ROLES.STAFF
            ? 'bg-white text-grey-text border-b border-grey-border'
            : 'bg-gradient-to-r from-blue-primary to-blue-600 text-white'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/bchvideowatermarkredandwhite.png" alt="BCH" className={`h-9 w-9 rounded-xl object-contain ${
              role === ROLES.STAFF ? 'bg-grey-bg p-0.5' : 'bg-white/90 p-0.5'
            }`} />
            <div>
              <h1 className="text-[1.05rem] font-extrabold leading-tight tracking-tight">Bharath Cycle Hub</h1>
              <p className={`text-[11px] mt-0.5 font-medium ${
                role === ROLES.STAFF ? 'text-grey-muted' : 'opacity-80'
              }`}>
                {auth?.appUser ? `${auth.appUser.name} — ${ROLE_LABELS[role]}` : ROLE_LABELS[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  role === ROLES.STAFF ? 'bg-grey-bg hover:bg-grey-border text-grey-muted' : 'bg-white/15 hover:bg-white/25'
                }`}
                title="Install App"
              >
                <Download size={16} />
              </button>
            )}

            <button className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              role === ROLES.STAFF ? 'bg-grey-bg hover:bg-grey-border text-grey-muted' : 'hover:bg-white/15'
            }`}>
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-urgent text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  {notifCount}
                </span>
              )}
            </button>

            {config.useSupabase ? (
              /* Supabase mode: show user avatar + logout */
              <button
                className={`w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  role === ROLES.STAFF ? 'bg-grey-bg hover:bg-grey-border text-grey-muted' : 'bg-white/15 hover:bg-white/25 border border-white/20'
                }`}
                style={role !== ROLES.STAFF ? { backgroundColor: auth?.appUser?.color || 'rgba(255,255,255,0.15)' } : undefined}
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            ) : (
              /* Mock mode: role switcher */
              <button
                className={`w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  role === ROLES.STAFF ? 'bg-grey-bg hover:bg-grey-border text-grey-muted' : 'bg-white/15 hover:bg-white/25 border border-white/20'
                }`}
                onClick={switchRole}
                title="Switch Role"
              >
                {ROLE_ICONS[role]}
              </button>
            )}
          </div>
        </div>
      </header>


      {/* Page Content */}
      <main className="px-4 pt-5 pb-4">
        <Outlet />
      </main>

      {/* Bottom Nav — larger icons + glow for mechanic role */}
      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] backdrop-blur-md border-t flex pb-[max(0.375rem,env(safe-area-inset-bottom))] ${
        isMechanic ? 'bg-white border-gray-200 py-1.5' : 'bg-white/98 border-grey-border/60 py-1'
      }`}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const iconSize = isMechanic ? 24 : 20;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-200 relative
                ${isMechanic ? 'min-h-16 py-2' : 'min-h-13 py-1.5'}
                ${isActive
                  ? isMechanic ? 'text-blue-primary' : 'text-blue-primary'
                  : 'text-grey-light hover:text-grey-muted'}`}
            >
              <div className={`rounded-xl transition-all duration-200 ${
                isMechanic ? 'p-2' : 'p-1.5'
              } ${isActive
                ? isMechanic
                  ? 'bg-blue-primary/15 shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                  : 'bg-blue-light'
                : ''
              }`}>
                <Icon size={iconSize} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`font-semibold ${
                isMechanic ? 'text-[10px]' : 'text-[9px]'
              } ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
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
