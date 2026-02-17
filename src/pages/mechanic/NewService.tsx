import { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import PhotoCapture from '../../components/ui/PhotoCapture';
import { photoService } from '../../services/photoService';
import VoiceInput from '../../components/ui/VoiceInput';
import { ChevronDown, X } from 'lucide-react';

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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const partsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
      if (partsRef.current && !partsRef.current.contains(e.target as Node)) setPartsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

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
      };
      const job = await createJob(jobData);
      // Upload photo & audio in background (don't block check-in)
      if (job?.id) {
        if (photoFile) photoService.uploadPhoto(job.id, photoFile, 'before').catch(() => {});
        if (audioFile) photoService.uploadAudio(job.id, audioFile).catch(() => {});
      }
      const mech = job ? mechanics.find(m => m.id === job.mechanicId) : null;
      showToast(`Checked in! ${mech?.name ? `Assigned to ${mech.name}` : 'Added to queue'}`, 'success');
      setForm({ customerName: '', customerPhone: '', bike: '', serviceType: 'regular', totalCharge: '', issue: '', priority: 'standard' });
      setSelectedServices([]);
      setSelectedParts([]);
      setPhotoFile(null);
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

      {/* Photo */}
      <PhotoCapture label="Tap to take bike photo" onCapture={setPhotoFile} />

      {/* Form Fields */}
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

      {/* Labor Charge */}
      <FormField label="Labor Charge (₹)">
        <input type="number" inputMode="numeric" min="0"
          value={form.totalCharge}
          onChange={e => update('totalCharge', e.target.value)}
          placeholder="Auto-calculated or enter manually"
          className="form-input" />
      </FormField>

      {/* Issue */}
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

      {/* Priority */}
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

// --- Multi-select dropdown component (same as CheckIn) ---

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
    const getPrice = (opt: string) => optionItems?.find(i => i.name === opt)?.price || 0;
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
          <div className="absolute z-50 mt-1 w-full bg-white border border-grey-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-grey-muted text-center">No options available yet</div>
            ) : (
              options.map(opt => {
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
