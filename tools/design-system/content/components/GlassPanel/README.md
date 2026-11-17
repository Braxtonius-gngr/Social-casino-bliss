# GlassPanel

The one surface of the app: a dark translucent card with a highlight hairline on its top and left edges.

- Add `.glass-panel` to any container, then give it a radius for its role (`radius-card` cards, `radius-pill` sheets and hero, `radius-rail` nav rail) and padding.
- Fill `glass-surface`, border `glass-border`, top and left `glass-highlight`, depth `shadow-panel`, `blur(12px)` backdrop.
- Text inside: `text-main`, secondary `text-muted`.
- Skins restyle it heavily in app.css (Executive: gradient #17181d → #0a0b0e with a gold top rule and no blur; Dead Channel: flat, no blur or shadow; Obsidian: near-opaque). Don't stack panels inside panels — use `rgba(0,0,0,0.3–0.5)` wells with a `glass-border` border instead (tier action cards, plan rows).
