import { useState, useEffect } from 'react';
import { Download, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LostFoundItem } from '@/types';
import { statusBadgeClass, statusDotClass, capitalizeStatus } from '@/types';

interface AdminReportProps {
  onDownload: () => void;
}

export default function AdminReport({ onDownload }: AdminReportProps) {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'resolved' | 'claimed' | 'all'>('resolved');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lost_found_items')
        .select('*')
        .order('created_at', { ascending: false });
      setItems((data as LostFoundItem[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = items.filter((i) => {
    if (filter === 'all') return i.status === 'resolved' || i.status === 'claimed';
    return i.status === filter;
  });

  const handleExportCSV = () => {
    const headers = ['Item Title', 'Category', 'Status', 'Location', 'Date', 'Reporter', 'Email', 'WhatsApp'];
    const rows = filtered.map((i) => [
      i.name, i.category, capitalizeStatus(i.status), i.location,
      new Date(i.date).toLocaleDateString(), i.reporter_name, i.reporter_email,
      i.whatsapp_contact || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-lost-found-${filter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onDownload();
  };

  return (
    <div className="space-y-4">
      {/* Filter + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['resolved', 'claimed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All Closed' : f}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-indigo-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{items.filter((i) => i.status === 'resolved').length}</p>
          <p className="text-xs text-indigo-500">Resolved</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{items.filter((i) => i.status === 'claimed').length}</p>
          <p className="text-xs text-amber-500">Claimed</p>
        </div>
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{items.length}</p>
          <p className="text-xs text-slate-500">Total Reports</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <FileSpreadsheet size={28} className="text-slate-300" />
          </div>
          <p className="mt-3 text-sm text-slate-400">No {filter} items to display.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Reporter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item.status)}`} />
                      {capitalizeStatus(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.location}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{item.reporter_name}</p>
                    <p className="text-xs text-slate-400">{item.reporter_email}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
