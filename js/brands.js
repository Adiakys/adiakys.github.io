// The projects as trackside sponsors. Each one advertises in its own voice:
// its colours, its type, the thing it is about drawn as the hero. Below the
// ad sits what the camera zooms in on: what it is, what it's built with, and
// its live numbers on GitHub.
//
// Bay billboards are 1600 × 1000: the ad fills the top 820, the circuit's own
// "pull in" plate hangs under it between the legs.
const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
const BODY = 'Barlow, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const DECO = 'Limelight, Georgia, serif';

export const BOARD = { w: 1600, h: 1000, ad: 820, panel: 0.9 };

// Where the Feeling Lucky board has its casino button, in board pixels: the
// page lays a real, animated button over it when the camera is there.
export const LUCKY_BUTTON = { x: 1200, y: 468, w: 310, h: 220 };

// Pictures the painters need, loaded once before the first frame.
export async function loadBrandImages() {
  const img = new Image();
  img.src = 'assets/brands/simrig-wheel.svg';
  try { await img.decode(); } catch { return {}; }
  return { simrigWheel: img };
}

export function paintBoard(c, id, i, stats, images) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  legs(g);
  BRANDS[id].board(g, i, stats ?? [], images);
  pullIn(g);
  return c;
}

export function paintHoarding(id) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 150;
  BRANDS[id].hoarding(c.getContext('2d'));
  return c;
}

