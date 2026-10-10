import { useState, useEffect, useCallback } from 'react';
import { Coffee, Book, Ticket, Award, Loader2, Check, Sparkles, Gift } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Redemption, RewardItem } from '@/types';
import { REWARD_ITEMS } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  coffee: Coffee,
  book: Book,
  ticket: Ticket,
  award: Award,
};

const colorMap: Record<string, { bg: string; text: string; ring: string; button: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', button: 'bg-amber-600 hover:bg-amber-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', button: 'bg-blue-600 hover:bg-blue-700' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200', button: 'bg-indigo-600 hover:bg-indigo-700' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', button: 'bg-emerald-600 hover:bg-emerald-700' },
};

export default function RewardsStore() {
  const { profile, session, refreshProfile } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<{ reward: RewardItem; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRedemptions = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRedemptions((data as Redemption[]) || []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `CLF-${code}-${Math.floor(Math.random() * 9000 + 1000)}`;
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (!session?.user?.id || !profile) return;
    setError(null);

    if (profile.points < reward.cost) {
      setError(`You need ${reward.cost - profile.points} more points to redeem this reward.`);
      return;
    }

    setRedeeming(reward.id);
    const code = generateCode();

    const { data, error: insertError } = await supabase
      .from('redemptions')
      .insert({
        user_id: session.user.id,
        reward_id: reward.id,
        reward_name: reward.name,
        points_cost: reward.cost,
        code,
        status: 'active',
      })
      .select('*')
      .maybeSingle();

    if (insertError || !data) {
      setError('Could not complete redemption. Please try again.');
      setRedeeming(null);
      return;
    }

    // Deduct points from profile
    await supabase
      .from('profiles')
      .update({ points: profile.points - reward.cost })
      .eq('id', session.user.id);

    await refreshProfile();
    await loadRedemptions();
    setRedeeming(null);
    setSuccessCode({ reward, code });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header with points balance */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white shadow-lg shadow-indigo-200">
            <Gift size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Rewards Store</h2>
            <p className="text-sm text-slate-400">Redeem your Good Samaritan points for campus perks</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-emerald-50 px-5 py-3">
          <Sparkles size={20} className="text-indigo-600" />
          <div>
            <p className="text-xs font-medium text-slate-400">Your Points</p>
            <p className="text-2xl font-bold text-indigo-700">{profile?.points || 0}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {/* Reward cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REWARD_ITEMS.map((reward) => {
          const Icon = iconMap[reward.icon] || Gift;
          const colors = colorMap[reward.color] || colorMap.indigo;
          const canAfford = (profile?.points || 0) >= reward.cost;
          return (
            <div
              key={reward.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                  <Icon size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800">{reward.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{reward.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={16} className="text-indigo-500" />
                  <span className="text-lg font-bold text-indigo-700">{reward.cost}</span>
                  <span className="text-xs text-slate-400">points</span>
                </div>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canAfford || redeeming === reward.id}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${colors.button}`}
                >
                  {redeeming === reward.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                </button>
              </div>
              {!canAfford && (
                <p className="mt-2 text-xs text-slate-400">Need {reward.cost - (profile?.points || 0)} more points</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Redemption history */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <Gift size={20} className="text-indigo-600" /> Your Vouchers
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : redemptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Gift size={28} className="text-slate-300" />
            </div>
            <p className="mt-3 text-sm text-slate-400">No vouchers redeemed yet. Earn points by returning found items!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {redemptions.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 transition-all hover:border-slate-300">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Gift size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{r.reward_name}</p>
                  <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white tracking-wider">
                    {r.code}
                  </code>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    r.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                    r.status === 'used' ? 'bg-slate-50 text-slate-500 ring-slate-200' :
                    'bg-rose-50 text-rose-600 ring-rose-200'
                  }`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success modal */}
      {successCode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSuccessCode(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl animate-scale-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Redemption Successful!</h3>
            <p className="mt-1 text-sm text-slate-500">{successCode.reward.name}</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">Your Redemption Code</p>
              <code className="mt-2 block text-2xl font-bold tracking-widest text-indigo-700">
                {successCode.code}
              </code>
            </div>
            <p className="mt-4 text-xs text-slate-400">Save this code and present it at the relevant campus office to claim your reward.</p>
            <button onClick={() => setSuccessCode(null)} className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
