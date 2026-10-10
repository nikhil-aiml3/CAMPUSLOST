import { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, Edit2, Trash2, CheckCircle2, Package, Loader2,
  Save, X, AlertCircle, MapPin, Calendar, ShieldQuestion, Check, XCircle,
  Hand, Inbox, MessageCircle, Ban, Sparkles, Gift, Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import type { LostFoundItem, Claim, Profile, Redemption } from '@/types';
import { statusBadgeClass, statusDotClass, capitalizeStatus, claimStatusBadgeClass } from '@/types';
import Modal from '@/components/Modal';
import EditItemModal from '@/components/EditItemModal';
import ChatDrawer from '@/components/ChatDrawer';

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { profile, session, refreshProfile } = useAuth();
  const [myItems, setMyItems] = useState<LostFoundItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItem, setEditingItem] = useState<LostFoundItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LostFoundItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [claimActionLoading, setClaimActionLoading] = useState<string | null>(null);
  const [chatItem, setChatItem] = useState<LostFoundItem | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [chatPartnerProfile, setChatPartnerProfile] = useState<Profile | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_contact || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadMyItems = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from('lost_found_items')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setMyItems((data as LostFoundItem[]) || []);
    setLoadingItems(false);
  }, [session]);

  const loadClaims = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingClaims(true);
    const { data } = await supabase
      .from('claims')
      .select('*')
      .in('item_id', myItems.map((i) => i.id))
      .order('created_at', { ascending: false });
    setClaims((data as Claim[]) || []);
    setLoadingClaims(false);
  }, [session, myItems]);

  useEffect(() => { loadMyItems(); }, [loadMyItems]);
  useEffect(() => {
    if (myItems.length > 0) loadClaims();
    else { setClaims([]); setLoadingClaims(false); }
  }, [myItems, loadClaims]);

  const loadRedemptions = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRedemptions((data as Redemption[]) || []);
  }, [session?.user?.id]);

  useEffect(() => { loadRedemptions(); }, [loadRedemptions]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setWhatsapp(profile?.whatsapp_contact || '');
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setProfileError(null);
    if (!fullName.trim()) { setProfileError('Name cannot be empty.'); return; }
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), whatsapp_contact: whatsapp.trim() || null })
      .eq('id', profile.id);
    setSavingProfile(false);
    if (error) { setProfileError('Could not save changes. Please try again.'); return; }
    await refreshProfile();
    setEditingProfile(false);
  };

  const handleResolve = async (item: LostFoundItem) => {
    const { error } = await supabase
      .from('lost_found_items')
      .update({ status: 'resolved', claimed: true })
      .eq('id', item.id);
    if (!error) loadMyItems();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('lost_found_items').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    if (!error) {
      setMyItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      setConfirmDelete(null);
    }
  };

  const handleEditSaved = (updated: LostFoundItem) => {
    setMyItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditingItem(null);
  };

  const openChat = async (item: LostFoundItem, claimantId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', claimantId)
      .maybeSingle();
    setChatPartnerProfile((data as Profile) || null);
    setChatPartnerId(claimantId);
    setChatItem(item);
  };

  const handleClaimAction = async (claim: Claim, action: 'approved' | 'rejected') => {
    setClaimActionLoading(claim.id);
    const { error } = await supabase
      .from('claims')
      .update({ status: action })
      .eq('id', claim.id);
    if (!error) {
      if (action === 'approved') {
        // Update item to resolved
        await supabase
          .from('lost_found_items')
          .update({ status: 'resolved', claimed: true, claim_pending: false })
          .eq('id', claim.item_id);
        // Notify the claimant their claim was approved
        await createNotification(
          claim.claimant_id,
          'status_update',
          'Claim Approved!',
          `Your claim for "${itemById(claim.item_id)?.name || 'an item'}" has been approved.`,
          claim.item_id,
        );
        loadMyItems();
      } else {
        // Notify the claimant their claim was rejected
        await createNotification(
          claim.claimant_id,
          'status_update',
          'Claim Rejected',
          `Your claim for "${itemById(claim.item_id)?.name || 'an item'}" was not approved.`,
          claim.item_id,
        );
      }
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? { ...c, status: action } : c)));
    }
    setClaimActionLoading(null);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none';

  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const itemById = (id: string) => myItems.find((i) => i.id === id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600">
        ← Back to Dashboard
      </button>

      {/* Profile card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
          {!editingProfile ? (
            <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200">
              <Edit2 size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditingProfile(false); setProfileError(null); }} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <X size={14} /> Cancel
              </button>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <User size={18} className="shrink-0 text-slate-400" />
              {editingProfile ? (
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={inputClass} />
              ) : (
                <span className="font-semibold text-slate-800">{profile.full_name}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} className="shrink-0 text-slate-400" />
              <span className="text-sm text-slate-600">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="shrink-0 text-slate-400" />
              {editingProfile ? (
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1 234 567 8900" className={inputClass} />
              ) : (
                <span className="text-sm text-slate-600">{profile.whatsapp_contact || 'Not provided'}</span>
              )}
            </div>
          </div>
        </div>
        {profileError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
            <AlertCircle size={16} /> {profileError}
          </div>
        )}
      </div>

      {/* Points & Achievements */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-emerald-50 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Points</p>
            <p className="text-2xl font-bold text-indigo-700">{profile.points || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Items Returned</p>
            <p className="text-2xl font-bold text-slate-800">{myItems.filter((i) => i.status === 'resolved').length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Vouchers Redeemed</p>
            <p className="text-2xl font-bold text-slate-800">{redemptions.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Claims Review */}
      {pendingClaims.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldQuestion size={20} className="text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Pending Claims</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{pendingClaims.length}</span>
          </div>
          <div className="space-y-3">
            {pendingClaims.map((claim) => {
              const item = itemById(claim.item_id);
              return (
                <div key={claim.id} className="rounded-xl border border-amber-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{item?.name || 'Unknown item'}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Claimed by <strong>{claim.claimant_name}</strong> ({claim.claimant_email})
                      </p>
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-xs font-medium text-slate-400">Their answer:</span>
                        <span className="text-sm font-medium text-slate-700">"{claim.submitted_answer}"</span>
                        {claim.answer_correct ? (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Correct</span>
                        ) : (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Incorrect</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleClaimAction(claim, 'approved')}
                        disabled={claimActionLoading === claim.id}
                        title="Approve claim"
                        className="rounded-lg bg-emerald-100 p-2 text-emerald-700 transition-all hover:bg-emerald-200 disabled:opacity-50"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleClaimAction(claim, 'rejected')}
                        disabled={claimActionLoading === claim.id}
                        title="Reject claim"
                        className="rounded-lg bg-rose-100 p-2 text-rose-700 transition-all hover:bg-rose-200 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Listed Items */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Package size={20} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">My Listed Items</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{myItems.length}</span>
        </div>

        {loadingItems ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : myItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="mt-3 text-sm text-slate-400">You haven't posted any items yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myItems.map((item) => {
              const itemClaims = claims.filter((c) => c.item_id === item.id);
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300"><Package size={20} /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-slate-800">{item.name}</h4>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.date).toLocaleDateString()}</span>
                        {item.verification_question && (
                          <span className="flex items-center gap-1 text-emerald-500"><ShieldQuestion size={12} /> Verified</span>
                        )}
                      </div>
                    </div>
                    <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${statusBadgeClass(item.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(item.status)}`} />
                      {capitalizeStatus(item.status)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.status !== 'resolved' && (
                        <button onClick={() => handleResolve(item)} title="Mark Resolved" className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50">
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => setEditingItem(item)} title="Edit" className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setConfirmDelete(item)} title="Delete" className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Claims on this item */}
                  {itemClaims.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Hand size={12} /> {itemClaims.length} claim{itemClaims.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1.5">
                        {itemClaims.map((claim) => (
                          <div key={claim.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                            <span className="font-medium text-slate-600">{claim.claimant_name}</span>
                            <span className="text-slate-400">answered: "{claim.submitted_answer}"</span>
                            {claim.locked && (
                              <span className="flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                                <Ban size={10} /> Locked
                              </span>
                            )}
                            <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${claimStatusBadgeClass(claim.status)}`}>
                              {claim.status}
                            </span>
                            {claim.answer_correct && (
                              <button
                                onClick={() => openChat(item, claim.claimant_id)}
                                title="Open chat"
                                className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
                              >
                                <MessageCircle size={12} /> Chat
                              </button>
                            )}
                            {claim.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => handleClaimAction(claim, 'approved')} disabled={claimActionLoading === claim.id} className="rounded p-1 text-emerald-600 hover:bg-emerald-100">
                                  <Check size={12} />
                                </button>
                                <button onClick={() => handleClaimAction(claim, 'rejected')} disabled={claimActionLoading === claim.id} className="rounded p-1 text-rose-600 hover:bg-rose-100">
                                  <XCircle size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Claims History (if any resolved/rejected) */}
      {claims.filter((c) => c.status !== 'pending').length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Inbox size={20} className="text-slate-500" />
            <h2 className="text-lg font-bold text-slate-900">Claims History</h2>
          </div>
          <div className="space-y-2">
            {claims.filter((c) => c.status !== 'pending').map((claim) => {
              const item = itemById(claim.item_id);
              return (
                <div key={claim.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-700">{item?.name || 'Unknown'}</span>
                  <span className="text-slate-400">— {claim.claimant_name}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${claimStatusBadgeClass(claim.status)}`}>
                    {claim.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gift size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Redeemed Vouchers</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{redemptions.length}</span>
          </div>
          <div className="space-y-3">
            {redemptions.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Gift size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{r.reward_name}</p>
                  <p className="text-xs text-slate-400">{r.points_cost} points &middot; {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <code className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold tracking-wider text-white">
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
            ))}
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item" maxWidth="max-w-lg">
        {editingItem && (
          <EditItemModal item={editingItem} onSaved={handleEditSaved} onClose={() => setEditingItem(null)} />
        )}
      </Modal>

      {/* Chat Drawer */}
      {chatItem && chatPartnerId && (
        <ChatDrawer
          item={chatItem}
          otherUserId={chatPartnerId}
          otherUserProfile={chatPartnerProfile}
          onClose={() => { setChatItem(null); setChatPartnerId(null); }}
        />
      )}

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Item" maxWidth="max-w-sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
