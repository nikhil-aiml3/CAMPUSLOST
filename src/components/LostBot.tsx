import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Sparkles, MessageCircle, Search, Lightbulb, Loader2, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LostFoundItem } from '@/types';
import { smartMatchItems, statusBadgeClass, statusDotClass, capitalizeStatus } from '@/types';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  matchedItems?: { item: LostFoundItem; confidence: number }[];
}

interface LostBotProps {
  onItemClick: (item: LostFoundItem) => void;
  onReport: () => void;
}

export default function LostBot({ onItemClick, onReport }: LostBotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'bot',
      content: "Hi! I'm LostBot, your AI assistant. Tell me what you lost or found — e.g. 'I lost my red calculator in the library' — and I'll search for matches instantly!",
    },
  ]);
  const [allItems, setAllItems] = useState<LostFoundItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('lost_found_items')
      .select('*')
      .in('status', ['lost', 'found'])
      .order('created_at', { ascending: false });
    setAllItems((data as LostFoundItem[]) || []);
  }, []);

  useEffect(() => {
    if (open && allItems.length === 0) loadItems();
  }, [open, allItems.length, loadItems]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const generateResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const matches = smartMatchItems(query, allItems, 3);

    // Detect intent: reporting vs searching
    const isReporting = q.includes('i lost') || q.includes('i found') || q.includes('lost my') || q.includes('found a');
    const isFoundIntent = q.includes('i found') || q.includes('found a');

    if (matches.length > 0) {
      const matchList = matches.map((m) => `"${m.item.name}" (${capitalizeStatus(m.item.status)}, ${m.confidence}% match)`).join(', ');
      let content = '';
      if (isFoundIntent) {
        content = `Great news! I found ${matches.length} potential match${matches.length > 1 ? 'es' : ''} for what you found: ${matchList}. `;
      } else {
        content = `I scanned all active listings and found ${matches.length} potential match${matches.length > 1 ? 'es' : ''}: ${matchList}. `;
      }
      content += 'Tap any card below to view full details. If none of these are it, you can report a new item.';
      return {
        id: `msg-${Date.now()}`,
        role: 'bot',
        content,
        matchedItems: matches,
      };
    }

    if (isReporting) {
      const itemType = isFoundIntent ? 'found' : 'lost';
      return {
        id: `msg-${Date.now()}`,
        role: 'bot',
        content: `I couldn't find any matching ${itemType} items in the database. Here's what I recommend:\n\n1. Report this item using the "Report Item" button — include a clear title, location, and description.\n2. If it's a Found item, set a verification question so only the real owner can claim it.\n3. Check back regularly — new items are posted every day!\n\nWould you like me to help you start a report?`,
      };
    }

    // Generic search guidance
    return {
      id: `msg-${Date.now()}`,
      role: 'bot',
      content: `I couldn't find exact matches for "${query}". Try including the item name, color, or location. For example: "black wallet near the cafeteria" or "lost laptop in Block C". You can also report a new item and I'll alert you if something matching shows up.`,
    };
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages((prev) => [...prev, response]);
      setThinking(false);
    }, 800 + Math.random() * 600);
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-2xl shadow-indigo-300 transition-all hover:scale-110 active:scale-95 animate-bounce-subtle"
          title="Ask LostBot"
        >
          <Bot size={26} />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-white ring-2 ring-white">
            AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[90] flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-3rem))] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Bot size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white">LostBot AI</h3>
              <p className="flex items-center gap-1 text-xs text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online — Smart item matching
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-indigo-600 text-white'
                      : 'rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}>
                    {msg.role === 'bot' && (
                      <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-indigo-600">
                        <Sparkles size={12} /> LostBot
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{formatContent(msg.content)}</p>
                  </div>

                  {/* Matched item cards */}
                  {msg.matchedItems && msg.matchedItems.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.matchedItems.map((match) => (
                        <button
                          key={match.item.id}
                          onClick={() => { onItemClick(match.item); setOpen(false); }}
                          className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:shadow-md"
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
                            <p className="truncate text-xs text-slate-400">{match.item.location}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(match.item.status)}`}>
                              <span className={`h-1 w-1 rounded-full ${statusDotClass(match.item.status)}`} />
                              {capitalizeStatus(match.item.status)}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs font-bold text-indigo-600">
                              <Sparkles size={10} /> {match.confidence}%
                            </span>
                          </div>
                        </button>
                      ))}

                      {/* Report suggestion */}
                      <button
                        onClick={() => { onReport(); setOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-2.5 text-sm font-medium text-indigo-600 transition-all hover:bg-indigo-50"
                      >
                        <Lightbulb size={16} /> None of these? Report a new item
                      </button>
                    </div>
                  )}

                  {/* Report CTA for guidance messages */}
                  {msg.role === 'bot' && msg.content.includes('report') && !msg.matchedItems && (
                    <button
                      onClick={() => { onReport(); setOpen(false); }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
                    >
                      <Package size={14} /> Report This Item
                    </button>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-400">Scanning database...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
              {['I lost my wallet', 'Found a phone', 'Lost laptop in library'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you lost or found..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
