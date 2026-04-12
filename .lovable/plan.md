

## Bulk Create: Multi-Listing Queue Interface

### Current state
The current `/create-bulk` page creates one listing at a time -- fill form, publish, form resets. The user wants to prepare **multiple listings on the same screen** and publish them all at once.

### New design: Multi-listing queue on one page

The page will have two sections:

```text
┌─────────────────────────────────────────────────┐
│  FORM (top)                                     │
│  Category | Subcategory | Title | Description   │
│  Price | Location | Condition | Photos          │
│  Extra fields (dynamic)                         │
│  [+ Add to queue]                               │
├─────────────────────────────────────────────────┤
│  QUEUE (bottom) - Card list of pending listings │
│  ┌──────────────────────────────────────────┐   │
│  │ #1 iPhone 14 | Electronics | 3 photos ✕  │   │
│  ├──────────────────────────────────────────┤   │
│  │ #2 Sofa cuir | Maison | 2 photos     ✕  │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  [Publish all (2 listings)]                     │
└─────────────────────────────────────────────────┘
```

### How it works
1. User fills the form with all fields (category, subcategory, title, description, price, location, condition, photos, extra fields) -- everything on one screen with dropdowns and inputs
2. Clicks **"+ Add to queue"** -- the listing data + photos are stored in local state, form resets (keeping category/location pre-filled)
3. Repeat for as many listings as needed
4. The queue shows compact cards with title, category, photo count, and a remove button
5. Click **"Publish all"** -- all listings are created sequentially with a progress bar showing "Publishing 2/5..."
6. Each listing goes through the same pipeline: insert → upload photos with watermark → trigger translation

### Technical changes

**File: `src/pages/BulkCreateListing.tsx`** -- Full rewrite
- Add a `queue` state: array of `{ form, extraFields, photos, previews }` objects
- "Add to queue" button validates the current form, pushes to queue, resets form
- "Publish all" button iterates through queue, publishing each one sequentially
- Progress bar shows overall progress (listing X of Y) and per-listing progress
- Queue section renders compact cards with edit/remove actions
- Clicking a queued item loads it back into the form for editing

**File: Translations** -- Add new keys
- `bulkCreate.addToQueue`, `bulkCreate.publishAll`, `bulkCreate.queueEmpty`, `bulkCreate.publishingProgress` in all 12 languages

### Key decisions
- Queue is held in React state (not persisted) -- simple and sufficient for a session
- Sequential publishing (not parallel) to avoid rate limits and ensure watermarking works
- Form keeps category + location after adding to queue for fast series entry
- Max queue size: 50 listings (agence limit is effectively unlimited but we cap the batch)
