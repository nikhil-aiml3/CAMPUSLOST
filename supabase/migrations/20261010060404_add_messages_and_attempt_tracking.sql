/*
# Add in-app messaging system and attempt tracking

1. New Tables
- `messages`
  - `id` (uuid, primary key)
  - `item_id` (uuid, FK to lost_found_items, ON DELETE CASCADE)
  - `sender_id` (uuid, FK to auth.users, NOT NULL)
  - `receiver_id` (uuid, FK to auth.users, NOT NULL)
  - `message` (text, NOT NULL)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `claims`
  - Added `attempts` (integer, default 1) — number of failed verification attempts by this claimant on this item
  - Added `locked` (boolean, default false) — true when claimant has exhausted 3 attempts

3. Security
- Enable RLS on `messages`.
- Authenticated users can SELECT messages where they are the sender or receiver.
- Authenticated users can INSERT messages where they are the sender.
- No update or delete needed for messages.
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participants" ON messages;
CREATE POLICY "messages_select_participants" ON messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
CREATE POLICY "messages_insert_sender" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Add attempt tracking to claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- Add index for faster message lookups
CREATE INDEX IF NOT EXISTS idx_messages_item_id ON messages(item_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);