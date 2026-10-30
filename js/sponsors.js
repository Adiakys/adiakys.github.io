// The projects, as sponsors. The same list is in index.html as plain links;
// the track reads the ids from there. Each brand's billboards are painted in
// brands.js; the accent is its colour in the HUD and on the garage doors.
export const SPONSORS = {
  simrig: { accent: '#ff5a1f' },
  otlp: { accent: '#7aa2ff' },
  mediatr: { accent: '#29a8e0' },
  lucky: { accent: '#e8c766' },
  gauth: { accent: '#c9a8f0' },
  vision: { accent: '#e5484d' },
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
