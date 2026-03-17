

## Plan: Post-Publication Boost Prompt

### What we're building
After a user successfully publishes a listing, instead of navigating directly to the listing detail page, we show a **full-screen dialog** prompting them to boost the listing immediately. The user can either boost (via points or Xendit for Pro users) or skip.

### Flow

```text
User publishes listing
        │
        ▼
  Navigate to /listing/:id
        │
        ▼
  BoostPromptDialog appears (overlay)
   ┌─────────────────────────────┐
   │  🔥 Boost your listing now  │
   │                             │
   │  [Boost 48h - 20 pts]      │
   │  [Featured 48h - 40 pts]   │
   │  [Stock boost (free)]      │  ← if available
   │                             │
   │  [Skip / Later]            │
   └─────────────────────────────┘
        │
        ▼
  Points deducted or stock boost used
  → Success toast → Dialog closes
```

### Implementation (3 files)

**1. New component: `src/components/BoostPromptDialog.tsx`**
- A Dialog that takes `listingId`, `open`, `onClose` props
- Shows the listing title + image preview
- Offers boost options:
  - **Boost (20 pts)** — standard 48h visibility boost
  - **Boost Premium (40 pts)** — featured with amber badge
  - **Use Stock Boost** — if user has unassigned stock boosts (free)
- Calls `supabase.functions.invoke('manage-points', { action: 'purchase', addon_type, listing_id })` or `use_stock_boost`
- On native platform: redirects to webapp `/points` (existing pattern from MyListings)
- "Skip" button to dismiss
- On success: invalidates queries, shows toast, closes dialog

**2. Modify `src/pages/CreateListing.tsx` (lines ~419-421)**
- After successful listing creation, instead of just navigating, also pass state to trigger the boost dialog
- Use React Router state: `navigate(`/listing/${listing.id}`, { state: { showBoostPrompt: true } })`

**3. Modify `src/pages/ListingDetail.tsx`**
- Read `location.state?.showBoostPrompt`
- If true, render `<BoostPromptDialog>` open by default
- Clear state after dialog closes (via `window.history.replaceState`)

### Technical details
- Reuses existing `manage-points` edge function (same as MyListings boost flow)
- Queries user's stock boosts (`user_addons` where `addon_type='boost'` and no `listing_id`) to show free option
- Pro users who buy boosts via Xendit: dialog shows a "Buy more boosts" link to `/dashboard` as secondary CTA
- No database changes needed — all existing infrastructure is reused

