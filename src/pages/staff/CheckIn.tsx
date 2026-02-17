import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { config } from '../../lib/config';
import { customerService } from '../../services/customerService';
import { bikeService } from '../../services/bikeService';
import { photoService } from '../../services/photoService';
import type { Bike } from '../../types/bike';
import Button from '../../components/ui/Button';
import PhotoCapture from '../../components/ui/PhotoCapture';
import VoiceInput from '../../components/ui/VoiceInput';
import { ChevronDown, X, Plus, Minus, Trash2 } from 'lucide-react';

interface PartLine {
  name: string;
  qty: number;
  price: number;
}

export default function CheckIn() {
  const { createJob, mechanics, showToast, serviceList, partsList, serviceItems, partsItems } = useApp();
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
      const jobData = {
        ...form,
        services: selectedService ? [selectedService] : [],
        checkinParts: flatParts,
        laborCharge: form.totalCharge ? Number(form.totalCharge) : undefined,
        bikeId: form.bikeId || undefined,
        customerId: form.customerId || undefined,
      };
      const job = await createJob(jobData);
      // Upload photo & audio in background
      if (job?.id) {
        if (photoFile) photoService.uploadPhoto(job.id, photoFile, 'before').catch(() => {});
        if (audioFile) photoService.uploadAudio(job.id, audioFile).catch(() => {});
      }
      const mech = job ? mechanics.find(m => m.id === job.mechanicId) : null;
      showToast(`Checked in! ${mech?.name ? `Assigned to ${mech.name}` : 'Added to queue'}`, 'success');
      setForm({ customerName: '', customerPhone: '', customerId: '', bike: '', bikeId: '', serviceType: 'regular', totalCharge: '', issue: '', priority: 'standard' });
      setSelectedService(null);
      setPartLines([]);
      setPhotoFile(null);
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
    <div className="space-y-4">
      <h3 className="text-base font-bold">New Service Check-In</h3>

      {/* Photo — Camera + Gallery options */}
      <PhotoCapture label="Tap to take bike photo" onCapture={setPhotoFile} />

      {/* Phone */}
      <FormField label="Phone Number">
        <div className="relative">
          <input type="tel" value={form.customerPhone} maxLength={10}
            onChange={e => update('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number" className="form-input" inputMode="numeric" />
          {isLookingUp && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-grey-muted">Looking up...</span>
          )}
          {customerFound && !isLookingUp && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-success font-semibold">Returning customer</span>
          )}
        </div>
      </FormField>

      <FormField label="Customer Name">
        <input value={form.customerName} onChange={e => update('customerName', e.target.value)}
          placeholder="Enter name" className="form-input" />
      </FormField>

      {/* Bike picker — saved bikes for returning customer */}
      {customerBikes.length > 0 && (
        <FormField label="Saved Bikes">
          <div className="flex flex-col gap-1.5">
            {customerBikes.map(bike => (
              <button key={bike.id} onClick={() => selectBike(bike)}
                className={`p-2.5 rounded-xl border-2 text-left text-sm transition-all cursor-pointer
                  ${form.bikeId === bike.id
                    ? 'border-blue-primary bg-blue-light'
                    : 'border-grey-border bg-white hover:bg-grey-bg'}`}>
                <span className="font-semibold">{bike.bikeModel}</span>
                {bike.registrationNumber && (
                  <span className="text-grey-muted ml-2 text-xs">{bike.registrationNumber}</span>
                )}
              </button>
            ))}
            <button onClick={() => setForm(prev => ({ ...prev, bike: '', bikeId: '' }))}
              className={`p-2.5 rounded-xl border-2 text-left text-sm transition-all cursor-pointer
                ${!form.bikeId && form.bike === ''
                  ? 'border-blue-primary bg-blue-light'
                  : 'border-grey-border bg-white hover:bg-grey-bg'}`}>
              <span className="font-semibold text-grey-muted">+ New bike</span>
            </button>
          </div>
        </FormField>
      )}

      {(!form.bikeId || customerBikes.length === 0) && (
        <FormField label="Bike Model">
          <input value={form.bike} onChange={e => update('bike', e.target.value)}
            placeholder="e.g. Hero Splendor Plus" className="form-input" />
        </FormField>
      )}

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

      {/* Parts — dropdown with search, adds with quantity */}
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
          {/* Total row */}
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

      {/* Total Charges (editable) */}
      <FormField label="Total Charges (₹)">
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
