/*
# Add user profiles, link items to users, enforce owner-scoped RLS

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text, not null)
  - `email` (text, not null)
  - `whatsapp_contact` (text, nullable)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `lost_found_items`
  - Added `user_id` (uuid, references auth.users, nullable for existing rows)
  - Removed old `reporter_name`, `reporter_email`, `whatsapp_contact` columns from the INSERT path
    (kept for backward compat with existing rows; new rows use user_id → profiles join)

3. Security
- Enable RLS on `profiles`: users can read all profiles (public contact visibility), update only their own.
- Change `lost_found_items` RLS from anon-open to authenticated-owner-scoped:
  - SELECT: any authenticated user can see all items (public feed)
  - INSERT: authenticated users, user_id must match auth.uid()
  - UPDATE: owner only (user_id = auth.uid())
  - DELETE: owner only OR admin (for now, owner only)
- Backfill user_id on existing rows is not possible (no auth users yet); existing rows keep NULL user_id.
  Items with NULL user_id are legacy mock data visible to all.

4. Trigger
- Auto-create a profile row when a new auth user signs up.
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  whatsapp_contact text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Add user_id to lost_found_items
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Default user_id to auth.uid() for new inserts
ALTER TABLE lost_found_items ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Replace RLS policies: authenticated-only, owner-scoped writes, public reads
DROP POLICY IF EXISTS "anon_select_items" ON lost_found_items;
DROP POLICY IF EXISTS "anon_insert_items" ON lost_found_items;
DROP POLICY IF EXISTS "anon_update_items" ON lost_found_items;
DROP POLICY IF EXISTS "anon_delete_items" ON lost_found_items;

CREATE POLICY "items_select_all" ON lost_found_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "items_insert_own" ON lost_found_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_update_own" ON lost_found_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_delete_own" ON lost_found_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Also allow anon to SELECT (so logged-out visitors can still browse)
-- We add a separate anon-select policy
DROP POLICY IF EXISTS "anon_browse_items" ON lost_found_items;
CREATE POLICY "anon_browse_items" ON lost_found_items FOR SELECT
  TO anon USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp_contact)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'whatsapp_contact'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow anon to browse inquiries (read-only) and authenticated to insert
DROP POLICY IF EXISTS "anon_select_inquiries" ON inquiries;
CREATE POLICY "anon_select_inquiries" ON inquiries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "auth_insert_inquiries" ON inquiries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inquiries" ON inquiries;