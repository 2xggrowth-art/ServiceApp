import { useState, useCallback } from 'react';
import { Delete } from 'lucide-react';

export default function PinPad({ onSubmit, isLoading, error }) {
  const [pin, setPin] = useState('');

  const handleDigit = useCallback((digit) => {
    if (isLoading) return;
    setPin(prev => {
      const next = prev + digit;
      // Auto-submit on 4th digit
      if (next.length === 4) {
        // Slight delay so user sees the 4th dot
        setTimeout(() => onSubmit(next), 150);
      }
      if (next.length > 4) return prev;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);
      return next;
    });
  }, [isLoading, onSubmit]);

  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setPin(prev => prev.slice(0, -1));
    if (navigator.vibrate) navigator.vibrate(20);
  }, [isLoading]);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PIN dots */}
      <div className="flex gap-3 mb-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150
              ${i < pin.length
                ? 'bg-blue-primary border-blue-primary scale-110'
                : 'bg-transparent border-grey-border'
              }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-urgent text-sm font-semibold animate-[fadeIn_0.2s_ease-out]">
          {error}
        </p>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <p className="text-blue-primary text-sm font-semibold">
          Checking...
        </p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            disabled={isLoading || pin.length >= 4}
            className="h-16 rounded-2xl bg-grey-bg text-grey-text text-2xl font-bold
              active:bg-blue-light active:text-blue-primary active:scale-95
              transition-all duration-100 cursor-pointer
              disabled:opacity-40"
          >
            {n}
          </button>
        ))}

        {/* Bottom row: Clear, 0, Backspace */}
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="h-16 rounded-2xl text-grey-muted text-sm font-semibold
            active:bg-grey-bg transition-all duration-100 cursor-pointer"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={isLoading || pin.length >= 4}
          className="h-16 rounded-2xl bg-grey-bg text-grey-text text-2xl font-bold
            active:bg-blue-light active:text-blue-primary active:scale-95
            transition-all duration-100 cursor-pointer
            disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={isLoading || pin.length === 0}
          className="h-16 rounded-2xl text-grey-muted flex items-center justify-center
            active:bg-grey-bg transition-all duration-100 cursor-pointer
            disabled:opacity-40"
        >
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
}
