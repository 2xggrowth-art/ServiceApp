import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SERVICE_TYPES } from '../../lib/constants';
import { config } from '../../lib/config';
import { customerService } from '../../services/customerService';
import { bikeService } from '../../services/bikeService';
import type { Bike } from '../../types/bike';
import Button from '../../components/ui/Button';
import VoiceInput from '../../components/ui/VoiceInput';
import { ChevronDown, X } from 'lucide-react';

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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Customer lookup state
  const [customerBikes, setCustomerBikes] = useState<Bike[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Close dropdowns on outside click
  const servicesRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
      if (partsRef.current && !partsRef.current.contains(e.target as Node)) setPartsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const toggleService = (svc: string) => {
    setSelectedServices(prev =>
      prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]
    );
  };

  const togglePart = (part: string) => {
    setSelectedParts(prev =>
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    );
  };

  // Auto-calculate total charges from selected services + parts prices
  useEffect(() => {
    const svcTotal = selectedServices.reduce((sum, name) => {
      const item = serviceItems?.find(i => i.name === name);
      return sum + (item?.price || 0);
    }, 0);
    const partsTotal = selectedParts.reduce((sum, name) => {
      const item = partsItems?.find(i => i.name === name);
      return sum + (item?.price || 0);
    }, 0);
    const total = svcTotal + partsTotal;
    setForm(prev => ({ ...prev, totalCharge: total > 0 ? String(total) : '' }));
  }, [selectedServices, selectedParts, serviceItems, partsItems]);

  // Phone number debounced lookup
  useEffect(() => {
    let cancelled = false;
    if (!config.useSupabase) return;
    const phone = form.customerPhone.trim();

    // Reset if phone cleared or too short
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
          // Load this customer's bikes
          const bikes = await bikeService.getByCustomerId(customer.id);
          if (cancelled) return;
          setCustomerBikes(bikes);
        } else {
          setCustomerFound(false);
          setCustomerBikes([]);
          setForm(prev => ({ ...prev, customerId: '', bikeId: '' }));
        }
      } catch {
        // Lookup failed — not critical, staff can type manually
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
      const jobData = {
        ...form,
        services: selectedServices,
        checkinParts: selectedParts,
        laborCharge: form.totalCharge ? Number(form.totalCharge) : undefined,
        bikeId: form.bikeId || undefined,
        customerId: form.customerId || undefined,
      };
      const job = await createJob(jobData);
      const mech = mechanics.find(m => m.id === job.mechanicId);
      showToast(`Checked in! ${mech?.name ? `Assigned to ${mech.name}` : 'Added to queue'}`, 'success');
      setForm({ customerName: '', customerPhone: '', customerId: '', bike: '', bikeId: '', serviceType: 'regular', totalCharge: '', issue: '', priority: 'standard' });
      setSelectedServices([]);
      setSelectedParts([]);
      setPhotoTaken(false);
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

      {/* Photo */}
      <div
        onClick={() => setPhotoTaken(true)}
        className={`h-28 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors
          ${photoTaken
            ? 'border-2 border-green-success bg-green-light'
            : 'border-2 border-dashed border-grey-border bg-grey-bg hover:bg-grey-border/30'}`}
      >
        <span className="text-3xl mb-1">📷</span>
        <span className={`text-sm font-semibold ${photoTaken ? 'text-green-success' : 'text-grey-muted'}`}>
          {photoTaken ? 'Photo captured!' : 'Tap to take bike photo'}
        </span>
      </div>

      {/* Form */}
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

      {/* Bike picker — show saved bikes if returning customer */}
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

      {/* Free-text bike input — always shown if no bike selected from picker */}
      {(!form.bikeId || customerBikes.length === 0) && (
        <FormField label="Bike Model">
          <input value={form.bike} onChange={e => update('bike', e.target.value)}
            placeholder="e.g. Hero Splendor Plus" className="form-input" />
        </FormField>
      )}

      {/* Service Type — multi-select dropdown */}
      <FormField label="Service Type">
        <MultiSelectDropdown
          ref={servicesRef}
          isOpen={servicesOpen}
          onToggle={() => { setServicesOpen(!servicesOpen); setPartsOpen(false); }}
          options={serviceList}
          optionItems={serviceItems}
          selected={selectedServices}
          onToggleOption={toggleService}
          placeholder="Select services..."
        />
      </FormField>

      {/* Parts — multi-select dropdown */}
      <FormField label="Parts">
        <MultiSelectDropdown
          ref={partsRef}
          isOpen={partsOpen}
          onToggle={() => { setPartsOpen(!partsOpen); setServicesOpen(false); }}
          options={partsList}
          optionItems={partsItems}
          selected={selectedParts}
          onToggleOption={togglePart}
          placeholder="Select parts..."
        />
      </FormField>

      {/* Total Charges */}
      <FormField label="Total Charges (₹)">
        <input type="number" inputMode="numeric" min="0"
          value={form.totalCharge}
          onChange={e => update('totalCharge', e.target.value)}
          placeholder="Enter total amount"
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
            🚨 Urgent
          </button>
        </div>
      </FormField>

      <Button size="lg" block onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Checking in...' : '✔ CHECK IN BIKE'}
      </Button>
    </div>
  );
}

// --- Multi-select dropdown component ---
import { forwardRef } from 'react';

interface OptionItem {
  name: string;
  price: number;
}

interface MultiSelectDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  options: string[];
  optionItems?: OptionItem[];
  selected: string[];
  onToggleOption: (opt: string) => void;
  placeholder: string;
}

const MultiSelectDropdown = forwardRef<HTMLDivElement, MultiSelectDropdownProps>(
  ({ isOpen, onToggle, options, optionItems, selected, onToggleOption, placeholder }, ref) => {
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const getPrice = (opt: string) => optionItems?.find(i => i.name === opt)?.price || 0;

    const filtered = search.trim()
      ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
      : options;

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchRef.current) searchRef.current.focus();
      if (!isOpen) setSearch('');
    }, [isOpen]);

    return (
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white cursor-pointer hover:bg-grey-bg transition-colors"
        >
          <span className={selected.length > 0 ? 'text-grey-text' : 'text-grey-light'}>
            {selected.length > 0 ? `${selected.length} selected` : placeholder}
          </span>
          <ChevronDown size={16} className={`text-grey-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selected.map(item => (
              <span key={item} className="inline-flex items-center gap-1 bg-blue-light text-blue-primary text-xs font-semibold px-2 py-1 rounded-lg">
                {item}
                <button type="button" onClick={() => onToggleOption(item)} className="cursor-pointer hover:text-red-urgent">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-grey-border rounded-xl shadow-lg max-h-64 flex flex-col">
            {/* Search input */}
            <div className="sticky top-0 bg-white border-b border-grey-border p-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2.5 py-1.5 text-sm border border-grey-border rounded-lg outline-none focus:border-blue-primary"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-grey-muted text-center">
                  {options.length === 0 ? 'No options available yet' : 'No matches found'}
                </div>
              ) : (
                filtered.map(opt => {
                  const isSelected = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onToggleOption(opt)}
                      className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2
                        ${isSelected ? 'bg-blue-light text-blue-primary font-semibold' : 'hover:bg-grey-bg'}`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                        ${isSelected ? 'border-blue-primary bg-blue-primary' : 'border-grey-border'}`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {getPrice(opt) > 0 && (
                        <span className="text-xs text-grey-muted ml-1">₹{getPrice(opt)}</span>
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
