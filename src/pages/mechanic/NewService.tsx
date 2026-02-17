import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import MultiPhotoCapture from '../../components/ui/MultiPhotoCapture';
import { photoService } from '../../services/photoService';
import { offlineDb } from '../../lib/offlineDb';
import VoiceInput from '../../components/ui/VoiceInput';
import { ChevronDown, Plus, Minus, Trash2 } from 'lucide-react';

interface PartLine {
  name: string;
  qty: number;
  price: number;
}

export default function NewService() {
  const { createJob, mechanics, showToast, serviceList, partsList, serviceItems, partsItems } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    bike: '',
    serviceType: 'regular' as string,
    totalCharge: '',
    issue: '',
    priority: 'standard',
  });
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [partLines, setPartLines] = useState<PartLine[]>([]);
  const [partsOpen, setPartsOpen] = useState(false);

  const partsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (partsRef.current && !partsRef.current.contains(e.target as Node)) setPartsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const addPart = (partName: string) => {
    setPartLines(prev => {
      const existing = prev.find(p => p.name === partName);
      if (existing) {
        return prev.map(p => p.name === partName ? { ...p, qty: p.qty + 1 } : p);
      }
      const price = partsItems?.find(i => i.name === partName)?.price || 0;
      return [...prev, { name: partName, qty: 1, price }];
    });
  };

  const updatePartQty = (name: string, delta: number) => {
    setPartLines(prev =>
      prev.map(p => p.name === name ? { ...p, qty: p.qty + delta } : p).filter(p => p.qty > 0)
    );
  };

  const removePart = (name: string) => {
    setPartLines(prev => prev.filter(p => p.name !== name));
  };

  // Auto-calculate total from selected service + parts
  const servicePrice = selectedService
    ? (serviceItems?.find(i => i.name === selectedService)?.price || 0)
    : 0;
  const partsTotal = partLines.reduce((sum, p) => sum + p.price * p.qty, 0);

  useEffect(() => {
    const total = servicePrice + partsTotal;
    setForm(prev => ({ ...prev, totalCharge: total > 0 ? String(total) : '' }));
  }, [servicePrice, partsTotal]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!form.customerName.trim()) { showToast('Enter customer name', 'error'); return; }
    if (!form.bike.trim()) { showToast('Enter bike model', 'error'); return; }

    setIsSubmitting(true);
    try {
      const flatParts = partLines.flatMap(p => Array(p.qty).fill(p.name));
      const jobData = {
        ...form,
        services: selectedService ? [selectedService] : [],
        checkinParts: flatParts,
        laborCharge: form.totalCharge ? Number(form.totalCharge) : undefined,
      };
      const job = await createJob(jobData);
      if (job?.id) {
        if (navigator.onLine) {
          if (photoFiles.length > 0) photoService.uploadPhotos(job.id, photoFiles).catch(() => {});
          if (audioFile) photoService.uploadAudio(job.id, audioFile).catch(() => {});
        } else if (photoFiles.length > 0 || audioFile) {
          offlineDb.savePendingMedia(
            String(job.id),
            photoFiles,
            audioFile,
          ).catch(() => {});
        }
      }
      const mech = job ? mechanics.find(m => m.id === job.mechanicId) : null;
      showToast(`Checked in! ${mech?.name ? `Assigned to ${mech.name}` : 'Added to queue'}`, 'success');
      setForm({ customerName: '', customerPhone: '', bike: '', serviceType: 'regular', totalCharge: '', issue: '', priority: 'standard' });
      setSelectedService(null);
      setPartLines([]);
      setPhotoFiles([]);
      setAudioFile(null);
      navigate('/mechanic/today');
    } catch (err) {
      console.error('[NewService] Error:', err);
      const msg = err instanceof Error ? err.message : 'Check-in failed';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold">New Service Check-In</h3>

      <FormField label="Photos">
        <MultiPhotoCapture maxPhotos={5} onPhotosChange={setPhotoFiles} disabled={isSubmitting} />
      </FormField>

      <FormField label="Customer Name">
        <input value={form.customerName} onChange={e => update('customerName', e.target.value)}
          placeholder="Enter name" className="form-input" />
      </FormField>

      <FormField label="Phone Number">
        <input type="tel" value={form.customerPhone} maxLength={10} inputMode="numeric"
          onChange={e => update('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number" className="form-input" />
      </FormField>

      <FormField label="Bike Model">
        <input value={form.bike} onChange={e => update('bike', e.target.value)}
          placeholder="e.g. Hero Splendor Plus" className="form-input" />
      </FormField>

      {/* Service Type — single select inline buttons */}
      <FormField label="Service Type">
        <div className="flex flex-wrap gap-2">
          {serviceList.length > 0 ? (
            serviceList.map(svc => {
              const price = serviceItems?.find(i => i.name === svc)?.price || 0;
              const isActive = selectedService === svc;
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => setSelectedService(isActive ? null : svc)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                    ${isActive
                      ? 'border-blue-primary bg-blue-light text-blue-primary'
                      : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}
                >
                  {svc}
                  {price > 0 && <span className="text-[11px] ml-1 opacity-70">₹{price}</span>}
                </button>
              );
            })
          ) : (
            <span className="text-sm text-grey-muted">No services available</span>
          )}
        </div>
      </FormField>

      {/* Parts — dropdown with search + quantity */}
      <FormField label="Parts">
        <PartsDropdown
          ref={partsRef}
          isOpen={partsOpen}
          onToggle={() => setPartsOpen(!partsOpen)}
          options={partsList}
          optionItems={partsItems}
          partLines={partLines}
          onAddPart={addPart}
          placeholder="Select parts..."
        />
      </FormField>

      {/* Parts Bill */}
      {partLines.length > 0 && (
        <div className="border border-grey-border rounded-xl overflow-hidden">
          <div className="bg-grey-bg px-3 py-2 border-b border-grey-border">
            <span className="text-xs font-bold text-grey-muted uppercase tracking-wide">Parts Bill</span>
          </div>
          <div className="divide-y divide-grey-border/50">
            {partLines.map(p => (
              <div key={p.name} className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">{p.name}</span>
                  <span className="text-[11px] text-grey-muted">₹{p.price} each</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => updatePartQty(p.name, -1)}
                    className="w-7 h-7 rounded-lg bg-grey-bg flex items-center justify-center text-grey-muted hover:bg-grey-border cursor-pointer transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{p.qty}</span>
                  <button type="button" onClick={() => updatePartQty(p.name, 1)}
                    className="w-7 h-7 rounded-lg bg-grey-bg flex items-center justify-center text-grey-muted hover:bg-grey-border cursor-pointer transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-sm font-bold w-16 text-right">₹{p.price * p.qty}</span>
                <button type="button" onClick={() => removePart(p.name)}
                  className="p-1 text-red-urgent/60 hover:text-red-urgent cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-blue-light/50 border-t border-grey-border">
            <span className="text-sm font-bold text-grey-text">
              {selectedService && servicePrice > 0 && (
                <span className="text-grey-muted font-semibold">
                  Service ₹{servicePrice} + Parts ₹{partsTotal} ={' '}
                </span>
              )}
              Total
            </span>
            <span className="text-base font-bold text-blue-primary">₹{servicePrice + partsTotal}</span>
          </div>
        </div>
      )}

      <FormField label="Labor Charge (₹)">
        <input type="number" inputMode="numeric" min="0"
          value={form.totalCharge}
          onChange={e => update('totalCharge', e.target.value)}
          placeholder="Auto-calculated or enter manually"
          className="form-input" />
      </FormField>

      <FormField label="Issue / Notes">
        <textarea value={form.issue} onChange={e => update('issue', e.target.value)}
          rows={2} placeholder="Describe the issue..." className="form-input resize-none" />
        <VoiceInput
          onTextResult={(text) => setForm(prev => ({
            ...prev,
            issue: prev.issue ? `${prev.issue} ${text}` : text,
          }))}
          onAudioRecorded={(file) => { setAudioFile(file); showToast('Voice note saved!', 'success'); }}
          disabled={isSubmitting}
        />
        {audioFile && (
          <div className="flex items-center gap-2 mt-1.5 bg-grey-bg rounded-xl px-3 py-2">
            <span className="text-xs text-grey-muted font-semibold flex-1">Voice note attached ({(audioFile.size / 1024).toFixed(0)} KB)</span>
            <button type="button" onClick={() => setAudioFile(null)}
              className="text-red-urgent text-xs font-semibold cursor-pointer hover:underline">Remove</button>
          </div>
        )}
      </FormField>

      <FormField label="Priority">
        <div className="flex gap-2">
          <button onClick={() => update('priority', 'standard')}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
              ${form.priority === 'standard'
                ? 'border-orange-action bg-orange-light text-orange-action'
                : 'border-grey-border text-grey-muted'}`}>
            Standard
          </button>
          <button onClick={() => update('priority', 'urgent')}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
              ${form.priority === 'urgent'
                ? 'border-red-urgent bg-red-light text-red-urgent'
                : 'border-grey-border text-grey-muted'}`}>
            Urgent
          </button>
        </div>
      </FormField>

      <Button size="lg" block onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Checking in...' : 'CHECK IN BIKE'}
      </Button>
    </div>
  );
}

// --- Parts dropdown with search (tap to add, supports qty) ---

interface OptionItem {
  name: string;
  price: number;
}

interface PartsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  options: string[];
  optionItems?: OptionItem[];
  partLines: PartLine[];
  onAddPart: (name: string) => void;
  placeholder: string;
}

