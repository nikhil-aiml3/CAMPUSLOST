import { useEffect, useState } from 'react';
import { Award, Download, X, CheckCircle2, Calendar, MapPin, User, Hand } from 'lucide-react';
import type { LostFoundItem } from '@/types';

interface CertificateProps {
  item: LostFoundItem;
  finderName: string;
  claimantName: string | null;
  onClose: () => void;
}

export default function HandoverCertificate({ item, finderName, claimantName, onClose }: CertificateProps) {
  const [resolvedAt, setResolvedAt] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    setResolvedAt(new Date(item.created_at).toLocaleString());
  }, [item.created_at]);

  const handleDownload = () => {
    const certText = `CAMPUS LOST & FOUND — HANDOVER RECEIPT
=========================================
Item: ${item.name}
Category: ${item.category}
Location: ${item.location}
Date Reported: ${new Date(item.date).toLocaleDateString()}
Finder: ${finderName}
Claimant: ${claimantName || 'N/A'}
Resolution Status: ${item.status.toUpperCase()}
Resolved At: ${resolvedAt}
=========================================
This digital receipt confirms the successful handover of the above item.
Thank you for being a Good Samaritan!`;

    const blob = new Blob([certText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover-receipt-${item.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-scale-in">
        {/* Decorative header bar */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-6 py-5">
          <button onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Handover Receipt</h2>
              <p className="text-xs text-white/80">Official confirmation of item return</p>
            </div>
          </div>
        </div>

        {/* Certificate body */}
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">Item Successfully Resolved</span>
          </div>

          {/* Item details */}
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5">
            <div className="mb-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Item Details</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{item.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Location</p>
                  <p className="font-medium text-slate-700">{item.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Date Reported</p>
                  <p className="font-medium text-slate-700">{new Date(item.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Finder</p>
                  <p className="font-medium text-slate-700">{finderName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hand size={14} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Claimant</p>
                  <p className="font-medium text-slate-700">{claimantName || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium text-slate-400">Resolution Timestamp</span>
            <span className="text-sm font-semibold text-slate-700">{resolvedAt}</span>
          </div>

          {/* Footer message */}
          <p className="text-center text-xs text-slate-400">
            This digital receipt confirms the successful handover of the above item through the Campus Lost &amp; Found Portal.
            Thank you for being a Good Samaritan!
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">
              Close
            </button>
            <button onClick={handleDownload} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700">
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
