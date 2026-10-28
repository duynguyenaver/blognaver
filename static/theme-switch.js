/* Switch between separately compiled Stack and Prism Hugo sites. */
(() => {
  'use strict';
  const root = '/blognaver/';
  const prismPrefix = root + 'prism/';
  const path = window.location.pathname;
  if (!path.startsWith(root) || /\/(cms|resume-cms)\//.test(path)) return;
  const isPrism = path.startsWith(prismPrefix);
  const other = isPrism ? 'Stack' : 'Prism';
  const current = isPrism ? 'Prism' : 'Stack';
  const relative = (isPrism ? path.slice(prismPrefix.length) : path.slice(root.length));
  const target = (isPrism ? root : prismPrefix) + relative + window.location.search + window.location.hash;
  const mount = () => {
    if (document.getElementById('bn-theme-switch')) return;
    const button = document.createElement('a');
    button.id = 'bn-theme-switch';
    button.href = target;
    button.setAttribute('aria-label', 'Chuyển theme từ ' + current + ' sang ' + other);
    button.title = 'Đổi giao diện: ' + current + ' → ' + other;
    button.innerHTML = '<span class="bn-theme-switch-icon" aria-hidden="true">◐</span><span class="bn-theme-switch-label">' + current + ' <span aria-hidden="true">⇄</span> ' + other + '</span>';
    button.addEventListener('click', () => { try { localStorage.setItem('blognaver-theme', other.toLowerCase()); } catch (_) {} });
    document.body.appendChild(button);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
