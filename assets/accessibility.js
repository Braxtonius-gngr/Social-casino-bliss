/* assets/accessibility.js
   Keyboard + ARIA support for the dynamically-rendered .strategy-row.interactive
   rows in index.html (Keen Info popovers, resource guides, etc.).

   These rows are template-string HTML re-rendered on demand (search, sort,
   tab switches, popover opens) rather than static markup present at
   DOMContentLoaded, so a one-time querySelectorAll would miss most of them.
   This uses a MutationObserver to tag new rows as they appear, plus event
   delegation on `document` so listeners never need to be re-attached.

   Rows already carry an inline onclick="this.classList.toggle('expanded')"
   for mouse users (see makeStrategyItem() in index.html). We never call
   toggle() ourselves in the click handler - only keydown (Enter/Space)
   toggles - so mouse and keyboard never double-toggle the same row.
*/

document.addEventListener('DOMContentLoaded', () => {
  function initStrategyRow(row) {
    if (row.dataset.a11yInit) return;
    row.dataset.a11yInit = '1';
    row.setAttribute('role', 'button');
    if (!row.hasAttribute('tabindex')) row.setAttribute('tabindex', '0');
    row.setAttribute('aria-expanded', row.classList.contains('expanded') ? 'true' : 'false');
  }

  function syncAriaExpanded(row) {
    row.setAttribute('aria-expanded', row.classList.contains('expanded') ? 'true' : 'false');
  }

  document.querySelectorAll('.strategy-row.interactive').forEach(initStrategyRow);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.strategy-row.interactive')) initStrategyRow(node);
        if (node.querySelectorAll) node.querySelectorAll('.strategy-row.interactive').forEach(initStrategyRow);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Mouse clicks already toggled 'expanded' via the row's own inline onclick
  // by the time this bubbles up here - just mirror the resulting state.
  document.addEventListener('click', (ev) => {
    const row = ev.target.closest('.strategy-row.interactive');
    if (row) syncAriaExpanded(row);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const row = ev.target.closest('.strategy-row.interactive');
    if (!row) return;
    ev.preventDefault();
    row.classList.toggle('expanded');
    syncAriaExpanded(row);
  });
});
