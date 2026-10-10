import { supabase } from '@/lib/supabase';
import type { NotificationType } from '@/types';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null = null,
  relatedItemId: string | null = null,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    related_item_id: relatedItemId,
  });
}
