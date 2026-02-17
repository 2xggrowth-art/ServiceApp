import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import SwitchMechanicSheet from './SwitchMechanicSheet';

export default function SwitchMechanicFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button — positioned above bottom nav */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-50 w-14 h-14 rounded-full bg-blue-primary text-white shadow-lg
          flex items-center justify-center
          active:scale-90 transition-transform cursor-pointer
          hover:bg-blue-700"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
          right: 'max(16px, calc(50% - 215px + 16px))', // 430px/2 = 215px
        }}
        title="Switch Mechanic"
      >
        <RefreshCw size={22} strokeWidth={2.5} />
      </button>

      <SwitchMechanicSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
