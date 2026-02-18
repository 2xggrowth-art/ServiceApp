import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { config } from '../../lib/config';
import { customerService } from '../../services/customerService';
import { bikeService } from '../../services/bikeService';
import { photoService } from '../../services/photoService';
import { offlineDb } from '../../lib/offlineDb';
import type { Bike } from '../../types/bike';
import Button from '../../components/ui/Button';
import MultiPhotoCapture from '../../components/ui/MultiPhotoCapture';
import VoiceInput from '../../components/ui/VoiceInput';
import { ChevronDown, X, Plus, Minus, Trash2 } from 'lucide-react';
import { openWhatsApp } from '../../lib/whatsapp';

interface PartLine {
  name: string;
  qty: number;
  price: number;
}

export default function CheckIn() {
  const { createJob, mechanics, jobs, showToast, serviceList, partsList, serviceItems, partsItems } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerId: '' as string,
    bike: '',
    bikeId: '' as string,
    serviceType: 'regular' as string,
    totalCharge: '',
    issue: '',
    priority: 'standard',
  });
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [partLines, setPartLines] = useState<PartLine[]>([]);
  const [partsOpen, setPartsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // Customer lookup state
  const [customerBikes, setCustomerBikes] = useState<Bike[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Close dropdown on outside click
  const partsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (partsRef.current && !partsRef.current.contains(e.target as Node)) setPartsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  // Add part or increment qty if already in list
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
    setPartLines(prev => {
      return prev
        .map(p => p.name === name ? { ...p, qty: p.qty + delta } : p)
        .filter(p => p.qty > 0);
    });
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

  // Phone number debounced lookup
  useEffect(() => {
    let cancelled = false;
    if (!config.useSupabase) return;
    const phone = form.customerPhone.trim();

    if (phone.length < 10) {
      setCustomerBikes([]);
      setCustomerFound(false);
      setForm(prev => ({ ...prev, customerId: '', bikeId: '' }));
      return;
    }

    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    lookupTimeout.current = setTimeout(async () => {
      if (cancelled) return;
      setIsLookingUp(true);
      try {
        const customers = await customerService.searchByPhone(phone);
        if (cancelled) return;
        if (customers && customers.length > 0) {
          const customer = customers[0];
          setCustomerFound(true);
          setForm(prev => ({
            ...prev,
            customerName: prev.customerName || customer.name,
            customerId: customer.id,
          }));
          const bikes = await bikeService.getByCustomerId(customer.id);
          if (cancelled) return;
          setCustomerBikes(bikes);
        } else {
          setCustomerFound(false);
          setCustomerBikes([]);
          setForm(prev => ({ ...prev, customerId: '', bikeId: '' }));
        }
      } catch {
        // Lookup failed — not critical
      } finally {
        if (!cancelled) setIsLookingUp(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    };
  }, [form.customerPhone]);

  const selectBike = (bike: Bike) => {
    setForm(prev => ({
      ...prev,
      bike: bike.bikeModel,
      bikeId: bike.id,
    }));
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim()) { showToast('Enter customer name', 'error'); return; }
    if (!form.bike.trim()) { showToast('Enter bike model', 'error'); return; }

    setIsSubmitting(true);
    try {
      // Flatten part lines to string array (repeat name by qty for backend compatibility)
      const flatParts = partLines.flatMap(p => Array(p.qty).fill(p.name));

      // Upload photos/audio BEFORE creating job so real URLs are stored
      let photoBefore: string | undefined;
      let photoAfter: string | undefined;

      if (navigator.onLine && config.useSupabase) {
        // Upload to Supabase Storage first, get permanent URLs
        if (photoFiles.length > 0) {
          const urls = await photoService.uploadPhotosOnly(photoFiles);
          if (urls.length > 0) photoBefore = JSON.stringify(urls);
        }
        if (audioFile) {
          const url = await photoService.uploadAudioOnly(audioFile);
          if (url) photoAfter = url;
        }
      } else if (photoFiles.length > 0 || audioFile) {
        // Offline or mock mode: use blob URLs for local display
        if (photoFiles.length > 0) {
          photoBefore = JSON.stringify(photoFiles.map(f => URL.createObjectURL(f)));
        }
        if (audioFile) {
          photoAfter = URL.createObjectURL(audioFile);
        }
      }

      const jobData: Record<string, unknown> = {
        ...form,
        services: selectedService ? [selectedService] : [],
        checkinParts: flatParts,
        laborCharge: form.totalCharge ? Number(form.totalCharge) : undefined,
        bikeId: form.bikeId || undefined,
        customerId: form.customerId || undefined,
        ...(photoBefore && { photoBefore }),
        ...(photoAfter && { photoAfter }),
      };
      const job = await createJob(jobData);
      // Store offline media for later upload when back online
      if (job?.id && !navigator.onLine && (photoFiles.length > 0 || audioFile)) {
        offlineDb.savePendingMedia(
          String(job.id),
          photoFiles,
          audioFile,
        ).catch(() => { });
      }
      const mech = job ? mechanics.find(m => m.id === job.mechanicId) : null;
      showToast(`Checked in! ${mech?.name ? `Assigned to ${mech.name}` : 'Added to queue'}`, 'success');
      // Open WhatsApp to notify customer
      if (form.customerPhone) {
        openWhatsApp(form.customerPhone, 'received', form.customerName, form.bike, form.totalCharge ? Number(form.totalCharge) : undefined, job?.serviceId);
      }
      setForm({ customerName: '', customerPhone: '', customerId: '', bike: '', bikeId: '', serviceType: 'regular', totalCharge: '', issue: '', priority: 'standard' });
      setSelectedService(null);
      setPartLines([]);
      setPhotoFiles([]);
      setAudioFile(null);
      setCustomerBikes([]);
      setCustomerFound(false);
      navigate('/staff/queue');
    } catch (err) {
      console.error('[CheckIn] Error:', err);
      const msg = err instanceof Error ? err.message : 'Check-in failed';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">New Check-In</h3>
            <p className="text-xs text-grey-muted mt-0.5">Register a new service job</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-right">
            <div className="text-[10px] text-blue-600/70 font-medium">Next Service ID</div>
            <div className="text-xs font-mono font-bold text-blue-600">
              BCH-{new Date().toISOString().split('T')[0].replace(/-/g, '')}-{String(jobs.filter(j => j.date === new Date().toISOString().split('T')[0]).length + 1).padStart(3, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Photos — gallery grid style */}
      <div>
        <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Bike Photos</label>
        <MultiPhotoCapture maxPhotos={5} onPhotosChange={setPhotoFiles} disabled={isSubmitting} />
      </div>

      {/* Phone */}
      <FloatingField label="Phone Number" hasValue={!!form.customerPhone}>
        <div className="relative">
          <input type="tel" value={form.customerPhone} maxLength={10}
            onChange={e => update('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number" className="form-input" inputMode="numeric" />
          {isLookingUp && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-grey-muted animate-pulse">Looking up...</span>
          )}
          {customerFound && !isLookingUp && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-green-success font-bold bg-green-light px-2 py-0.5 rounded-full">Returning</span>
          )}
        </div>
      </FloatingField>

      <FloatingField label="Customer Name" hasValue={!!form.customerName}>
        <input value={form.customerName} onChange={e => update('customerName', e.target.value)}
          placeholder="Enter name" className="form-input" />
      </FloatingField>

      {/* Bike picker — saved bikes for returning customer */}
      {customerBikes.length > 0 && (
        <div>
          <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Saved Bikes</label>
          <div className="flex flex-col gap-2">
            {customerBikes.map(bike => (
              <button key={bike.id} onClick={() => selectBike(bike)}
                className={`p-3 rounded-2xl border-2 text-left text-sm transition-all cursor-pointer
                  ${form.bikeId === bike.id
                    ? 'border-blue-primary bg-blue-light shadow-sm'
                    : 'border-grey-border bg-white hover:bg-grey-bg'}`}>
                <span className="font-bold">{bike.bikeModel}</span>
                {bike.registrationNumber && (
                  <span className="text-grey-muted ml-2 text-xs">{bike.registrationNumber}</span>
                )}
              </button>
            ))}
            <button onClick={() => setForm(prev => ({ ...prev, bike: '', bikeId: '' }))}
              className={`p-3 rounded-2xl border-2 border-dashed text-left text-sm transition-all cursor-pointer
                ${!form.bikeId && form.bike === ''
                  ? 'border-blue-primary bg-blue-light/50'
                  : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}>
              <span className="font-semibold">+ Add New Bike</span>
            </button>
          </div>
        </div>
      )}

      {(!form.bikeId || customerBikes.length === 0) && (
        <FloatingField label="Bike Model" hasValue={!!form.bike}>
          <input value={form.bike} onChange={e => update('bike', e.target.value)}
            placeholder="e.g. Hero Splendor Plus" className="form-input" />
        </FloatingField>
      )}

      {/* Service Type — elegant selection card grid with icons */}
      <div>
        <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Service Type</label>
        {serviceList.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {serviceList.map(svc => {
              const price = serviceItems?.find(i => i.name === svc)?.price || 0;
              const isActive = selectedService === svc;
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => setSelectedService(isActive ? null : svc)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                    ${isActive
                      ? 'border-blue-primary bg-blue-light'
                      : 'border-grey-border bg-white hover:bg-grey-bg active:scale-[0.98]'}`}
                >
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-primary' : 'text-grey-text'}`}>{svc}</span>
                  {price > 0 && (
                    <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-primary/70' : 'text-grey-light'}`}>₹{price}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-grey-muted bg-grey-bg rounded-xl p-3 text-center">No services available</p>
        )}
      </div>

      {/* Parts — dropdown with search */}
      <div>
        <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Parts</label>
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
      </div>

      {/* Parts Bill — refined */}
      {partLines.length > 0 && (
        <div className="border border-grey-border/80 rounded-2xl overflow-hidden bg-white">
          <div className="bg-grey-bg/60 px-4 py-2.5 border-b border-grey-border/60">
            <span className="text-[10px] font-bold text-grey-muted uppercase tracking-wider">Parts Summary</span>
          </div>
          <div className="divide-y divide-grey-border/30">
            {partLines.map(p => (
              <div key={p.name} className="flex items-center gap-2 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold block truncate">{p.name}</span>
                  <span className="text-[10px] text-grey-light">₹{p.price} each</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => updatePartQty(p.name, -1)}
                    className="w-7 h-7 rounded-lg bg-grey-bg flex items-center justify-center text-grey-muted hover:bg-grey-border cursor-pointer transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{p.qty}</span>
                  <button type="button" onClick={() => updatePartQty(p.name, 1)}
                    className="w-7 h-7 rounded-lg bg-grey-bg flex items-center justify-center text-grey-muted hover:bg-grey-border cursor-pointer transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-sm font-bold w-14 text-right tabular-nums">₹{p.price * p.qty}</span>
                <button type="button" onClick={() => removePart(p.name)}
                  className="p-1 text-grey-light hover:text-red-urgent cursor-pointer transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-blue-primary/5 border-t border-grey-border/40">
            <span className="text-sm font-bold text-grey-text">
              {selectedService && servicePrice > 0 && (
                <span className="text-grey-muted font-medium text-xs">
                  Service ₹{servicePrice} + Parts ₹{partsTotal} ={' '}
                </span>
              )}
              Total
            </span>
            <span className="text-base font-extrabold text-blue-primary tabular-nums">₹{servicePrice + partsTotal}</span>
          </div>
        </div>
      )}

      {/* Total Charges (auto-calculated, read-only) */}
      <FloatingField label="Total Charges (₹)" hasValue={!!form.totalCharge}>
        <input type="number" inputMode="numeric"
          value={form.totalCharge}
          readOnly
          className="form-input bg-gray-50 cursor-not-allowed" />
      </FloatingField>

      {/* Issue / Notes with secondary utility buttons */}
      <div>
        <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Issue / Notes</label>
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
          <div className="flex items-center gap-2 mt-2 bg-grey-bg/80 rounded-xl px-3 py-2.5 border border-grey-border/50">
            <span className="text-[11px] text-grey-muted font-medium flex-1">Voice note attached ({(audioFile.size / 1024).toFixed(0)} KB)</span>
            <button type="button" onClick={() => setAudioFile(null)}
              className="text-red-urgent/70 text-[11px] font-semibold cursor-pointer hover:text-red-urgent transition-colors">Remove</button>
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className="text-[11px] font-semibold text-grey-muted uppercase tracking-wider block mb-2">Priority</label>
        <div className="flex gap-2.5">
          <button onClick={() => update('priority', 'standard')}
            className={`flex-1 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200 cursor-pointer
              ${form.priority === 'standard'
                ? 'border-blue-primary bg-blue-light text-blue-primary shadow-sm'
                : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}>
            Standard
          </button>
          <button onClick={() => update('priority', 'urgent')}
            className={`flex-1 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200 cursor-pointer
              ${form.priority === 'urgent'
                ? 'border-red-urgent bg-red-light text-red-urgent shadow-sm'
                : 'border-grey-border text-grey-muted hover:bg-grey-bg'}`}>
            Urgent
          </button>
        </div>
      </div>

      <Button size="lg" block onClick={handleSubmit} disabled={isSubmitting}
        className="!rounded-2xl !py-4 !font-extrabold !text-[15px] tracking-wide shadow-md">
        {isSubmitting ? 'Checking in...' : 'CHECK IN BIKE'}
      </Button>
    </div>
  );
}

// --- Parts dropdown with search (tap to add, supports duplicates via qty) ---

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

function FloatingField({ label, children, hasValue }: { label: string; children: React.ReactNode; hasValue?: boolean }) {
  return (
    <div className="relative">
      <label className={`text-[11px] font-semibold uppercase tracking-wider block mb-2 transition-colors ${hasValue ? 'text-blue-primary' : 'text-grey-muted'
        }`}>{label}</label>
      {children}
    </div>
  );
}
