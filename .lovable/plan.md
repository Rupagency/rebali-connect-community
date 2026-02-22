
# WhatsApp Proxy + Progressive Phone Reveal

## Overview
Replace the current direct WhatsApp contact flow with a proxy system where all initial communications go through Re-Bali's official WhatsApp number via Fonnte. After 3 verified exchanges between buyer and seller, the seller's real phone number is automatically revealed.

## Architecture

### 1. Database Migrations

**Add columns to `conversations` table:**
- `buyer_msg_count` (int, default 0)
- `seller_msg_count` (int, default 0)
- `total_msg_count` (int, default 0)
- `unlocked` (bool, default false)
- `unlocked_at` (timestamptz, nullable)
- `status` (text, default 'active') -- active / blocked
- `buyer_phone` (text, nullable) -- buyer's WhatsApp number for relay

**Add column to `messages` table:**
- `from_role` (text, nullable) -- 'buyer' / 'seller' / 'system'

**New table: `wa_relay_tokens`** -- maps Fonnte incoming messages to conversations
- `id` (uuid, PK)
- `token` (text, unique) -- short unique token for deep link
- `listing_id` (uuid)
- `buyer_id` (uuid)
- `conversation_id` (uuid, nullable) -- set once conversation created
- `created_at` (timestamptz)

**New table: `risk_events`** -- logs blocked messages
- `id` (uuid, PK)
- `user_id` (uuid, nullable)
- `phone` (text, nullable)
- `event_type` (text) -- 'blocked_number', 'blocked_link'
- `details` (jsonb)
- `created_at` (timestamptz)

**RLS Policies:**
- `wa_relay_tokens`: service role insert/update, users can read their own tokens
- `risk_events`: service role insert, admins can read
- Update `conversations` policies for new columns
- Restrict `profiles.phone` and `profiles.whatsapp` fields from public queries (create a view or handle in code)

### 2. Edge Functions

**`wa-webhook` (new)** -- receives incoming WhatsApp messages from Fonnte
- `verify_jwt = false` in config.toml (webhook from external)
- Parse incoming Fonnte payload (sender phone, message body)
- Parse `RB|L=<listingId>|B=<buyerId>|` token from message body
- Identify sender role (match phone against seller phone in DB, or buyer phone from token)
- Create or reuse conversation
- Anti-scam filter: scan for phone numbers, links, messaging app references
  - If blocked: reply via Fonnte with warning message, log risk_event
  - If clean: save message, update counts, relay to other party
- Check unlock condition after each message:
  - `total_msg_count >= 3` AND `buyer_msg_count >= 1` AND `seller_msg_count >= 1`
  - Seller `phone_verified = true` AND not banned
  - Buyer not banned
  - If met: set `unlocked = true`, send system messages with phone number to both parties via Fonnte
- Relay messages with prefix: `"Re-Bali (Annonce: <title>): <message>"`

**`wa-send-relay` (new)** -- helper to send messages via Fonnte
- Accepts: target phone, message text
- Sends via Fonnte API
- Used by wa-webhook for relaying and system messages

### 3. Frontend Changes

**`ListingDetail.tsx`:**
- Remove direct WhatsApp link (`wa.me/seller_phone`)
- Remove direct phone call button
- Replace with "Contact on WhatsApp" button that:
  - Requires login
  - Generates/reuses a relay token via Supabase
  - Opens `https://wa.me/<REBALI_WA_NUMBER>?text=RB|L=<listingId>|B=<userId>| Hi, I'm interested in your item "<title>"`
- The Re-Bali WhatsApp number is stored as a constant (e.g. `REBALI_WA_NUMBER`)
- Remove seller phone/whatsapp display everywhere on listing page
- Keep the in-app message button as secondary option

**`SellerProfile.tsx`:**
- Remove phone number display (only show "Phone verified" badge)

**`ListingCard.tsx`:**
- No changes needed (doesn't show phone)

**Admin panel (`Admin.tsx`):**
- Add a "WhatsApp Relay" tab showing:
  - Conversations with counts, unlock status
  - Risk events log (blocked messages)
  - Ability to block a conversation (`status = 'blocked'`)

### 4. Anti-Scam Filters (in wa-webhook)

Patterns to block before relaying:
- Phone numbers: `+62`, `08xx`, 6+ consecutive digits
- Links: `wa.me`, `t.me`, `telegram`, `bit.ly`, `tinyurl`, `linktr.ee`, `instagram.com`, any URL pattern
- Messaging apps: `whatsapp`, `signal`, `telegram`

When blocked:
- Do NOT relay the message
- Reply to sender: "For safety, sharing phone numbers or links is not allowed until 3 exchanges are completed."
- Insert into `risk_events` table

### 5. Edge Cases Handled

- **No valid token in message**: Reply "Please use the Contact button on the Re-Bali listing."
- **Listing inactive**: Reply "This listing is no longer available."
- **Phone blacklisted**: Reply "Your account has been restricted."
- **Multiple conversations per buyer/listing**: Reuse existing conversation
- **After unlock**: Proxy continues working but phone is revealed

## Technical Details

### Fonnte Webhook Setup
The user will need to configure the Fonnte webhook URL in their Fonnte dashboard to point to:
`https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/wa-webhook`

### Re-Bali WhatsApp Number
A constant `REBALI_WA_NUMBER` needs to be defined -- this is the number connected to Fonnte that acts as the relay.

### Message Flow
```text
Buyer -> WhatsApp (Re-Bali number) -> Fonnte webhook -> wa-webhook Edge Function
  -> Anti-scam check
  -> Save message + update counts
  -> Relay to seller via Fonnte
  -> Check unlock condition -> if met, send system messages
```

### Files to Create
- `supabase/functions/wa-webhook/index.ts`

### Files to Modify
- `src/pages/ListingDetail.tsx` (replace WhatsApp/phone buttons with proxy CTA)
- `src/pages/Admin.tsx` (add relay monitoring tab)
- `src/lib/constants.ts` (add REBALI_WA_NUMBER)
- `supabase/config.toml` (add wa-webhook with verify_jwt = false)
- `src/i18n/translations/en.json` and `fr.json` (new translation keys)

### Database Migration (1 migration)
- ALTER conversations ADD columns (counts, unlocked, status, buyer_phone)
- ALTER messages ADD from_role column
- CREATE TABLE wa_relay_tokens
- CREATE TABLE risk_events
- RLS policies for new tables
