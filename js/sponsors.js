// The projects, as sponsors. The same list is in index.html as plain links;
// the track reads the ids from there and the board colours from here.
export const SPONSORS = {
  simrig: { name: 'SIMRIG', bg: '#ff5a1f', fg: '#14110f', tag: 'RUST' },
  otlp: { name: 'OTLP DASHBOARD', bg: '#2f6bff', fg: '#ffffff', tag: '.NET' },
  mediatr: { name: 'OPENMEDIATR', bg: '#f2f0ea', fg: '#14110f', tag: '.NET' },
  lucky: { name: 'FEELING LUCKY', bg: '#0f7a4a', fg: '#f6e7b0', tag: 'TS' },
  gauth: { name: 'LIMITEDINPUTAUTH', bg: '#1b1d22', fg: '#f2f0ea', tag: '.NET' },
  vision: { name: 'CLAUDE VISION', bg: '#d4a373', fg: '#14110f', tag: 'PY' },
};

export function readSponsorInfo() {
  const info = {};
  for (const li of document.querySelectorAll('[data-sponsor]')) {
    const a = li.querySelector('a');
    info[li.dataset.sponsor] = {
      title: a.textContent,
      href: a.href,
      text: li.querySelector('.what').textContent,
      tech: li.querySelector('.tech').textContent,
    };
  }
  return info;
}
