import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS, SERVICE_TYPES } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
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
    getMechanicJobs, currentMechanicId, completeJob, markPartsNeeded,
    pauseJob, resumeJob, showToast, parts, partsList, partsItems, serviceItems
  } = useApp();
  const navigate = useNavigate();

  const myJobs = getMechanicJobs(currentMechanicId);
  const activeJob = myJobs.find(j => j.status === STATUS.IN_PROGRESS);
  const isPaused = !!activeJob?.pausedAt;

  const [partsUsed, setPartsUsed] = useState([]);
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // Load existing parts
  useEffect(() => {
    if (activeJob?.partsUsed?.length > 0 && partsUsed.length === 0) {
      setPartsUsed([...activeJob.partsUsed]);
    }
  }, [activeJob?.id]);

  const handleAddPart = () => {
    if (!selectedPartId) return;

    if (selectedPartId.startsWith('inv-')) {
      const invId = Number(selectedPartId.replace('inv-', ''));
      const part = parts.find(p => p.id === invId);
      if (!part) return;
      setPartsUsed(prev => [...prev, { name: part.name, qty: partQty, price: part.price }]);
    } else if (selectedPartId.startsWith('list-')) {
      const partName = selectedPartId.replace('list-', '');
      const price = partsItems?.find(i => i.name === partName)?.price || 0;
      setPartsUsed(prev => [...prev, { name: partName, qty: partQty, price }]);
    }

    setPartsModalOpen(false);
    setSelectedPartId('');
    setPartQty(1);
    showToast('Part added', 'success');
  };

  const removePart = (idx: number) => {
    setPartsUsed(prev => prev.filter((_, i) => i !== idx));
  };

  const handleNeedParts = async () => {
    if (!activeJob) return;
    try {
      await markPartsNeeded(activeJob.id, [{ name: 'Requested part', status: 'pending' }]);
      showToast('Parts request sent!', 'info');
      navigate('/mechanic/today');
    } catch {
      // Error toast shown by context
    }
  };

  const handleComplete = async () => {
    if (!activeJob) return;
    try {
      await completeJob(activeJob.id, partsUsed);
      setPartsUsed([]);
      const needsQc = ['repair', 'makeover'].includes(activeJob.serviceType);
      showToast(needsQc ? 'Sent for QC check!' : 'Job completed!', 'success');
      // Notify customer via WhatsApp
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
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🔧</div>
        <p className="text-grey-muted">No active job</p>
        <p className="text-xs text-grey-light mt-1">Start one from Today tab</p>
      </div>
    );
  }

  const st = SERVICE_TYPES[activeJob.serviceType] || SERVICE_TYPES.regular;
  const jobServices = activeJob.services || [];
  const jobCheckinParts = activeJob.checkinParts || [];

  // Parse photos and audio from job record
  const jobPhotos = parsePhotoUrls(activeJob.photoBefore);
  const audioUrl = activeJob.photoAfter || '';

  // Deduplicate checkinParts for bill display
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
    <div className="space-y-4">
      {/* Job Info */}
      <Card className="text-center space-y-2">
        <h3 className="font-bold text-lg">{activeJob.bike}</h3>
        <p className="text-sm text-grey-muted">{activeJob.customerName}</p>

        {/* Service type — big bold display */}
        {jobServices.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {jobServices.map((svc, i) => {
              const svcPrice = serviceItems?.find(s => s.name === svc)?.price || 0;
              return (
                <div key={`svc-${i}`} className="bg-blue-primary text-white px-4 py-2 rounded-xl">
                  <span className="text-base font-bold">{svc}</span>
                  {svcPrice > 0 && <span className="text-sm ml-1.5 opacity-80">₹{svcPrice}</span>}
                </div>
              );
            })}
          </div>
        )}

        {activeJob.issue && (
          <p className="text-xs text-grey-muted italic">"{activeJob.issue}"</p>
        )}

        {laborCharge > 0 && (
          <div className="inline-block bg-green-success/10 rounded-xl px-5 py-2.5">
            <span className="text-xl font-bold text-green-success">{formatCurrency(laborCharge)}</span>
            <span className="text-xs text-green-success/70 ml-1">total</span>
          </div>
        )}
      </Card>

      {/* Check-in Photos */}
      {jobPhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Image size={14} /> Check-in Photos
          </h4>
          <div className="flex flex-wrap gap-2">
            {jobPhotos.map((url, i) => (
              <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-grey-border">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Note */}
      {audioUrl && (
        <div>
          <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Volume2 size={14} /> Voice Note
          </h4>
          <audio controls className="w-full h-10" preload="metadata">
            <source src={audioUrl} />
          </audio>
        </div>
      )}

      {/* Parts from check-in — bill format */}
      {checkinPartsBill.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package size={14} /> Parts (from check-in)
          </h4>
          <div className="border border-grey-border rounded-xl overflow-hidden">
            <div className="divide-y divide-grey-border/50">
              {checkinPartsBill.map(p => (
                <div key={p.name} className="flex items-center justify-between px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {p.price > 0 && <span className="text-[11px] text-grey-muted ml-1">₹{p.price}</span>}
                  </div>
                  {p.qty > 1 && <span className="text-xs text-grey-muted mx-2">x{p.qty}</span>}
                  {p.price > 0 && <span className="text-sm font-bold">₹{p.price * p.qty}</span>}
                </div>
              ))}
            </div>
            {checkinPartsTotal > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-orange-light/30 border-t border-grey-border">
                <span className="text-xs font-bold text-grey-muted">Parts Total</span>
                <span className="text-sm font-bold text-orange-action">₹{checkinPartsTotal}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts Used */}
      <div>
        <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2">Parts Used</h4>
        {partsUsed.length === 0 ? (
          <p className="text-xs text-grey-light">No parts added yet</p>
        ) : (
          <div className="space-y-2">
            {partsUsed.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-grey-muted">Qty: {p.qty} {p.price > 0 ? `• ${formatCurrency(p.price)}` : ''}</div>
                </div>
                <button onClick={() => removePart(i)} className="text-red-urgent text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-light cursor-pointer">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" block className="mt-3" onClick={() => setPartsModalOpen(true)}>
          + Add Part
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <ActionBtn icon="🔧" label="Need Parts" onClick={handleNeedParts} />
        <ActionBtn icon="💡" label="Need Help" onClick={() => showToast('Help request sent!', 'info')} />
        <ActionBtn
          icon={isPaused ? '▶️' : '⏸️'}
          label={isPaused ? 'Resume' : 'Pause'}
          active={isPaused}
          onClick={async () => {
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

      <Button variant="success" size="lg" block onClick={handleComplete}>
        COMPLETE JOB
      </Button>

      {/* Parts Modal */}
      <Modal open={partsModalOpen} onClose={() => setPartsModalOpen(false)} title="Add Part Used">
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-grey-muted block mb-1">Part Name</label>
            <select
              value={selectedPartId}
              onChange={e => setSelectedPartId(e.target.value)}
              className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value="">Select a part...</option>
              {parts.length > 0 && (
                <optgroup label="Inventory">
                  {parts.map(p => (
                    <option key={p.id} value={`inv-${p.id}`}>{p.name} (₹{p.price}) - Stock: {p.stock}</option>
                  ))}
                </optgroup>
              )}
              {partsList.length > 0 && (
                <optgroup label="Parts List">
                  {partsList.map(p => (
                    <option key={p} value={`list-${p}`}>{p}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-grey-muted block mb-1">Quantity</label>
            <input
              type="number" min="1" value={partQty}
              onChange={e => setPartQty(Number(e.target.value) || 1)}
              className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" block onClick={() => setPartsModalOpen(false)}>Cancel</Button>
          <Button variant="success" block disabled={!selectedPartId} onClick={handleAddPart}>Add Part</Button>
        </div>
      </Modal>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors cursor-pointer
        ${active ? 'bg-orange-light border-orange-action' : 'bg-white border-grey-border hover:bg-grey-bg'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
