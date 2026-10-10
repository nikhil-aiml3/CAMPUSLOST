export type ItemStatus = 'lost' | 'found' | 'claimed' | 'resolved';

export type ItemCategory =
  | 'Electronics'
  | 'Books'
  | 'IDs/Wallets'
  | 'Clothing'
  | 'Accessories'
  | 'Others';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  whatsapp_contact: string | null;
  points: number;
  created_at: string;
}

export interface LostFoundItem {
  id: string;
  name: string;
  category: ItemCategory;
  status: ItemStatus;
  location: string;
  date: string;
  description: string | null;
  image_url: string | null;
  reporter_name: string;
  reporter_email: string;
  whatsapp_contact: string | null;
  user_id: string | null;
  claimed: boolean;
  claim_pending: boolean;
  verification_question: string | null;
  verification_answer: string | null;
  high_priority: boolean;
  created_at: string;
}

export type NewLostFoundItem = Omit<LostFoundItem, 'id' | 'created_at' | 'claimed' | 'claim_pending' | 'user_id'> & {
  claimed?: boolean;
  claim_pending?: boolean;
};

export interface Inquiry {
  id: string;
  item_id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  claimant_name: string;
  claimant_email: string;
  submitted_answer: string;
  answer_correct: boolean;
  status: ClaimStatus;
  attempts: number;
  locked: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  item_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export const CATEGORIES: ItemCategory[] = [
  'Electronics',
  'Books',
  'IDs/Wallets',
  'Clothing',
  'Accessories',
  'Others',
];

export const REPORT_STATUSES: ('lost' | 'found')[] = ['lost', 'found'];

export const ALL_STATUS_FILTERS: ('all' | ItemStatus)[] = [
  'all',
  'lost',
  'found',
  'claimed',
  'resolved',
];

export const CATEGORY_FILTERS: ('all' | ItemCategory)[] = ['all', ...CATEGORIES];

export function statusBadgeClass(status: ItemStatus): string {
  switch (status) {
    case 'lost':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    case 'found':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'claimed':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'resolved':
      return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200';
  }
}

export function statusDotClass(status: ItemStatus): string {
  switch (status) {
    case 'lost':
      return 'bg-rose-500';
    case 'found':
      return 'bg-emerald-500';
    case 'claimed':
      return 'bg-amber-500';
    case 'resolved':
      return 'bg-indigo-500';
  }
}

export function capitalizeStatus(status: ItemStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function claimStatusBadgeClass(status: ClaimStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }
}

export type NotificationType = 'chat_message' | 'claim_submitted' | 'status_update' | 'general';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_item_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type RedemptionStatus = 'active' | 'used' | 'expired';

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  reward_name: string;
  points_cost: number;
  code: string;
  status: RedemptionStatus;
  created_at: string;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  color: string;
}

export const REWARD_ITEMS: RewardItem[] = [
  { id: 'coffee', name: 'Free Cafeteria Coffee Voucher', description: 'A hot coffee on us at any campus cafeteria', cost: 30, icon: 'coffee', color: 'amber' },
  { id: 'library_waiver', name: 'Library Late Fee Waiver (Up to ₹100)', description: 'Clear your library fines up to ₹100', cost: 50, icon: 'book', color: 'blue' },
  { id: 'techfest_pass', name: 'College Tech Fest Priority Pass', description: 'Skip the queue at all tech fest events', cost: 100, icon: 'ticket', color: 'indigo' },
  { id: 'badge', name: 'Official Campus Good Samaritan Digital Badge', description: 'Show off your community spirit with a digital badge', cost: 15, icon: 'award', color: 'emerald' },
];

/* ── AI Priority & Urgency Classification ── */

const HIGH_PRIORITY_CATEGORIES: ItemCategory[] = ['Electronics', 'IDs/Wallets'];

const HIGH_PRIORITY_KEYWORDS = [
  'wallet', 'purse', 'id', 'card', 'license', 'passport', ' Aadhaar',
  'pan card', 'student id', 'identity',
  'laptop', 'phone', 'mobile', 'tablet', 'iphone', 'android', 'macbook',
  'headphone', 'earbud', 'airpod', 'camera', 'watch', 'speaker',
  'medicine', 'medication', 'medical', 'inhaler', 'insulin', 'prescription',
  'key', 'keys', 'car key',
  'bank', 'debit', 'credit', 'atm',
];

export function classifyAIPriority(name: string, category: ItemCategory, description: string | null): boolean {
  const text = `${name} ${description || ''}`.toLowerCase();
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) return true;
  return HIGH_PRIORITY_KEYWORDS.some((kw) => text.includes(kw));
}

/* ── Semantic Smart-Match AI ── */

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'cellphone', 'smartphone', 'iphone', 'android'],
  laptop: ['macbook', 'notebook', 'computer', 'chromebook'],
  bag: ['backpack', 'rucksack', 'handbag', 'purse'],
  wallet: ['purse', 'pouch', 'money'],
  keys: ['key', 'keychain'],
  headphones: ['earphone', 'earbud', 'airpod', 'airpods'],
  watch: ['smartwatch', 'fitness'],
  id: ['card', 'license', 'passport', 'aadhaar', 'pan'],
  book: ['textbook', 'notebook', 'novel'],
  bottle: ['flask', 'thermos'],
  charger: ['adapter', 'cable', 'cord'],
};

function expandTokens(tokens: Set<string>): Set<string> {
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    const syns = SEMANTIC_SYNONYMS[token];
    if (syns) syns.forEach((s) => expanded.add(s));
    // also check if token is a synonym of another word
    for (const [key, syns] of Object.entries(SEMANTIC_SYNONYMS)) {
      if (syns.includes(token)) {
        expanded.add(key);
        syns.forEach((s) => expanded.add(s));
      }
    }
  }
  return expanded;
}

export interface SmartMatchResult {
  item: LostFoundItem;
  confidence: number;
}

export function smartMatchItems(query: string, items: LostFoundItem[], limit = 3): SmartMatchResult[] {
  const queryTokens = expandTokens(new Set(tokenize(query)));
  if (queryTokens.size === 0) return [];

  const results: SmartMatchResult[] = items
    .map((item) => {
      const itemText = `${item.name} ${item.description || ''} ${item.location} ${item.category}`;
      const itemTokens = expandTokens(new Set(tokenize(itemText)));

      const textSim = jaccardSimilarity(queryTokens, itemTokens);

      // Category boost
      let categoryBoost = 0;
      const queryStr = query.toLowerCase();
      if (queryStr.includes(item.category.toLowerCase()) ||
          item.category.toLowerCase().includes(queryStr)) {
        categoryBoost = 0.15;
      }

      // Name exact match boost
      let nameBoost = 0;
      const nameTokens = new Set(tokenize(item.name));
      let nameMatches = 0;
      for (const t of tokenize(query)) {
        if (nameTokens.has(t)) nameMatches++;
      }
      if (nameMatches > 0) {
        nameBoost = (nameMatches / nameTokens.size) * 0.25;
      }

      const confidence = Math.min(0.99, Math.round((textSim * 0.6 + categoryBoost + nameBoost) * 100));
      return { item, confidence };
    })
    .filter((r) => r.confidence > 10)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  return results;
}
