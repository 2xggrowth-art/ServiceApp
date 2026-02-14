import { useApp } from '../../context/AppContext';

const icons = { success: '✅', error: '❌', info: 'ℹ️' };
const styles = {
  success: 'bg-green-success',
  error: 'bg-red-urgent',
  info: 'bg-blue-primary',
};

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg flex items-center gap-2 ${styles[toast.type] || styles.info}`}
      style={{ animation: 'fadeInDown 0.3s ease-out' }}
    >
      <span>{icons[toast.type] || ''}</span>
      {toast.message}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
