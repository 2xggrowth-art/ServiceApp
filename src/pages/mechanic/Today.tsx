import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday, formatCurrency } from '../../lib/helpers';
import { haptic } from '../../lib/haptic';
import JobCard from '../../components/ui/JobCard';
import Card from '../../components/ui/Card';
import { Wrench, Clock, RefreshCw, CheckCircle, Play, Eye, ChevronDown, Ban, ArrowRightLeft } from 'lucide-react';
import type { Job } from '../../types';

/** Parse photoBefore field: could be JSON array of URLs or single URL */
function parsePhotoUrls(val?: string): string[] {
  if (!val) return [];
  if (val.startsWith('[')) {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [val];
}

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
    .filter(j => j.status === STATUS.RECEIVED && !j.mechanicId);
  const pendingJobs = [...pendingAssigned, ...unassignedJobs]
    .sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // Takeover: only other mechanics' actively worked jobs (in_progress / parts_pending)
  const takeoverJobs = jobs.filter(j =>
    j.mechanicId &&
    j.mechanicId !== currentMechanicId &&
    [STATUS.IN_PROGRESS, STATUS.PARTS_PENDING].includes(j.status) &&
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

  // --- Collapsible section state ---
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    inProgress: true,
    pending: true,
    takeover: false,
    done: false,
  });
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Expanded job detail
  const [expandedJobId, setExpandedJobId] = useState<string | number | null>(null);
  const toggleExpand = (jobId: string | number) => {
    haptic();
    setExpandedJobId(prev => prev === jobId ? null : jobId);
  };

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

  /** Full-width action buttons */
  const getActions = (job) => {
    if (job.mechanicId && job.mechanicId !== currentMechanicId) {
      return (
        <button
          onClick={() => handleTakeover(job.id)}
          className="w-full py-3 bg-orange-action text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <ArrowRightLeft size={16} /> TAKE OVER
        </button>
      );
    }
    if (job.status === STATUS.RECEIVED && !job.mechanicId) {
      return hasActiveJob ? (
        <button
          disabled
          className="w-full py-3 bg-gray-200 text-gray-400 text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Ban size={16} /> Finish active job first
        </button>
      ) : (
        <button
          onClick={() => handlePick(job.id)}
          className="w-full py-3.5 bg-green-success text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
        >
          <Play size={16} fill="white" /> PICK & START
        </button>
      );
    }
    if (job.status === STATUS.ASSIGNED) {
      return hasActiveJob ? (
        <button
          disabled
          className="w-full py-3 bg-gray-200 text-gray-400 text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Ban size={16} /> Finish active job first
        </button>
      ) : (
        <button
          onClick={() => handleStart(job.id)}
          className="w-full py-3.5 bg-blue-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
        >
          <Play size={16} fill="white" /> START JOB
        </button>
      );
    }
    if (job.status === STATUS.IN_PROGRESS) {
      return (
        <button
          onClick={() => { haptic(); navigate('/mechanic/active'); }}
          className="w-full py-3 bg-blue-primary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Eye size={16} /> VIEW ACTIVE JOB
        </button>
      );
    }
    if (job.status === STATUS.PARTS_PENDING) {
      return (
        <button
          onClick={() => { haptic(); navigate('/mechanic/active'); }}
          className="w-full py-3 bg-orange-action text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <Wrench size={16} /> VIEW JOB
        </button>
      );
    }
    return null;
  };

  /** Render a job card — expandable for pending/takeover */
  const renderExpandableJob = (job: Job, showMechanic?: boolean) => {
    const isExpanded = expandedJobId === job.id;
    const isPending = [STATUS.RECEIVED, STATUS.ASSIGNED].includes(job.status);
    const isTakeover = job.mechanicId && job.mechanicId !== currentMechanicId;
    const canExpand = isPending || isTakeover;
    const mech = showMechanic ? mechanics.find(m => m.id === job.mechanicId) : undefined;

    return (
      <div key={job.id}>
        <div
          onClick={canExpand ? () => toggleExpand(job.id) : undefined}
          className={canExpand ? 'cursor-pointer' : ''}
        >
          <JobCard job={job} hideTime mechanic={mech} actions={!isExpanded ? getActions(job) : undefined} />
        </div>

        {isExpanded && (
          <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl -mt-2 pt-4 px-4 pb-4 space-y-3">
            <JobDetailPanel job={job} />
            <div className="pt-1">{getActions(job)}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'var(--font-mechanic)' }}>
      {/* Progress bar */}
      <Card className="p-4!">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-black/50 uppercase tracking-wide">Today's Progress</span>
          <span className="text-sm font-bold text-black">{done}<span className="text-black/30">/{total}</span></span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-success rounded-full transition-all duration-700"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </Card>

      {/* 1. In Progress */}
      {inProgressJobs.length > 0 && (
        <CollapsibleSection
          icon={<Wrench size={16} />} label="In Progress" count={inProgressJobs.length}
          color="text-blue-primary" open={openSections.inProgress} onToggle={() => toggle('inProgress')}
        >
          {inProgressJobs.map(job => (
            <JobCard key={job.id} job={job} hideTime actions={getActions(job)} />
          ))}
        </CollapsibleSection>
      )}

      {/* 2. Pending — expandable */}
      {pendingJobs.length > 0 && (
        <CollapsibleSection
          icon={<Clock size={16} />} label="Pending" count={pendingJobs.length}
          color="text-orange-action" open={openSections.pending} onToggle={() => toggle('pending')}
        >
          {pendingJobs.map(job => renderExpandableJob(job))}
        </CollapsibleSection>
      )}

      {/* 3. Takeover — expandable */}
      {takeoverJobs.length > 0 && (
        <CollapsibleSection
          icon={<RefreshCw size={16} />} label="Takeover" count={takeoverJobs.length}
          color="text-orange-action" open={openSections.takeover} onToggle={() => toggle('takeover')}
        >
          {takeoverJobs.map(job => renderExpandableJob(job, true))}
        </CollapsibleSection>
      )}

      {/* 4. Done */}
      {doneJobs.length > 0 && (
        <CollapsibleSection
          icon={<CheckCircle size={16} />} label="Done" count={doneJobs.length}
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
          <CheckCircle size={48} className="mx-auto mb-3 text-green-success" />
          <p className="text-lg font-bold text-black">All Done!</p>
          <p className="text-sm text-black/50 mt-1">Check back later for new jobs</p>
        </div>
      )}
    </div>
  );
}

