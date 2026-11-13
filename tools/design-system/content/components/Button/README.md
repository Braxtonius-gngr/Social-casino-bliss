# Button

Gold means money and action; every primary control is a solid `accent-gold` fill with `ink-on-gold` text.

| class | use |
| --- | --- |
| `.btn-open` | The card's primary action (open the platform). Pill (`radius-pill`), `button` style, `shadow-button`. |
| `.btn-open.cooldown` | Same slot while the bonus cools down: dark well, `glass-border`, `text-muted` countdown. |
| `.landing-btn` | The landing's single CTA, `radius-rail`, 1rem. |
| `.btn-primary` / `.btn-cancel` / `.btn-danger` | Sheet actions inside `.modal-actions`, equal width, `radius-input`. Primary last (right). |

- Consumer supplies the label (short and uppercase: OPEN, SAVE, CANCEL, REMOVE, DONE).
- Hover: `accent-gold-hover`. Press: spring scale to .965 (`cubic-bezier(.34,1.56,.64,1)`, 130ms). Focus: 2px `accent-gold` outline.
- Danger is `accent-pink` on `accent-pink-dim`; it is below 4.5:1 in several skins, so always say the action in words (REMOVE, not an icon alone).
- One gold button per view region. Never put gold on gold.
