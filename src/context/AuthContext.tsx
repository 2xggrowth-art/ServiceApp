import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { setCallerId } from '../lib/authStore';

const AuthContext = createContext(null);

const SESSION_KEY = 'bch_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function loadStoredSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }) {
  const [appUser, setAppUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Restore session on mount + listen for auth state changes
  useEffect(() => {
    if (!config.useSupabase) {
      setIsLoading(false);
      return;
    }

    const stored = loadStoredSession();
    if (stored) {
      setAppUser(stored);
      setCallerId(stored.id || null);
    }
    setIsLoading(false);

    // Listen for auth state changes (token refresh, sign out, etc.)
    // This prevents unhandled errors from Supabase's auto-refresh when offline
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed successfully — no action needed
      } else if (event === 'SIGNED_OUT') {
        setAppUser(null);
        setCallerId(null);
        saveSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Owner/Admin login via Supabase Auth (email + password)
  const loginWithEmail = useCallback(async (email, password) => {
    if (!supabase) return;
    setError(null);
    setIsLoading(true);

    try {
      // Try Supabase Auth first for session
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Fetch user by auth_user_id, fallback to email if not linked
      let users;
      const { data: byAuth, error: authQueryErr } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (!authQueryErr && byAuth) {
        users = byAuth;
      } else {
        // Fallback: find by email (auth_user_id not linked yet)
        const { data: byEmail, error: emailErr } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        if (emailErr || !byEmail) {
          throw new Error('User account not found. Contact admin.');
        }
        users = byEmail;
      }

      const user = {
        id: users.id,
        name: users.name,
        role: users.role,
        email: users.email,
        avatar: users.avatar,
        color: users.color,
        mechanicLevel: users.mechanic_level,
        authUserId: authData.user.id,
      };

      setAppUser(user);
      setCallerId(user.id);
      saveSession(user);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mechanic/Staff login via PIN verification
  const loginWithPin = useCallback(async (phone, pin) => {
    if (!supabase) return;
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_pin', {
        p_phone: phone,
        p_pin: pin,
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error('Wrong PIN. Try again.');
      }

      const row = data[0];
      const user = {
        id: row.user_id,
        name: row.user_name,
        role: row.user_role,
        phone,
        avatar: row.user_avatar,
        color: row.user_color,
        mechanicLevel: row.user_mechanic_level,
      };

      setAppUser(user);
      setCallerId(user.id);
      saveSession(user);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fast switch mechanic (shared device) — verify PIN then swap identity
  const switchMechanic = useCallback(async (phone, pin) => {
    await loginWithPin(phone, pin);
  }, [loginWithPin]);

  // Logout
  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setAppUser(null);
    setCallerId(null);
    saveSession(null);
    setError(null);
  }, []);

  // Session timeout — auto-logout after inactivity
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!config.useSupabase || !appUser || isLocked) return;

    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT_MS) {
        setIsLocked(true); // Soft lock instead of full logout
      }
    }, 60000); // check every minute

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [appUser, isLocked]);

  // Unlock session with PIN (mechanic/staff)
  const unlock = useCallback(async (pin: string) => {
    if (!appUser?.phone) throw new Error('No phone on session');
    await loginWithPin(appUser.phone, pin);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  }, [appUser, loginWithPin]);

  // Unlock session with email/password (admin/owner)
  const unlockAdmin = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  }, [loginWithEmail]);

  const value = {
    appUser,
    role: appUser?.role || null,
    currentMechanicId: appUser?.role === 'mechanic' ? appUser.id : null,
    isAuthenticated: !!appUser,
    isLoading,
    isLocked,
    error,
    loginWithEmail,
    loginWithPin,
    switchMechanic,
    logout,
    unlock,
    unlockAdmin,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
