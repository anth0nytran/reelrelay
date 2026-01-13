-- ATN Social Publisher - Billing Schema
-- Adds billing_accounts table for Stripe subscription management with 14-day trial

-- Billing status enum
CREATE TYPE billing_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- Billing Accounts (one per user)
CREATE TABLE billing_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status billing_status NOT NULL DEFAULT 'trialing',
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_accounts_status ON billing_accounts(status);
CREATE INDEX idx_billing_accounts_stripe_customer ON billing_accounts(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_billing_accounts_stripe_subscription ON billing_accounts(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_billing_accounts_trial_ends ON billing_accounts(trial_ends_at) WHERE status = 'trialing';

-- Apply updated_at trigger
CREATE TRIGGER tr_billing_accounts_updated_at
  BEFORE UPDATE ON billing_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to auto-create billing_accounts row when a new user signs up
CREATE OR REPLACE FUNCTION create_billing_account_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.billing_accounts (user_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trialing', NOW(), NOW() + INTERVAL '14 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER tr_create_billing_account_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_billing_account_for_new_user();

-- Backfill existing users who don't have a billing_accounts row
INSERT INTO billing_accounts (user_id, status, trial_started_at, trial_ends_at)
SELECT id, 'trialing', created_at, created_at + INTERVAL '14 days'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM billing_accounts ba WHERE ba.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;
