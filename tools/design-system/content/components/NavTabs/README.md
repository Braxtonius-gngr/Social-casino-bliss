# NavTabs

The app's top-level navigation: a horizontally scrolling rail of pill tabs on a glass surface.

- Container `.nav-pill-group.glass-panel` (`radius-rail`, 6px padding, 12px right so the last pill clears the edge); tabs `.nav-tab` (`radius-tab`, `nav-tab` style, `text-muted`).
- Active tab: `.active` — `accent-gold-dim` fill, `accent-gold` text and border. Exactly one active.
- Tabs keep their natural width and the rail scrolls (scrollbar hidden) rather than squeezing labels; under 520px padding drops to 6px 10px.
- Consumer supplies tab labels (one word each) and the active state.