/** Expanded detail panel showing job info */
function JobDetailPanel({ job }: { job: Job }) {
  const photos = parsePhotoUrls(job.photoBefore);
  const audioUrl = job.photoAfter || '';
  const services = job.services || [];
  const checkinParts = job.checkinParts || [];

  return (
    <>
      {/* Services */}
      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map((svc, i) => (
            <span key={i} className="bg-blue-primary/10 text-blue-primary px-3 py-1 rounded-lg text-xs font-bold">{svc}</span>
          ))}
        </div>
      )}

      {/* Issue */}
      {job.issue && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-wide mb-1">Issue</p>
          <p className="text-sm text-black font-medium leading-relaxed">{job.issue}</p>
        </div>
      )}

      {/* Labor charge */}
      {job.laborCharge != null && job.laborCharge > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-wide">Charge:</span>
          <span className="text-sm font-bold text-green-success">{formatCurrency(job.laborCharge)}</span>
        </div>
      )}

      {/* Check-in parts */}
      {checkinParts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-wide mb-1.5">Parts (check-in)</p>
          <div className="flex flex-wrap gap-1.5">
            {checkinParts.map((p, i) => (
              <span key={i} className="bg-orange-action/10 text-orange-action px-2.5 py-1 rounded-lg text-[11px] font-bold">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-wide mb-1.5">Photos</p>
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((url, i) => (
              <img key={i} src={url} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-cover ring-1 ring-gray-200 shrink-0" />
            ))}
          </div>
        </div>
      )}

      {/* Voice note */}
      {audioUrl && (
        <div>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-wide mb-1.5">Voice Note</p>
          <audio controls className="w-full h-10" preload="metadata">
            <source src={audioUrl} />
          </audio>
        </div>
      )}

      {/* Hint if no extra details */}
      {!job.issue && services.length === 0 && checkinParts.length === 0 && photos.length === 0 && !audioUrl && (
        <p className="text-xs text-black/30 text-center py-2">No additional details</p>
      )}
    </>
  );
}

function CollapsibleSection({ icon, label, count, color, open, onToggle, children }: {
  icon: React.ReactNode; label: string; count: number; color: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between text-sm font-bold uppercase tracking-wide ${color} cursor-pointer py-2 bg-transparent border-none outline-none`}
      >
        <span className="flex items-center gap-2">
          {icon} {label}
          <span className="text-xs font-bold bg-black/5 px-2 py-0.5 rounded-md">{count}</span>
        </span>
        <ChevronDown size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
