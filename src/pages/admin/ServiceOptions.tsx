import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { serviceOptionsService } from '../../services/serviceOptionsService';
import type { ServiceOption } from '../../services/serviceOptionsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, Check, X } from 'lucide-react';

type Tab = 'service' | 'part';

export default function ServiceOptions() {
  const { showToast, refreshServiceOptions } = useApp();
  const [tab, setTab] = useState<Tab>('service');
  const [items, setItems] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Load items
  const loadItems = async () => {
    if (!navigator.onLine) { setLoading(false); return; }
    try {
      const all = await serviceOptionsService.getAll();
      setItems(all);
      refreshServiceOptions();
    } catch (err) {
      console.error('Failed to load service options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const filtered = items
    .filter(i => i.type === tab)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Add item
  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { showToast('Enter a name', 'error'); return; }

    setAdding(true);
    try {
      await serviceOptionsService.create(tab, name, Number(newPrice) || 0);
      setNewName('');
      setNewPrice('');
      await loadItems();
      showToast(`${tab === 'service' ? 'Service' : 'Part'} added`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  // Edit item
  const startEdit = (item: ServiceOption) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price || ''));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) { showToast('Name cannot be empty', 'error'); return; }

    try {
      await serviceOptionsService.update(editingId, name, Number(editPrice) || 0);
      setEditingId(null);
      setEditName('');
      setEditPrice('');
      await loadItems();
      showToast('Updated', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      showToast(msg, 'error');
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    try {
      await serviceOptionsService.remove(id);
      await loadItems();
      showToast('Removed', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove';
      showToast(msg, 'error');
    }
  };

  // Reorder: move up/down by swapping with neighbor
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const idA = filtered[index].id;
    const idB = filtered[targetIdx].id;

    // Optimistic UI swap
    setItems(prev => {
      const next = [...prev];
      const a = next.find(i => i.id === idA);
      const b = next.find(i => i.id === idB);
      if (a && b) {
        const tmp = a.sortOrder;
        a.sortOrder = b.sortOrder;
        b.sortOrder = tmp;
      }
      return next;
    });

    try {
      await serviceOptionsService.swap(idA, idB);
    } catch (err) {
      await loadItems(); // Rollback
      const msg = err instanceof Error ? err.message : 'Failed to reorder';
      showToast(msg, 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-bold">Manage Services & Parts</h3>

      {/* Tab Toggle — iOS-style pill selector */}
      <div className="flex gap-1 bg-grey-bg rounded-2xl p-1.5">
        <button
          onClick={() => setTab('service')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer
            ${tab === 'service' ? 'bg-white text-grey-text shadow-card' : 'text-grey-muted hover:text-grey-text'}`}
        >
          Services
        </button>
        <button
          onClick={() => setTab('part')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer
            ${tab === 'part' ? 'bg-white text-grey-text shadow-card' : 'text-grey-muted hover:text-grey-text'}`}
        >
          Parts
        </button>
      </div>

      {/* Items List — Grouped */}
      {filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-[13px] text-grey-muted">No {tab === 'service' ? 'services' : 'parts'} added yet</p>
        </Card>
      ) : (
        <Card className="divide-y divide-grey-border/50 overflow-hidden !p-0">
          {filtered.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 py-3 px-4 hover:bg-admin-card-hover transition-colors duration-150">
              {/* Rank number */}
              <span className="w-7 h-7 rounded-lg bg-grey-bg text-grey-muted text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              {/* Name or edit input */}
              {editingId === item.id ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 border border-blue-primary rounded-lg px-2 py-1.5 text-sm"
                    placeholder="Name"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <input
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="w-20 border border-blue-primary rounded-lg px-2 py-1.5 text-sm"
                    placeholder="₹ Price"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <button onClick={saveEdit} className="text-green-success cursor-pointer p-1"><Check size={16} /></button>
                  <button onClick={cancelEdit} className="text-grey-muted cursor-pointer p-1"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{item.name}</span>
                  {item.price > 0 && (
                    <span className="text-[11px] text-grey-muted">₹{item.price}</span>
                  )}
                </div>
              )}

              {/* Actions (hidden when editing) */}
              {editingId !== item.id && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-grey-bg cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === filtered.length - 1}
                    className="p-1.5 rounded-lg hover:bg-grey-bg cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-light text-blue-primary cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-light text-red-urgent cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Add New Item */}
      <Card className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Add new ${tab === 'service' ? 'service' : 'part'}...`}
            className="flex-1 min-w-0 border border-grey-border rounded-xl px-3 py-2.5 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <input
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            placeholder="₹ Price"
            type="number"
            min="0"
            inputMode="numeric"
            className="w-24 shrink-0 border border-grey-border rounded-xl px-3 py-2.5 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>
        <Button size="sm" block onClick={handleAdd} disabled={adding || !newName.trim()}>
          <Plus size={16} className="mr-1" /> Add {tab === 'service' ? 'Service' : 'Part'}
        </Button>
      </Card>

      <p className="text-[11px] text-grey-light text-center">
        Use arrows to reorder. Items appear in this order in the Check-In dropdowns.
      </p>
    </div>
  );
}
