import { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Award, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  points: number;
  resolved_count: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    // Get profiles sorted by points
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, points')
      .order('points', { ascending: false })
      .limit(10);

    if (!profiles) {
      setLoading(false);
      return;
    }

    // Get resolved item counts per user
    const { data: resolvedItems } = await supabase
      .from('lost_found_items')
      .select('user_id')
      .eq('status', 'resolved');

    const countMap = new Map<string, number>();
    (resolvedItems || []).forEach((row: { user_id: string | null }) => {
      if (row.user_id) {
        countMap.set(row.user_id, (countMap.get(row.user_id) || 0) + 1);
      }
    });

    const leaderboard: LeaderboardEntry[] = (profiles as Omit<LeaderboardEntry, 'resolved_count'>[]).map((p) => ({
      ...p,
      resolved_count: countMap.get(p.id) || 0,
    }));

    setEntries(leaderboard);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getBadge = (points: number) => {
    if (points >= 100) return { label: 'Gold Samaritan', icon: Crown, color: 'text-amber-500 bg-amber-50 ring-amber-200' };
    if (points >= 50) return { label: 'Silver Samaritan', icon: Medal, color: 'text-slate-500 bg-slate-50 ring-slate-200' };
    if (points >= 20) return { label: 'Bronze Samaritan', icon: Award, color: 'text-orange-600 bg-orange-50 ring-orange-200' };
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200">
          <Trophy size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Good Samaritan Leaderboard</h2>
          <p className="text-sm text-slate-400">Top campus heroes who've reunited the most items</p>
        </div>
      </div>

      {entries.length === 0 || entries.every((e) => e.points === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Trophy size={32} className="text-slate-300" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-700">No heroes yet</h3>
          <p className="mt-1 text-sm text-slate-400">Report found items and help return them to climb the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.filter((e) => e.points > 0).map((entry, idx) => {
            const badge = getBadge(entry.points);
            const BadgeIcon = badge?.icon;
            const rankStyles =
              idx === 0 ? 'ring-amber-300 bg-gradient-to-r from-amber-50 to-orange-50' :
              idx === 1 ? 'ring-slate-200 bg-gradient-to-r from-slate-50 to-slate-100' :
              idx === 2 ? 'ring-orange-200 bg-gradient-to-r from-orange-50 to-amber-50' :
              'ring-slate-200 bg-white';
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${rankStyles}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                  idx === 1 ? 'bg-slate-200 text-slate-700' :
                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                  {entry.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{entry.full_name}</p>
                  <p className="text-xs text-slate-400">{entry.resolved_count} item{entry.resolved_count !== 1 ? 's' : ''} returned</p>
                </div>
                {badge && BadgeIcon && (
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge.color}`}>
                    <BadgeIcon size={12} /> {badge.label}
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">
                  <Trophy size={14} />
                  {entry.points}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
