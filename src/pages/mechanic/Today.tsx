import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { getToday } from '../../lib/helpers';
import { openWhatsApp } from '../../lib/whatsapp';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Today() {
  const { getMechanicJobs, currentMechanicId, pickJob, startJob, reassignJob, showToast, jobs, mechanics } = useApp();
  // No manual refresh needed — polling (30s) + realtime + visibility listener handle data freshness
  const navigate = useNavigate();
  const myJobs = getMechanicJobs(currentMechanicId);
  const today = getToday();

  // Jobs assigned to OTHER mechanics that this mechanic can take over
  const takeoverJobs = jobs.filter(j =>
    j.mechanicId &&
    j.mechanicId !== currentMechanicId &&
    ![STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status) &&
    (j.date === today || j.date < today)
  );

  // Separate unassigned (available to pick) from my assigned jobs
  const unassignedJobs = myJobs
    .filter(j => j.status === STATUS.RECEIVED && !j.mechanicId)
    .sort((a, b) => {
      // Urgent first, then by creation time
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const myAssignedJobs = myJobs.filter(j => j.mechanicId === currentMechanicId);
  const carryoverJobs = myAssignedJobs.filter(j => j.date < today && j.status !== STATUS.COMPLETED);
  const todayJobs = myAssignedJobs.filter(j => j.date === today);

  const done = myAssignedJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
  const total = myAssignedJobs.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const morning = todayJobs.filter(j => j.timeBlock === 'morning');
  const afternoon = todayJobs.filter(j => j.timeBlock === 'afternoon');

  const handlePick = async (jobId) => {
    try {
      await pickJob(jobId);
      showToast('Job picked! Timer started.', 'success');
      const job = myJobs.find(j => j.id === jobId) || unassignedJobs.find(j => j.id === jobId);
      if (job?.customerPhone) {
        openWhatsApp(job.customerPhone, 'in_progress', job.customerName, job.bike);
      }
      navigate('/mechanic/active');
    } catch {
      // Error toast shown by context
    }
  };

  const handleStart = async (jobId) => {
    try {
      await startJob(jobId);
      showToast('Job started! Timer running.', 'info');
      const job = myJobs.find(j => j.id === jobId);
      if (job?.customerPhone) {
        openWhatsApp(job.customerPhone, 'in_progress', job.customerName, job.bike);
      }
      navigate('/mechanic/active');
    } catch {
      // Error toast shown by context
    }
  };

  const handleTakeover = async (jobId) => {
    if (!currentMechanicId) return;
    try {
      await reassignJob(jobId, currentMechanicId);
      showToast('Job taken over! It\'s now yours.', 'success');
    } catch {
      showToast('Failed to take over job', 'error');
    }
  };

  const getActions = (job) => {
    // Job assigned to another mechanic — show take over
    if (job.mechanicId && job.mechanicId !== currentMechanicId) {
      return <Button size="sm" variant="warning" onClick={() => handleTakeover(job.id)}>🔄 TAKE OVER</Button>;
    }
    if (job.status === STATUS.RECEIVED && !job.mechanicId) {
      return <Button size="sm" variant="success" onClick={() => handlePick(job.id)}>🎯 PICK & START</Button>;
    }
    if (job.status === STATUS.ASSIGNED) {
      return <Button size="sm" onClick={() => handleStart(job.id)}>▶ START</Button>;
    }
    if (job.status === STATUS.IN_PROGRESS) {
      return <Button size="sm" variant="success" onClick={() => navigate('/mechanic/active')}>⏰ VIEW</Button>;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold">Today's Progress</span>
          <span className="text-grey-muted">{done}/{total} jobs</span>
        </div>
        <div className="h-2.5 bg-grey-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-green-success rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {/* Available Jobs to Pick */}
      {unassignedJobs.length > 0 && (
        <>
          <div className="text-sm font-bold text-blue-primary flex items-center gap-2">
            🎯 Available Jobs — Pick One
          </div>
          {unassignedJobs.map(job => (
            <JobCard key={job.id} job={job} actions={getActions(job)} />
          ))}
        </>
      )}

      {/* Jobs from other mechanics — available to take over */}
      {takeoverJobs.length > 0 && (
        <>
          <div className="text-sm font-bold text-orange-action flex items-center gap-2">
            🔄 Other Mechanics' Jobs — Take Over
          </div>
          {takeoverJobs.map(job => {
            const mech = mechanics.find(m => m.id === job.mechanicId);
            return <JobCard key={job.id} job={job} mechanic={mech} actions={getActions(job)} />;
          })}
        </>
      )}

      {/* Carryover from previous days */}
      {carryoverJobs.length > 0 && (
        <>
          <div className="text-sm font-bold text-orange-action flex items-center gap-2">
            📌 Ongoing from previous days
          </div>
          {carryoverJobs.map(job => (
            <JobCard key={job.id} job={job} actions={getActions(job)} />
          ))}
        </>
      )}

      {/* Morning Block */}
      {morning.length > 0 && (
        <>
          <div className="text-sm font-bold text-grey-muted flex items-center gap-2">
            ☀️ Morning
          </div>
          {morning.map(job => (
            <JobCard key={job.id} job={job} dimCompleted actions={getActions(job)} />
          ))}
        </>
      )}

      {/* Afternoon Block */}
      {afternoon.length > 0 && (
        <>
          <div className="text-sm font-bold text-grey-muted flex items-center gap-2">
            🌅 Afternoon
          </div>
          {afternoon.map(job => (
            <JobCard key={job.id} job={job} dimCompleted actions={getActions(job)} />
          ))}
        </>
      )}

      {/* Empty */}
      {myJobs.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-grey-muted">No jobs available!</p>
          <p className="text-xs text-grey-light mt-1">Check back soon for new jobs</p>
        </div>
      )}

      <p className="text-center text-xs text-grey-light">Tap PICK & START to claim a job</p>
    </div>
  );
}
