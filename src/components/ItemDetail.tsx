import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Calendar, Tag, User, Mail, MessageCircle, ImageOff,
  Copy, Check, Hand, CheckCircle2, Trash2, RotateCcw, ShieldAlert,
  Send, Loader2, MessagesSquare, ShieldQuestion, Lock, AlertCircle,
  Ban, Sparkles, Package, Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import type { LostFoundItem, ItemStatus, Profile, Claim, SmartMatchResult } from '@/types';
import { statusBadgeClass, statusDotClass, capitalizeStatus, smartMatchItems } from '@/types';
import ChatDrawer from '@/components/ChatDrawer';
import HandoverCertificate from '@/components/HandoverCertificate';

const MAX_ATTEMPTS = 3;

interface ItemDetailProps {
  item: LostFoundItem;
  onClose: () => void;
  onUpdated: (item: LostFoundItem) => void;
  onDeleted: () => void;
  isAdmin: boolean;
}

export default function ItemDetail({ item, onClose, onUpdated, onDeleted, isAdmin }: ItemDetailProps) {
  const { session, profile } = useAuth();
  const [showContact, setShowContact] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState<'email' | 'whatsapp' | null>(null);
  const [showInquiry, setShowInquiry] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [chatPartnerProfile, setChatPartnerProfile] = useState<Profile | null>(null);
  const [existingClaim, setExistingClaim] = useState<Claim | null>(null);
  const [currentItem, setCurrentItem] = useState(item);
  const [posterProfile, setPosterProfile] = useState<Profile | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [smartMatches, setSmartMatches] = useState<SmartMatchResult[]>([]);

  const isOwner = currentItem.user_id === session?.user?.id;

  const fetchPosterProfile = useCallback(async () => {
    if (item.user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', item.user_id)
        .maybeSingle();
      setPosterProfile((data as Profile) || null);
    }
  }, [item.user_id]);

  const fetchExistingClaim = useCallback(async () => {
    if (!session?.user?.id || !item.id) return;
    const { data } = await supabase
      .from('claims')
      .select('*')
      .eq('item_id', item.id)
      .eq('claimant_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingClaim((data as Claim) || null);
  }, [session?.user?.id, item.id]);

  useEffect(() => {
    setCurrentItem(item);
    setPosterProfile(null);
    setShowContact(false);
    setVerifySuccess(false);
    setShowChat(false);
    setExistingClaim(null);
    fetchPosterProfile();
    fetchExistingClaim();
  }, [item, fetchPosterProfile, fetchExistingClaim]);

  // Smart-Match AI: fetch all active items and compute matches
  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('lost_found_items')
        .select('*')
        .in('status', ['lost', 'found'])
        .neq('id', currentItem.id);
      const otherItems = (data as LostFoundItem[]) || [];
      // For a Lost item, match against Found items; for a Found item, match against Lost items
      const targetType = currentItem.status === 'lost' ? 'found' : 'lost';
      const candidates = otherItems.filter((i) => i.status === targetType);
      const query = `${currentItem.name} ${currentItem.description || ''} ${currentItem.location}`;
      setSmartMatches(smartMatchItems(query, candidates, 3));
    };
    if (currentItem.status === 'lost' || currentItem.status === 'found') {
      fetchMatches();
    } else {
      setSmartMatches([]);
    }
  }, [currentItem]);

  const displayName = posterProfile?.full_name || currentItem.reporter_name || 'Anonymous';
  const displayEmail = posterProfile?.email || currentItem.reporter_email;
  const displayWhatsapp = posterProfile?.whatsapp_contact || currentItem.whatsapp_contact;

  const formattedDate = new Date(currentItem.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm reaching out regarding your ${currentItem.status} item: ${currentItem.name}`
  );
  const whatsappUrl = displayWhatsapp
    ? `https://wa.me/${displayWhatsapp.replace(/[\s+()-]/g, '')}?text=${whatsappMessage}`
    : null;

  // Determine if chat is available
  // - Owner can chat if there's an approved/pending claim from someone
  // - Claimant can chat if they verified successfully
  const canClaimantChat = verifySuccess || (existingClaim?.answer_correct && !existingClaim?.locked);
  const isLockedOut = existingClaim?.locked === true;
  const claimantUsedAllAttempts = existingClaim && existingClaim.attempts >= MAX_ATTEMPTS && !existingClaim.answer_correct;

  const updateStatus = async (newStatus: ItemStatus) => {
    setUpdating(true);
    const updates = { status: newStatus, claimed: newStatus === 'claimed' || newStatus === 'resolved' };
    const { error } = await supabase.from('lost_found_items').update(updates).eq('id', currentItem.id);
    setUpdating(false);
    if (error) return;
    const updated = { ...currentItem, ...updates };
    setCurrentItem(updated);
    onUpdated(updated);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('lost_found_items').delete().eq('id', currentItem.id);
    setDeleting(false);
    if (error) return;
    onDeleted();
  };

  const copyToClipboard = (text: string, type: 'email' | 'whatsapp') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const isActive = currentItem.status === 'lost' || currentItem.status === 'found';
  const hasVerification = currentItem.status === 'found' && currentItem.verification_question && currentItem.verification_answer;

  const handleClaimClick = () => {
    if (isLockedOut || claimantUsedAllAttempts) return;
    if (hasVerification) {
      setShowVerify(true);
    } else {
      updateStatus('claimed');
    }
  };

  const handleVerifySuccess = () => {
    setVerifySuccess(true);
    setShowContact(true);
    setShowVerify(false);
    updateStatus('claimed');
    fetchExistingClaim();
  };

  const openChat = async (partnerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle();
    setChatPartnerProfile((data as Profile) || null);
    setChatPartnerId(partnerId);
    setShowChat(true);
  };

  return (
    <div className="space-y-5">
      {/* Image */}
      <div className="relative h-56 overflow-hidden rounded-xl bg-slate-100">
        {currentItem.image_url ? (
          <img src={currentItem.image_url} alt={currentItem.name} className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
        ) : null}
        <div className={`flex h-full w-full items-center justify-center ${currentItem.image_url ? 'hidden' : ''}`}>
          <ImageOff className="text-slate-300" size={40} />
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${statusBadgeClass(currentItem.status)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(currentItem.status)}`} />
            {capitalizeStatus(currentItem.status)}
          </span>
          {currentItem.high_priority && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <Sparkles size={10} /> AI: High Priority
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900">{currentItem.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{currentItem.description || 'No description provided.'}</p>
      </div>

      {/* Verification success banner */}
      {verifySuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 animate-fade-in">
          <CheckCircle2 size={18} />
          Ownership Verified Successfully! You can now contact the finder and use in-app chat.
        </div>
      )}

      {/* Lockout warning */}
      {(isLockedOut || claimantUsedAllAttempts) && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          <Ban size={18} />
          Maximum attempts reached. Verification failed to prevent fraudulent claims.
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><Tag size={14} /> Category</div>
          <p className="mt-1 text-sm font-semibold text-slate-700">{currentItem.category}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><Calendar size={14} /> Date</div>
          <p className="mt-1 text-sm font-semibold text-slate-700">{formattedDate}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><MapPin size={14} /> Location</div>
          <p className="mt-1 text-sm font-semibold text-slate-700">{currentItem.location}</p>
        </div>
      </div>

      {/* AI Smart-Match Suggestions */}
      {smartMatches.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">AI Smart-Match Suggestions</p>
              <p className="text-xs text-slate-400">
                {currentItem.status === 'lost' ? 'Found items that might be yours' : 'Lost items that might match what you found'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {smartMatches.map((match) => (
              <button
                key={match.item.id}
                onClick={() => setCurrentItem(match.item)}
                className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {match.item.image_url ? (
                    <img src={match.item.image_url} alt={match.item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300"><Package size={16} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{match.item.name}</p>
                  <p className="truncate text-xs text-slate-400">{match.item.location} &middot; {capitalizeStatus(match.item.status)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  <Sparkles size={10} /> {match.confidence}% Match
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Poster / Contact section */}
      <div className="rounded-xl border border-slate-200 p-4">
        {!showContact ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                <p className="text-xs text-slate-400">Posted this item</p>
              </div>
            </div>
            {isOwner ? (
              <button onClick={() => setShowContact(true)} className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100">
                View Contact
              </button>
            ) : hasVerification && !verifySuccess && !canClaimantChat ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock size={14} /> Contact locked — verify to reveal
              </div>
            ) : (
              <button onClick={() => setShowContact(true)} className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100">
                View Contact
              </button>
            )}
          </div>
        ) : (
          <div className="animate-fade-in space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                <p className="text-xs text-slate-400">Posted this item</p>
              </div>
            </div>

            {displayEmail && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{displayEmail}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyToClipboard(displayEmail, 'email')} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600" title="Copy email">
                    {copied === 'email' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <a href={`mailto:${displayEmail}`} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-700">Email</a>
                </div>
              </div>
            )}

            {whatsappUrl && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-emerald-700 truncate">
                  <MessageCircle size={16} className="shrink-0" />
                  <span className="truncate">{displayWhatsapp}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyToClipboard(displayWhatsapp!, 'whatsapp')} className="rounded-md p-1.5 text-emerald-400 transition-colors hover:bg-emerald-100 hover:text-emerald-600" title="Copy number">
                    {copied === 'whatsapp' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              </div>
            )}

            {posterProfile && (
              <p className="text-xs text-slate-400">Contact details from {posterProfile.full_name}'s profile.</p>
            )}
          </div>
        )}
      </div>

      {/* Chat section — unlocked after verification */}
      {(canClaimantChat || (isOwner && currentItem.claim_pending)) && currentItem.user_id && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                <MessageCircle size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">In-App Chat</p>
                <p className="text-xs text-slate-400">
                  {canClaimantChat ? 'Chat with the finder to coordinate handover' : 'Chat with the verified claimant'}
                </p>
              </div>
            </div>
            <button
              onClick={() => openChat(canClaimantChat ? currentItem.user_id! : chatPartnerId || session?.user?.id || '')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
            >
              <MessageCircle size={16} />
              Open Chat
            </button>
          </div>
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <ShieldAlert size={16} /> Admin Controls
          </div>
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <button onClick={() => updateStatus('claimed')} disabled={updating} className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-200 disabled:opacity-50">
                <Hand size={14} /> Mark Claimed
              </button>
            )}
            {currentItem.status !== 'resolved' && (
              <button onClick={() => updateStatus('resolved')} disabled={updating} className="flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-200 disabled:opacity-50">
                <CheckCircle2 size={14} /> Mark Resolved
              </button>
            )}
            {currentItem.status === 'resolved' && (
              <button onClick={() => updateStatus('found')} disabled={updating} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-50">
                <RotateCcw size={14} /> Reopen
              </button>
            )}
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-200 disabled:opacity-50">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Post
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">Close</button>
        <button onClick={() => setShowInquiry(true)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">
          <MessagesSquare size={16} />
          <span className="hidden sm:inline">Send Inquiry</span>
        </button>
        {isActive && !isAdmin && !isOwner && !(isLockedOut || claimantUsedAllAttempts) && (
          <button onClick={handleClaimClick} disabled={updating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-60">
            {hasVerification ? <ShieldQuestion size={16} /> : <Hand size={16} />}
            {updating ? 'Updating...' : hasVerification ? 'Verify & Claim' : 'This Is Mine'}
          </button>
        )}
        {(isLockedOut || claimantUsedAllAttempts) && !isOwner && (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            <Ban size={16} /> Locked
          </div>
        )}
        {currentItem.status === 'claimed' && !verifySuccess && !isLockedOut && !claimantUsedAllAttempts && !isOwner && (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
            <Hand size={16} /> Claimed
          </div>
        )}
        {currentItem.status === 'resolved' && (
          <>
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200">
              <CheckCircle2 size={16} /> Resolved
            </div>
            <button
              onClick={() => setShowCertificate(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
            >
              <Award size={16} /> Certificate
            </button>
          </>
        )}
      </div>

      {/* Verify Ownership modal */}
      {showVerify && (
        <VerifyOwnershipModal
          item={currentItem}
          claimantName={profile?.full_name || 'Anonymous'}
          claimantEmail={profile?.email || ''}
          claimantId={session?.user?.id || ''}
          existingClaim={existingClaim}
          onSuccess={handleVerifySuccess}
          onClose={() => setShowVerify(false)}
        />
      )}

      {/* Chat drawer */}
      {showChat && chatPartnerId && (
        <ChatDrawer
          item={currentItem}
          otherUserId={chatPartnerId}
          otherUserProfile={chatPartnerProfile}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Inquiry sub-modal */}
      {showInquiry && <InquiryForm item={currentItem} onClose={() => setShowInquiry(false)} />}

      {/* Handover Certificate */}
      {showCertificate && (
        <HandoverCertificate
          item={currentItem}
          finderName={posterProfile?.full_name || currentItem.reporter_name || 'Anonymous'}
          claimantName={null}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}

// --- Verify Ownership Challenge Modal with 3-attempt limit ---
function VerifyOwnershipModal({
  item, claimantName, claimantEmail, claimantId, existingClaim, onSuccess, onClose,
}: {
  item: LostFoundItem;
  claimantName: string;
  claimantEmail: string;
  claimantId: string;
  existingClaim: Claim | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(
    existingClaim && !existingClaim.answer_correct ? existingClaim.attempts : 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      setError('Please enter your answer.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const isCorrect = answer.trim().toLowerCase() === (item.verification_answer || '').trim().toLowerCase();
    const newAttemptCount = failedAttempts + 1;
    const shouldLock = !isCorrect && newAttemptCount >= MAX_ATTEMPTS;

    // Upsert the claim record
    if (existingClaim) {
      // Update existing claim
      if (isCorrect) {
        await supabase.from('claims').update({
          submitted_answer: answer.trim(),
          answer_correct: true,
          status: 'pending',
          attempts: newAttemptCount,
          locked: false,
        }).eq('id', existingClaim.id);
        await supabase.from('lost_found_items').update({ claim_pending: true }).eq('id', item.id);
      } else {
        await supabase.from('claims').update({
          submitted_answer: answer.trim(),
          answer_correct: false,
          status: 'rejected',
          attempts: newAttemptCount,
          locked: shouldLock,
        }).eq('id', existingClaim.id);
      }
    } else {
      // Insert new claim
      await supabase.from('claims').insert({
        item_id: item.id,
        claimant_id: claimantId,
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        submitted_answer: answer.trim(),
        answer_correct: isCorrect,
        status: isCorrect ? 'pending' : 'rejected',
        attempts: newAttemptCount,
        locked: shouldLock,
      });
      if (isCorrect) {
        await supabase.from('lost_found_items').update({ claim_pending: true }).eq('id', item.id);
      }
    }

    setSubmitting(false);

    if (isCorrect) {
      onSuccess();
    } else {
      setFailedAttempts(newAttemptCount);
      setAnswer('');
      if (shouldLock) {
        setLocked(true);
        setError('Maximum attempts reached. Verification failed to prevent fraudulent claims.');
      } else {
        setError(`Incorrect answer. ${MAX_ATTEMPTS - newAttemptCount} attempt${MAX_ATTEMPTS - newAttemptCount !== 1 ? 's' : ''} remaining.`);
      }
    }
  };

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${
    error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-indigo-100'
  }`;

  if (locked) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Ban size={32} className="text-rose-600" />
          </div>
          <h3 className="mt-4 font-bold text-slate-900">Verification Locked</h3>
          <p className="mt-2 text-sm text-slate-500">
            Maximum attempts reached. Verification failed to prevent fraudulent claims.
          </p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  const remaining = MAX_ATTEMPTS - failedAttempts;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <ShieldQuestion size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Verify Ownership</h3>
            <p className="text-xs text-slate-400">Answer the secret question to claim this item</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Attempt counter */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400">Attempts remaining</span>
            <div className="flex gap-1">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i < remaining ? 'bg-emerald-500' : 'bg-rose-300'}`}
                />
              ))}
            </div>
          </div>

          {/* Question display */}
          <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
            <p className="text-xs font-semibold text-indigo-600">SECURITY QUESTION</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{item.verification_question}</p>
          </div>

          {/* Answer input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Your Answer</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setError(null); }}
              placeholder="Type the correct answer..."
              className={inputClass}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldQuestion size={16} />}
              {submitting ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Inquiry Form ---
function InquiryForm({ item, onClose }: { item: LostFoundItem; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    const { error: insertError } = await supabase.from('inquiries').insert({
      item_id: item.id, sender_name: name.trim(), sender_email: email.trim(), message: message.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError('Could not send inquiry. Please try again.');
      return;
    }
    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl animate-scale-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h3 className="mt-4 font-bold text-slate-900">Inquiry Sent!</h3>
          <p className="mt-1 text-sm text-slate-500">The poster will be notified of your message.</p>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">Send Inquiry</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Your Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Your Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@campus.edu" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Hi, I'd like to ask about: ${item.name}...`} rows={3} className={`${inputClass} resize-none`} />
          </div>
          {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
