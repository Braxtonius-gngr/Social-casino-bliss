# Wordmark

The "Daily Roll Over" name set in the serif family, with "Roll Over" in `accent-gold`.

- **Landing:** `.landing-title` (`landing-title` style, 2.6rem), broken after "Daily", tagline "Your Daily Roll's Over" under it in `text-muted` italic serif.
- **In app:** `.app-title` (`app-title` style, 2rem) on one line, centred, `space-24` below.
- Markup: `<h1 class="app-title">Daily <span>Roll Over</span></h1>` — the consumer supplies only the text; the `<span>` carries the gold.
- Each skin re-sets the wordmark in its own face (Obsidian: Georgia without stroke; Neon: Tilt Neon; Dead Channel: IM Fell English SC; Burin: Pinyon Script brand word; West Texas: Special Elite). Never set the brand word in anything but `accent-gold`.
- The `date-header` line sits above it in the app: uppercase, `0.15em` tracking, `text-muted`.
