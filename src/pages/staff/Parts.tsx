import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { StatusBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Parts() {
  const { getDashboardStats, parts, markPartsReceived, showToast, isDataLoading } = useApp();
  const stats = getDashboardStats();
  const partsJobs = stats.jobs.filter(j => j.status === STATUS.PARTS_PENDING);
  const lowStock = parts.filter(p => p.stock <= p.reorderAt);

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading parts...</p>
      </div>
    );
  }

  const handleReceived = async (jobId: string | number) => {
    try {
      await markPartsReceived(jobId);
      showToast('Parts received - mechanic notified!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update parts status';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Parts Requests */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Parts Requests</h3>

      {partsJobs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-sm text-grey-muted">No pending parts requests</p>
        </div>
      ) : (
        partsJobs.map(job => (
          <Card key={job.id} bordered borderColor="border-orange-action">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-sm">{job.customerName}</div>
                <div className="text-xs text-grey-muted">{job.bike}</div>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-xs text-grey-muted mb-3">
              Needed: {(job.partsNeeded || []).map(p => p.name).join(', ') || 'Not specified'}
            </div>
            <Button size="sm" variant="success" onClick={() => handleReceived(job.id)}>
              ✅ Parts Received
            </Button>
          </Card>
        ))
      )}

      <div className="border-t border-grey-border my-2" />

      {/* Inventory Low Stock */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Inventory (Low Stock ⚠)</h3>

      {lowStock.length === 0 ? (
        <p className="text-xs text-grey-muted text-center py-4">All parts well stocked</p>
      ) : (
        <Card>
          {lowStock.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between py-2.5 ${i < lowStock.length - 1 ? 'border-b border-grey-border' : ''}`}>
              <div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className={`text-xs ${p.stock <= 2 ? 'text-red-urgent' : 'text-orange-action'}`}>
                  Stock: {p.stock} (Reorder at {p.reorderAt})
                </div>
              </div>
              <span className="text-lg">{p.stock <= 2 ? '🔴' : '🟠'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