const PartsDropdown = forwardRef<HTMLDivElement, PartsDropdownProps>(
  ({ isOpen, onToggle, options, optionItems, partLines, onAddPart, placeholder }, ref) => {
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const getPrice = (opt: string) => optionItems?.find(i => i.name === opt)?.price || 0;
    const getQty = (opt: string) => partLines.find(p => p.name === opt)?.qty || 0;

    const filtered = search.trim()
      ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
      : options;

    useEffect(() => {
      if (isOpen && searchRef.current) searchRef.current.focus();
      if (!isOpen) setSearch('');
    }, [isOpen]);

    const totalParts = partLines.reduce((s, p) => s + p.qty, 0);

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white cursor-pointer hover:bg-grey-bg transition-colors"
        >
          <span className={totalParts > 0 ? 'text-grey-text' : 'text-grey-light'}>
            {totalParts > 0 ? `${totalParts} part${totalParts > 1 ? 's' : ''} added` : placeholder}
          </span>
          <ChevronDown size={16} className={`text-grey-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-grey-border rounded-xl shadow-lg max-h-64 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-grey-border p-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search parts..."
                className="w-full px-2.5 py-1.5 text-sm border border-grey-border rounded-lg outline-none focus:border-blue-primary"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-grey-muted text-center">
                  {options.length === 0 ? 'No parts available yet' : 'No matches found'}
                </div>
              ) : (
                filtered.map(opt => {
                  const qty = getQty(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onAddPart(opt)}
                      className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 hover:bg-grey-bg active:bg-blue-light"
                    >
                      <Plus size={14} className="text-blue-primary shrink-0" />
                      <span className="flex-1">{opt}</span>
                      {qty > 0 && (
                        <span className="text-[11px] font-bold text-blue-primary bg-blue-light px-1.5 py-0.5 rounded">
                          x{qty}
                        </span>
                      )}
                      {getPrice(opt) > 0 && (
                        <span className="text-xs text-grey-muted">₹{getPrice(opt)}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-grey-muted uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
