import { MapPin, Calendar, Clock, ImageOff, Zap } from 'lucide-react';
import type { LostFoundItem } from '@/types';
import { statusBadgeClass, statusDotClass, capitalizeStatus } from '@/types';

interface ItemCardProps {
  item: LostFoundItem;
  onClick: () => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const daysAgo = Math.floor((Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`flex h-full w-full items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
          <ImageOff className="text-slate-300" size={32} />
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${statusBadgeClass(item.status)}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item.status)}`} />
            {capitalizeStatus(item.status)}
          </span>
          {item.high_priority && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              <Zap size={10} /> High Priority
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            {item.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
          {item.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
          {item.description || 'No description provided'}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar size={14} className="shrink-0" />
          <span>{formattedDate}</span>
          <span className="text-slate-300">•</span>
          <Clock size={14} className="shrink-0" />
          <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
        </div>
      </div>
    </button>
  );
}
