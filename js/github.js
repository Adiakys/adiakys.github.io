// Live numbers for a repository from the GitHub API: stars, main language,
// last push, latest release. Kept for an hour so visitors stay well under the
// API's 60 requests an hour.
const CACHE_MS = 60 * 60 * 1000;
const ago = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const pending = new Map();

// Resolves to a list of short facts, or null when GitHub can't be reached.
export function repoStats(href) {
  const m = href.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return Promise.resolve(null);
  const key = `gh-stats:${m[1]}/${m[2]}`;
  if (!pending.has(key)) pending.set(key, load(m[1], m[2], key));
  return pending.get(key);
}

async function load(owner, repo, key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved && Date.now() - saved.at < CACHE_MS) return saved.stats;
  } catch { /* no storage */ }
  try {
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    const [r, rel] = await Promise.all([
      fetch(api).then((res) => (res.ok ? res.json() : null)),
      // The list, not /releases/latest, which answers 404 when there is none.
      fetch(`${api}/releases?per_page=1`).then((res) => (res.ok ? res.json() : [])),
    ]);
    if (!r) return null;
    const stats = [`${r.stargazers_count.toLocaleString('en')} ★`];
    if (r.language) stats.push(r.language);
    stats.push(`updated ${since(r.pushed_at)}`);
    if (rel[0]?.tag_name) stats.push(`release ${rel[0].tag_name}`);
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), stats })); } catch { /* no storage */ }
    return stats;
  } catch {
    return null;
  }
}

function since(iso) {
  const days = Math.round((Date.parse(iso) - Date.now()) / 86400000);
  if (days > -1) return 'today';
  if (days > -30) return ago.format(days, 'day');
  if (days > -365) return ago.format(Math.round(days / 30), 'month');
  return ago.format(Math.round(days / 365), 'year');
}
