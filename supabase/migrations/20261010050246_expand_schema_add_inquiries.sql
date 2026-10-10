/*
# Expand lost_found_items schema and add inquiries table

1. Modified Tables
- `lost_found_items`
  - Added `whatsapp_contact` (text, nullable) — student WhatsApp phone number
  - Expanded `status` CHECK constraint to include 'claimed' and 'resolved' (was: 'lost', 'found')
  - Migrated existing claimed=true items to status='resolved'
  - Updated existing mock data categories to match new category list (IDs -> IDs/Wallets, Other -> Others)

2. New Tables
- `inquiries`
  - `id` (uuid, primary key)
  - `item_id` (uuid, foreign key to lost_found_items, ON DELETE CASCADE)
  - `sender_name` (text, not null)
  - `sender_email` (text, not null)
  - `message` (text, not null)
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `inquiries`.
- Allow anon + authenticated full CRUD (single-tenant, no auth, intentionally public).
*/

-- Add whatsapp_contact column
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS whatsapp_contact text;

-- Expand status constraint
ALTER TABLE lost_found_items DROP CONSTRAINT IF EXISTS lost_found_items_status_check;
ALTER TABLE lost_found_items ADD CONSTRAINT lost_found_items_status_check
  CHECK (status IN ('lost', 'found', 'claimed', 'resolved'));

-- Migrate claimed items to resolved status
UPDATE lost_found_items SET status = 'resolved' WHERE claimed = true;

-- Update category names to match new schema
UPDATE lost_found_items SET category = 'IDs/Wallets' WHERE category = 'IDs';
UPDATE lost_found_items SET category = 'Others' WHERE category = 'Other';

-- Create inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES lost_found_items(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inquiries" ON inquiries;
CREATE POLICY "anon_select_inquiries" ON inquiries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "anon_insert_inquiries" ON inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inquiries" ON inquiries;
CREATE POLICY "anon_delete_inquiries" ON inquiries FOR DELETE
  TO anon, authenticated USING (true);