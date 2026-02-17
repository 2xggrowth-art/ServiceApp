import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday } from '../../lib/helpers';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { CheckCircle2 } from 'lucide-react';
import type { Job } from '../../types';

export default function Assign() {
  const { getDashboardStats, mechanics, reassignJob, showToast, jobs } = useApp();
  const stats = getDashboardStats();
  const activeJobs = stats.jobs.filter(j => j.status !== STATUS.COMPLETED);
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMech, setSelectedMech] = useState<string | null>(null);

  const today = getToday();

  const openReassign = (job: Job) => {
    setSelectedJob(job);
    setSelectedMech(null);
    setModalOpen(true);
  };

  const confirmReassign = () => {
    if (!selectedJob || !selectedMech) return;
    const mech = mechanics.find(m => m.id === selectedMech);
    if (!mech) {
      showToast('Mechanic not found', 'error');
      return;
    }
    reassignJob(selectedJob.id, selectedMech);
    showToast(`Reassigned to ${mech.name}`, 'success');
    setModalOpen(false);
  };

  if (activeJobs.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-success" />
        </div>
        <p className="text-[15px] font-semibold text-grey-text mb-1">All caught up</p>
        <p className="text-[13px] text-grey-muted">No active assignments to manage</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest">Today's Assignments</h3>
        <span className="text-[11px] font-semibold text-blue-primary bg-blue-light px-2 py-1 rounded-lg">{activeJobs.length} active</span>
      </div>

      {activeJobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          mechanic={mechMap[job.mechanicId]}
          actions={
            <Button size="sm" variant="outline" onClick={() => openReassign(job)}>
              🔄 Reassign
            </Button>
          }
        />
      ))}

      {/* Reassign Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Reassign Job">
        {selectedJob && (
          <>
            <div className="bg-grey-bg rounded-xl p-3 mb-4">
              <div className="text-[15px] font-bold">{selectedJob.customerName}</div>
              <div className="text-[13px] text-grey-muted">{selectedJob.bike}</div>
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
              <Button block disabled={!selectedMech} onClick={confirmReassign}>Reassign</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
