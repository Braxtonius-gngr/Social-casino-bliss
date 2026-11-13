# HeroStat

The header card: a green ring holding today's ready count, with a short heading and a mono detail line.

- `.hero-stat-card.glass-panel` (`radius-pill`, 20px padding, 18px gap). Ring `.hero-ring-circle`: 72px, 2px `accent-green` border over an 8% green wash, `hero-stat` numeral.
- `.hero-details h2` in `hero-heading`; `p` in `detail-mono`, `text-muted`.
- In the app the ring is tappable and opens a height-animated details popout; the consumer supplies the count, heading and detail line.
