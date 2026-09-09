/**
 * A link object associated with a drop card.
 * @typedef {Object} DropLink
 * @property {string} matchedName - The matched name or display text for the link.
 * @property {string} rawUrl - The raw URL of the link.
 * @property {boolean} isTracked - Whether the link is tracked (true) or unknown (false).
 */

/**
 * A social feed object containing drop details.
 * @typedef {Object} DropCardData
 * @property {string} id - Unique identifier for the drop.
 * @property {string} title - Title of the post or drop.
 * @property {string} source - Source of the drop (e.g., "Reddit", "Discord").
 * @property {number} createdUtc - Creation timestamp in seconds since epoch.
 * @property {string} selftext - The main text content of the post.
 * @property {DropLink[]} links - Array of associated links.
 */

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts a UTC timestamp (in seconds) to a human-readable "time ago" string.
 * @param {number} createdUtc - The timestamp in seconds.
 * @returns {string} Human-readable time ago (e.g., "15m ago", "2h ago").
 */
function timeAgo(createdUtc) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = now - createdUtc;

  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Generates an HTML string for a Reddit/Discord drop card.
 * @param {DropCardData} data - The drop card data.
 * @returns {string} The formatted HTML string.
 */
export function generateDropCardHtml({ id, title, source, createdUtc, selftext, links }) {
  // Truncate selftext to 120 chars
  let previewText = (selftext || '').trim();
  if (previewText.length > 120) {
    previewText = previewText.substring(0, 120) + '...';
  }

  // Map links to HTML
  const linksHtml = (links || []).map(link => {
    const tagClass = link.isTracked ? 'drop-tag' : 'drop-tag unknown';
    const tagStyle = link.isTracked ? 'color: var(--accent-green); border-color: var(--accent-green);' : '';
    // Use tagStyle inline if needed, but existing CSS classes (.drop-tag, .drop-tag.unknown) should cover the base styling.
    // The prompt asks for: "<span class="drop-tag"> (green if tracked, pink/unknown if not)"
    // Looking at index.html: .drop-tag.unknown { color:var(--accent-pink); border-color:var(--accent-pink); }
    // There doesn't appear to be a .drop-tag.tracked, but .drop-tag is grey by default.
    // To strictly follow "green if tracked", we can add an inline style for tracked, or assume it's styled elsewhere.
    // Let's add inline styles as requested to ensure it's green/pink.
    const inlineStyle = link.isTracked
      ? 'color: var(--accent-green); border-color: var(--accent-green);'
      : 'color: var(--accent-pink); border-color: var(--accent-pink);';

    return `
      <div class="drop-row">
        <div class="drop-main">
          <span class="${tagClass}" style="${inlineStyle}">${escHtml(link.matchedName || 'Link')}</span>
        </div>
        <button class="btn-open" data-url="${escHtml(link.rawUrl)}">OPEN</button>
      </div>
    `;
  }).join('');

  return `
    <div class="ledger-card glass-panel" style="flex-direction: column; align-items: stretch;" id="drop-${escHtml(id)}">
      <div class="card-title-row" style="margin-bottom: 8px;">
        <span class="casino-name" style="flex: 1; white-space: normal;">${escHtml(title)}</span>
        <span class="type-badge">${escHtml(source)}</span>
        <span class="card-status">${escHtml(timeAgo(createdUtc))}</span>
      </div>
      <div class="card-body" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
        ${escHtml(previewText)}
      </div>
      <div class="card-actions" style="flex-direction: column; gap: 8px; align-items: stretch;">
        ${linksHtml}
      </div>
    </div>
  `;
}
