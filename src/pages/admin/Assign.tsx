import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday, formatCurrency } from '../../lib/helpers';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Image, Volume2, Package, ChevronDown, Pencil, X, UserPlus, RefreshCw } from 'lucide-react';
import type { Job } from '../../types';

/** Parse photoBefore field: could be JSON array of URLs or single URL */
function parsePhotoUrls(val?: string): string[] {
  if (!val) return [];
  if (val.startsWith('[')) {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [val];
}

export default function Assign() {
  const { getDashboardStats, mechanics, reassignJob, showToast, jobs, isDataLoading, partsItems, editJob, serviceList, serviceItems } = useApp();
  const stats = getDashboardStats();
  const allJobs = stats.jobs;
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [filter, setFilter] = useState<string>('unassigned');
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Assign/Reassign modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMech, setSelectedMech] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'assign' | 'reassign'>('assign');

  const today = getToday();

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading queue...</p>
      </div>
    );
  }

  const counts: Record<string, number> = {
    unassigned: allJobs.filter(j => j.status === STATUS.RECEIVED).length,
    assigned: allJobs.filter(j => j.status === STATUS.ASSIGNED).length,
    working: allJobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
    parts: allJobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
    ready: allJobs.filter(j => [STATUS.QUALITY_CHECK, STATUS.READY].includes(j.status)).length,
    done: allJobs.filter(j => j.status === STATUS.COMPLETED).length,
  };

  let filtered = allJobs;
  if (filter === 'unassigned') filtered = allJobs.filter(j => j.status === STATUS.RECEIVED);
  else if (filter === 'assigned') filtered = allJobs.filter(j => j.status === STATUS.ASSIGNED);
  else if (filter === 'working') filtered = allJobs.filter(j => j.status === STATUS.IN_PROGRESS);
  else if (filter === 'parts') filtered = allJobs.filter(j => j.status === STATUS.PARTS_PENDING);
  else if (filter === 'ready') filtered = allJobs.filter(j => [STATUS.QUALITY_CHECK, STATUS.READY].includes(j.status));
  else if (filter === 'done') filtered = allJobs.filter(j => j.status === STATUS.COMPLETED);

  const statusOrder = [STATUS.RECEIVED, STATUS.ASSIGNED, STATUS.PARTS_PENDING, STATUS.IN_PROGRESS, STATUS.QUALITY_CHECK, STATUS.READY, STATUS.COMPLETED];
  filtered = [...filtered].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
  });

  const filters = [
    { id: 'unassigned', label: 'Unassigned', color: 'bg-red-urgent' },
    { id: 'assigned', label: 'Assigned', color: 'bg-blue-primary' },
    { id: 'working', label: 'Working', color: 'bg-amber-500' },
    { id: 'parts', label: 'Parts', color: 'bg-orange-action' },
    { id: 'ready', label: 'Ready', color: 'bg-emerald-500' },
    { id: 'done', label: 'Done', color: 'bg-green-success' },
  ];

  const openAssign = (job: Job) => {
    setSelectedJob(job);
    setSelectedMech(null);
    setModalMode('assign');
    setModalOpen(true);
  };

  const openReassign = (job: Job) => {
    setSelectedJob(job);
    setSelectedMech(null);
    setModalMode('reassign');
    setModalOpen(true);
  };

  const confirmAssign = () => {
    if (!selectedJob || !selectedMech) return;
    const mech = mechanics.find(m => m.id === selectedMech);
    if (!mech) { showToast('Mechanic not found', 'error'); return; }
    reassignJob(selectedJob.id, selectedMech);
    showToast(`${modalMode === 'assign' ? 'Assigned' : 'Reassigned'} to ${mech.name}`, 'success');
    setModalOpen(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-extrabold tracking-tight">Service Queue</h3>
        <p className="text-[11px] text-grey-muted mt-0.5">{allJobs.length} job{allJobs.length !== 1 ? 's' : ''} today</p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(filter === f.id ? 'unassigned' : f.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-2
              ${filter === f.id
                ? `${f.color} text-white shadow-sm`
                : 'bg-white text-grey-muted border border-grey-border/80 hover:bg-grey-bg active:scale-[0.97]'}`}>
            {f.label}
            <span className={`min-w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold ${
              filter === f.id ? 'bg-white/20' : 'bg-grey-bg'
            }`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-grey-bg mx-auto mb-3 flex items-center justify-center text-3xl">📋</div>
          <p className="text-grey-muted font-medium text-sm">No jobs match this filter</p>
          <p className="text-grey-light text-xs mt-1">Try selecting a different category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => {
            const isExpanded = expandedId === job.id;
            const photos = parsePhotoUrls(job.photoBefore);
            const audioUrl = job.photoAfter || '';
            const checkinParts = job.checkinParts || [];
            const laborCharge = job.laborCharge ?? 0;
            const isUnassigned = job.status === STATUS.RECEIVED && !job.mechanicId;
            const isDone = job.status === STATUS.COMPLETED;

            return (
              <div key={job.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  className="cursor-pointer"
                >
                  <JobCard
                    job={job}
                    mechanic={mechMap[job.mechanicId!]}
                    hideTime
                    actions={
                      isDone ? undefined :
                      isUnassigned ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); openAssign(job); }}>
                          <UserPlus size={14} className="mr-1" /> Assign
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openReassign(job); }}>
                          <RefreshCw size={13} className="mr-1" /> Reassign
                        </Button>
                      )
                    }
                  />
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="bg-gray-50 border-2 border-gray-100 border-t-0 rounded-b-2xl -mt-2 pt-4 px-4 pb-4 space-y-3">
                    {/* Edit button — only for unassigned (received) jobs */}
                    {job.status === STATUS.RECEIVED && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingJob(job); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-primary text-white text-xs font-bold cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <Pencil size={14} /> Edit Job Details
                      </button>
                    )}

                    {/* Photos */}
                    {photos.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Image size={12} /> Photos
                        </h5>
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((url, pi) => (
                            <div key={pi} className="aspect-square rounded-xl overflow-hidden border border-gray-200">
                              <img src={url} alt={`Photo ${pi + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio */}
                    {audioUrl && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Volume2 size={12} /> Voice Note
                        </h5>
                        <audio controls className="w-full h-10" preload="metadata">
                          <source src={audioUrl} />
                        </audio>
                      </div>
                    )}

                    {/* Parts from check-in */}
                    {checkinParts.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Package size={12} /> Parts
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {[...new Set(checkinParts)].map(name => {
                            const qty = checkinParts.filter(p => p === name).length;
                            const price = partsItems?.find(i => i.name === name)?.price || 0;
                            return (
                              <span key={name} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-medium text-black/70">
                                {name}{qty > 1 ? ` x${qty}` : ''}{price > 0 ? ` ₹${price * qty}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Labor charge */}
                    {laborCharge > 0 && (
                      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-200">
                        <span className="text-xs font-medium text-black/60">Labor Charge</span>
                        <span className="text-sm font-bold text-green-success">{formatCurrency(laborCharge)}</span>
                      </div>
                    )}

                    {/* Full issue text */}
                    {job.issue && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-1">Issue</h5>
                        <p className="text-xs text-black/70 leading-relaxed">{job.issue}</p>
                      </div>
                    )}

                    {/* Collapse hint */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-grey-muted font-medium pt-1 cursor-pointer"
                    >
                      <ChevronDown size={12} className="rotate-180" /> Tap to collapse
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign/Reassign Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'assign' ? 'Assign Job' : 'Reassign Job'}>
        {selectedJob && (
          <>
            <div className="bg-grey-bg rounded-xl p-3 mb-4">
              <div className="text-[15px] font-bold">{selectedJob.customerName}</div>
              <div className="text-[13px] text-grey-muted">{selectedJob.bike}</div>
              {selectedJob.serviceId && (
                <div className="text-[11px] font-mono text-blue-600/70 mt-0.5">{selectedJob.serviceId}</div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {mechanics.filter(m => m.status === 'on_duty').map(m => {
                const load = jobs.filter(j =>
                  j.mechanicId === m.id && j.date === today &&
                  [STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(j.status)
                ).length;
                const isCurrent = m.id === selectedJob.mechanicId;
                const isSelected = m.id === selectedMech;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMech(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150
                      ${isSelected
                        ? 'bg-blue-light border-2 border-blue-primary shadow-card'
                        : 'bg-white border-2 border-transparent hover:bg-grey-bg active:scale-[0.98]'}`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-card" style={{ background: m.color }}>
                      {m.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{m.name} {isCurrent && <span className="text-grey-muted text-[11px]">(current)</span>}</div>
                      <div className="text-[11px] text-grey-muted">{m.role} • {load} active jobs</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" block onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button block disabled={!selectedMech} onClick={confirmAssign}>
                {modalMode === 'assign' ? 'Assign' : 'Reassign'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Edit Job Modal */}
      {editingJob && (
        <EditJobModal
          job={editingJob}
          serviceList={serviceList}
          serviceItems={serviceItems}
          onSave={async (updates) => {
            try {
              await editJob(editingJob.id, updates);
              showToast('Job updated', 'success');
              setEditingJob(null);
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
            }
          }}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
}

// --- Edit Job Modal ---

interface EditJobModalProps {
  job: Job;
  serviceList: string[];
  serviceItems: { name: string; price: number }[];
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function EditJobModal({ job, serviceList, serviceItems, onSave, onClose }: EditJobModalProps) {
  const [customerName, setCustomerName] = useState(job.customerName);
  const [customerPhone, setCustomerPhone] = useState(job.customerPhone || '');
  const [bike, setBike] = useState(job.bike);
  const [issue, setIssue] = useState(job.issue || '');
  const [priority, setPriority] = useState(job.priority);
  const [selectedService, setSelectedService] = useState<string | null>(job.services?.[0] || null);
  const [totalCharge, setTotalCharge] = useState(job.laborCharge ? String(job.laborCharge) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!customerName.trim()) return;
    if (!bike.trim()) return;
    setSaving(true);
    try {
      await onSave({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        bike: bike.trim(),
        issue: issue.trim() || undefined,
        priority,
        services: selectedService ? [selectedService] : [],
        laborCharge: totalCharge ? Number(totalCharge) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-grey-border/50 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="text-base font-extrabold">Edit Job</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-grey-bg cursor-pointer transition-colors">
            <X size={18} className="text-grey-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Customer Name</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
              className="form-input" placeholder="Customer name" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Phone</label>
            <input type="tel" value={customerPhone} maxLength={10} inputMode="numeric"
              onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="form-input" placeholder="10-digit mobile" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Bike Model</label>
            <input value={bike} onChange={e => setBike(e.target.value)}
              className="form-input" placeholder="e.g. Hero Splendor Plus" />
          </div>
          {serviceList.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Service</label>
              <div className="grid grid-cols-2 gap-2">
                {serviceList.map(svc => {
                  const price = serviceItems?.find(i => i.name === svc)?.price || 0;
                  const isActive = selectedService === svc;
                  return (
                    <button key={svc} type="button"
                      onClick={() => setSelectedService(isActive ? null : svc)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                        ${isActive
                          ? 'border-blue-primary bg-blue-light'
                          : 'border-grey-border bg-white hover:bg-grey-bg active:scale-[0.98]'}`}>
                      <span className={`text-xs font-bold ${isActive ? 'text-blue-primary' : 'text-grey-text'}`}>{svc}</span>
                      {price > 0 && (
                        <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-primary/70' : 'text-grey-light'}`}>₹{price}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Total Charge (₹)</label>
            <input type="number" inputMode="numeric" value={totalCharge}
              onChange={e => setTotalCharge(e.target.value)}
              className="form-input" placeholder="Amount" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Issue / Notes</label>
            <textarea value={issue} onChange={e => setIssue(e.target.value)}
              rows={2} className="form-input resize-none" placeholder="Describe the issue..." />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-1.5">Priority</label>
            <div className="flex gap-2.5">
              <button onClick={() => setPriority('standard')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer
                  ${priority === 'standard'
                    ? 'border-blue-primary bg-blue-light text-blue-primary'
                    : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}>
                Standard
              </button>
              <button onClick={() => setPriority('urgent')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer
                  ${priority === 'urgent'
                    ? 'border-red-urgent bg-red-light text-red-urgent'
                    : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}>
                Urgent
              </button>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !customerName.trim() || !bike.trim()}
            className="w-full py-3.5 rounded-2xl bg-blue-primary text-white font-extrabold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
