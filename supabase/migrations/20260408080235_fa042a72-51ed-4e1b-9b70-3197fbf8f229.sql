CREATE OR REPLACE FUNCTION public.can_create_review(
  _conversation_id uuid,
  _reviewer_id uuid,
  _reviewed_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_reviewer_created_at timestamptz;
  v_reviewed_created_at timestamptz;
  v_buyer_sent boolean;
  v_seller_sent boolean;
BEGIN
  IF _conversation_id IS NULL OR _reviewer_id IS NULL OR _reviewed_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT v_conversation.deal_closed OR NOT v_conversation.buyer_confirmed THEN
    RETURN false;
  END IF;

  IF NOT (
    (v_conversation.buyer_id = _reviewer_id AND v_conversation.seller_id = _reviewed_user_id)
    OR
    (v_conversation.seller_id = _reviewer_id AND v_conversation.buyer_id = _reviewed_user_id)
  ) THEN
    RETURN false;
  END IF;

  SELECT created_at INTO v_reviewer_created_at
  FROM public.profiles
  WHERE id = _reviewer_id;

  SELECT created_at INTO v_reviewed_created_at
  FROM public.profiles
  WHERE id = _reviewed_user_id;

  IF v_reviewer_created_at IS NULL OR v_reviewed_created_at IS NULL THEN
    RETURN false;
  END IF;

  IF v_reviewer_created_at >= now() - interval '7 days'
     OR v_reviewed_created_at >= now() - interval '7 days' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.conversation_id = _conversation_id
      AND m.sender_id = v_conversation.buyer_id
      AND COALESCE(m.from_role, '') <> 'system'
  ) INTO v_buyer_sent;

  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.conversation_id = _conversation_id
      AND m.sender_id = v_conversation.seller_id
      AND COALESCE(m.from_role, '') <> 'system'
  ) INTO v_seller_sent;

  IF NOT (v_buyer_sent AND v_seller_sent) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

DROP POLICY IF EXISTS "Users can create reviews for others" ON public.reviews;

CREATE POLICY "Users can create reviews for others"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id <> reviewed_user_id
  AND conversation_id IS NOT NULL
  AND public.can_create_review(conversation_id, reviewer_id, reviewed_user_id)
);