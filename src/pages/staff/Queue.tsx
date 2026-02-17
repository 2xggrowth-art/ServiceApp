import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { Job } from '../../types';

export default function Queue() {
  const { getDashboardStats, mechanics, qcPassJob, qcFailJob, showToast, isDataLoading } = useApp();
  const stats = getDashboardStats();
  const jobs = stats.jobs;
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [filter, setFilter] = useState('all');
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [qcJob, setQcJob] = useState<Job | null>(null);

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading queue...</p>
      </div>
    );
  }

  const counts: Record<string, number> = {
    all: jobs.length,
    working: jobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
    parts: jobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
    ready: jobs.filter(j => [STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length,
  };

  let filtered = jobs;
  if (filter === 'working') filtered = jobs.filter(j => j.status === STATUS.IN_PROGRESS);
  else if (filter === 'parts') filtered = jobs.filter(j => j.status === STATUS.PARTS_PENDING);
  else if (filter === 'ready') filtered = jobs.filter(j => [STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status));

  const statusOrder = [STATUS.PARTS_PENDING, STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.RECEIVED, STATUS.QUALITY_CHECK, STATUS.READY, STATUS.COMPLETED];
  filtered = [...filtered].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'working', label: 'Working' },
    { id: 'parts', label: 'Parts Wait' },
    { id: 'ready', label: 'Ready' },
  ];

  const openQcModal = (job: Job) => { setQcJob(job); setQcModalOpen(true); };

  const handleQcPass = async () => {
    if (!qcJob) return;
    try {
      await qcPassJob(qcJob.id);
      showToast('QC passed! Bike ready for pickup.', 'success');
      setQcModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QC pass failed';
      showToast(msg, 'error');
    }
  };

  const handleQcFail = async () => {
    if (!qcJob) return;
    try {
      await qcFailJob(qcJob.id);
      showToast('QC failed - sent back to mechanic.', 'error');
      setQcModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QC fail failed';
      showToast(msg, 'error');
    }
  };

  return (
    <div>
      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5
              ${filter === f.id
                ? 'bg-blue-primary text-white'
                : 'bg-white text-grey-muted border border-grey-border hover:bg-grey-bg'}`}>
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-white/25' : 'bg-grey-bg'}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-grey-muted">No jobs match this filter</p>
        </div>
      ) : (
        filtered.map(job => (
          <JobCard key={job.id} job={job} mechanic={mechMap[job.mechanicId]}
            actions={
              job.status === STATUS.QUALITY_CHECK
                ? <Button size="sm" variant="warning" onClick={() => openQcModal(job)}>QC Check</Button>
                : null
            }
          />
        ))
      )}

      <p className="text-center text-xs text-grey-light mt-2">Swipe cards for quick actions</p>

      {/* QC Modal */}
      <Modal open={qcModalOpen} onClose={() => setQcModalOpen(false)} title="Quality Check">
        {qcJob && (
          <>
            <div className="bg-grey-bg rounded-xl p-3 mb-4">
              <div className="font-bold text-sm">{qcJob.customerName}</div>
              <div className="text-xs text-grey-muted">{qcJob.bike}</div>
            </div>

            {/* Before/After Photos */}
            {(qcJob.photoBefore || qcJob.photoAfter) && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-grey-muted mb-1">BEFORE</div>
                  {qcJob.photoBefore ? (
                    <img src={qcJob.photoBefore} alt="Before" loading="lazy" className="h-24 w-full object-cover rounded-xl" />
                  ) : (
                    <div className="h-24 border-2 border-dashed border-grey-border rounded-xl flex items-center justify-center text-grey-muted text-xs">No photo</div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-grey-muted mb-1">AFTER</div>
                  {qcJob.photoAfter ? (
                    <img src={qcJob.photoAfter} alt="After" loading="lazy" className="h-24 w-full object-cover rounded-xl" />
                  ) : (
                    <div className="h-24 border-2 border-dashed border-grey-border rounded-xl flex items-center justify-center text-grey-muted text-xs">No photo</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="danger" block onClick={handleQcFail}>❌ Fail</Button>
              <Button variant="success" block onClick={handleQcPass}>✅ Pass</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
