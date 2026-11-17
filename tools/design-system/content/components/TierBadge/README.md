# TierBadge

The platform's rank, S to F, as a small uppercase badge; plus type badges and tag pills that share its size.

- `.tier-badge.tier-<S|A|B|C|D|F>`: text and 1px border in `tier-s`…`tier-f`, a 20% wash of the same colour behind (`badge` style, `radius-sm`).
- Executive reads S/A/B as a podium — gold, silver, bronze. Other skins remap S–C to their own palette; D, F and Not Rankable are one shared neutral/warning across skins.
- D and F use a **dashed** border, Not Rankable a **dotted** violet one, Unranked a plain `glass-border` — so the "nothing to show" states differ by shape, not just colour. Keep the letter: it is the label.
- `.type-badge` (orange, e.g. LIVE) and `.tag-pill` (neutral, `radius-xs`) sit beside it on the card's title row.
