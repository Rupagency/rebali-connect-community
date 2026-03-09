
-- Public function to count completed deals for any user (for badges display)
CREATE OR REPLACE FUNCTION public.get_completed_deals_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.conversations
  WHERE (buyer_id = _user_id OR seller_id = _user_id)
    AND deal_closed = true
    AND buyer_confirmed = true
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.get_completed_deals_count(uuid) TO authenticated, anon;
