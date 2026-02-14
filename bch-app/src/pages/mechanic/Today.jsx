import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import JobCard from '../../components/ui/JobCard';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Today() {
  const { getMechanicJobs, currentMechanicId, startJob, showToast } = useApp();
  const navigate = useNavigate();
  const myJobs = getMechanicJobs(currentMechanicId);

  const done = myJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
  const total = myJobs.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const morning = myJobs.filter(j => j.timeBlock === 'morning');
  const afternoon = myJobs.filter(j => j.timeBlock === 'afternoon');

  const handleStart = (jobId) => {
    startJob(jobId);
    showToast('Job started! Timer running.', 'info');
    navigate('/mechanic/active');
  };

  const getActions = (job) => {
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
          <p className="text-grey-muted">No jobs assigned today!</p>
        </div>
      )}

      <p className="text-center text-xs text-grey-light">Tap START to begin working</p>
    </div>
  );
}
