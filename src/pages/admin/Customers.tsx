import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { StatusBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Users, ChevronDown, Clock } from 'lucide-react';
import { openWhatsApp } from '../../lib/whatsapp';
import type { WhatsAppStage } from '../../lib/whatsapp';
import type { Job } from '../../types';

const TIMELINE_STEPS = [
  { key: 'received', label: 'Received' },
  { key: 'working',  label: 'Working' },
  { key: 'ready',    label: 'Ready' },
];

const STATUS_TO_STEP: Record<string, number> = {
  received: 0, assigned: 0,
  parts_pending: 1, in_progress: 1, quality_check: 1,
  ready: 2, completed: 2,
};

const SECTIONS = [
  { key: 'received', label: 'Received',  step: 0, color: 'text-grey-muted',    bg: 'bg-gray-100',       dot: 'bg-gray-400' },
  { key: 'working',  label: 'Working',   step: 1, color: 'text-blue-primary',  bg: 'bg-blue-light',     dot: 'bg-blue-primary' },
  { key: 'ready',    label: 'Ready',     step: 2, color: 'text-green-success', bg: 'bg-emerald-50',     dot: 'bg-green-success' },
];

/** Map job status to WhatsApp template stage */
function getWhatsAppStage(status: string): WhatsAppStage | null {
  switch (status) {
    case STATUS.RECEIVED:
    case STATUS.ASSIGNED:
      return 'received';
    case STATUS.IN_PROGRESS:
      return 'in_progress';
    case STATUS.QUALITY_CHECK:
      return 'quality_check';
    case STATUS.READY:
      return 'ready';
    default:
      return null;
  }
}

/** Format ISO date to readable "18 Feb, 11:30 AM" */
function formatTimestamp(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Format just the date "18 Feb 2026" */
function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Customers() {
  const { getDashboardStats, showToast } = useApp();
  const stats = getDashboardStats();
  const { jobs } = stats;

  // Sections collapsed by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    received: false, working: false, ready: false,
  });
  const [expandedJobId, setExpandedJobId] = useState<string | number | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpand = (jobId: string | number) => {
    setExpandedJobId(prev => prev === jobId ? null : jobId);
  };

  const handleWhatsApp = (job: typeof jobs[0]) => {
    const stage = getWhatsAppStage(job.status);
    if (!stage) {
      showToast('No message template for this status', 'warning');
      return;
    }
    if (!job.customerPhone) {
      showToast('No phone number for this customer', 'warning');
      return;
    }
    openWhatsApp(job.customerPhone, stage, job.customerName, job.bike, job.totalCost);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest">Customer Status</h3>
        <span className="text-[11px] font-semibold text-blue-primary bg-blue-light px-2 py-1 rounded-lg">{jobs.length} jobs</span>
      </div>

      {SECTIONS.map(section => {
        const sectionJobs = jobs.filter(j => (STATUS_TO_STEP[j.status] ?? 0) === section.step);
        if (sectionJobs.length === 0) return null;
        const isOpen = openSections[section.key];

        return (
          <div key={section.key}>
            {/* Section header — tap to toggle */}
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white border border-grey-border/60 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${section.dot}`} />
                <span className={`text-sm font-bold ${section.color}`}>{section.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${section.bg} ${section.color}`}>
                  {sectionJobs.length}
                </span>
              </div>
              <ChevronDown size={16} className={`text-grey-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Section content */}
            {isOpen && (
              <div className="mt-2 space-y-2.5">
                {sectionJobs.map((job) => {
                  const currentIdx = STATUS_TO_STEP[job.status] ?? 0;
                  const waStage = getWhatsAppStage(job.status);
                  const isExpanded = expandedJobId === job.id;

                  return (
                    <div key={job.id}>
                      <Card className="animate-fade-in-up cursor-pointer" onClick={() => toggleExpand(job.id)}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="text-[15px] font-bold leading-snug">{job.customerName}</div>
                            <div className="text-[13px] text-grey-muted mt-0.5">{job.customerPhone || 'No phone'} · {job.bike}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={job.status} />
                            <ChevronDown size={14} className={`text-grey-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Date */}
                        <div className="text-[11px] text-grey-muted mb-2">
                          {formatDate(job.date)}
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center gap-0 my-2 px-1">
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
                        {waStage && job.customerPhone && (
                          <div className="text-right mt-2" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleWhatsApp(job)}
                            >
                              💬 WhatsApp
                            </Button>
                          </div>
                        )}
                      </Card>

                      {/* Expanded: Workflow timestamps */}
                      {isExpanded && (
                        <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl -mt-1 px-4 py-3">
                          <WorkflowTimeline job={job} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Workflow timeline showing all timestamps */
function WorkflowTimeline({ job }: { job: Job }) {
  const steps = [
    { label: 'Checked In', time: formatTimestamp(job.createdAt), done: true },
    { label: 'Work Started', time: formatTimestamp(job.startedAt), done: !!job.startedAt },
    { label: 'Completed', time: formatTimestamp(job.completedAt), done: !!job.completedAt },
    { label: 'Payment', time: formatTimestamp(job.paidAt), done: !!job.paidAt },
  ];

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Clock size={12} className="text-grey-muted" />
        <span className="text-[10px] font-bold text-grey-muted uppercase tracking-wide">Workflow Timeline</span>
      </div>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${step.done ? 'bg-green-success' : 'bg-gray-300'}`} />
            {i < steps.length - 1 && (
              <div className={`w-0.5 h-5 ${step.done ? 'bg-green-success/40' : 'bg-gray-200'}`} />
            )}
          </div>
          {/* Label + time */}
          <div className="flex-1 -mt-0.5 pb-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${step.done ? 'text-black' : 'text-grey-muted'}`}>{step.label}</span>
              {step.time ? (
                <span className="text-[11px] text-grey-muted">{step.time}</span>
              ) : (
                <span className="text-[11px] text-grey-light">—</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Service & issue info */}
      {(job.services?.length > 0 || job.issue) && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          {job.services?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.services.map((svc, i) => (
                <span key={i} className="text-[10px] font-bold bg-blue-primary/10 text-blue-primary px-2 py-0.5 rounded">{svc}</span>
              ))}
            </div>
          )}
          {job.issue && (
            <p className="text-[11px] text-grey-muted leading-relaxed">{job.issue}</p>
          )}
        </div>
      )}
    </div>
  );
}
