import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import { haptic } from '../../lib/haptic';
import Card from '../../components/ui/Card';
import PhotoGallery from '../../components/ui/PhotoGallery';
import { Wrench, Package, Volume2, AlertTriangle, Lightbulb, Pause, Play, CheckCircle } from 'lucide-react';

/** Parse photoBefore field: could be JSON array of URLs or single URL */
function parsePhotoUrls(val?: string): string[] {
  if (!val) return [];
  if (val.startsWith('[')) {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [val];
}

export default function ActiveJob() {
  const {
    getMechanicJobs, currentMechanicId, completeJob, markPartsNeeded, markPartsReceived,
    pauseJob, resumeJob, showToast, partsList, partsItems, serviceItems
  } = useApp();
  const navigate = useNavigate();

  const myJobs = getMechanicJobs(currentMechanicId);
  // Show in_progress OR parts_pending jobs so mechanic can still work on them
  const activeJob = myJobs.find(j => j.status === STATUS.IN_PROGRESS)
    || myJobs.find(j => j.status === STATUS.PARTS_PENDING);
  const isPaused = !!activeJob?.pausedAt;
  const isPartsPending = activeJob?.status === STATUS.PARTS_PENDING;

  const [partsUsed, setPartsUsed] = useState([]);
  const [partsSearch, setPartsSearch] = useState('');

  // Load existing parts
  useEffect(() => {
    if (activeJob?.partsUsed?.length > 0 && partsUsed.length === 0) {
      setPartsUsed([...activeJob.partsUsed]);
    }
  }, [activeJob?.id]);

  const handleTapPart = (partName: string) => {
    haptic();
    const price = partsItems?.find(i => i.name === partName)?.price || 0;
    setPartsUsed(prev => {
      const existing = prev.findIndex(p => p.name === partName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
        return updated;
      }
      return [...prev, { name: partName, qty: 1, price }];
    });
  };

  const removePart = (idx: number) => {
    haptic();
    setPartsUsed(prev => prev.filter((_, i) => i !== idx));
  };

  const handleNeedParts = async () => {
    if (!activeJob) return;
    haptic(100);
    try {
      await markPartsNeeded(activeJob.id, [{ name: 'Requested part', status: 'pending' }]);
      showToast('Parts request sent! You can still view this job.', 'info');
    } catch {
      // Error toast shown by context
    }
  };

  const handleResumeFromParts = async () => {
    if (!activeJob) return;
    haptic(100);
    try {
      await markPartsReceived(activeJob.id);
      showToast('Resumed work — parts received!', 'success');
    } catch {
      // Error toast shown by context
    }
  };

  const handleComplete = async () => {
    if (!activeJob) return;
    haptic(150);
    try {
      await completeJob(activeJob.id, partsUsed);
      setPartsUsed([]);
      const needsQc = ['repair', 'makeover'].includes(activeJob.serviceType);
      showToast(needsQc ? 'Sent for QC check!' : 'Job completed!', 'success');
      navigate('/mechanic/today');
    } catch {
      // Error toast shown by context
    }
  };

  if (!activeJob) {
    return (
      <div className="text-center py-20" style={{ fontFamily: 'var(--font-mechanic)' }}>
        <Wrench size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-bold text-black">No Active Job</p>
        <p className="text-sm text-black/50 mt-1">Start one from Today tab</p>
      </div>
    );
  }

  const jobServices = activeJob.services || [];
  const jobCheckinParts = activeJob.checkinParts || [];

  const jobPhotos = parsePhotoUrls(activeJob.photoBefore);
  const audioUrl = activeJob.photoAfter || '';

  const checkinPartsBill: { name: string; qty: number; price: number }[] = [];
  const partCountMap: Record<string, number> = {};
  for (const name of jobCheckinParts) {
    partCountMap[name] = (partCountMap[name] || 0) + 1;
  }
  for (const [name, qty] of Object.entries(partCountMap)) {
    const price = partsItems?.find(i => i.name === name)?.price || 0;
    checkinPartsBill.push({ name, qty, price });
  }

  const laborCharge = activeJob.laborCharge ?? 0;
  const checkinPartsTotal = checkinPartsBill.reduce((sum, p) => sum + p.price * p.qty, 0);

  return (
    <div className="space-y-5" style={{ fontFamily: 'var(--font-mechanic)' }}>
      {/* Parts Pending Banner */}
      {isPartsPending && (
        <div className="bg-orange-action/5 border border-orange-action/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-orange-action shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-black">Waiting for Parts</p>
              <p className="text-xs text-black/50 mt-0.5">
                {(activeJob.partsNeeded || []).map(p => p.name).join(', ') || 'Parts requested'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResumeFromParts}
            className="w-full py-3 bg-green-success text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Play size={16} fill="white" /> RESUME WORK
          </button>
        </div>
      )}

      {/* Job Info */}
      <Card className="p-4! text-center space-y-2.5">
        <h3 className="font-bold text-lg text-black">{activeJob.bike}</h3>
        <p className="text-sm text-black/50">{activeJob.customerName}</p>
        {activeJob.serviceId && (
          <p className="text-xs font-mono font-bold text-blue-600/70">{activeJob.serviceId}</p>
        )}

        {/* Service type */}
        {jobServices.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {jobServices.map((svc, i) => {
              const svcPrice = serviceItems?.find(s => s.name === svc)?.price || 0;
              return (
                <div key={`svc-${i}`} className="bg-blue-primary/10 text-blue-primary px-4 py-2 rounded-lg">
                  <span className="text-sm font-bold">{svc}</span>
                  {svcPrice > 0 && <span className="text-xs ml-1.5 opacity-70">₹{svcPrice}</span>}
                </div>
              );
            })}
          </div>
        )}

        {activeJob.issue && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-black/60 leading-relaxed">"{activeJob.issue}"</p>
          </div>
        )}

        {laborCharge > 0 && (
          <div className="inline-block bg-green-success/10 border border-green-success/20 rounded-lg px-4 py-2">
            <span className="text-lg font-bold text-green-success">{formatCurrency(laborCharge)}</span>
          </div>
        )}
      </Card>

      {/* Check-in Photos — large preview with tap-to-zoom */}
      <PhotoGallery photos={jobPhotos} label="Check-in Photos" />

      {/* Voice Note */}
      {audioUrl && (
        <div>
          <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <Volume2 size={16} /> Voice Note
          </h4>
          <audio controls className="w-full h-12" preload="metadata">
            <source src={audioUrl} />
          </audio>
        </div>
      )}

      {/* Parts from check-in */}
      {checkinPartsBill.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package size={16} /> Parts (from check-in)
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {checkinPartsBill.map(p => (
                <div key={p.name} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-black">{p.name}</span>
                    {p.price > 0 && <span className="text-xs text-black/40 ml-1.5">₹{p.price}</span>}
                  </div>
                  {p.qty > 1 && <span className="text-xs text-black/50 mx-2">x{p.qty}</span>}
                  {p.price > 0 && <span className="text-xs font-bold text-black">₹{p.price * p.qty}</span>}
                </div>
              ))}
            </div>
            {checkinPartsTotal > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-orange-action/5 border-t border-gray-200">
                <span className="text-xs font-bold text-black">Parts Total</span>
                <span className="text-xs font-bold text-orange-action">₹{checkinPartsTotal}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts — search to add */}
      <div>
        <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 mb-2">
          <Wrench size={14} /> Add Parts {partsUsed.length > 0 && `(${partsUsed.length})`}
        </h4>

        {/* Search input */}
        <input
          type="text"
          value={partsSearch}
          onChange={e => setPartsSearch(e.target.value)}
          placeholder="Type to search parts..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black bg-white focus:border-blue-primary focus:outline-none"
        />

        {/* Matching parts — only show when typing */}
        {partsSearch.trim().length > 0 && (() => {
          const query = partsSearch.trim().toLowerCase();
          const matches = partsList.filter(name => name.toLowerCase().includes(query));
          return matches.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {matches.map(name => {
                const added = partsUsed.find(p => p.name === name);
                return (
                  <button
                    key={name}
                    onClick={() => { handleTapPart(name); setPartsSearch(''); }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer active:scale-[0.98] transition-transform
                      ${added ? 'bg-blue-primary text-white' : 'bg-white border border-gray-200 text-black active:bg-gray-50'}`}
                  >
                    {name}{added ? ` ×${added.qty}` : ''}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-black/40 font-medium">No parts found</p>
          );
        })()}

        {/* Added parts summary — always visible */}
        {partsUsed.length > 0 && (
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {partsUsed.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-bold text-black">{p.name} x{p.qty}</span>
                <div className="flex items-center gap-2">
                  {p.price > 0 && <span className="text-xs font-bold text-black/50">₹{p.price * p.qty}</span>}
                  <button
                    onClick={() => removePart(i)}
                    className="w-6 h-6 bg-red-urgent/10 text-red-urgent text-xs font-bold rounded flex items-center justify-center cursor-pointer active:bg-red-urgent/20"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <ActionBtn icon={<Wrench size={18} />} label="Need Parts" onClick={handleNeedParts} />
        <ActionBtn icon={<Lightbulb size={18} />} label="Need Help" onClick={() => { haptic(); showToast('Help request sent!', 'info'); }} />
        <ActionBtn
          icon={isPaused ? <Play size={18} /> : <Pause size={18} />}
          label={isPaused ? 'Resume' : 'Pause'}
          active={isPaused}
          onClick={async () => {
            haptic(100);
            if (isPaused) {
              await resumeJob(activeJob.id);
              showToast('Job resumed!', 'success');
            } else {
              await pauseJob(activeJob.id);
              showToast('Job paused', 'info');
            }
          }}
        />
      </div>

      {/* COMPLETE */}
      <button
        onClick={handleComplete}
        className="w-full py-4 bg-green-success text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
      >
        <CheckCircle size={20} /> COMPLETE JOB
      </button>

    </div>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-colors cursor-pointer active:scale-[0.98]
        ${active ? 'bg-orange-action/5 border-orange-action/30 text-orange-action' : 'bg-white border-gray-200 text-black/60 active:bg-gray-50'}`}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}
