# LedgerCard

One tracked platform in the daily ledger: avatar, name, tier, ready status and its open action.

- `.ledger-card.glass-panel` (`radius-card`, 14px padding) in a `.game-list` (12px gap). Two full-width rows: `.card-left` (avatar + `.card-title-row`) and `.card-bottom-row` (`.card-status` + `.card-actions`).
- `.casino-avatar`: 46px disc, platform initials in the mono family. `.casino-name` ellipsizes; badges never wrap under it.
- Status: green `.status-dot` + READY, or a muted dot + countdown in mono. `.verify-tag.stale` flags rotting catalogue data in orange.
- Actions: `.btn-open` (or its cooldown form) then `.btn-dots` for the menu. The status takes slack; buttons drop under it only if they must.
- Consumer supplies: initials, name, tier letter, optional type badge, ready state or time, the open URL. Cards rise in with a 30ms stagger (off with motion off).
