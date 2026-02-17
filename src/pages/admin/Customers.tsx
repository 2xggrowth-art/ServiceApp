import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../lib/constants';
import { StatusBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Users } from 'lucide-react';

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
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-grey-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users size={32} className="text-grey-muted" />
        </div>
        <p className="text-[15px] font-semibold text-grey-text mb-1">No customers today</p>
        <p className="text-[13px] text-grey-muted">Jobs will appear here once checked in</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest">Customer Status</h3>
        <span className="text-[11px] font-semibold text-blue-primary bg-blue-light px-2 py-1 rounded-lg">{jobs.length} jobs</span>
      </div>

      {jobs.map((job, i) => {
        const currentIdx = STATUS_TO_STEP[job.status] ?? 0;

        return (
          <Card key={job.id} className="animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[15px] font-bold leading-snug">{job.customerName}</div>
                <div className="text-[13px] text-grey-muted mt-0.5">{job.customerPhone || 'No phone'} · {job.bike}</div>
              </div>
              <StatusBadge status={job.status} />
            </div>

            {/* Timeline — enhanced with glow on current */}
            <div className="flex items-center gap-0 my-4 px-1">
              {TIMELINE_STEPS.map((step, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 transition-all duration-300
                        ${isDone ? 'bg-green-success border-green-success scale-90' :
                          isCurrent ? 'bg-blue-primary border-blue-primary ring-4 ring-blue-primary/20' :
                          'bg-white border-grey-border'}`}
                      />
                      <span className={`text-[9px] mt-1.5 font-semibold
                        ${isDone ? 'text-green-success' : isCurrent ? 'text-blue-primary' : 'text-grey-light'}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1.5 rounded transition-colors duration-300
                        ${isDone ? 'bg-green-success' : 'bg-grey-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* WhatsApp */}
            <div className="text-right mt-3">
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
