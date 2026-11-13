# FilterChips

Filter and sort controls above the ledger: pill chips that scroll sideways, and orange chips showing the active sort stack.

- `.filter-chips` row of `.filter-btn` (dark well, `glass-border`, `text-muted`, `radius-pill`); `.active` takes the gold treatment like a nav tab.
- `.sort-trigger-btn` opens the sort drawer: outlined in `accent-gold`, never filled.
- Sorting is `accent-orange`: `.sort-stack-chip` (`radius-md`) lists each active sort key in priority order with a remove ✕.
- Consumer supplies chip labels and selection state; several filters may be active, sorts are ordered.
