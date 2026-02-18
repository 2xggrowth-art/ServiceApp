import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { openWhatsApp } from '../../lib/whatsapp';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { Job } from '../../types';

export default function QualityCheck() {
  const { getDashboardStats, mechanics, qcPassJob, qcFailJob, showToast, isDataLoading } = useApp();
  const stats = getDashboardStats();
  const jobs = stats.jobs;
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [qcJob, setQcJob] = useState<Job | null>(null);

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-6 h-6 border-2 border-purple-qc border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-grey-muted">Loading QC jobs...</p>
      </div>
    );
  }

  const qcJobs = jobs.filter(j => j.status === STATUS.QUALITY_CHECK);

  const openQcModal = (job: Job) => { setQcJob(job); setQcModalOpen(true); };

  const handleQcPass = async () => {
    if (!qcJob) return;
    try {
      await qcPassJob(qcJob.id);
      showToast('QC passed! Bike ready for pickup.', 'success');
      // Notify customer via WhatsApp
      if (qcJob.customerPhone) {
        openWhatsApp(qcJob.customerPhone, 'ready', qcJob.customerName, qcJob.bike, qcJob.totalCost, qcJob.serviceId);
      }
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
      showToast('QC failed — sent back to mechanic.', 'error');
      setQcModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QC fail failed';
      showToast(msg, 'error');
    }
  };

  return (
    <div>
      {/* Header summary */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-grey-text uppercase tracking-wide">
          Quality Check
        </h2>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-light text-purple-qc">
          {qcJobs.length} pending
        </span>
      </div>

      {/* QC Jobs List */}
      {qcJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-grey-muted font-medium">No bikes pending QC</p>
          <p className="text-xs text-grey-light mt-1">All quality checks are done</p>
        </div>
      ) : (
        qcJobs.map(job => (
          <JobCard key={job.id} job={job} mechanic={mechMap[job.mechanicId]} hideTime
            actions={
              <Button size="sm" variant="warning" onClick={() => openQcModal(job)}>QC Check</Button>
            }
          />
        ))
      )}

      {/* QC Decision Modal */}
      <Modal open={qcModalOpen} onClose={() => setQcModalOpen(false)} title="Quality Check">
        {qcJob && (
          <>
            <div className="bg-grey-bg rounded-xl p-3 mb-4">
              <div className="font-bold text-sm">{qcJob.customerName}</div>
              <div className="text-xs text-grey-muted">{qcJob.bike}</div>
              {mechMap[qcJob.mechanicId] && (
                <div className="text-xs text-grey-muted mt-1">
                  Mechanic: <span className="font-medium text-grey-text">{mechMap[qcJob.mechanicId].name}</span>
                </div>
              )}
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
