/*
# Add ownership verification fields and claims table

1. Modified Tables
- `lost_found_items`
  - Added `verification_question` (text, nullable) — secret question set by finder
  - Added `verification_answer` (text, nullable) — expected answer (case-insensitive compare)
  - Added `claim_pending` (boolean, default false) — marks item as having a pending claim awaiting owner review

2. New Tables
- `claims`
  - `id` (uuid, primary key)
  - `item_id` (uuid, FK to lost_found_items, ON DELETE CASCADE)
  - `claimant_id` (uuid, FK to auth.users, NOT NULL)
  - `claimant_name` (text, not null)
  - `claimant_email` (text, not null)
  - `submitted_answer` (text, not null) — what the claimant typed
  - `answer_correct` (boolean, not null) — whether answer matched
  - `status` (text, not null, default 'pending') — 'pending', 'approved', 'rejected'
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `claims`.
- Authenticated users can read all claims (so item owners can see claims on their items).
- Authenticated users can insert claims (claimants submit).
- Owners can update claims on their items (approve/reject) — enforced via policy through item ownership.
- Owners can delete claims on their items.
*/

ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS verification_question text;
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS verification_answer text;
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS claim_pending boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  claimant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimant_name text NOT NULL,
  claimant_email text NOT NULL,
  submitted_answer text NOT NULL,
  answer_correct boolean NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_select_all" ON claims;
CREATE POLICY "claims_select_all" ON claims FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "claims_insert_auth" ON claims;
CREATE POLICY "claims_insert_auth" ON claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = claimant_id);

DROP POLICY IF EXISTS "claims_update_item_owner" ON claims;
CREATE POLICY "claims_update_item_owner" ON claims FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM lost_found_items WHERE lost_found_items.id = claims.item_id AND lost_found_items.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM lost_found_items WHERE lost_found_items.id = claims.item_id AND lost_found_items.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "claims_delete_item_owner" ON claims;
CREATE POLICY "claims_delete_item_owner" ON claims FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM lost_found_items WHERE lost_found_items.id = claims.item_id AND lost_found_items.user_id = auth.uid())
  );