

## Diagnostic -- Root Cause Analysis

### Bug 1: Profile page infinite spinner ("tourne en boucle")

The Profile page logic at line 456-472 is:
1. If `authLoading` -> show spinner
2. If `!user` -> `<Navigate to="/auth" />`
3. If `!profile` -> show spinner (infinite!)

**Root cause**: In `AuthContext.tsx`, there's a race condition. `getSession()` (line 58-63) sets `loading = false` immediately, but `fetchProfile()` is fired asynchronously without awaiting. So the sequence is:
- `getSession()` resolves -> sets `user` -> fires `fetchProfile()` (not awaited) -> sets `loading = false`
- Profile.tsx sees: `authLoading = false`, `user = valid`, `profile = null` -> **infinite spinner at line 466-472**
- Meanwhile, `onAuthStateChange` fires -> calls `fetchProfile` again (awaited this time) -> but `loading` was already set to false

The `!profile` guard (line 466) spins forever if `fetchProfile` is slow or hasn't completed yet. There's no guarantee `profile` gets set before `loading` becomes `false`.

### Bug 2: Auth page login does nothing

In `Auth.tsx` line 62-74, after successful login:
```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password });
// ...
navigate('/');
```

The `navigate('/')` fires immediately after login, but `AuthContext` hasn't processed the `onAuthStateChange` event yet. When the user lands on `/`, no redirect happens because the home page doesn't require auth. But when they navigate to `/profile`, the profile is still `null` (race condition above), causing the infinite spinner.

Also, since `Auth.tsx` doesn't check if the user is already logged in and redirect away, after login the user stays on the auth page until they manually navigate.

## Fix Plan

### 1. Fix AuthContext -- ensure `loading` stays `true` until profile is fully loaded

In `AuthContext.tsx`:
- In `getSession()` handler: **await** `fetchProfile` before setting `loading = false`
- In `onAuthStateChange`: already awaits fetchProfile, but ensure `loading` is only set to false **after** profile is fetched
- Add a `profileLoaded` flag to prevent the race

### 2. Fix Auth page -- redirect when already logged in

In `Auth.tsx`:
- Import `useAuth` and check if user is already authenticated
- If `user` exists and auth is ready, redirect to `/` or the intended page
- This handles the case where login succeeds but the page doesn't react

### 3. Fix Profile page -- handle profile loading state gracefully

The `!profile` spinner is actually fine IF the AuthContext guarantees that `loading` stays `true` until profile is loaded. Fix 1 handles this.

## Technical Details

**AuthContext.tsx changes:**
- Track profile loading separately with a `profileReady` flag
- `loading` = `true` until BOTH session check AND profile fetch complete
- Use `setTimeout(..., 0)` wrapper for `fetchProfile` inside `onAuthStateChange` to avoid Supabase deadlock (per best practices), but still track completion

**Auth.tsx changes:**
- Add `useAuth()` hook
- Add early return: `if (!loading && user) return <Navigate to="/" replace />;`

