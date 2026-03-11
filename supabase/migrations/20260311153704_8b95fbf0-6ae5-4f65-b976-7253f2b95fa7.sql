DROP POLICY IF EXISTS "Users can create their own invoices" ON payment_invoices;
CREATE POLICY "Users can create their own invoices"
  ON payment_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );