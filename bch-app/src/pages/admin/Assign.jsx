import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function Assign() {
  const { getDashboardStats, mechanics, reassignJob, showToast, jobs } = useApp();
  const stats = getDashboardStats();
  const activeJobs = stats.jobs.filter(j => j.status !== STATUS.COMPLETED);
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedMech, setSelectedMech] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const openReassign = (job) => {
    setSelectedJob(job);
    setSelectedMech(null);
    setModalOpen(true);
  };

  const confirmReassign = () => {
    if (!selectedJob || !selectedMech) return;
    reassignJob(selectedJob.id, selectedMech);
    const mech = mechanics.find(m => m.id === selectedMech);
    showToast(`Reassigned to ${mech?.name}`, 'success');
    setModalOpen(false);
  };

  if (activeJobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-grey-muted">No active assignments</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-3">Today's Assignments</h3>

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
              <div className="font-bold text-sm">{selectedJob.customerName}</div>
              <div className="text-xs text-grey-muted">{selectedJob.bike}</div>
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
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-light border-2 border-blue-primary' : 'bg-white border-2 border-transparent hover:bg-grey-bg'}`}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>
                      {m.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{m.name} {isCurrent && <span className="text-grey-muted">(current)</span>}</div>
                      <div className="text-xs text-grey-muted">{m.role} • {load} active jobs</div>
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
