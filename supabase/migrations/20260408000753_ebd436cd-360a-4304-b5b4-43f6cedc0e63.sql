DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.share_contact_info(_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conversation public.conversations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_buyer_sent boolean;
  v_seller_sent boolean;
  v_contact_message text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF v_conversation.buyer_id <> v_user_id AND v_conversation.seller_id <> v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.messages
    WHERE conversation_id = _conversation_id
      AND sender_id = v_conversation.buyer_id
      AND COALESCE(from_role, '') <> 'system'
  ), EXISTS (
    SELECT 1
    FROM public.messages
    WHERE conversation_id = _conversation_id
      AND sender_id = v_conversation.seller_id
      AND COALESCE(from_role, '') <> 'system'
  )
  INTO v_buyer_sent, v_seller_sent;

  IF NOT (v_buyer_sent AND v_seller_sent) THEN
    RAISE EXCEPTION 'Both participants must send at least one message first';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF NULLIF(BTRIM(COALESCE(v_profile.phone, '')), '') IS NULL
     AND NULLIF(BTRIM(COALESCE(v_profile.whatsapp, '')), '') IS NULL THEN
    RAISE EXCEPTION 'No contact information available to share';
  END IF;

  v_contact_message := concat_ws(E'\n',
    format('📞 %s', COALESCE(NULLIF(BTRIM(v_profile.display_name), ''), 'User')),
    CASE
      WHEN NULLIF(BTRIM(COALESCE(v_profile.phone, '')), '') IS NOT NULL
      THEN format('Phone: %s', v_profile.phone)
      ELSE NULL
    END,
    CASE
      WHEN NULLIF(BTRIM(COALESCE(v_profile.whatsapp, '')), '') IS NOT NULL
      THEN format('WhatsApp: %s', v_profile.whatsapp)
      ELSE NULL
    END
  );

  INSERT INTO public.messages (conversation_id, sender_id, content, from_role)
  VALUES (_conversation_id, v_user_id, v_contact_message, 'system');

  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = _conversation_id;

  RETURN jsonb_build_object('ok', true, 'shared', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_contact_info(uuid) TO authenticated;