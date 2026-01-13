-- ATN Social Publisher - Billing RLS Policies
-- Users can read their own billing status; all updates happen via service role

-- Enable RLS on billing_accounts
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;

-- Users can read their own billing account
DROP POLICY IF EXISTS "billing_accounts_select_own" ON billing_accounts;
CREATE POLICY "billing_accounts_select_own" ON billing_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No insert/update/delete policies for authenticated users
-- All modifications happen server-side via service role which bypasses RLS
