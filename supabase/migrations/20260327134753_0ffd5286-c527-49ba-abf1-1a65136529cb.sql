
-- Add read_at and edited_at columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;

-- Drop existing update policy and create a new one that allows editing content
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;

-- Policy: recipients can mark as read (update read + read_at)
CREATE POLICY "Recipients can mark messages as read"
ON public.messages FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
  AND (
    -- Case 1: recipient marking as read (can only change read + read_at)
    (
      sender_id != auth.uid()
      AND NOT (content IS DISTINCT FROM (SELECT m.content FROM messages m WHERE m.id = messages.id))
      AND NOT (sender_id IS DISTINCT FROM (SELECT m.sender_id FROM messages m WHERE m.id = messages.id))
      AND NOT (conversation_id IS DISTINCT FROM (SELECT m.conversation_id FROM messages m WHERE m.id = messages.id))
      AND NOT (from_role IS DISTINCT FROM (SELECT m.from_role FROM messages m WHERE m.id = messages.id))
      AND NOT (created_at IS DISTINCT FROM (SELECT m.created_at FROM messages m WHERE m.id = messages.id))
      AND NOT (edited_at IS DISTINCT FROM (SELECT m.edited_at FROM messages m WHERE m.id = messages.id))
    )
    OR
    -- Case 2: sender editing their own message (can only change content + edited_at)
    (
      sender_id = auth.uid()
      AND NOT (read IS DISTINCT FROM (SELECT m.read FROM messages m WHERE m.id = messages.id))
      AND NOT (read_at IS DISTINCT FROM (SELECT m.read_at FROM messages m WHERE m.id = messages.id))
      AND NOT (sender_id IS DISTINCT FROM (SELECT m.sender_id FROM messages m WHERE m.id = messages.id))
      AND NOT (conversation_id IS DISTINCT FROM (SELECT m.conversation_id FROM messages m WHERE m.id = messages.id))
      AND NOT (from_role IS DISTINCT FROM (SELECT m.from_role FROM messages m WHERE m.id = messages.id))
      AND NOT (created_at IS DISTINCT FROM (SELECT m.created_at FROM messages m WHERE m.id = messages.id))
    )
  )
);
