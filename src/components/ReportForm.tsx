import { useState } from 'react';
import { Loader2, Send, Upload, ShieldQuestion } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, REPORT_STATUSES, type ItemCategory, type NewLostFoundItem } from '@/types';

interface ReportFormProps {
  onSubmitted: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  category: ItemCategory;
  status: 'lost' | 'found';
  location: string;
  date: string;
  description: string;
  image_url: string;
  verification_question: string;
  verification_answer: string;
}

export default function ReportForm({ onSubmitted, onCancel }: ReportFormProps) {
  const { profile } = useAuth();

  const [formData, setFormData] = useState<FormState>({
    name: '',
    category: 'Electronics',
    status: 'lost',
    location: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    image_url: '',
    verification_question: '',
    verification_answer: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `items/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('lost-found-images').upload(filePath, file);
      if (uploadError) {
        setError('Could not upload image. You can still use an image URL instead.');
        return;
      }
      const { data: urlData } = supabase.storage.from('lost-found-images').getPublicUrl(filePath);
      update('image_url', urlData.publicUrl);
    } catch {
      setError('Could not upload image. You can still use an image URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.name.trim()) errors.name = 'Item title is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.date) errors.date = 'Date is required';
    if (formData.status === 'found') {
      if (!formData.verification_question.trim()) errors.verification_question = 'Please set a verification question for found items';
      if (!formData.verification_answer.trim()) errors.verification_answer = 'Please provide the expected answer';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);

    const newItem: NewLostFoundItem = {
      name: formData.name.trim(),
      category: formData.category,
      status: formData.status,
      location: formData.location.trim(),
      date: formData.date,
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      reporter_name: profile?.full_name || 'Anonymous',
      reporter_email: profile?.email || '',
      whatsapp_contact: profile?.whatsapp_contact || null,
      verification_question: formData.status === 'found' ? formData.verification_question.trim() || null : null,
      verification_answer: formData.status === 'found' ? formData.verification_answer.trim() || null : null,
    };

    const { error: insertError } = await supabase
      .from('lost_found_items')
      .insert(newItem);

    setSubmitting(false);

    if (insertError) {
      setError('Something went wrong while submitting. Please try again.');
      return;
    }
    onSubmitted();
  };

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${
      hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-indigo-100'
    }`;
  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Reporter info banner */}
      <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
          {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-700">{profile?.full_name}</p>
          <p className="truncate text-xs text-slate-400">Posting as • {profile?.email}</p>
        </div>
      </div>

      {/* Status toggle */}
      <div>
        <label className={labelClass}>Report Type</label>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => update('status', status)}
              className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                formData.status === status
                  ? status === 'lost' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {status === 'lost' ? 'I Lost Something' : 'I Found Something'}
            </button>
          ))}
        </div>
      </div>

      {/* Item title */}
      <div>
        <label className={labelClass}>Item Title <span className="text-rose-500">*</span></label>
        <input type="text" value={formData.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Blue MacBook Pro 14" className={inputClass(!!fieldErrors.name)} />
        {fieldErrors.name && <p className="mt-1 text-xs text-rose-500">{fieldErrors.name}</p>}
      </div>

      {/* Category + Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select value={formData.category} onChange={(e) => update('category', e.target.value as ItemCategory)} className={inputClass()}>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date <span className="text-rose-500">*</span></label>
          <input type="date" value={formData.date} onChange={(e) => update('date', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass(!!fieldErrors.date)} />
          {fieldErrors.date && <p className="mt-1 text-xs text-rose-500">{fieldErrors.date}</p>}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>Campus Location <span className="text-rose-500">*</span></label>
        <input type="text" value={formData.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Library 2nd Floor, Block A" className={inputClass(!!fieldErrors.location)} />
        {fieldErrors.location && <p className="mt-1 text-xs text-rose-500">{fieldErrors.location}</p>}
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Detailed Description</label>
        <textarea value={formData.description} onChange={(e) => update('description', e.target.value)} placeholder="Add any details that would help identify the item (color, brand, distinguishing features)..." rows={3} className={`${inputClass()} resize-none`} />
      </div>

      {/* Image URL / upload */}
      <div>
        <label className={labelClass}>Image (optional)</label>
        <div className="flex gap-2">
          <input type="url" value={formData.image_url} onChange={(e) => update('image_url', e.target.value)} placeholder="Paste image URL..." className={inputClass()} />
          <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-2 h-24 w-full rounded-lg object-cover" />}
      </div>

      {/* Verification question — only for Found items */}
      {formData.status === 'found' && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ShieldQuestion size={18} />
            Ownership Verification
          </div>
          <p className="text-xs text-emerald-600">
            Since you found this item, set a secret question that only the true owner would know.
            Anyone claiming the item must answer it correctly before seeing your contact details.
          </p>
          <div>
            <label className={labelClass}>Verification Question <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.verification_question}
              onChange={(e) => update('verification_question', e.target.value)}
              placeholder="e.g. What color sticker is on the laptop lid?"
              className={inputClass(!!fieldErrors.verification_question)}
            />
            {fieldErrors.verification_question && <p className="mt-1 text-xs text-rose-500">{fieldErrors.verification_question}</p>}
          </div>
          <div>
            <label className={labelClass}>Expected Answer <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.verification_answer}
              onChange={(e) => update('verification_answer', e.target.value)}
              placeholder="e.g. Red Spider-Man"
              className={inputClass(!!fieldErrors.verification_answer)}
            />
            {fieldErrors.verification_answer && <p className="mt-1 text-xs text-rose-500">{fieldErrors.verification_answer}</p>}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}
