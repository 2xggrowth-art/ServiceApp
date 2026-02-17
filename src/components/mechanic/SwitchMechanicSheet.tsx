import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import PinPad from '../../pages/auth/PinPad';
import { ArrowLeft, Check } from 'lucide-react';

export default function SwitchMechanicSheet({ isOpen, onClose }) {
  const auth = useAuth();
  const { mechanics, setCurrentMechanicId, showToast } = useApp();
  const [mechanicList, setMechanicList] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [pinError, setPinError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load mechanics list
  useEffect(() => {
    if (!isOpen) return;

    const fallbackList = mechanics.map(m => ({
      id: m.id, name: m.name, phone: m.phone,
      avatar: m.avatar, color: m.color, level: m.role,
    }));

    if (config.useSupabase && supabase && navigator.onLine) {
      supabase.rpc('get_active_mechanics').then(({ data }) => {
        if (data) {
          setMechanicList(data.map(m => ({
            id: m.user_id,
            name: m.user_name,
            phone: m.user_phone,
            avatar: m.user_avatar,
            color: m.user_color,
            level: m.user_mechanic_level,
          })));
        }
      }).catch(() => {
        setMechanicList(fallbackList);
      });
    } else {
      setMechanicList(fallbackList);
    }
  }, [isOpen, mechanics]);

  const handleMechanicTap = useCallback((mechanic) => {
    // In mock mode, switch immediately (no PIN needed)
    if (!config.useSupabase) {
      setCurrentMechanicId(mechanic.id);
      showToast(`Switched to ${mechanic.name}`, 'success');
      onClose();
      return;
    }

    // Supabase mode: require PIN
    setSelectedMechanic(mechanic);
    setPinError(null);
  }, [onClose, setCurrentMechanicId, showToast]);

  const handlePinSubmit = useCallback(async (pin) => {
    if (!selectedMechanic) return;
    setPinError(null);
    setIsLoading(true);

    try {
      await auth.switchMechanic(selectedMechanic.phone, pin);
      showToast(`Switched to ${selectedMechanic.name}`, 'success');
      onClose();
    } catch (err) {
      setPinError(err.message || 'Wrong PIN');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMechanic, auth, showToast, onClose]);

  const goBack = () => {
    setSelectedMechanic(null);
    setPinError(null);
  };

  if (!isOpen) return null;

  const currentId = config.useSupabase ? auth.appUser?.id : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-8 animate-[fadeIn_0.2s_ease-out]"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-grey-border rounded-full mx-auto mb-4" />

        {!selectedMechanic ? (
          <>
            <h3 className="text-base font-bold text-grey-text mb-4 text-center">
              Switch Mechanic
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {mechanicList.map(m => {
                const isCurrent = m.id === currentId;
                return (
                  <button
                    key={m.id}
                    onClick={() => !isCurrent && handleMechanicTap(m)}
                    disabled={isCurrent}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-transform
                      ${isCurrent
                        ? 'bg-green-light border-2 border-green-success opacity-70'
                        : 'bg-grey-bg active:scale-95 cursor-pointer border-2 border-transparent'
                      }`}
                  >
                    <div className="relative">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.avatar}
                      </div>
                      {isCurrent && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-success rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-grey-text">{m.name}</span>
                    <span className="text-[10px] text-grey-muted capitalize">{m.level}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-xl bg-grey-bg text-grey-muted font-semibold text-sm
                active:scale-[0.98] transition-transform cursor-pointer"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-grey-muted hover:text-grey-text cursor-pointer mb-4"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="flex flex-col items-center gap-2 mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg"
                style={{ backgroundColor: selectedMechanic.color }}
              >
                {selectedMechanic.avatar}
              </div>
              <h3 className="text-base font-bold text-grey-text">{selectedMechanic.name}</h3>
              <p className="text-xs text-grey-muted">Enter PIN to switch</p>
            </div>

            <PinPad
              onSubmit={handlePinSubmit}
              isLoading={isLoading}
              error={pinError}
            />
          </>
        )}
      </div>
    </div>
  );
}
