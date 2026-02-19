import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday } from '../../lib/helpers';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { CheckCircle2, UserPlus, RefreshCw } from 'lucide-react';
import type { Job } from '../../types';

export default function Assign() {
  const { getDashboardStats, mechanics, reassignJob, showToast, jobs } = useApp();
  const stats = getDashboardStats();
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMech, setSelectedMech] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'assign' | 'reassign'>('assign');

  const today = getToday();

  // Split jobs into sections
  const unassigned = stats.jobs.filter(j => j.status === STATUS.RECEIVED && !j.mechanicId);
  const active = stats.jobs.filter(j =>
    j.status !== STATUS.COMPLETED && j.status !== STATUS.RECEIVED && j.mechanicId
  );
  // Also include assigned/received with mechanic (auto-assigned but not started)
  const assigned = stats.jobs.filter(j =>
    (j.status === STATUS.ASSIGNED || (j.status === STATUS.RECEIVED && j.mechanicId)) &&
    j.mechanicId
  );
  const inProgress = stats.jobs.filter(j =>
    [STATUS.IN_PROGRESS, STATUS.PARTS_PENDING, STATUS.QUALITY_CHECK, STATUS.READY].includes(j.status)
  );
  const completed = stats.jobs.filter(j => j.status === STATUS.COMPLETED);

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
    if (!mech) {
      showToast('Mechanic not found', 'error');
      return;
    }
    reassignJob(selectedJob.id, selectedMech);
    showToast(`${modalMode === 'assign' ? 'Assigned' : 'Reassigned'} to ${mech.name}`, 'success');
    setModalOpen(false);
  };

  const allEmpty = unassigned.length === 0 && assigned.length === 0 && inProgress.length === 0 && completed.length === 0;

  if (allEmpty) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-success" />
        </div>
        <p className="text-[15px] font-semibold text-grey-text mb-1">All caught up</p>
        <p className="text-[13px] text-grey-muted">No jobs today</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unassigned Jobs */}
      {unassigned.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-red-urgent uppercase tracking-widest">Unassigned</h3>
            <span className="text-[11px] font-bold text-white bg-red-urgent px-2 py-0.5 rounded-lg">{unassigned.length}</span>
          </div>
          {unassigned.map(job => (
            <JobCard
              key={job.id}
              job={job}
              actions={
                <Button size="sm" onClick={() => openAssign(job)}>
                  <UserPlus size={14} className="mr-1" /> Assign
                </Button>
              }
            />
          ))}
        </div>
      )}

      {/* Assigned (waiting to start) */}
      {assigned.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-blue-primary uppercase tracking-widest">Assigned</h3>
            <span className="text-[11px] font-semibold text-blue-primary bg-blue-light px-2 py-0.5 rounded-lg">{assigned.length}</span>
          </div>
          {assigned.map(job => (
            <JobCard
              key={job.id}
              job={job}
              mechanic={mechMap[job.mechanicId!]}
              actions={
                <Button size="sm" variant="outline" onClick={() => openReassign(job)}>
                  <RefreshCw size={13} className="mr-1" /> Reassign
                </Button>
              }
            />
          ))}
        </div>
      )}

      {/* In Progress / Active */}
      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-orange-action uppercase tracking-widest">In Progress</h3>
            <span className="text-[11px] font-semibold text-orange-action bg-orange-action/10 px-2 py-0.5 rounded-lg">{inProgress.length}</span>
          </div>
          {inProgress.map(job => (
            <JobCard
              key={job.id}
              job={job}
              mechanic={mechMap[job.mechanicId!]}
              actions={
                <Button size="sm" variant="outline" onClick={() => openReassign(job)}>
                  <RefreshCw size={13} className="mr-1" /> Reassign
                </Button>
              }
            />
          ))}
        </div>
      )}

      {/* Completed / Done */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-green-success uppercase tracking-widest">Done</h3>
            <span className="text-[11px] font-semibold text-green-success bg-green-light px-2 py-0.5 rounded-lg">{completed.length}</span>
          </div>
          {completed.map(job => (
            <JobCard
              key={job.id}
              job={job}
              mechanic={mechMap[job.mechanicId!]}
            />
          ))}
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
    </div>
  );
}
