-- Wolnaa Veranstalter-Portal Migration
-- Im Supabase SQL Editor ausführen

CREATE TABLE IF NOT EXISTS veranstalter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  firmenname TEXT NOT NULL,
  kontakt_email TEXT NOT NULL,
  telefon TEXT,
  website TEXT,
  stripe_account_id TEXT UNIQUE,
  stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  stripe_onboarded_at TIMESTAMPTZ,
  aktiv BOOLEAN DEFAULT TRUE,
  platform_fee_percent NUMERIC(5,2) DEFAULT 3.00
);

ALTER TABLE veranstalter DISABLE ROW LEVEL SECURITY;
GRANT ALL ON veranstalter TO anon;
GRANT ALL ON veranstalter TO authenticated;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS veranstalter_id UUID REFERENCES veranstalter(id),
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_veranstalter ON events(veranstalter_id);
CREATE INDEX IF NOT EXISTS idx_veranstalter_user ON veranstalter(user_id);
