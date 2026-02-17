import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import PinPad from './PinPad';
import { ArrowLeft, Shield, Download } from 'lucide-react';

const CACHE_KEY_MECHANICS = 'bch_login_mechanics';
const CACHE_KEY_OWNER = 'bch_login_owner';

function loadCached(key: string) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveCache(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

export default function LoginScreen() {
  const { loginWithEmail, loginWithPin, error, clearError, isLoading } = useAuth();
  const [mode, setMode] = useState('select'); // 'select' | 'mechanic_pin' | 'owner_login' | 'owner_pin' | 'owner_choose'
  const [mechanics, setMechanics] = useState(() => loadCached(CACHE_KEY_MECHANICS) || []);
  const [ownerUser, setOwnerUser] = useState(() => loadCached(CACHE_KEY_OWNER));
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinError, setPinError] = useState(null);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallTip, setShowInstallTip] = useState(false);

  // Check if already running as installed PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

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
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') setInstallPrompt(null);
    } else {
      setShowInstallTip(true);
    }
  };

  // Fetch active mechanics for avatar grid + check owner has PIN
  useEffect(() => {
    async function fetchUsers() {
      if (!supabase) return;
      setFetchingUsers(true);
      try {
        const { data } = await supabase.rpc('get_active_mechanics');
        if (data) {
          const mapped = data.map(m => ({
            id: m.user_id,
            name: m.user_name,
            phone: m.user_phone,
            avatar: m.user_avatar,
            color: m.user_color,
            level: m.user_mechanic_level,
            status: m.user_status,
          }));
          setMechanics(mapped);
          saveCache(CACHE_KEY_MECHANICS, mapped);
        }
        // Check if owner has a PIN set (has phone + pin_hash)
        const { data: ownerRows } = await supabase
          .from('users')
          .select('id, name, phone, avatar, color, pin_hash')
          .eq('role', 'owner')
          .eq('is_active', true)
          .limit(1);
        const ownerData = ownerRows?.[0];
        if (ownerData && ownerData.phone && ownerData.pin_hash) {
          const owner = {
            id: ownerData.id,
            name: ownerData.name,
            phone: ownerData.phone,
            avatar: ownerData.avatar || 'O',
            color: ownerData.color || '#2563eb',
          };
          setOwnerUser(owner);
          saveCache(CACHE_KEY_OWNER, owner);
        }
      } catch {
        // Offline or network error — cached data already loaded via useState initializer
      } finally {
        setFetchingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const handleMechanicTap = useCallback((mechanic) => {
    setSelectedMechanic(mechanic);
    setMode('mechanic_pin');
    clearError();
    setPinError(null);
  }, [clearError]);

  const handlePinSubmit = useCallback(async (pin) => {
    if (!selectedMechanic) return;
    setPinError(null);
    try {
      await loginWithPin(selectedMechanic.phone, pin);
    } catch (err) {
      setPinError(err.message || 'Wrong PIN');
    }
  }, [selectedMechanic, loginWithPin]);

  const handleOwnerPinSubmit = useCallback(async (pin) => {
    if (!ownerUser) return;
    setPinError(null);
    try {
      await loginWithPin(ownerUser.phone, pin);
    } catch (err) {
      setPinError(err.message || 'Wrong PIN');
    }
  }, [ownerUser, loginWithPin]);

  const handleOwnerLogin = useCallback(async (e) => {
    e.preventDefault();
    clearError();
    try {
      await loginWithEmail(email, password);
    } catch {
      // error is set in AuthContext
    }
  }, [email, password, loginWithEmail, clearError]);

  const goBack = () => {
    setMode('select');
    setSelectedMechanic(null);
    clearError();
    setPinError(null);
  };

  return (
    <div className="min-h-screen max-w-[430px] mx-auto bg-page-bg flex flex-col">
      {/* Header */}
      <div className="bg-blue-primary text-white px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <img src="/bchvideowatermarkredandwhite.png" alt="BCH" className="h-10 w-10 rounded-lg bg-white p-0.5 object-contain" />
          <h1 className="text-xl font-bold">Bharath Cycle Hub</h1>
        </div>
        <p className="text-xs opacity-80">Service Management</p>
      </div>

      <div className="flex-1 px-4 py-6">
        {/* === SELECT MODE === */}
        {mode === 'select' && (
          <div className="space-y-6">
            {/* Mechanic Grid */}
            <div>
              <h2 className="text-sm font-bold text-grey-text mb-3 uppercase tracking-wide">
                Tap your name
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {mechanics.length === 0 && fetchingUsers ? (
                  // Loading skeleton placeholders
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white shadow-sm animate-pulse">
                      <div className="w-14 h-14 rounded-full bg-grey-border" />
                      <div className="w-12 h-3 rounded bg-grey-border" />
                      <div className="w-8 h-2 rounded bg-grey-border" />
                    </div>
                  ))
                ) : mechanics.length === 0 ? (
                  <div className="col-span-3 text-center py-6 text-grey-muted text-sm">
                    No mechanics available. Check connection.
                  </div>
                ) : (
                  mechanics.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleMechanicTap(m)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white
                        shadow-sm active:scale-95 transition-transform cursor-pointer
                        border-2 border-transparent hover:border-blue-light"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.avatar}
                      </div>
                      <span className="text-sm font-semibold text-grey-text">{m.name}</span>
                      <span className="text-[10px] text-grey-muted capitalize">{m.level}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-grey-border" />
              <span className="text-xs text-grey-muted">or</span>
              <div className="flex-1 h-px bg-grey-border" />
            </div>

            {/* Staff PIN login */}
            <button
              onClick={() => {
                // Use first staff-like entry or show a generic staff login
                setSelectedMechanic({ name: 'Staff', phone: '+91-9876500010', avatar: 'S', color: '#6b7280' });
                setMode('mechanic_pin');
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm
                active:scale-[0.98] transition-transform cursor-pointer border-2 border-transparent
                hover:border-blue-light"
            >
              <div className="w-12 h-12 rounded-full bg-grey-bg flex items-center justify-center text-grey-muted">
                <Shield size={22} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-grey-text">Support Staff</p>
                <p className="text-xs text-grey-muted">Login with PIN</p>
              </div>
            </button>

            {/* Owner login */}
            <button
              onClick={() => {
                clearError();
                setPinError(null);
                if (ownerUser) {
                  setMode('owner_choose');
                } else {
                  setMode('owner_login');
                }
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm
                active:scale-[0.98] transition-transform cursor-pointer border-2 border-transparent
                hover:border-blue-light"
            >
              <div className="w-12 h-12 rounded-full bg-blue-primary/10 flex items-center justify-center text-blue-primary">
                <span className="text-lg font-bold">O</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-grey-text">Owner / Admin</p>
                <p className="text-xs text-grey-muted">{ownerUser ? 'Login with PIN or email' : 'Login with email'}</p>
              </div>
            </button>
          </div>
        )}

        {/* === MECHANIC PIN ENTRY === */}
        {mode === 'mechanic_pin' && selectedMechanic && (
          <div className="space-y-5">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-grey-muted hover:text-grey-text cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="flex flex-col items-center gap-2 mb-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ backgroundColor: selectedMechanic.color }}
              >
                {selectedMechanic.avatar}
              </div>
              <h2 className="text-lg font-bold text-grey-text">{selectedMechanic.name}</h2>
              <p className="text-xs text-grey-muted">Enter 4-digit PIN</p>
            </div>

            <PinPad
              onSubmit={handlePinSubmit}
              isLoading={isLoading}
              error={pinError}
            />
          </div>
        )}

        {/* === OWNER CHOOSE: PIN or EMAIL === */}
        {mode === 'owner_choose' && (
          <div className="space-y-5">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-grey-muted hover:text-grey-text cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center mb-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg mx-auto mb-2"
                style={{ backgroundColor: ownerUser?.color || '#2563eb' }}
              >
                {ownerUser?.avatar || 'O'}
              </div>
              <h2 className="text-lg font-bold text-grey-text">{ownerUser?.name || 'Owner'}</h2>
              <p className="text-xs text-grey-muted">Choose login method</p>
            </div>

            <button
              onClick={() => { setMode('owner_pin'); setPinError(null); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm
                active:scale-[0.98] transition-transform cursor-pointer border-2 border-transparent
                hover:border-blue-light"
            >
              <div className="w-12 h-12 rounded-full bg-blue-primary/10 flex items-center justify-center text-blue-primary text-xl font-bold">
                #
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-grey-text">Login with PIN</p>
                <p className="text-xs text-grey-muted">Enter 4-digit PIN</p>
              </div>
            </button>

            <button
              onClick={() => { setMode('owner_login'); clearError(); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm
                active:scale-[0.98] transition-transform cursor-pointer border-2 border-transparent
                hover:border-blue-light"
            >
              <div className="w-12 h-12 rounded-full bg-blue-primary/10 flex items-center justify-center text-blue-primary text-xl font-bold">
                @
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-grey-text">Login with Email</p>
                <p className="text-xs text-grey-muted">Use email & password</p>
              </div>
            </button>
          </div>
        )}

        {/* === OWNER PIN LOGIN === */}
        {mode === 'owner_pin' && ownerUser && (
          <div className="space-y-5">
            <button
              onClick={() => setMode('owner_choose')}
              className="flex items-center gap-1 text-sm text-grey-muted hover:text-grey-text cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="flex flex-col items-center gap-2 mb-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ backgroundColor: ownerUser.color }}
              >
                {ownerUser.avatar}
              </div>
              <h2 className="text-lg font-bold text-grey-text">{ownerUser.name}</h2>
              <p className="text-xs text-grey-muted">Enter 4-digit PIN</p>
            </div>

            <PinPad
              onSubmit={handleOwnerPinSubmit}
              isLoading={isLoading}
              error={pinError}
            />
          </div>
        )}

        {/* === OWNER EMAIL LOGIN === */}
        {mode === 'owner_login' && (
          <div className="space-y-5">
            <button
              onClick={() => ownerUser ? setMode('owner_choose') : goBack()}
              className="flex items-center gap-1 text-sm text-grey-muted hover:text-grey-text cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-grey-text">Owner Login</h2>
              <p className="text-xs text-grey-muted">Sign in with your email</p>
            </div>

            {error && (
              <div className="bg-red-light text-red-urgent text-sm p-3 rounded-xl text-center font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-grey-muted mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input w-full"
                  placeholder="owner@bharathcyclehub.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-grey-muted mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3.5 rounded-xl bg-blue-primary text-white font-bold text-base
                  active:scale-[0.98] transition-transform cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-center space-y-2">
        {!isStandalone && (
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-primary text-white text-xs font-bold active:scale-95 transition-transform cursor-pointer shadow-sm"
          >
            <Download size={14} /> Install App
          </button>
        )}
        {showInstallTip && (
          <div className="bg-grey-bg rounded-xl px-3 py-2.5 text-[11px] text-grey-text text-left mt-1">
            <p className="font-semibold mb-1">To install:</p>
            <p>Tap <strong>⋮</strong> (menu) → <strong>"Add to Home screen"</strong></p>
            <button onClick={() => setShowInstallTip(false)} className="text-blue-primary font-semibold mt-1 cursor-pointer">Got it</button>
          </div>
        )}
        <p className="text-[10px] text-grey-light">Bharath Cycle Hub &copy; 2026</p>
      </div>
    </div>
  );
}
