# FormField

Labelled inputs and settings toggles used in every sheet.

- `.form-group` > `label` (`label-caps`, `text-muted`) + `input`/`select`/`textarea` (dark well, `glass-border`, `radius-input`, 12px 14px, `body` style). Focus swaps the border to `accent-gold`. `.locked` inputs drop to 55% opacity.
- `.toggle-row`: label left, native 20px checkbox right tinted `accent-pink`, hairline `glass-border` rule under each row.
- Consumer supplies the label text, value and change handler. Always use a real `<label>`.
