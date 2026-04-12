

## Bulk Listing Creator for Agency Pro Accounts

### Overview
Create a dedicated "Bulk Create" page exclusively for `agence` tier pro accounts that allows creating multiple listings in series on the same page, with an optimized inline form that resets after each submission.

### How it works for the user
1. Agency user navigates to `/create-bulk` (accessible from MyListings page via a special button)
2. They see a streamlined single-page form with all fields visible (no multi-step wizard)
3. After submitting one listing, a success toast appears, the form resets (keeping category and location pre-filled), and they can immediately create the next one
4. A sidebar/counter shows how many listings were created in the current session
5. Each listing is published individually (with photos, translation trigger, etc.)

### Technical Plan

**1. New page: `src/pages/BulkCreateListing.tsx`**
- Single-page flat form (no stepper) with: category, subcategory, title, description, price, currency, location, condition, listing_type, extra fields, photos
- Category/subcategory selectors reuse existing `CATEGORY_TREE` and `CATEGORY_FIELDS` logic from constants
- Photo upload with drag-and-drop, reusing existing watermark and upload logic from CreateListing
- On submit: insert listing, upload photos, trigger translation -- same logic as CreateListing but extracted
- After success: increment session counter, clear title/description/price/photos but keep category/location/condition pre-selected
- Guard: only accessible if `tier === 'agence'`, otherwise redirect

**2. Route registration in `src/App.tsx`**
- Add lazy-loaded route `/create-bulk` pointing to BulkCreateListing

**3. Entry point in `src/pages/MyListings.tsx`**
- For agence users, add a "Bulk Create" button next to the existing "Create Listing" button

**4. Translations**
- Add keys for bulk creation UI (`bulkCreate.title`, `bulkCreate.counter`, `bulkCreate.keepGoing`, etc.) in all 12 language files

### Key design decisions
- Flat single-page form (not multi-step) for speed -- the whole point is rapid-fire creation
- Category and location persist between submissions to optimize series of similar listings
- Session counter shows progress ("5 listings created this session")
- Reuses all existing submission logic (watermarking, moderation check, translation trigger, image hash)
- No changes to database schema needed -- uses existing tables

