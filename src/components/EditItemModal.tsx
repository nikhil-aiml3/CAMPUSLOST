import { useState } from 'react';
import { Loader2, Save, ShieldQuestion } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LostFoundItem, ItemCategory, ItemStatus } from '@/types';
import { CATEGORIES } from '@/types';

interface EditItemModalProps {
  item: LostFoundItem;
  onSaved: (item: LostFoundItem) => void;
  onClose: () => void;
}

const STATUSES: ItemStatus[] = ['lost', 'found', 'claimed', 'resolved'];

export default function EditItemModal({ item, onSaved, onClose }: EditItemModalProps) {
  const [formData, setFormData] = useState({
    name: item.name,
    category: item.category,
    status: item.status,
    location: item.location,
    date: item.date,
    description: item.description || '',
    image_url: item.image_url || '',
    verification_question: item.verification_question || '',
    verification_answer: item.verification_answer || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      setError('Item title and location are required.');
      return;
    }
    if (formData.status === 'found' && (!formData.verification_question.trim() || !formData.verification_answer.trim())) {
      setError('Found items must have a verification question and answer.');
      return;
    }
    setSaving(true);
    const updates = {
      name: formData.name.trim(),
      category: formData.category,
      status: formData.status,
      location: formData.location.trim(),
      date: formData.date,
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      claimed: formData.status === 'claimed' || formData.status === 'resolved',
      verification_question: formData.status === 'found' ? formData.verification_question.trim() || null : null,
      verification_answer: formData.status === 'found' ? formData.verification_answer.trim() || null : null,
    };
    const { data, error: updateError } = await supabase
      .from('lost_found_items')
      .update(updates)
      .eq('id', item.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (updateError || !data) {
      setError('Could not save changes. Please try again.');
      return;
    }
    onSaved(data as LostFoundItem);
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none';
  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Item Title</label>
        <input type="text" value={formData.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select value={formData.category} onChange={(e) => update('category', e.target.value as ItemCategory)} className={inputClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={formData.status} onChange={(e) => update('status', e.target.value as ItemStatus)} className={inputClass}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Location</label>
          <input type="text" value={formData.location} onChange={(e) => update('location', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={formData.date} onChange={(e) => update('date', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={formData.description} onChange={(e) => update('description', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
      </div>
      <div>
        <label className={labelClass}>Image URL</label>
        <input type="url" value={formData.image_url} onChange={(e) => update('image_url', e.target.value)} placeholder="https://..." className={inputClass} />
        {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-2 h-20 w-full rounded-lg object-cover" />}
      </div>

      {/* Verification question editing for Found items */}
      {formData.status === 'found' && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ShieldQuestion size={16} />
            Ownership Verification
          </div>
          <div>
            <label className={labelClass}>Verification Question</label>
            <input type="text" value={formData.verification_question} onChange={(e) => update('verification_question', e.target.value)} placeholder="Secret question only the owner knows..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expected Answer</label>
            <input type="text" value={formData.verification_answer} onChange={(e) => update('verification_answer', e.target.value)} placeholder="The correct answer..." className={inputClass} />
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
