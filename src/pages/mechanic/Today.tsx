import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday } from '../../lib/helpers';
import { haptic } from '../../lib/haptic';
import JobCard from '../../components/ui/JobCard';
import Card from '../../components/ui/Card';

export default function Today() {
  const { getMechanicJobs, currentMechanicId, pickJob, startJob, reassignJob, showToast, jobs, mechanics } = useApp();
  const navigate = useNavigate();
  const myJobs = getMechanicJobs(currentMechanicId);
  const today = getToday();

  // --- Section data ---
  const allMyJobs = myJobs.filter(j => j.mechanicId === currentMechanicId);

  const doneStatuses = [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK];

  // In Progress: jobs currently being worked on (in_progress + parts_pending)
  const inProgressJobs = allMyJobs.filter(j => j.status === STATUS.IN_PROGRESS || j.status === STATUS.PARTS_PENDING);

  // Pending: assigned/received jobs not yet started (includes unassigned available to pick)
  const pendingAssigned = allMyJobs.filter(j => [STATUS.RECEIVED, STATUS.ASSIGNED].includes(j.status));
  const unassignedJobs = myJobs
    .filter(j => j.status === STATUS.RECEIVED && !j.mechanicId)
    .sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const pendingJobs = [...pendingAssigned, ...unassignedJobs];

  // Takeover: other mechanics' active jobs
  const takeoverJobs = jobs.filter(j =>
    j.mechanicId &&
    j.mechanicId !== currentMechanicId &&
    !doneStatuses.includes(j.status) &&
    (j.date === today || j.date < today)
  );

  // Done
  const doneJobs = allMyJobs.filter(j => doneStatuses.includes(j.status));

  // Progress bar
  const done = doneJobs.length;
  const total = allMyJobs.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Check if mechanic already has an active job (blocks starting another)
  const hasActiveJob = myJobs.some(j => j.mechanicId === currentMechanicId && j.status === STATUS.IN_PROGRESS);

  // --- Collapsible section state (In Progress open by default) ---
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    inProgress: true,
    pending: true,
    takeover: false,
    done: false,
  });
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // --- Handlers ---
  const handlePick = async (jobId) => {
    haptic(80);
    try {
      await pickJob(jobId);
      showToast('Job picked! Timer started.', 'success');
      navigate('/mechanic/active');
    } catch {
      // Error toast shown by context
    }
  };

  const handleStart = async (jobId) => {
    haptic(80);
    try {
      await startJob(jobId);
      showToast('Job started! Timer running.', 'info');
      navigate('/mechanic/active');
    } catch {
      // Error toast shown by context
    }
  };

  const handleTakeover = async (jobId) => {
    if (!currentMechanicId) return;
    haptic(80);
    try {
      await reassignJob(jobId, currentMechanicId);
      showToast('Job taken over! It\'s now yours.', 'success');
    } catch {
      showToast('Failed to take over job', 'error');
    }
  };

  /** Full-width chunky action buttons */
  const getActions = (job) => {
    if (job.mechanicId && job.mechanicId !== currentMechanicId) {
      return (
        <button
          onClick={() => handleTakeover(job.id)}
          className="w-full min-h-14 bg-orange-action text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
        >
          🔄 TAKE OVER
        </button>
      );
    }
    if (job.status === STATUS.RECEIVED && !job.mechanicId) {
      return hasActiveJob ? (
        <button
          disabled
          className="w-full min-h-14 bg-gray-300 text-gray-500 text-base font-bold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          🚫 Finish active job first
        </button>
      ) : (
        <button
          onClick={() => handlePick(job.id)}
          className="w-full min-h-16 bg-green-success text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform shadow-md"
        >
          🎯 PICK & START
        </button>
      );
    }
    if (job.status === STATUS.ASSIGNED) {
      return hasActiveJob ? (
        <button
          disabled
          className="w-full min-h-14 bg-gray-300 text-gray-500 text-base font-bold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          🚫 Finish active job first
        </button>
      ) : (
        <button
          onClick={() => handleStart(job.id)}
          className="w-full min-h-16 bg-blue-primary text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform shadow-md"
        >
          ▶ START JOB
        </button>
      );
    }
    if (job.status === STATUS.IN_PROGRESS) {
      return (
        <button
          onClick={() => { haptic(); navigate('/mechanic/active'); }}
          className="w-full min-h-14 bg-blue-primary text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
        >
          ⏰ VIEW ACTIVE JOB
        </button>
      );
    }
    if (job.status === STATUS.PARTS_PENDING) {
      return (
        <button
          onClick={() => { haptic(); navigate('/mechanic/active'); }}
          className="w-full min-h-14 bg-orange-action text-white text-base font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
        >
          🔧 VIEW JOB
        </button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'var(--font-mechanic)' }}>
      {/* Progress bar */}
      <Card className="!p-5">
        <div className="flex justify-between items-end mb-3">
          <span className="text-base font-bold text-black">Today's Progress</span>
          <span className="text-2xl font-bold text-black">{done}/{total}</span>
        </div>
        <div className="h-8 bg-gray-200 rounded-2xl overflow-hidden relative">
          <div
            className="h-full bg-green-success rounded-2xl transition-all duration-700 flex items-center justify-end pr-3"
            style={{ width: `${Math.max(pct, 8)}%` }}
          >
            {pct > 15 && (
              <span className="text-white text-sm font-bold">{pct}%</span>
            )}
          </div>
          {pct <= 15 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-black">{pct}%</span>
          )}
        </div>
      </Card>

      {/* 1. In Progress */}
      {inProgressJobs.length > 0 && (
        <CollapsibleSection
          emoji="🔧" label="In Progress" count={inProgressJobs.length}
          color="text-blue-primary" open={openSections.inProgress} onToggle={() => toggle('inProgress')}
        >
          {inProgressJobs.map(job => (
            <JobCard key={job.id} job={job} hideTime actions={getActions(job)} />
          ))}
        </CollapsibleSection>
      )}

      {/* 2. Pending */}
      {pendingJobs.length > 0 && (
        <CollapsibleSection
          emoji="⏳" label="Pending" count={pendingJobs.length}
          color="text-orange-action" open={openSections.pending} onToggle={() => toggle('pending')}
        >
          {pendingJobs.map(job => (
            <JobCard key={job.id} job={job} hideTime actions={getActions(job)} />
          ))}
        </CollapsibleSection>
      )}

      {/* 3. Takeover */}
      {takeoverJobs.length > 0 && (
        <CollapsibleSection
          emoji="🔄" label="Takeover" count={takeoverJobs.length}
          color="text-orange-action" open={openSections.takeover} onToggle={() => toggle('takeover')}
        >
          {takeoverJobs.map(job => {
            const mech = mechanics.find(m => m.id === job.mechanicId);
            return <JobCard key={job.id} job={job} hideTime mechanic={mech} actions={getActions(job)} />;
          })}
        </CollapsibleSection>
      )}

      {/* 4. Done */}
      {doneJobs.length > 0 && (
        <CollapsibleSection
          emoji="✅" label="Done" count={doneJobs.length}
          color="text-green-success" open={openSections.done} onToggle={() => toggle('done')}
        >
          {doneJobs.map(job => (
            <JobCard key={job.id} job={job} hideTime dimCompleted />
          ))}
        </CollapsibleSection>
      )}

      {/* Empty state */}
      {myJobs.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-bold text-black">All Done!</p>
          <p className="text-base text-black/60 mt-2">Check back later for new jobs</p>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ emoji, label, count, color, open, onToggle, children }: {
  emoji: string; label: string; count: number; color: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between text-base font-bold ${color} cursor-pointer py-2 bg-transparent border-none outline-none`}
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span> {label} ({count})
        </span>
        <span className={`text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
