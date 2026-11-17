# SheetModal

The app's only dialog: a glass sheet centred over a dimmed, lightly blurred backdrop.

- `.sheet-backdrop.open` (black 50%, `blur(4px)`, `z-sheet`) holds `.sheet-modal.glass-panel` (max 440px, `radius-pill`, 24px padding). It rises in over 300ms.
- Title `h3` in `sheet-title` (serif, uppercase); body copy `text-muted`; actions in `.modal-actions`, the confirming button last.
- `.keen-info-popover` is the warning callout inside sheets: dashed `accent-pink` border, pink title, orange `.keen-summary-blocked` for the one fact nobody should miss.
- Consumer supplies title, body, actions and the close handler.
