import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS, SERVICE_TYPES } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import { ServiceBadge } from '../../components/ui/Badge';
import WhatsAppButton from '../../components/ui/WhatsAppButton';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Pickup() {
  const { getDashboardStats, processPayment, showToast, isDataLoading } = useApp();
  const stats = getDashboardStats();
  const readyJobs = stats.jobs.filter(j => [STATUS.READY, STATUS.COMPLETED].includes(j.status));

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading pickups...</p>
      </div>
    );
  }

  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({});

  const selectPayment = (jobId: string | number, method: string) => {
    setSelectedPayments(prev => ({ ...prev, [String(jobId)]: method }));
  };

  const handlePayment = async (jobId: string | number) => {
    const method = selectedPayments[String(jobId)];
    if (!method) return;
    try {
      await processPayment(jobId, method);
      showToast('Payment received!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      showToast(msg, 'error');
    }
  };

  if (readyJobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">💰</div>
        <p className="text-grey-muted">No bikes ready for pickup yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {readyJobs.map(job => {
        const isPaid = job.status === STATUS.COMPLETED;
        const st = SERVICE_TYPES[job.serviceType] || SERVICE_TYPES.regular;
        const partsTotal = (job.partsUsed || []).reduce((s, p) => s + (p.price * (p.qty || 1)), 0);
        const labor = job.laborCharge ?? st.price;
        const total = partsTotal + labor;

        if (isPaid) {
          return (
            <Card key={job.id} bordered borderColor="border-green-success" className="opacity-70">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-sm">{job.customerName}</div>
                  <div className="text-xs text-grey-muted">{job.bike}</div>
                  {job.serviceId && <div className="text-[10px] font-mono text-blue-600/70 mt-0.5">{job.serviceId}</div>}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-green-light text-green-success">
                  PAID ✅
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-base border-t-2 border-grey-text pt-2 mt-2">
                <span>Total</span>
                <span>{formatCurrency(job.totalCost || total)}</span>
              </div>
              <div className="text-xs text-grey-muted text-center mt-2">
                Paid via {(job.paymentMethod || '').toUpperCase()}
                {job.paidAt && ` at ${new Date(job.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            </Card>
          );
        }

        const paymentSelected = selectedPayments[job.id];
        const paymentMethods = [
          { id: 'cash', icon: '💵', label: 'Cash' },
          { id: 'upi', icon: '📱', label: 'UPI' },
          { id: 'card', icon: '💳', label: 'Card' },
          { id: 'credit', icon: '📝', label: 'Credit' },
        ];

        return (
          <Card key={job.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-sm">{job.customerName}</div>
                <div className="text-xs text-grey-muted">{job.bike}</div>
                {job.serviceId && <div className="text-[10px] font-mono text-blue-600/70 mt-0.5">{job.serviceId}</div>}
              </div>
              <div className="flex items-center gap-2">
                <WhatsAppButton phone={job.customerPhone} stage="ready" customerName={job.customerName} bike={job.bike} quote={job.totalCost} serviceId={job.serviceId} />
                <ServiceBadge type={job.serviceType} />
              </div>
            </div>

            {/* Before/After Photos */}
            {(job.photoBefore || job.photoAfter) && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {job.photoBefore ? (
                  <img src={job.photoBefore} alt="Before" loading="lazy" className="h-20 w-full object-cover rounded-xl" />
                ) : (
                  <div className="h-20 border-2 border-dashed border-grey-border rounded-xl flex items-center justify-center text-grey-muted text-xs">No photo</div>
                )}
                {job.photoAfter ? (
                  <img src={job.photoAfter} alt="After" loading="lazy" className="h-20 w-full object-cover rounded-xl" />
                ) : (
                  <div className="h-20 border-2 border-dashed border-grey-border rounded-xl flex items-center justify-center text-grey-muted text-xs">No photo</div>
                )}
              </div>
            )}

            <div className="border-t border-grey-border my-3" />

            {/* Bill */}
            <div className="flex justify-between text-sm py-1"><span>Labor</span><span>{formatCurrency(labor)}</span></div>
            {(job.partsUsed || []).map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{p.name} x{p.qty || 1}</span>
                <span>{formatCurrency(p.price * (p.qty || 1))}</span>
              </div>
            ))}
            <div className="flex justify-between font-extrabold text-base border-t-2 border-grey-text pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {/* Payment Methods */}
            <div className="text-xs font-semibold text-grey-muted uppercase mt-3 mb-2">Payment Method</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {paymentMethods.map(pm => (
                <button key={pm.id} onClick={() => selectPayment(job.id, pm.id)}
                  className={`py-3 rounded-xl border-2 text-center text-xs font-semibold transition-all cursor-pointer
                    ${paymentSelected === pm.id
                      ? 'border-green-success bg-green-light'
                      : 'border-grey-border bg-white hover:bg-grey-bg'}`}>
                  <div className="text-lg">{pm.icon}</div>
                  {pm.label}
                </button>
              ))}
            </div>

            <Button variant="success" block disabled={!paymentSelected} onClick={() => handlePayment(job.id)}>
              💰 PAYMENT RECEIVED
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
