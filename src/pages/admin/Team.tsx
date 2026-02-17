import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import { config } from '../../lib/config';
import { userService } from '../../services/userService';
import { performanceService } from '../../services/performanceService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { LeaderboardEntry } from '../../types/performance';

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#854d0e'];

interface MemberForm {
  name: string;
  phone: string;
  role: 'mechanic' | 'staff';
  mechanicLevel: 'senior' | 'junior' | '';
  color: string;
  pin: string;
}

type Period = '7d' | '30d' | '90d';
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
const PERIOD_LABELS: Record<Period, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' };

function getDateRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - PERIOD_DAYS[period]);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export default function Team() {
  const { mechanics, getDashboardStats, showToast, refreshData } = useApp();
  const auth = useAuth() as { appUser?: { id: string; name: string } } | null;
  const stats = getDashboardStats();
  const [togglingId, setTogglingId] = useState(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(config.useSupabase);
  const [period, setPeriod] = useState<Period>('30d');

  // Load leaderboard from Supabase with period filter
  useEffect(() => {
    if (!config.useSupabase || !navigator.onLine) { setLbLoading(false); return; }
    let cancelled = false;
    setLbLoading(true);

    const { from, to } = getDateRange(period);
    performanceService.getTeamLeaderboard(from, to)
      .then(data => { if (!cancelled) setLeaderboard(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLbLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  // Local fallback perf data
  const perfData = mechanics.map(m => {
    const mechJobs = stats.jobs.filter(j => j.mechanicId === m.id);
    const done = mechJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
    const total = mechJobs.length;
    const onTime = mechJobs.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;
    const avgTime = mechJobs.filter(j => j.actualMin).length > 0
      ? Math.round(mechJobs.filter(j => j.actualMin).reduce((sum, j) => sum + j.actualMin, 0) / mechJobs.filter(j => j.actualMin).length)
      : 0;
    return { ...m, done, total, onTimeRate: done > 0 ? Math.round((onTime / done) * 100) : 0, avgTime };
  }).sort((a, b) => b.done - a.done);

  // Merge leaderboard data with mechanic list
  const rankedData = leaderboard.length > 0
    ? leaderboard.map(lb => {
        const m = mechanics.find(mech => mech.id === lb.mechanicId);
        return {
          id: lb.mechanicId,
          name: lb.mechanicName,
          avatar: lb.mechanicAvatar,
          color: lb.mechanicColor,
          role: m?.role || 'mechanic',
          status: m?.status || 'on_duty',
          done: lb.jobsCompleted,
          onTimeRate: lb.onTimePct,
          avgTime: lb.avgMin ? Math.round(lb.avgMin) : 0,
          revenue: lb.revenue,
          total: perfData.find(p => p.id === lb.mechanicId)?.total ?? 0,
        };
      })
    : perfData.map(m => ({ ...m, revenue: 0 }));

  // Add/Edit member modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm: MemberForm = { name: '', phone: '', role: 'mechanic', mechanicLevel: 'junior', color: AVATAR_COLORS[0], pin: '' };
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setMemberForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: { id: string; name: string; phone?: string; role: string; color: string }) => {
    setEditingId(m.id);
    const mech = mechanics.find(mc => mc.id === m.id);
    setMemberForm({
      name: m.name,
      phone: (mech as Record<string, unknown>)?.phone as string || m.phone || '',
      role: 'mechanic',
      mechanicLevel: (m.role === 'senior' ? 'senior' : 'junior') as 'senior' | 'junior',
      color: m.color || AVATAR_COLORS[0],
      pin: '',
    });
    setShowModal(true);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name.trim()) { showToast('Enter name', 'error'); return; }
    if (!config.useSupabase) { showToast('Supabase not configured', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        name: memberForm.name.trim(),
        phone: memberForm.phone.trim(),
        role: memberForm.role,
        mechanicLevel: memberForm.role === 'mechanic' ? memberForm.mechanicLevel || 'junior' : null,
        avatar: memberForm.name.trim().charAt(0).toUpperCase(),
        color: memberForm.color,
        pin: memberForm.pin || undefined,
      };

      if (editingId) {
        await userService.updateUser(editingId, payload);
        showToast(`${payload.name} updated`, 'success');
      } else {
        await userService.createUser(payload);
        showToast(`${payload.name} added to team`, 'success');
      }
      setShowModal(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!editingId || !config.useSupabase) return;
    const name = memberForm.name;
    setSaving(true);
    try {
      await userService.deactivateUser(editingId);
      showToast(`${name} removed from team`, 'success');
      setShowModal(false);
    } catch {
      showToast('Failed to remove member', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Owner PIN change
  const [ownerPin, setOwnerPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const handleChangeOwnerPin = async () => {
    if (ownerPin.length !== 4) { showToast('PIN must be 4 digits', 'error'); return; }
    if (!auth?.appUser?.id || !config.useSupabase) return;
    setSavingPin(true);
    try {
      await userService.updateUser(auth.appUser.id, { pin: ownerPin });
      showToast('Your PIN updated', 'success');
      setOwnerPin('');
    } catch {
      showToast('Failed to update PIN', 'error');
    } finally {
      setSavingPin(false);
    }
  };

  const handleToggleStatus = async (mechanic) => {
    const newStatus = mechanic.status === 'on_duty' ? 'off_duty' : 'on_duty';
    setTogglingId(mechanic.id);
    try {
      if (config.useSupabase) {
        await userService.updateMechanicStatus(mechanic.id, newStatus);
      }
      showToast(`${mechanic.name} is now ${newStatus === 'on_duty' ? 'On Duty' : 'Off Duty'}`, 'success');
      // Refresh mechanics list so toggle reflects immediately
      refreshData();
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnlock = async (userId: string, name: string) => {
    try {
      await userService.unlockUser(userId);
      showToast(`${name} unlocked`, 'success');
    } catch {
      showToast('Failed to unlock user', 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* Period Toggle — iOS-style pill selector */}
      <div className="flex gap-1 bg-grey-bg rounded-2xl p-1.5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer
              ${period === p
                ? 'bg-white text-grey-text shadow-card'
                : 'text-grey-muted hover:text-grey-text'}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">
        {leaderboard.length > 0 ? `${PERIOD_LABELS[period]} Leaderboard` : 'Weekly Performance'}
      </h3>
      {lbLoading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-grey-muted">Loading leaderboard...</p>
        </div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          {rankedData.length >= 3 && (
            <Card elevated className="!py-6">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd place */}
                <div className="text-center w-20">
                  <div className="w-11 h-11 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white text-sm font-bold ring-2 ring-grey-border shadow-card"
                    style={{ background: rankedData[1].color }}>
                    {rankedData[1].avatar}
                  </div>
                  <div className="text-[11px] font-bold truncate">{rankedData[1].name}</div>
                  <div className="text-[10px] text-grey-muted">{rankedData[1].done} jobs</div>
                  <div className="h-12 bg-grey-bg rounded-t-lg mt-1.5 flex items-center justify-center">
                    <span className="text-sm">🥈</span>
                  </div>
                </div>
                {/* 1st place — taller */}
                <div className="text-center w-20">
                  <div className="w-13 h-13 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white text-sm font-bold ring-2 ring-yellow-400 shadow-card"
                    style={{ background: rankedData[0].color, width: '3.25rem', height: '3.25rem' }}>
                    {rankedData[0].avatar}
                  </div>
                  <div className="text-[11px] font-bold truncate">{rankedData[0].name}</div>
                  <div className="text-[10px] text-grey-muted">{rankedData[0].done} jobs</div>
                  <div className="h-20 bg-blue-light rounded-t-lg mt-1.5 flex items-center justify-center">
                    <span className="text-lg">🥇</span>
                  </div>
                </div>
                {/* 3rd place */}
                <div className="text-center w-20">
                  <div className="w-11 h-11 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white text-sm font-bold ring-2 ring-grey-border shadow-card"
                    style={{ background: rankedData[2].color }}>
                    {rankedData[2].avatar}
                  </div>
                  <div className="text-[11px] font-bold truncate">{rankedData[2].name}</div>
                  <div className="text-[10px] text-grey-muted">{rankedData[2].done} jobs</div>
                  <div className="h-8 bg-grey-bg rounded-t-lg mt-1.5 flex items-center justify-center">
                    <span className="text-sm">🥉</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Bar chart for rank 4+ (or all if < 3) */}
          {(rankedData.length < 3 ? rankedData : rankedData.slice(3)).length > 0 && (
            <Card>
              <div className="space-y-3">
                {(rankedData.length < 3 ? rankedData : rankedData.slice(3)).map((m, i) => {
                  const rank = rankedData.length < 3 ? i : i + 3;
                  const maxJobs = Math.max(...rankedData.map(r => r.done), 1);
                  const pct = Math.max((m.done / maxJobs) * 100, m.done > 0 ? 15 : 0);
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold w-5 text-center text-grey-muted">
                        #{rank + 1}
                      </span>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: m.color }}
                      >
                        {m.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold truncate">{m.name}</span>
                          <span className="text-[10px] text-grey-muted">{m.done} jobs</span>
                        </div>
                        <div className="h-2 bg-grey-bg rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(pct, 3)}%`, background: m.done > 0 ? '#6b7280' : '#e5e7eb' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Workload Balance */}
      <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">Today's Workload</h3>
      <Card>
        <div className="space-y-3">
          {perfData.map(m => {
            const loadPct = m.total > 0 ? (m.total / 5) * 100 : 0;
            const barColor = loadPct > 80 ? '#dc2626' : loadPct > 50 ? '#ea580c' : '#2563eb';
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: m.color }}
                >
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate">{m.name}</span>
                    <span className={`text-[10px] font-bold ${m.total > 0 ? 'text-grey-text' : 'text-grey-light'}`}>
                      {m.total > 0 ? `${m.total} jobs` : 'Idle'}
                    </span>
                  </div>
                  <div className="h-2 bg-grey-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(Math.min(loadPct, 100), m.total > 0 ? 8 : 0)}%`,
                        background: m.total > 0 ? barColor : 'transparent',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Button variant="outline" block onClick={() => showToast('Workload rebalanced!', 'success')}>
        ⚖️ Auto-Rebalance Workload
      </Button>

      {/* Team Members */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest">Team Members</h3>
        <button onClick={openAdd}
          className="text-[11px] font-bold text-white bg-admin-dark px-3 py-1.5 rounded-xl cursor-pointer hover:bg-admin-surface transition-colors">
          + Add Member
        </button>
      </div>
      <Card className="divide-y divide-grey-border/50 overflow-hidden !p-0">
        {rankedData.map(m => {
          const mechanic = mechanics.find(mech => mech.id === m.id);
          const isLocked = mechanic && 'lockedUntil' in mechanic && (mechanic as Record<string, unknown>).lockedUntil;
          const isOnDuty = m.status === 'on_duty';
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-admin-card-hover transition-colors duration-150">
              <div onClick={() => openEdit(m)}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 cursor-pointer ring-2 ring-white shadow-card transition-transform active:scale-95"
                style={{ background: m.color }}>
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(m)}>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">{m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                    m.role === 'senior' ? 'bg-green-light text-green-success' : 'bg-grey-bg text-grey-muted'
                  }`}>{m.role}</span>
                  {isLocked && <span className="text-[10px] text-red-urgent font-bold">LOCKED</span>}
                </div>
                <div className="text-[11px] text-grey-muted mt-0.5">
                  {m.done} done · On-time: {Math.round(m.onTimeRate)}%
                  {m.avgTime > 0 && ` · Avg: ${m.avgTime}min`}
                  {m.revenue > 0 && ` · ${formatCurrency(m.revenue)}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isLocked && config.useSupabase && (
                  <button onClick={() => handleUnlock(m.id, m.name)}
                    className="text-[10px] text-blue-primary font-bold px-2 py-1 rounded-lg border border-blue-primary cursor-pointer">
                    Unlock
                  </button>
                )}
                <button
                  onClick={() => handleToggleStatus(m)}
                  disabled={togglingId === m.id}
                  className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer
                    ${isOnDuty ? 'bg-green-success' : 'bg-grey-border'}
                    ${togglingId === m.id ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform
                    ${isOnDuty ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Owner PIN Change */}
      {config.useSupabase && auth?.appUser && (
        <>
          <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">My Settings</h3>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wide block mb-1.5">Change My PIN</label>
                <input type="password" inputMode="numeric" maxLength={4}
                  value={ownerPin} onChange={e => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="New 4-digit PIN" className="form-input" />
              </div>
              <button onClick={handleChangeOwnerPin} disabled={savingPin || ownerPin.length !== 4}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer mt-5
                  ${ownerPin.length === 4 ? 'bg-blue-primary' : 'bg-grey-border'}`}>
                {savingPin ? '...' : 'Save'}
              </button>
            </div>
          </Card>
        </>
      )}

      {/* Add / Edit Member Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Member' : 'Add New Member'}>
        <div className="space-y-3">
          <FormField label="Name">
            <input value={memberForm.name} onChange={e => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter name" className="form-input" />
          </FormField>

          <FormField label="Phone">
            <input type="tel" value={memberForm.phone} maxLength={10} inputMode="numeric"
              onChange={e => setMemberForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="10-digit mobile number" className="form-input" />
          </FormField>

          <FormField label="Role">
            <div className="flex gap-2">
              <button onClick={() => setMemberForm(prev => ({ ...prev, role: 'mechanic', mechanicLevel: prev.mechanicLevel || 'junior' }))}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                  ${memberForm.role === 'mechanic' ? 'border-blue-primary bg-blue-light text-blue-primary' : 'border-grey-border text-grey-muted'}`}>
                Mechanic
              </button>
              <button onClick={() => setMemberForm(prev => ({ ...prev, role: 'staff', mechanicLevel: '' }))}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                  ${memberForm.role === 'staff' ? 'border-blue-primary bg-blue-light text-blue-primary' : 'border-grey-border text-grey-muted'}`}>
                Staff
              </button>
            </div>
          </FormField>

          {memberForm.role === 'mechanic' && (
            <FormField label="Level">
              <div className="flex gap-2">
                <button onClick={() => setMemberForm(prev => ({ ...prev, mechanicLevel: 'junior' }))}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                    ${memberForm.mechanicLevel === 'junior' ? 'border-orange-action bg-orange-light text-orange-action' : 'border-grey-border text-grey-muted'}`}>
                  Junior
                </button>
                <button onClick={() => setMemberForm(prev => ({ ...prev, mechanicLevel: 'senior' }))}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                    ${memberForm.mechanicLevel === 'senior' ? 'border-green-success bg-green-light text-green-success' : 'border-grey-border text-grey-muted'}`}>
                  Senior
                </button>
              </div>
            </FormField>
          )}

          <FormField label="Color">
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setMemberForm(prev => ({ ...prev, color: c }))}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-transform ${memberForm.color === c ? 'ring-2 ring-offset-2 ring-blue-primary scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </FormField>

          <FormField label={editingId ? 'New PIN (leave blank to keep current)' : 'PIN (4 digits)'}>
            <input type="password" inputMode="numeric" maxLength={4}
              value={memberForm.pin} onChange={e => setMemberForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
              placeholder="••••" className="form-input" />
          </FormField>

          <div className="pt-2 space-y-2">
            <Button size="lg" block onClick={handleSaveMember} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add to Team'}
            </Button>
            {editingId && (
              <button onClick={handleDeactivate} disabled={saving}
                className="w-full py-2 text-sm font-semibold text-red-urgent cursor-pointer">
                Remove from Team
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
