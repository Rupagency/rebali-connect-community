
# WhatsApp Proxy + Progressive Phone Reveal -- Implementation Plan

## Summary
Replace all direct WhatsApp/phone contact with a proxy relay through Re-Bali's official WhatsApp number (via Fonnte). Seller phone numbers are hidden until 3 verified exchanges occur, then automatically revealed via a system message in the WhatsApp thread.

---

## Step 1: Database Migration

A single migration will:

### ALTER existing tables
- **conversations**: add `buyer_msg_count` (int default 0), `seller_msg_count` (int default 0), `total_msg_count` (int default 0), `unlocked` (bool default false), `unlocked_at` (timestamptz nullable), `relay_status` (text default 'active'), `buyer_phone` (text nullable)
- **messages**: add `from_role` (text nullable) -- values: 'buyer', 'seller', 'system'

### CREATE new tables
- **wa_relay_tokens**: `id` (uuid PK), `token` (text unique), `listing_id` (uuid), `buyer_id` (uuid), `conversation_id` (uuid nullable), `created_at` (timestamptz default now())
- **risk_events**: `id` (uuid PK), `user_id` (uuid nullable), `phone` (text nullable), `event_type` (text), `details` (jsonb), `created_at` (timestamptz default now())

### RLS Policies
- **wa_relay_tokens**: service role can insert/update (true), users can read their own tokens (`buyer_id = auth.uid()`)
- **risk_events**: service role can insert (true), admins can read (`has_role(auth.uid(), 'admin')`)
- **conversations**: admins can view all, admins can update all (for blocking)

---

## Step 2: Edge Function -- `wa-webhook`

Create `supabase/functions/wa-webhook/index.ts` with `verify_jwt = false` in config.toml.

This single edge function handles:

1. **Incoming Fonnte webhook**: Parse `sender` (phone) and `message` from Fonnte POST payload
2. **Token parsing**: Extract `RB|L=<listingId>|B=<buyerId>|` from message body
3. **Role detection**: Match sender phone against seller's phone in profiles table; if no match, treat as buyer
4. **Conversation management**: Find or create conversation for this buyer+listing pair; store buyer_phone on first message
5. **Anti-scam filter**: Before relaying, scan for phone numbers (regex: `+62`, `08xx`, 6+ consecutive digits), URLs, messaging app references. If blocked: reply with warning via Fonnte, log risk_event, do NOT relay
6. **Save message**: Insert into messages table with `from_role`, update conversation counts
7. **Relay**: Send message to the other party via Fonnte API (`POST https://api.fonnte.com/send` with `Authorization: FONNTE_TOKEN` header, `target` and `message` fields), prefixed with "Re-Bali (Listing: title): ..."
8. **Unlock check**: After each message, if `total_msg_count >= 3` AND `buyer_msg_count >= 1` AND `seller_msg_count >= 1` AND seller `phone_verified = true` AND neither party banned: set `unlocked = true`, send system messages to both parties via Fonnte with the seller's real phone number

Edge cases handled:
- No valid token: reply "Please use the Contact button on the Re-Bali listing."
- Listing inactive: reply "This listing is no longer available."
- Phone in banned_devices: reply "Your account has been restricted."
- Conversation already exists: reuse it

Uses existing `FONNTE_TOKEN` secret (already configured).

---

## Step 3: Frontend -- ListingDetail.tsx

### Remove
- Direct WhatsApp link (`wa.me/seller.whatsapp`)
- Direct phone call button (`tel:seller.phone`)
- Display of seller phone/whatsapp numbers

### Add
- `REBALI_WA_NUMBER` constant in `src/lib/constants.ts`
- "Contact on WhatsApp" button that:
  - Requires login (show toast if not logged in)
  - Cannot contact own listing
  - Opens `https://wa.me/REBALI_WA_NUMBER?text=RB|L=<listingId>|B=<userId>| Hi, I'm interested in your item "<title>"`
- Keep existing in-app message button as secondary option
- Show "Phone verified" badge instead of actual phone number

This applies to both the desktop sidebar card and the mobile bottom bar.

---

## Step 4: Frontend -- SellerProfile.tsx

### Remove
- Direct WhatsApp button (line 146-153)
- Direct phone call button (line 154-161)

### Replace with
- "Phone verified" badge only (already shown if `phone_verified`)
- No direct contact info exposed

---

## Step 5: Frontend -- Admin.tsx

### Add new tab "WhatsApp Relay" (6th tab)
- Conversations table showing: listing title, buyer name, seller name, message counts, unlocked status, relay_status
- Risk events log: phone, event type, details, timestamp
- Action: block/unblock conversation (`relay_status = 'blocked'`)

---

## Step 6: Config & Constants

### supabase/config.toml
Add:
```toml
[functions.wa-webhook]
verify_jwt = false
```

### src/lib/constants.ts
Add `REBALI_WA_NUMBER` constant (placeholder value, user will need to set their actual number).

---

## Step 7: i18n Translations

Add keys to en.json and fr.json:
- `listing.contactWhatsApp`: "Contact on WhatsApp" / "Contacter sur WhatsApp"
- `listing.phoneVerified`: "Phone verified" / "Telephone verifie"
- `listing.loginToContact`: "Log in to contact the seller" / "Connectez-vous pour contacter le vendeur"
- `admin.waRelay`: "WhatsApp Relay" / "Relais WhatsApp"
- `admin.relayConversations`: "Relay Conversations" / "Conversations relais"
- `admin.riskEvents`: "Risk Events" / "Evenements a risque"
- `admin.blockConversation` / `admin.unblockConversation`
- `admin.unlocked` / `admin.locked`

---

## Files Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/wa-webhook/index.ts` |
| Modify | `supabase/config.toml` (add wa-webhook) |
| Modify | `src/lib/constants.ts` (add REBALI_WA_NUMBER) |
| Modify | `src/pages/ListingDetail.tsx` (replace contact buttons) |
| Modify | `src/pages/SellerProfile.tsx` (remove phone display) |
| Modify | `src/pages/Admin.tsx` (add WhatsApp Relay tab) |
| Modify | `src/i18n/translations/en.json` (new keys) |
| Modify | `src/i18n/translations/fr.json` (new keys) |
| Migration | 1 SQL migration for all schema changes |

---

## Post-Implementation: User Action Required

After deployment, you will need to:
1. Set the `REBALI_WA_NUMBER` constant to your actual Re-Bali WhatsApp number
2. Configure the Fonnte webhook URL in your Fonnte dashboard to: `https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/wa-webhook`
