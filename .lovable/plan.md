

# Fix: Other users showing as "User" in Messages

## Root Cause

The `public_profiles` view is created with `security_invoker=true`, which means it inherits the RLS policies from the `profiles` table. The profiles SELECT policy only allows `auth.uid() = id` (you can only see your own profile). So when Messages.tsx joins `profiles` to get the other user's info, it returns null.

This also affects `SellerProfile.tsx`, `ListingDetail.tsx`, `BlockedUsers.tsx`, and `BusinessPage.tsx` which query `public_profiles` directly.

## Fix

**Recreate `public_profiles` view WITHOUT `security_invoker`**. Since this view only exposes safe, non-PII fields (display_name, avatar_url, is_verified_seller, phone_verified, user_type, created_at), it's safe for everyone to read. Without security_invoker, the view runs as the owner (postgres) which bypasses RLS, allowing any authenticated user to see other users' public info.

### Database Migration
```sql
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT id, display_name, avatar_url, is_verified_seller, phone_verified, user_type, created_at
  FROM profiles;
```
No `security_invoker` = view owner executes the query, bypassing profiles RLS. Only safe columns are exposed.

### Code Change: Messages.tsx conversation query
Replace the `profiles` join with a separate `public_profiles` fetch for the other users, since foreign key hints don't work with views:

1. Keep conversation query but remove the `buyer:profiles!...` and `seller:profiles!...` joins
2. After fetching conversations, collect all unique other-user IDs
3. Batch-fetch from `public_profiles` using `.in('id', otherUserIds)`
4. Merge the profile data into each conversation object

This follows the existing pattern used in `SellerProfile.tsx` and `ListingDetail.tsx`.