const BRANDS = {
  // Motorsport tech: charcoal and Rust orange, a livery stripe, the formula wheel.
  simrig: {
    board(g, i, stats, { simrigWheel }) {
      g.fillStyle = '#1b1c1f';
      g.fillRect(0, 0, 1600, 820);
      g.fillStyle = '#ff5a1f';
      slant(g, 960, 300, 820);
      g.fillStyle = '#f2ece2';
      slant(g, 1370, 34, 600);
      if (simrigWheel) g.drawImage(simrigWheel, 1090, 70, 420, 420);
      g.save();
      g.transform(1, 0, -0.2, 1, 40, 0);
      g.fillStyle = '#f2ece2';
      g.font = `800 250px ${COND}`;
      g.fillText('SIMRIG', 60, 250);
      g.restore();
      g.fillStyle = '#ff5a1f';
      g.font = `700 64px ${COND}`;
      g.fillText('Any wheel. Any pedal. On Linux.', 64, 340);
      info(g, i, stats, { x: 64, w: 880, ink: '#f2ece2', dim: '#9c9a95', accent: '#ff5a1f', chip: 'rgba(242,236,226,0.12)' });
    },
    hoarding(g) {
      g.fillStyle = '#ff5a1f';
      g.fillRect(0, 0, 1024, 150);
      g.fillStyle = '#1b1c1f';
      g.fillRect(760, 0, 264, 150);
      g.save();
      g.transform(1, 0, -0.2, 1, 20, 0);
      g.font = `800 120px ${COND}`;
      g.fillText('SIMRIG', 60, 122);
      g.restore();
      g.fillStyle = '#f2ece2';
      g.font = `700 40px ${COND}`;
      g.fillText('ON LINUX', 790, 92);
    },
  },

  // Observability: its own mark (three spans, one hot), a trace waterfall.
  otlp: {
    board(g, i, stats) {
      g.fillStyle = '#141d30';
      g.fillRect(0, 0, 1600, 820);
      // The waterfall, faint, down the right side.
      const spans = [[0, 520], [40, 300], [70, 140], [240, 220], [360, 120], [180, 330], [420, 90]];
      spans.forEach(([x, w], n) => {
        g.fillStyle = n === 4 ? '#e8603c' : 'rgba(122,162,255,0.22)';
        g.fillRect(1000 + x, 390 + n * 46, w, 28);
      });
      logoLines(g, 64, 70, 3.2, '#e9edf5', '#e8603c');
      g.fillStyle = '#e9edf5';
      g.font = `800 110px ${MONO}`;
      g.fillText('otlp', 300, 160);
      g.fillText('dashboard', 300, 270);
      g.fillStyle = '#7aa2ff';
      g.font = `500 44px ${MONO}`;
      g.fillText('traces, logs and metrics. on your own box.', 64, 360);
      info(g, i, stats, { x: 64, w: 900, ink: '#e9edf5', dim: '#8d97ab', accent: '#7aa2ff', chip: 'rgba(122,162,255,0.16)', mono: true });
    },
    hoarding(g) {
      g.fillStyle = '#141d30';
      g.fillRect(0, 0, 1024, 150);
      logoLines(g, 40, 22, 1.5, '#e9edf5', '#e8603c');
      g.fillStyle = '#e9edf5';
      g.font = `800 76px ${MONO}`;
      g.fillText('otlpdashboard', 180, 102);
    },
  },

  // A clean .NET library: light, navy and cyan, its hexagon with requests
  // going in one side and out the other.
  mediatr: {
    board(g, i, stats) {
      g.fillStyle = '#f4f6fb';
      g.fillRect(0, 0, 1600, 820);
      g.fillStyle = '#1b2f6b';
      g.fillRect(0, 0, 1600, 18);
      mediator(g, 300, 200, 1.05);
      g.fillStyle = '#1b2f6b';
      g.font = `800 136px ${BODY}`;
      g.fillText('OpenMediatR', 610, 248);
      g.fillStyle = '#1e95cc';
      g.font = `600 52px ${BODY}`;
      g.fillText('Requests in, handlers out. Free, Apache 2.0.', 64, 400);
      info(g, i, stats, { x: 64, y: 480, w: 1460, ink: '#1b2f6b', dim: '#5a6789', accent: '#1e95cc', chip: 'rgba(27,47,107,0.08)' });
    },
    hoarding(g) {
      g.fillStyle = '#f4f6fb';
      g.fillRect(0, 0, 1024, 150);
      mediator(g, 120, 75, 0.48);
      g.fillStyle = '#1b2f6b';
      g.font = `800 84px ${BODY}`;
      g.fillText('OpenMediatR', 260, 106);
    },
  },

  // A casino room: green baize, a gold deco frame, a clover, a winning hand.
  lucky: {
    board(g, i, stats) {
      const felt = g.createRadialGradient(800, 380, 80, 800, 380, 900);
      felt.addColorStop(0, '#13684a');
      felt.addColorStop(1, '#0a3d2b');
      g.fillStyle = felt;
      g.fillRect(0, 0, 1600, 820);
      g.strokeStyle = '#d4af5a';
      g.lineWidth = 6;
      g.strokeRect(22, 22, 1556, 776);
      g.lineWidth = 2;
      g.strokeRect(40, 40, 1520, 740);
      for (const [x, y] of [[40, 40], [1560, 40], [40, 780], [1560, 780]]) {
        g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.stroke();
      }
      clover(g, 150, 170, 60, '#d4af5a');
      card(g, 1320, 150, -0.18, 'A', '♠', '#14110f');
      card(g, 1430, 140, 0.12, '7', '♥', '#c0392b');
      g.fillStyle = '#e8c766';
      g.font = `120px ${DECO}`;
      g.fillText('Feeling Lucky', 250, 215);
      g.fillStyle = '#f1e6c8';
      g.font = `italic 500 54px ${BODY}`;
      g.fillText('Spin the wheel, deal a hand, scratch a card.', 90, 340);
      info(g, i, stats, { x: 90, w: 1060, ink: '#f1e6c8', dim: '#b9c9ae', accent: '#e8c766', chip: 'rgba(212,175,90,0.18)', foot: 738, right: 1500 });
      casinoButton(g, LUCKY_BUTTON);
    },
    hoarding(g) {
      g.fillStyle = '#0d4a33';
      g.fillRect(0, 0, 1024, 150);
      g.strokeStyle = '#d4af5a';
      g.lineWidth = 4;
      g.strokeRect(8, 8, 1008, 134);
      clover(g, 90, 75, 30, '#d4af5a');
      g.fillStyle = '#e8c766';
      g.font = `84px ${DECO}`;
      g.fillText('Feeling Lucky', 170, 106);
    },
  },

  // Sign in on the TV, confirm on the phone: the device code is the hero.
  gauth: {
    board(g, i, stats) {
      g.fillStyle = '#3f1d66';
      g.fillRect(0, 0, 1600, 820);
      g.fillStyle = '#f5f0fb';
      g.font = `800 140px ${COND}`;
      g.fillText('LimitedInputAuth', 64, 190);
      g.fillStyle = '#c9a8f0';
      g.font = `700 60px ${COND}`;
      g.fillText('.NET', 64, 270);
      // The code, as a TV shows it.
      g.fillStyle = '#f5f0fb';
      round(g, 990, 80, 546, 260, 26);
      g.fillStyle = '#7d6a95';
      g.font = `600 34px ${BODY}`;
      g.fillText('Enter this code on your phone', 1026, 140);
      g.fillStyle = '#3f1d66';
      g.font = `800 82px ${MONO}`;
      g.fillText('WDJB-MJHT', 1026, 258);
      g.fillStyle = '#c9a8f0';
      g.font = `600 54px ${BODY}`;
      g.fillText('Sign in on the TV. Confirm on the phone.', 64, 400);
      info(g, i, stats, { x: 64, y: 480, w: 1460, ink: '#f5f0fb', dim: '#b8a6cf', accent: '#c9a8f0', chip: 'rgba(245,240,251,0.12)' });
    },
    hoarding(g) {
      g.fillStyle = '#3f1d66';
      g.fillRect(0, 0, 1024, 150);
      g.fillStyle = '#f5f0fb';
      round(g, 30, 28, 360, 94, 14);
      g.fillStyle = '#3f1d66';
      g.font = `800 58px ${MONO}`;
      g.fillText('WDJB-MJHT', 52, 96);
      g.fillStyle = '#f5f0fb';
      g.font = `800 64px ${COND}`;
      g.fillText('LimitedInputAuth', 420, 98);
    },
  },

  // What the assistant sees: a camera viewfinder, recording.
  vision: {
    board(g, i, stats) {
      g.fillStyle = '#1d2023';
      g.fillRect(0, 0, 1600, 820);
      g.strokeStyle = '#f0f0ee';
      g.lineWidth = 8;
      for (const [x, y, dx, dy] of [[40, 40, 1, 1], [1560, 40, -1, 1], [40, 780, 1, -1], [1560, 780, -1, -1]]) {
        g.beginPath(); g.moveTo(x, y + dy * 80); g.lineTo(x, y); g.lineTo(x + dx * 80, y); g.stroke();
      }
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(1380, 210); g.lineTo(1460, 210); g.moveTo(1420, 170); g.lineTo(1420, 250); g.stroke();
      g.fillStyle = '#e5484d';
      g.beginPath(); g.arc(104, 104, 18, 0, Math.PI * 2); g.fill();
      g.font = `700 40px ${MONO}`;
      g.fillText('REC', 136, 118);
      g.fillStyle = '#f0f0ee';
      g.textAlign = 'right';
      g.fillText('00:02:17:08', 1500, 118);
      g.textAlign = 'left';
      g.font = `800 120px ${MONO}`;
      g.fillText('claude-vision', 90, 280);
      g.fillStyle = '#b8bcc2';
      g.font = `500 50px ${BODY}`;
      g.fillText('Snapshots, short clips or a live watch.', 90, 380);
      info(g, i, stats, { x: 90, y: 450, w: 1400, ink: '#f0f0ee', dim: '#9aa0a8', accent: '#e5484d', chip: 'rgba(240,240,238,0.1)', mono: true, foot: 740, right: 1490 });
    },
    hoarding(g) {
      g.fillStyle = '#1d2023';
      g.fillRect(0, 0, 1024, 150);
      g.fillStyle = '#e5484d';
      g.beginPath(); g.arc(70, 75, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0f0ee';
      g.font = `800 76px ${MONO}`;
      g.fillText('claude-vision', 120, 102);
    },
  },
};

// What the camera zooms in on, in each brand's colours: the description,
// what it's built with and the live numbers, then where to find it.
// `foot` is the baseline of the last line, `right` where it ends: inside any frame.
function info(g, i, stats, { x, y = 450, w, ink, dim, accent, chip, mono = false, foot = 780, right = 1536 }) {
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = ink;
  g.font = `500 50px ${BODY}`;
  wrap(g, i.text, x, y + 40, w, 62, 2);
  g.fillStyle = accent;
  g.font = `700 42px ${mono ? MONO : COND}`;
  g.fillText(i.tech, x, y + 190);
  let cx = x;
  g.font = `600 36px ${mono ? MONO : COND}`;
  for (const fact of stats) {
    const fw = g.measureText(fact).width + 36;
    if (cx + fw > x + w) break;
    g.fillStyle = chip;
    g.fillRect(cx, y + 212, fw, 54);
    g.fillStyle = ink;
    g.fillText(fact, cx + 18, y + 251);
    cx += fw + 14;
  }
  g.fillStyle = dim;
  g.font = `600 38px ${mono ? MONO : COND}`;
  g.fillText(i.href.replace(/^https:\/\//, ''), x, foot);
  g.textAlign = 'right';
  g.fillText('Enter to open', right, foot);
  g.textAlign = 'left';
}

// Red velvet, a gold rim, a ring of bulbs: the button the page animates.
function casinoButton(g, { x, y, w, h }) {
  g.fillStyle = '#7d1720';
  round(g, x, y, w, h, 22);
  g.strokeStyle = '#d4af5a';
  g.lineWidth = 6;
  g.beginPath(); g.roundRect(x, y, w, h, 22); g.stroke();
  g.fillStyle = '#ffe9a8';
  const n = 9;
  for (let k = 0; k < n; k++) {
    for (const by of [y + 16, y + h - 16]) { g.beginPath(); g.arc(x + 24 + (k * (w - 48)) / (n - 1), by, 6, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = '#e8c766';
  g.font = `40px ${DECO}`;
  g.textAlign = 'center';
  g.fillText('Try your luck', x + w / 2, y + h / 2 + 4, w - 40);
  g.fillStyle = '#f1e6c8';
  g.font = `500 26px ${BODY}`;
  g.fillText('Win a faster car', x + w / 2, y + h / 2 + 46);
  g.textAlign = 'left';
}

// The circuit's own plate under every bay billboard.
function pullIn(g) {
  g.fillStyle = '#2f6bff';
  g.fillRect(560, 840, 480, 64);
  g.fillStyle = '#ffffff';
  g.fillRect(572, 850, 44, 44);
  g.fillStyle = '#2f6bff';
  g.font = `800 40px ${COND}`;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText('P', 594, 874);
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.font = `700 36px ${COND}`;
  g.fillText('Pull in to read more', 632, 874);
  g.textBaseline = 'alphabetic';
}

function legs(g) {
  g.fillStyle = '#2b2d31';
  g.fillRect(300, 820, 40, 180);
  g.fillRect(1260, 820, 40, 180);
}

function slant(g, x, w, h) {
  g.beginPath();
  g.moveTo(x + 160, 0); g.lineTo(x + 160 + w, 0); g.lineTo(x + w, h); g.lineTo(x, h);
  g.fill();
}

// OtlpDashboard's mark: three spans of different length, the middle one ending hot.
function logoLines(g, x, y, k, ink, hot) {
  g.strokeStyle = ink;
  g.lineCap = 'round';
  g.lineWidth = 9 * k;
  for (const [y0, x1] of [[0, 60], [20, 42], [40, 48]]) {
    g.beginPath(); g.moveTo(x, y + y0 * k); g.lineTo(x + x1 * k, y + y0 * k); g.stroke();
  }
  g.fillStyle = hot;
  g.beginPath(); g.arc(x + 54 * k, y + 20 * k, 9 * k, 0, Math.PI * 2); g.fill();
}

// OpenMediatR's mark: a hexagon with an M, a request in, a response out.
function mediator(g, cx, cy, k) {
  const hex = (r) => {
    g.beginPath();
    for (let a = 0; a < 6; a++) g.lineTo(cx + r * Math.sin((a * Math.PI) / 3), cy - r * Math.cos((a * Math.PI) / 3));
    g.closePath();
  };
  g.fillStyle = '#29a8e0';
  hex(118 * k); g.fill();
  g.fillStyle = '#1b2f6b';
  hex(98 * k); g.fill();
  g.fillStyle = '#ffffff';
  g.font = `800 ${110 * k}px ${BODY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('M', cx, cy + 6 * k);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const arrow = (x0, x1, color) => {
    g.strokeStyle = g.fillStyle = color;
    g.lineWidth = 12 * k;
    g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1 - 22 * k, cy); g.stroke();
    g.beginPath(); g.moveTo(x1, cy); g.lineTo(x1 - 30 * k, cy - 20 * k); g.lineTo(x1 - 30 * k, cy + 20 * k); g.fill();
  };
  g.fillStyle = '#1b2f6b';
  g.fillRect(cx - 250 * k, cy - 24 * k, 48 * k, 48 * k);
  arrow(cx - 196 * k, cx - 128 * k, '#1b2f6b');
  arrow(cx + 128 * k, cx + 196 * k, '#29a8e0');
  g.fillStyle = '#29a8e0';
  g.fillRect(cx + 202 * k, cy - 24 * k, 48 * k, 48 * k);
}

function clover(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    g.beginPath(); g.arc(cx + dx * r * 0.62, cy + dy * r * 0.62, r * 0.58, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = color;
  g.lineWidth = r * 0.16;
  g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + r * 0.6, cy + r * 1.3, cx + r * 0.2, cy + r * 1.8); g.stroke();
}

function card(g, x, y, angle, rank, suit, color) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = '#fbf8f1';
  round(g, -100, -10, 200, 290, 18);
  g.fillStyle = color;
  g.font = `700 64px ${BODY}`;
  g.fillText(rank, -80, 60);
  g.font = `140px ${BODY}`;
  g.textAlign = 'center';
  g.fillText(suit, 0, 200);
  g.textAlign = 'left';
  g.restore();
}

function round(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

// Fill text into at most `lines` lines of `width`, ending with … if it doesn't fit.
function wrap(g, text, x, y, width, lineHeight, lines) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < lines && words.length; n++) {
    while (words.length && g.measureText(line + words[0]).width <= width) line += words.shift() + ' ';
    if (n === lines - 1 && words.length) line = line.trimEnd() + '…';
    g.fillText(line.trimEnd(), x, y + n * lineHeight);
    line = '';
  }
}
