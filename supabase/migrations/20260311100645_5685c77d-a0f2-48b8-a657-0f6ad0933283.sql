
-- FIX 2: conversations - lock system fields (unlocked, relay_status, msg counts, short codes)
DROP POLICY IF EXISTS "Participants can update safe fields" ON public.conversations;

CREATE POLICY "Participants can update safe fields"
ON public.conversations
FOR UPDATE
TO authenticated
USING ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
WITH CHECK (
  ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
  AND NOT (deal_closed IS DISTINCT FROM (SELECT c.deal_closed FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_confirmed IS DISTINCT FROM (SELECT c.buyer_confirmed FROM conversations c WHERE c.id = conversations.id))
  AND NOT (deal_closed_by IS DISTINCT FROM (SELECT c.deal_closed_by FROM conversations c WHERE c.id = conversations.id))
  AND NOT (deal_closed_at IS DISTINCT FROM (SELECT c.deal_closed_at FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_confirmed_at IS DISTINCT FROM (SELECT c.buyer_confirmed_at FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_phone IS DISTINCT FROM (SELECT c.buyer_phone FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_id IS DISTINCT FROM (SELECT c.buyer_id FROM conversations c WHERE c.id = conversations.id))
  AND NOT (seller_id IS DISTINCT FROM (SELECT c.seller_id FROM conversations c WHERE c.id = conversations.id))
  AND NOT (listing_id IS DISTINCT FROM (SELECT c.listing_id FROM conversations c WHERE c.id = conversations.id))
  AND NOT (unlocked IS DISTINCT FROM (SELECT c.unlocked FROM conversations c WHERE c.id = conversations.id))
  AND NOT (unlocked_at IS DISTINCT FROM (SELECT c.unlocked_at FROM conversations c WHERE c.id = conversations.id))
  AND NOT (relay_status IS DISTINCT FROM (SELECT c.relay_status FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_short_code IS DISTINCT FROM (SELECT c.buyer_short_code FROM conversations c WHERE c.id = conversations.id))
  AND NOT (seller_short_code IS DISTINCT FROM (SELECT c.seller_short_code FROM conversations c WHERE c.id = conversations.id))
  AND NOT (total_msg_count IS DISTINCT FROM (SELECT c.total_msg_count FROM conversations c WHERE c.id = conversations.id))
  AND NOT (buyer_msg_count IS DISTINCT FROM (SELECT c.buyer_msg_count FROM conversations c WHERE c.id = conversations.id))
  AND NOT (seller_msg_count IS DISTINCT FROM (SELECT c.seller_msg_count FROM conversations c WHERE c.id = conversations.id))
);
