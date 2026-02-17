import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function LockScreen() {
  const auth = useAuth();
  const user = auth.appUser;
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const [pin, setPin] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');

  const handlePinUnlock = async () => {
    if (pin.length !== 4) return;
    setUnlocking(true);
    setError('');
    try {
      await auth.unlock(pin);
    } catch {
      setError('Wrong PIN. Try again.');
      setPin('');
    } finally {
      setUnlocking(false);
    }
  };

  const handleAdminUnlock = async () => {
    if (!email || !password) return;
    setUnlocking(true);
    setError('');
    try {
      await auth.unlockAdmin(email, password);
    } catch {
      setError('Invalid credentials. Try again.');
      setPassword('');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSwitchUser = () => {
    auth.logout();
  };

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-6">
      <div className="w-full max-w-[340px] text-center space-y-6">
        {/* User avatar */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: user?.color || '#2563eb' }}
          >
            {user?.avatar || '?'}
          </div>
          <h2 className="text-lg font-bold">{user?.name || 'User'}</h2>
          <p className="text-sm text-grey-muted">Session locked due to inactivity</p>
        </div>

        {error && (
          <p className="text-sm text-red-urgent font-semibold">{error}</p>
        )}

        {/* PIN unlock for mechanic/staff */}
        {!isAdminOrOwner && (
          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              className="form-input text-center text-xl tracking-[0.5em] font-mono"
              autoFocus
            />
            <Button size="lg" block onClick={handlePinUnlock} disabled={pin.length !== 4 || unlocking}>
              {unlocking ? 'Unlocking...' : 'Unlock'}
            </Button>
          </div>
        )}

        {/* Email/password unlock for admin/owner */}
        {isAdminOrOwner && (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="form-input"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="form-input"
              autoFocus
            />
            <Button size="lg" block onClick={handleAdminUnlock} disabled={!email || !password || unlocking}>
              {unlocking ? 'Unlocking...' : 'Unlock'}
            </Button>
          </div>
        )}

        <button
          onClick={handleSwitchUser}
          className="text-sm text-grey-muted underline cursor-pointer hover:text-grey-text"
        >
          Switch User
        </button>
      </div>
    </div>
  );
}
