
-- 1. Create SECURITY DEFINER function for seller to close a deal
CREATE OR REPLACE FUNCTION public.close_deal(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_id uuid;
  v_buyer_id uuid;
  v_deal_closed boolean;
  v_listing_id uuid;
BEGIN
  -- Verify caller is the seller of this conversation
  SELECT seller_id, buyer_id, deal_closed, listing_id
  INTO v_seller_id, v_buyer_id, v_deal_closed, v_listing_id
  FROM public.conversations
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the seller can close a deal';
  END IF;

  IF v_deal_closed THEN
    RAISE EXCEPTION 'Deal is already closed';
  END IF;

  -- Set deal as closed
  UPDATE public.conversations
  SET deal_closed = true,
      deal_closed_at = now(),
      deal_closed_by = auth.uid(),
      updated_at = now()
  WHERE id = _conversation_id;

  -- Mark listing as sold
  UPDATE public.listings
  SET status = 'sold'
  WHERE id = v_listing_id AND seller_id = v_seller_id;

  -- Close other conversations for this listing
  UPDATE public.conversations
  SET relay_status = 'closed', updated_at = now()
  WHERE listing_id = v_listing_id AND id != _conversation_id;

  -- Insert system message in the deal conversation
  INSERT INTO public.messages (conversation_id, sender_id, content, from_role)
  VALUES (_conversation_id, v_seller_id, '🤝 Deal closed', 'system');

  -- Insert system messages in closed conversations
  INSERT INTO public.messages (conversation_id, sender_id, content, from_role)
  SELECT id, v_seller_id, 'This item has been sold', 'system'
  FROM public.conversations
  WHERE listing_id = v_listing_id AND id != _conversation_id;
END;
$$;

-- 2. Create SECURITY DEFINER function for buyer to confirm a deal
CREATE OR REPLACE FUNCTION public.confirm_deal(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_id uuid;
  v_deal_closed boolean;
  v_buyer_confirmed boolean;
BEGIN
  SELECT buyer_id, deal_closed, buyer_confirmed
  INTO v_buyer_id, v_deal_closed, v_buyer_confirmed
  FROM public.conversations
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF auth.uid() != v_buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can confirm a deal';
  END IF;

  IF NOT v_deal_closed THEN
    RAISE EXCEPTION 'Seller must close the deal first';
  END IF;

  IF v_buyer_confirmed THEN
    RAISE EXCEPTION 'Deal is already confirmed';
  END IF;

  UPDATE public.conversations
  SET buyer_confirmed = true,
      buyer_confirmed_at = now(),
      updated_at = now()
  WHERE id = _conversation_id;

  INSERT INTO public.messages (conversation_id, sender_id, content, from_role)
  VALUES (_conversation_id, v_buyer_id, '✅ Deal confirmed by buyer', 'system');
END;
$$;

-- 3. Drop the old permissive UPDATE policy for participants
DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;

-- 4. Create a restrictive UPDATE policy that only allows safe field updates
-- Participants can only update: updated_at, relay_status (to 'closed' after both reviewed)
-- They CANNOT update: deal_closed, buyer_confirmed, buyer_phone, deal_closed_by, deal_closed_at, buyer_confirmed_at
CREATE POLICY "Participants can update safe fields"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = buyer_id) OR (auth.uid() = seller_id)
)
WITH CHECK (
  ((auth.uid() = buyer_id) OR (auth.uid() = seller_id))
  AND deal_closed IS NOT DISTINCT FROM (SELECT c.deal_closed FROM public.conversations c WHERE c.id = conversations.id)
  AND buyer_confirmed IS NOT DISTINCT FROM (SELECT c.buyer_confirmed FROM public.conversations c WHERE c.id = conversations.id)
  AND deal_closed_by IS NOT DISTINCT FROM (SELECT c.deal_closed_by FROM public.conversations c WHERE c.id = conversations.id)
  AND deal_closed_at IS NOT DISTINCT FROM (SELECT c.deal_closed_at FROM public.conversations c WHERE c.id = conversations.id)
  AND buyer_confirmed_at IS NOT DISTINCT FROM (SELECT c.buyer_confirmed_at FROM public.conversations c WHERE c.id = conversations.id)
  AND buyer_phone IS NOT DISTINCT FROM (SELECT c.buyer_phone FROM public.conversations c WHERE c.id = conversations.id)
  AND buyer_id IS NOT DISTINCT FROM (SELECT c.buyer_id FROM public.conversations c WHERE c.id = conversations.id)
  AND seller_id IS NOT DISTINCT FROM (SELECT c.seller_id FROM public.conversations c WHERE c.id = conversations.id)
  AND listing_id IS NOT DISTINCT FROM (SELECT c.listing_id FROM public.conversations c WHERE c.id = conversations.id)
);
