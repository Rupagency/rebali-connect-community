

# Floating PWA Install Button (Mobile)

Add a small floating action button (FAB) in the bottom-right corner on mobile devices that prompts users to install the app as a PWA. The button adapts its behavior based on the device (Android vs iOS).

## How it works

- **Android**: Uses the native `beforeinstallprompt` event to trigger the browser's install dialog directly. The button disappears once the app is installed.
- **iOS (Safari)**: Since iOS doesn't support `beforeinstallprompt`, tapping the button shows a small tooltip/modal explaining: "Tap the Share button, then 'Add to Home Screen'".
- The button only appears on mobile devices and only when the app is NOT already in standalone/installed mode.
- A dismiss/close option stores the preference in `localStorage` so it doesn't reappear for users who don't want it.

## Visual

- Small circular FAB (40x40px), bottom-right, above the BottomNav bar (~80px from bottom)
- Uses a `Download` icon from lucide-react
- Subtle pulse animation on first appearance to draw attention
- Teal/primary color to match the theme

## Technical Details

**New file:** `src/components/PwaInstallButton.tsx`
- Listens for `beforeinstallprompt` event (Android)
- Detects iOS via user agent
- Checks `display-mode: standalone` to hide when already installed
- Stores dismissal in `localStorage` key `rebali-pwa-dismiss`
- On Android: calls `prompt()` on the deferred event
- On iOS: shows a small popover with install instructions
- Only renders on mobile (uses `useIsMobile` hook)

**Modified file:** `src/components/Layout.tsx`
- Import and render `<PwaInstallButton />` alongside `<BottomNav />`

