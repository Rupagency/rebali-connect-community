-- Allow service-role to delete conversations (for cleanup function)
-- Regular users still cannot delete (no authenticated policy)
CREATE POLICY "Service can delete conversations"
ON public.conversations
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service can delete messages"
ON public.messages
FOR DELETE
TO service_role
USING (true);