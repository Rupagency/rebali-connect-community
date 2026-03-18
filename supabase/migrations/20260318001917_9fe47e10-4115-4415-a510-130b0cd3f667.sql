-- Drop the existing permissive UPDATE policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;

-- Recreate with WITH CHECK: only allow changing `read` field, nothing else
CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
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
  -- Prevent changing content
  AND NOT (content IS DISTINCT FROM (SELECT m.content FROM messages m WHERE m.id = messages.id))
  -- Prevent changing sender_id
  AND NOT (sender_id IS DISTINCT FROM (SELECT m.sender_id FROM messages m WHERE m.id = messages.id))
  -- Prevent changing conversation_id
  AND NOT (conversation_id IS DISTINCT FROM (SELECT m.conversation_id FROM messages m WHERE m.id = messages.id))
  -- Prevent changing from_role
  AND NOT (from_role IS DISTINCT FROM (SELECT m.from_role FROM messages m WHERE m.id = messages.id))
  -- Prevent changing created_at
  AND NOT (created_at IS DISTINCT FROM (SELECT m.created_at FROM messages m WHERE m.id = messages.id))
);