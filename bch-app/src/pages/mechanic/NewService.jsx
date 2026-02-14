import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SERVICE_TYPES } from '../../lib/constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function NewService() {
  const { createJob, mechanics, showToast } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    bike: '',
    serviceType: '',
    issue: '',
    priority: 'standard',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    if (!form.customerName.trim()) { showToast('Enter customer name', 'error'); return; }
    if (!form.bike.trim()) { showToast('Enter bike model', 'error'); return; }
    if (!form.serviceType) { showToast('Select service type', 'error'); return; }

    const job = createJob(form);
    const mech = mechanics.find(m => m.id === job.mechanicId);
    showToast(`Checked in! Assigned to ${mech?.name || 'queue'}`, 'success');

    setForm({ customerName: '', customerPhone: '', bike: '', serviceType: '', issue: '', priority: 'standard' });
    navigate('/mechanic/today');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold">New Service Check-In</h3>

      {/* Photo */}
      <div className="h-28 border-2 border-dashed border-grey-border rounded-2xl flex flex-col items-center justify-center text-grey-muted cursor-pointer hover:bg-grey-bg transition-colors">
        <span className="text-3xl mb-1">📷</span>
        <span className="text-sm">Tap to take bike photo</span>
      </div>

      {/* Form Fields */}
      <FormField label="Customer Name">
        <input
          value={form.customerName}
          onChange={e => update('customerName', e.target.value)}
          placeholder="Enter name"
          className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white focus:border-blue-primary focus:ring-1 focus:ring-blue-primary outline-none transition-colors"
        />
      </FormField>

      <FormField label="Phone Number">
        <input
          type="tel"
          value={form.customerPhone}
          onChange={e => update('customerPhone', e.target.value)}
          placeholder="+91-XXXXXXXXXX"
          className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white focus:border-blue-primary focus:ring-1 focus:ring-blue-primary outline-none transition-colors"
        />
      </FormField>

      <FormField label="Bike Model">
        <input
          value={form.bike}
          onChange={e => update('bike', e.target.value)}
          placeholder="e.g. Hero Splendor Plus"
          className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white focus:border-blue-primary focus:ring-1 focus:ring-blue-primary outline-none transition-colors"
        />
      </FormField>

      {/* Service Type */}
      <FormField label="Service Type">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SERVICE_TYPES).map(([key, st]) => (
            <button
              key={key}
              onClick={() => update('serviceType', st.id)}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer
                ${form.serviceType === st.id
                  ? 'border-blue-primary bg-blue-light'
                  : 'border-grey-border bg-white hover:bg-grey-bg'}`}
            >
              <div className="text-2xl">{st.icon}</div>
              <div className="text-xs font-semibold mt-1">{st.label}</div>
              <div className="text-xs text-grey-muted">₹{st.price > 0 ? st.price.toLocaleString() : 'Free'}</div>
            </button>
          ))}
        </div>
      </FormField>

      {/* Issue */}
      <FormField label="Issue / Notes">
        <textarea
          value={form.issue}
          onChange={e => update('issue', e.target.value)}
          rows={2}
          placeholder="Describe the issue..."
          className="w-full border border-grey-border rounded-xl px-3 py-2.5 text-sm bg-white focus:border-blue-primary focus:ring-1 focus:ring-blue-primary outline-none transition-colors resize-none"
        />
      </FormField>

      {/* Priority */}
      <FormField label="Priority">
        <div className="flex gap-2">
          <button
            onClick={() => update('priority', 'standard')}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
              ${form.priority === 'standard'
                ? 'border-orange-action bg-orange-light text-orange-action'
                : 'border-grey-border text-grey-muted'}`}
          >
            Standard
          </button>
          <button
            onClick={() => update('priority', 'urgent')}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
              ${form.priority === 'urgent'
                ? 'border-red-urgent bg-red-light text-red-urgent'
                : 'border-grey-border text-grey-muted'}`}
          >
            🚨 Urgent
          </button>
        </div>
      </FormField>

      <Button size="lg" block onClick={handleSubmit}>
        ✔ CHECK IN BIKE
      </Button>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-grey-muted block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
