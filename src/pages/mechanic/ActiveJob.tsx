import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import { haptic } from '../../lib/haptic';
import Card from '../../components/ui/Card';
import { Wrench, Package, Image, Volume2 } from 'lucide-react';
import { openWhatsApp } from '../../lib/whatsapp';

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
      if (activeJob.customerPhone) {
        openWhatsApp(activeJob.customerPhone, needsQc ? 'quality_check' : 'ready', activeJob.customerName, activeJob.bike);
      }
      navigate('/mechanic/today');
    } catch {
      // Error toast shown by context
    }
  };

  if (!activeJob) {
    return (
      <div className="text-center py-20" style={{ fontFamily: 'var(--font-mechanic)' }}>
        <div className="text-6xl mb-4">🔧</div>
        <p className="text-xl font-bold text-black">No Active Job</p>
        <p className="text-base text-black/60 mt-2">Start one from Today tab</p>
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
      {/* Parts Pending Banner — bold and unmissable */}
      {isPartsPending && (
        <div className="bg-orange-action/10 border-2 border-orange-action rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🔧</span>
            <div className="flex-1">
              <p className="text-base font-bold text-black">Waiting for Parts</p>
              <p className="text-sm text-black/70 mt-0.5">
                {(activeJob.partsNeeded || []).map(p => p.name).join(', ') || 'Parts requested'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResumeFromParts}
            className="w-full min-h-14 bg-green-success text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
          >
            ▶ RESUME WORK
          </button>
        </div>
      )}

      {/* Job Info — high contrast */}
      <Card className="p-5! text-center space-y-3">
        <h3 className="font-bold text-xl text-black">{activeJob.bike}</h3>
        <p className="text-base text-black/70">{activeJob.customerName}</p>

        {/* Service type */}
        {jobServices.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {jobServices.map((svc, i) => {
              const svcPrice = serviceItems?.find(s => s.name === svc)?.price || 0;
              return (
                <div key={`svc-${i}`} className="bg-blue-primary text-white px-5 py-2.5 rounded-2xl">
                  <span className="text-lg font-bold">{svc}</span>
                  {svcPrice > 0 && <span className="text-base ml-2 opacity-80">₹{svcPrice}</span>}
                </div>
              );
            })}
          </div>
        )}

        {activeJob.issue && (
          <div className="bg-gray-100 rounded-2xl p-3">
            <p className="text-sm text-black/80 font-medium">"{activeJob.issue}"</p>
          </div>
        )}

        {laborCharge > 0 && (
          <div className="inline-block bg-green-success/10 border-2 border-green-success/30 rounded-2xl px-6 py-3">
            <span className="text-2xl font-bold text-green-success">{formatCurrency(laborCharge)}</span>
          </div>
        )}
      </Card>

      {/* Check-in Photos */}
      {jobPhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <Image size={16} /> Check-in Photos
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {jobPhotos.map((url, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-200">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {checkinPartsBill.map(p => (
                <div key={p.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-black">{p.name}</span>
                    {p.price > 0 && <span className="text-sm text-black/50 ml-2">₹{p.price}</span>}
                  </div>
                  {p.qty > 1 && <span className="text-sm text-black/60 mx-2">x{p.qty}</span>}
                  {p.price > 0 && <span className="text-base font-bold text-black">₹{p.price * p.qty}</span>}
                </div>
              ))}
            </div>
            {checkinPartsTotal > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-orange-action/10 border-t-2 border-gray-200">
                <span className="text-sm font-bold text-black">Parts Total</span>
                <span className="text-base font-bold text-orange-action">₹{checkinPartsTotal}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts — tap to add, tap added part to +1, long-press to remove */}
      <div>
        <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-3">
          <Wrench size={14} className="inline mr-1.5" /> Tap to add parts
        </h4>
        <div className="flex flex-wrap gap-2">
          {partsList.map(name => {
            const added = partsUsed.find(p => p.name === name);
            return (
              <button
                key={name}
                onClick={() => handleTapPart(name)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer active:scale-95 transition-transform
                  ${added ? 'bg-blue-primary text-white' : 'bg-white border-2 border-gray-300 text-black active:bg-gray-100'}`}
              >
                {name}{added ? ` ×${added.qty}` : ''}
              </button>
            );
          })}
        </div>

        {/* Added parts summary with remove */}
        {partsUsed.length > 0 && (
          <div className="mt-3 border-2 border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
            {partsUsed.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-bold text-black">{p.name} ×{p.qty}</span>
                <div className="flex items-center gap-3">
                  {p.price > 0 && <span className="text-sm font-bold text-black/60">₹{p.price * p.qty}</span>}
                  <button
                    onClick={() => removePart(i)}
                    className="min-w-8 min-h-8 bg-red-urgent/10 text-red-urgent text-sm font-bold rounded-lg flex items-center justify-center cursor-pointer active:bg-red-urgent/20"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons — chunky grid */}
      <div className="grid grid-cols-3 gap-3">
        <ActionBtn icon="🔧" label="Need Parts" onClick={handleNeedParts} />
        <ActionBtn icon="💡" label="Need Help" onClick={() => { haptic(); showToast('Help request sent!', 'info'); }} />
        <ActionBtn
          icon={isPaused ? '▶️' : '⏸️'}
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

      {/* COMPLETE — the biggest button on screen */}
      <button
        onClick={handleComplete}
        className="w-full min-h-18 bg-green-success text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform shadow-lg"
      >
        ✅ COMPLETE JOB
      </button>

    </div>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 min-h-18 rounded-2xl border-2 transition-colors cursor-pointer active:scale-[0.97]
        ${active ? 'bg-orange-action/10 border-orange-action' : 'bg-white border-gray-300 active:bg-gray-100'}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-bold text-black">{label}</span>
    </button>
  );
}
