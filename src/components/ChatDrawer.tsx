import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { LostFoundItem, Message, Profile } from '@/types';

interface ChatDrawerProps {
  item: LostFoundItem;
  otherUserId: string;
  otherUserProfile: Profile | null;
  onClose: () => void;
}

export default function ChatDrawer({ item, otherUserId, otherUserProfile, onClose }: ChatDrawerProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myId = session?.user?.id || '';
  const otherName = otherUserProfile?.full_name || 'Other user';

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('item_id', item.id)
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [item.id, myId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    const { data } = await supabase
      .from('messages')
      .insert({
        item_id: item.id,
        sender_id: myId,
        receiver_id: otherUserId,
        message: newMessage.trim(),
      })
      .select('*')
      .maybeSingle();
    setSending(false);
    if (data) {
      setMessages((prev) => [...prev, data as Message]);
      setNewMessage('');
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-end sm:items-center sm:justify-center animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl animate-slide-up sm:h-[600px] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <MessageCircle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-slate-900">{otherName}</h3>
            <p className="truncate text-xs text-slate-400">Re: {item.name}</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <MessageCircle size={24} className="text-indigo-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">Start the conversation</p>
              <p className="mt-1 text-xs text-slate-400">Coordinate a safe handover for this item.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === myId;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? 'rounded-br-md bg-indigo-600 text-white'
                      : 'rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={`mt-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 p-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
