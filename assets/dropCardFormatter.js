/**
 * @typedef {Object} DropLink
 * @property {string} matchedName - The name of the platform/drop matched.
 * @property {string} rawUrl - The original URL of the drop.
 * @property {boolean} isTracked - Whether the drop is tracked by the user.
 */

/**
 * @typedef {Object} DropCardData
 * @property {string} id - Unique identifier for the drop card.
 * @property {string} title - The title of the drop.
 * @property {string} source - The source platform (e.g. Reddit, Discord).
 * @property {number} createdUtc - The UTC timestamp (in seconds or milliseconds) when the drop was posted.
 * @property {string} selftext - The body text or preview snippet of the drop.
 * @property {DropLink[]} links - A list of links contained within the drop.
 */

/**
 * Sanitizes a string to prevent XSS vulnerabilities.
 * @param {string} str - The string to sanitize.
 * @returns {string} The sanitized HTML string.
 */
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts a Unix timestamp to a human-readable "time ago" string.
 * @param {number} timestamp - The UTC timestamp.
 * @returns {string} The formatted "time ago" string.
 */
function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  // Ensure timestamp is in milliseconds
  const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000;
  const seconds = Math.floor((Date.now() - ms) / 1000);

  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Generates an HTML string for a social feed drop card.
 * @param {DropCardData} data - The data for the drop card.
 * @returns {string} The constructed HTML string.
 */
export function generateDropCardHtml({ id, title, source, createdUtc, selftext, links = [] }) {
  const safeId = escHtml(id);
  const safeTitle = escHtml(title);
  const safeSource = escHtml(source);
  const timeAgo = getTimeAgo(createdUtc);

  // Truncate selftext to 120 characters and sanitize
  let preview = selftext || '';
  if (preview.length > 120) {
    preview = preview.substring(0, 120) + '...';
  }
  const safePreview = escHtml(preview);

  // Map over links to generate sub-rows
  const linksHtml = links.map(link => {
    const safeName = escHtml(link.matchedName || 'Unknown');
    const safeUrl = escHtml(link.rawUrl);

    // Determine the tag text and styling classes
    let tagHtml = '';
    if (link.isTracked) {
      tagHtml = `<span class="drop-tag" style="color:var(--accent-green); border-color:var(--accent-green);">Tracked</span>`;
    } else {
      tagHtml = `<span class="drop-tag unknown">Unknown / Untracked</span>`;
    }

    return `
      <div class="drop-row" style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
        <div class="drop-main">
          <div class="drop-name">${safeName} ${tagHtml}</div>
          <div class="drop-url" style="font-size: 0.75rem; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeUrl}</div>
        </div>
        <button class="btn-open" data-url="${safeUrl}" style="padding:7px 12px; font-size:0.72rem;">OPEN</button>
      </div>
    `;
  }).join('');

  return `
    <div class="ledger-card glass-panel" id="drop-${safeId}" style="flex-direction: column; align-items: stretch; margin-bottom: 12px; padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 1rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeTitle}</h4>
        <span class="type-badge">${safeSource}</span>
      </div>
      <div class="card-status" style="margin-bottom: 12px; opacity: 0.6;">
        <span>${timeAgo}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
        ${safePreview}
      </div>
      <div class="drop-links">
        ${linksHtml}
      </div>
    </div>
  `;
}
