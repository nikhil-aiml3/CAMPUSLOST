/*
# Add Points, Notifications, and Redemption System

## Overview
This migration adds a gamified points system, in-app notifications, and a rewards redemption store
to the Campus Lost & Found Portal. Users earn points by successfully returning found items,
can redeem points for campus perks, and receive notifications for chat messages, claim activity,
and item status updates.

## Changes

### 1. Profiles table — add points column
- Added `points` column (integer, default 0) to track each user's reward point balance.
- Points are awarded (+20) when a user's "Found" item is marked as "Resolved".

### 2. Notifications table (new)
- Stores in-app notifications for each user.
- Fields: id, user_id (recipient), type (chat_message | claim_submitted | status_update),
  title, body, related_item_id, is_read, created_at.
- RLS enabled: users can only read/update/delete their own notifications.

### 3. Redemptions table (new)
- Stores redemption records when users claim rewards from the store.
- Fields: id, user_id, reward_id, reward_name, points_cost, code, status (active | used | expired),
  created_at.
- RLS enabled: users can only CRUD their own redemptions.

### 4. Award points trigger
- A trigger fires when a lost_found_items row's status changes TO 'resolved'.
- It awards +20 points to the item's user_id (the finder who reported the found item).
- This only fires on status transitions into 'resolved', not on every update.

### 5. Security
- RLS enabled on notifications and redemptions tables.
- Owner-scoped CRUD policies on both tables (TO authenticated, auth.uid() = user_id).
*/

-- Add points column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  related_item_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id text NOT NULL,
  reward_name text NOT NULL,
  points_cost integer NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT redemptions_status_check CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text]))
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_redemptions" ON redemptions;
CREATE POLICY "select_own_redemptions" ON redemptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_redemptions" ON redemptions;
CREATE POLICY "insert_own_redemptions" ON redemptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_redemptions" ON redemptions;
CREATE POLICY "update_own_redemptions" ON redemptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_redemptions" ON redemptions;
CREATE POLICY "delete_own_redemptions" ON redemptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);

-- Trigger: award 20 points to finder when item status changes to 'resolved'
CREATE OR REPLACE FUNCTION award_points_on_resolve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only award when status transitions TO 'resolved' (not already resolved)
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') AND NEW.user_id IS NOT NULL THEN
    UPDATE profiles SET points = points + 20 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_points_on_resolve ON lost_found_items;
CREATE TRIGGER trigger_award_points_on_resolve
  AFTER UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_resolve();