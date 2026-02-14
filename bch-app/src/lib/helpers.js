export function formatTime(min) {
  if (!min) return '--';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatCurrency(n) {
  if (n == null) return '--';
  return '₹' + n.toLocaleString('en-IN');
}

export function formatTimer(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function getTimeBlock() {
  return new Date().getHours() < 13 ? 'morning' : 'afternoon';
}

export function isWeekend() {
  return [0, 6].includes(new Date().getDay());
}
