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
