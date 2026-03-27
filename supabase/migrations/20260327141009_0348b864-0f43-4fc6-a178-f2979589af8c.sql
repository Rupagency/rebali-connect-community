-- Fix infinite recursion in messages UPDATE RLS by replacing self-referencing policy
-- with a safe participant policy + trigger-based field validation.

-- 1) Replace recursive UPDATE policy
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;

CREATE POLICY "Participants can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- 2) Enforce update rules with trigger (no self-query in RLS)
CREATE OR REPLACE FUNCTION public.enforce_messages_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service-role / backend maintenance updates
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Immutable columns for everyone
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.from_role IS DISTINCT FROM OLD.from_role THEN
    RAISE EXCEPTION 'immutable_message_fields';
  END IF;

  -- Sender can edit own content (+ edited_at), but cannot touch read flags
  IF OLD.sender_id = auth.uid() THEN
    IF NEW.read IS DISTINCT FROM OLD.read
       OR NEW.read_at IS DISTINCT FROM OLD.read_at THEN
      RAISE EXCEPTION 'sender_cannot_change_read_status';
    END IF;

    IF NEW.content IS DISTINCT FROM OLD.content THEN
      IF COALESCE(BTRIM(NEW.content), '') = '' THEN
        RAISE EXCEPTION 'message_content_required';
      END IF;
      IF NEW.edited_at IS NULL THEN
        NEW.edited_at := now();
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Recipient can only mark as read/read_at, never edit content
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.edited_at IS DISTINCT FROM OLD.edited_at THEN
    RAISE EXCEPTION 'recipient_cannot_edit_content';
  END IF;

  -- Do not allow reverting read state to unread
  IF OLD.read = true AND NEW.read = false THEN
    RAISE EXCEPTION 'cannot_mark_unread';
  END IF;

  -- Auto-fill read_at when marking read
  IF NEW.read = true AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_messages_update_rules ON public.messages;
CREATE TRIGGER trg_enforce_messages_update_rules
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_messages_update_rules();