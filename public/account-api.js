import { mountShell } from './shell.js';
import { detail, overview } from './workspace-data.js';
let fixtures;
function loadFixtures() {
  return (fixtures ??= fetch('/workspace.json').then((r) => {
    if (!r.ok) throw new Error('Workspace could not be loaded.');
    return r.json();
  }));
}
const user = {
  id: 'workspace-account',
  name: 'Vaibhav',
  email: 'vaibhav.s@rgcdigital.com',
  company_origin: 'https://store.example.com',
  is_master: false,
};
export async function api(path, options = {}) {
  if (!window.portalAccess.requireLogin()) throw new Error('Please log in.');
  if (options.method && options.method !== 'GET') throw new Error('This workspace is read-only.');
  const data = structuredClone(await loadFixtures());
  // Keep sample dates relative to today's UTC date even on older deployments.
  const shift = Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(data.anchor);
  for (const s of data.sessions)
    for (const k of ['started_at', 'last_activity_at', 'first_seen_at'])
      s[k] = new Date(Date.parse(s[k]) + shift).toISOString();
  const url = new URL(path, location.origin),
    p = url.pathname;
  if (p === '/api/auth/me') return { user };
  if (p === '/api/admin/analytics') return overview(data, url.searchParams);
  if (p === '/api/admin/recordings') return { recordings: [], stats: { total: 0 } };
  const s = data.sessions.find(
    (s) =>
      p.includes('/' + s.id + '/') ||
      p.endsWith('/' + s.id) ||
      p.includes('/' + s.id + '-recording'),
  );
  if (!s) throw new Error('Session not found.');
  const d = detail(s);
  if (p.endsWith('/events')) return { events: d.timeline, next_offset: null };
  if (p.endsWith('/video/status') && s.has_recording)
    return { status: 'ready', format: 'webm', segments: [], truncated: false };
  if (p.startsWith('/api/admin/analytics/sessions/')) return d;
  if (p.endsWith('-recording') && s.has_recording)
    return {
      recording: d.recordings[0],
      context: d.contexts[0],
      account_name: user.name,
      company_origin: s.origin,
    };
  throw new Error('This action is unavailable.');
}
export async function account() {
  if (!window.portalAccess.requireLogin()) return new Promise(() => {});
  mountShell(user);
  document.querySelector('#account').textContent = user.name;
  const button = document.querySelector('#logout');
  button.textContent = 'Log out';
  button.onclick = () => window.portalAccess.logout();
  return user;
}
export const date = (value) => new Date(value).toLocaleString();
export const duration = (ms) =>
  Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
