import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { STATUS, SERVICE_TYPES } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PhotoCapture from '../../components/ui/PhotoCapture';
import { photoService } from '../../services/photoService';
import { Wrench, Package } from 'lucide-react';

export default function ActiveJob() {
  const {
    getMechanicJobs, currentMechanicId, completeJob, markPartsNeeded,
    pauseJob, resumeJob, showToast, parts, partsList
  } = useApp();
  // No manual refresh needed — polling (30s) + realtime + visibility listener handle data freshness
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
      // Inventory part
      const invId = Number(selectedPartId.replace('inv-', ''));
      const part = parts.find(p => p.id === invId);
      if (!part) return;
      setPartsUsed(prev => [...prev, { name: part.name, qty: partQty, price: part.price }]);
    } else if (selectedPartId.startsWith('list-')) {
      // Parts list item (no price)
      const partName = selectedPartId.replace('list-', '');
      setPartsUsed(prev => [...prev, { name: partName, qty: partQty, price: 0 }]);
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

  return (
    <div className="space-y-4">
      {/* Job Info */}
      <Card className="text-center">
        <h3 className="font-bold text-lg">🏍️ {activeJob.bike}</h3>
        <p className="text-sm text-grey-muted">{activeJob.customerName} • {st.label}</p>
        {activeJob.laborCharge != null && activeJob.laborCharge > 0 && (
          <p className="text-sm font-semibold text-blue-primary mt-1">Total Charges: {formatCurrency(activeJob.laborCharge)}</p>
        )}
      </Card>

      {/* Services from check-in */}
      {jobServices.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Wrench size={14} /> Services
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {jobServices.map(svc => (
              <span key={svc} className="bg-blue-light text-blue-primary text-xs font-semibold px-2.5 py-1 rounded-lg">
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parts from check-in */}
      {jobCheckinParts.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-grey-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package size={14} /> Parts (from check-in)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {jobCheckinParts.map(part => (
              <span key={part} className="bg-orange-light text-orange-action text-xs font-semibold px-2.5 py-1 rounded-lg">
                {part}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="grid grid-cols-2 gap-3">
        <PhotoCapture
          label="📷 Before"
          value={activeJob.photoBefore}
          onCapture={(file) => {
            photoService.uploadPhoto(activeJob.id, file, 'before').catch(() => {});
          }}
        />
        <PhotoCapture
          label="📷 After"
          value={activeJob.photoAfter}
          onCapture={(file) => {
            photoService.uploadPhoto(activeJob.id, file, 'after').catch(() => {});
          }}
        />
      </div>

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
                  <div className="text-xs text-grey-muted">Qty: {p.qty} • {formatCurrency(p.price)}</div>
                </div>
                <button onClick={() => removePart(i)} className="text-red-urgent text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-light cursor-pointer">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" block className="mt-3" onClick={() => setPartsModalOpen(true)}>
          ➕ Add Part
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
        ✅ COMPLETE JOB
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
