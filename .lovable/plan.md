

## Diagnostic

The white screen is caused by a **Vite module loading failure** -- the browser cannot fetch the compiled `Auth.tsx` module. The source code of `Auth.tsx` and `LegalDialog.tsx` is syntactically correct, imports are valid, and translation keys exist in all language files.

The error: `Failed to fetch dynamically imported module: .../src/pages/Auth.tsx` indicates Vite's dev server has a stale/corrupted module cache for this file.

## Root Cause

This is NOT a code logic error. It is a **build cache corruption** that sometimes happens after rapid successive edits. The module hash Vite is looking for no longer exists on the server.

## Fix Plan

1. **Force Auth.tsx rebuild** -- Make a trivial whitespace change (add a comment at the top) to invalidate Vite's module cache and force a clean recompilation. This is the same technique used on `main.tsx` previously but needs to target the actual broken file (`Auth.tsx`).

2. **No functional code changes needed** -- The checkbox, LegalDialog, and translations are all already correctly implemented and wired up.

This is a single-file touch to clear the build issue.

