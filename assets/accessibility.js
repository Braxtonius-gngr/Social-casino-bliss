/* assets/accessibility.js
   - Dismiss landing-screen and persist
   - Add keyboard/ARIA toggles for .strategy-row.interactive
*/

document.addEventListener('DOMContentLoaded', () => {
  // Landing screen dismissal
  const landing = document.querySelector('.landing-screen');
  const landingBtn = document.querySelector('.landing-btn');
  if (landing && landingBtn) {
    if (localStorage.getItem('seen-landing')) {
      landing.classList.add('hidden');
    }
    landingBtn.setAttribute('aria-label', landingBtn.getAttribute('aria-label') || 'Enter app');
    landingBtn.addEventListener('click', () => {
      landing.classList.add('hidden');
      localStorage.setItem('seen-landing', '1');
      // Move focus to main content area
      const main = document.getElementById('main-content') || document.querySelector('main');
      if (main) main.focus();
    });
  }

  // Strategy rows: enable keyboard toggle and aria-expanded
  const strategyRows = Array.from(document.querySelectorAll('.strategy-row.interactive'));
  strategyRows.forEach((row, idx) => {
    const header = row.querySelector('.strategy-row-header');
    const body = row.querySelector('.strategy-row-body');
    const rowId = row.id || `strategy-row-${idx+1}`;
    row.id = rowId;
    if (header && body) {
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', header.getAttribute('tabindex') || '0');
      header.setAttribute('aria-controls', body.id || `${rowId}-body`);
      body.id = body.id || `${rowId}-body`;
      header.setAttribute('aria-expanded', row.classList.contains('expanded') ? 'true' : 'false');

      const toggle = () => {
        const willExpand = header.getAttribute('aria-expanded') === 'false';
        header.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
        row.classList.toggle('expanded', willExpand);
        if (willExpand) body.querySelectorAll('a, button, [tabindex]').forEach(el => el.setAttribute('tabindex', '0'));
      };

      header.addEventListener('click', toggle);
      header.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          toggle();
        }
      });
    }
  });
});
