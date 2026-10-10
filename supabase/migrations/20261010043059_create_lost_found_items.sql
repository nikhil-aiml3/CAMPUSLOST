/*
# Create lost_found_items table (single-tenant, no auth)

1. New Tables
- `lost_found_items`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, not null) — item name/title
  - `category` (text, not null) — Electronics, Books, IDs, Clothing, Other
  - `status` (text, not null) — 'lost' or 'found'
  - `location` (text, not null) — where item was lost or found
  - `date` (date, not null) — date item was lost or found
  - `description` (text) — optional details about the item
  - `image_url` (text) — optional image URL or uploaded image
  - `reporter_name` (text, not null) — name of person reporting
  - `reporter_email` (text, not null) — contact email for claims
  - `claimed` (boolean, default false) — whether item has been claimed
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `lost_found_items`.
- Allow anon + authenticated full CRUD — this is a public campus portal with no sign-in, so all data is intentionally shared.
- USING (true) is acceptable here because the app is single-tenant with no auth and data is intentionally public.
*/

CREATE TABLE IF NOT EXISTS lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL CHECK (status IN ('lost', 'found')),
  location text NOT NULL,
  date date NOT NULL,
  description text,
  image_url text,
  reporter_name text NOT NULL,
  reporter_email text NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_items" ON lost_found_items;
CREATE POLICY "anon_select_items" ON lost_found_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_items" ON lost_found_items;
CREATE POLICY "anon_insert_items" ON lost_found_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_items" ON lost_found_items;
CREATE POLICY "anon_update_items" ON lost_found_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_items" ON lost_found_items;
CREATE POLICY "anon_delete_items" ON lost_found_items FOR DELETE
  TO anon, authenticated USING (true);