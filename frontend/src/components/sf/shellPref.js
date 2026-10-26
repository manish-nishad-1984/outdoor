// Which app shell to render: 'new' (Salesforce-style, the default) or 'classic' (old sidebar).
// Switch with ?ui=classic / ?ui=new on any URL; the choice is remembered per browser.
const KEY = 'ui-shell';

export function readShellPref(search) {
  const fromUrl = new URLSearchParams(search).get('ui');
  if (fromUrl === 'new' || fromUrl === 'classic') {
    try { localStorage.setItem(KEY, fromUrl); } catch { /* ignore */ }
    return fromUrl;
  }
  try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'new'; } catch { return 'new'; }
}
