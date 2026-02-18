import { useState, useEffect, useRef } from 'react';
import { config } from '../../lib/config';
import { activityLogService } from '../../services/activityLogService';
import { useApp } from '../../context/AppContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import type { ActivityLog } from '../../types';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  job_created: 'Job Created',
  job_started: 'Job Started',
  job_completed: 'Job Completed',
  job_reassigned: 'Job Reassigned',
  qc_passed: 'QC Passed',
  qc_failed: 'QC Failed',
  parts_needed: 'Parts Needed',
  parts_received: 'Parts Received',
  payment_processed: 'Payment Processed',
};

const ACTION_ICONS: Record<string, string> = {
  job_created: '📋',
  job_started: '▶️',
  job_completed: '✅',
  job_reassigned: '🔄',
  qc_passed: '✅',
  qc_failed: '❌',
  parts_needed: '🔧',
  parts_received: '📦',
  payment_processed: '💰',
};

export default function AuditLog() {
  const { mechanics } = useApp();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [mechanicFilter, setMechanicFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const currentFilters = {
    actionFilter: filter,
    mechanicId: mechanicFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const loadLogs = async (pageNum = 0) => {
    if (!navigator.onLine) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await activityLogService.getRecentLogs(
        PAGE_SIZE,
        pageNum * PAGE_SIZE,
        currentFilters
      );
      if (data) {
        setLogs(pageNum === 0 ? data : prev => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!config.useSupabase || !navigator.onLine) {
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      setLogs([]);
      loadLogs(0);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filter, mechanicFilter, dateFrom, dateTo]);

  const loadMore = () => {
    if (!navigator.onLine) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadLogs(nextPage);
  };

  const handleExportCsv = async () => {
    if (!navigator.onLine) return;
    setExporting(true);
    try {
      const csv = await activityLogService.exportCsv(currentFilters);
      if (!csv) return;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const actionTypes = ['all', ...Object.keys(ACTION_LABELS)];

  if (!config.useSupabase) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">📊</div>
        <p className="text-grey-muted">Audit log requires Supabase mode</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">Audit Log</h3>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Date range filters */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-grey-muted font-semibold uppercase block mb-0.5">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="form-input text-xs py-1.5" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-grey-muted font-semibold uppercase block mb-0.5">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="form-input text-xs py-1.5" />
        </div>
      </div>

      {/* Mechanic filter */}
      <select value={mechanicFilter} onChange={e => setMechanicFilter(e.target.value)}
        className="form-input text-xs py-1.5">
        <option value="">All team members</option>
        {mechanics.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Action type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {actionTypes.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer
              ${filter === a
                ? 'bg-blue-primary text-white'
                : 'bg-white text-grey-muted border border-grey-border hover:bg-grey-bg'}`}
          >
            {a === 'all' ? 'All' : ACTION_LABELS[a] || a}
          </button>
        ))}
      </div>

      {/* Logs */}
      {loading && logs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-grey-muted">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-grey-muted">No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const details = (log.details || {}) as Record<string, unknown>;
            const hasDiff = details._before || details._after;
            const isExpanded = expandedId === log.id;

            return (
              <Card key={log.id}
                className={`py-2.5 ${hasDiff ? 'cursor-pointer' : ''}`}
                onClick={hasDiff ? () => setExpandedId(isExpanded ? null : log.id) : undefined}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{ACTION_ICONS[log.action] || '📝'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{ACTION_LABELS[log.action] || log.action}</span>
                      {log.users && (
                        <span className="text-xs text-grey-muted">by {log.users.name}</span>
                      )}
                    </div>
                    {log.jobs && (
                      <div className="text-xs text-grey-muted">
                        {log.jobs.customer_name} — {log.jobs.bike}
                      </div>
                    )}
                    <div className="text-[10px] text-grey-light mt-0.5">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      {hasDiff && <span className="ml-1 text-blue-primary">{isExpanded ? '▲' : '▼'} details</span>}
                    </div>
                  </div>
                </div>

                {/* Before/After state diff */}
                {isExpanded && hasDiff && (
                  <div className="mt-2 pt-2 border-t border-grey-border text-xs space-y-1">
                    {details._before && (
                      <div>
                        <span className="font-semibold text-red-urgent">Before: </span>
                        <span className="text-grey-muted">{JSON.stringify(details._before)}</span>
                      </div>
                    )}
                    {details._after && (
                      <div>
                        <span className="font-semibold text-green-success">After: </span>
                        <span className="text-grey-muted">{JSON.stringify(details._after)}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {hasMore && (
            <Button variant="outline" block onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
