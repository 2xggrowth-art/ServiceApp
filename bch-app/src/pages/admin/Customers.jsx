import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../lib/constants';
import { StatusBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const TIMELINE_STEPS = [
  { key: 'received', label: 'Recv' },
  { key: 'parts',    label: 'Parts' },
  { key: 'working',  label: 'Work' },
  { key: 'qc',       label: 'QC' },
  { key: 'ready',    label: 'Ready' },
];

const STATUS_TO_STEP = {
  received: 0, assigned: 0, parts_pending: 1, in_progress: 2,
  quality_check: 3, ready: 4, completed: 4,
};

export default function Customers() {
  const { getDashboardStats, showToast } = useApp();
  const stats = getDashboardStats();
  const { jobs } = stats;

  const handleWhatsApp = (phone, name, status) => {
    const msg = `Hello ${name}, your bike service status: ${status}. - Bharath Cycle Hub`;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
    showToast('WhatsApp opened!', 'success');
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">👤</div>
        <p className="text-grey-muted">No customers today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => {
        const currentIdx = STATUS_TO_STEP[job.status] ?? 0;

        return (
          <Card key={job.id}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-sm">{job.customerName}</div>
                <div className="text-xs text-grey-muted">{job.customerPhone || 'No phone'} • {job.bike}</div>
              </div>
              <StatusBadge status={job.status} />
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-0 my-3">
              {TIMELINE_STEPS.map((step, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 transition-colors
                        ${isDone ? 'bg-green-success border-green-success' :
                          isCurrent ? 'bg-blue-primary border-blue-primary' :
                          'bg-white border-grey-border'}`}
                      />
                      <span className={`text-[9px] mt-1 font-semibold
                        ${isDone ? 'text-green-success' : isCurrent ? 'text-blue-primary' : 'text-grey-light'}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 rounded ${isDone ? 'bg-green-success' : 'bg-grey-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* WhatsApp */}
            <div className="text-right mt-2">
              <Button
                size="sm"
                variant="success"
                onClick={() => handleWhatsApp(job.customerPhone, job.customerName, STATUS_LABELS[job.status])}
              >
                💬 WhatsApp
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
