

# Security Fixes Plan — 3 Vulnerabilities

## Summary

Three security vulnerabilities to fix, **none requiring a new secret or API key**:

1. **log-device spoofing** — Anyone can flag any user as "high risk"
2. **expire-addons open endpoint** — Anyone can trigger mass Pro expiration
3. **payment_invoices fake paid** — Users can insert invoices marked as "paid"

---

## Fix 1: log-device — Validate user identity server-side

**File:** `supabase/functions/log-device/index.ts`

**Problem:** The function accepts `user_id` from the request body without checking it matches the authenticated user. Any logged-in user can flag someone else as high-risk.

**Solution:** Use `getClaims()` to extract the real `user_id` from the JWT token, ignoring whatever the client sends.

Changes:
- Add JWT auth check at the top (require `Authorization: Bearer` header)
- Create Supabase client with the user's auth header
- Extract `user_id` from `getClaims().sub` instead of the request body
- Keep `device_hash` and `user_agent` from the body (those are fine)

Also add `log-device` to `config.toml` with `verify_jwt = false` (since we validate manually with `getClaims`).

---

## Fix 2: expire-addons — Restrict to service-role callers only

**File:** `supabase/functions/expire-addons/index.ts`

**Problem:** Fully open endpoint. Anyone can call it and trigger mass expiration.

**Solution:** Check that the `Authorization` header contains the **service role key** (which is already available as `SUPABASE_SERVICE_ROLE_KEY` env var — no new secret needed). The `pg_cron` job already sends the anon key, but we'll validate using getClaims and check that the role is `service_role`.

Simpler approach: Check that the request's Authorization Bearer token decodes to `role: service_role` using getClaims. The cron job already sends a Bearer token. We just need to update the cron job SQL to use the service role key from vault instead of anon key, and add the role check in the function.

**Actual simplest approach:** Just verify the Authorization header matches the `SUPABASE_SERVICE_ROLE_KEY` directly:
```typescript
const authHeader = req.headers.get("Authorization");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (authHeader !== `Bearer ${serviceKey}`) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

This uses the existing `SUPABASE_SERVICE_ROLE_KEY` secret — **no new secret needed**.

---

## Fix 3: payment_invoices — Restrict INSERT to pending status only

**Problem:** RLS INSERT policy only checks `user_id = auth.uid()`. Users can insert rows with `status = 'paid'` to fraudulently unlock features.

**Solution:** Add a database migration to update the RLS INSERT policy with a `WITH CHECK` clause that enforces `status = 'pending'`:

```sql
DROP POLICY IF EXISTS "Users can insert their own invoices" ON payment_invoices;
CREATE POLICY "Users can insert their own invoices"
  ON payment_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );
```

This ensures only the `xendit-webhook` edge function (using service role, which bypasses RLS) can set `status = 'paid'`.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/log-device/index.ts` | Add JWT auth, extract user_id from token |
| `supabase/config.toml` | Add `[functions.log-device]` with `verify_jwt = false` |
| `supabase/functions/expire-addons/index.ts` | Add service-role key check |
| Database migration | Tighten `payment_invoices` INSERT policy |

## Risk Assessment

- **No new secrets required** — uses existing `SUPABASE_SERVICE_ROLE_KEY`
- **No client-side changes** — all fixes are backend only
- **No breaking changes** — legitimate flows (cron jobs, authenticated users, Xendit webhooks) continue to work

