// The card for a lap you drove: 1200 × 630, the size link previews use, so it
// reads the same in a chat or on LinkedIn. The frame you crossed the line in,
// with your car in it, the time, the car's name and the track map.
import { CARS } from './cars.js';

const W = 1200, H = 630;
const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
const BODY = 'Barlow, system-ui, sans-serif';
const INK = '#f2f0ea', DIM = '#c9c6bd', ACCENT = '#ff5a1f';
export const CIRCUIT = 'Circuito delle Langhe';

// `snapshot` is a canvas of the race; `map` the track outline from track.js.
export function paintLapCard({ time, best, carId, snapshot, map }) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  // The race, cropped to fill the card, darker on the left where the time goes.
  const k = Math.max(W / snapshot.width, H / snapshot.height);
  g.drawImage(snapshot, (W - snapshot.width * k) / 2, (H - snapshot.height * k) / 2, snapshot.width * k, snapshot.height * k);
  const shade = g.createLinearGradient(0, 0, W * 0.75, 0);
  shade.addColorStop(0, 'rgba(12,13,16,0.92)');
  shade.addColorStop(0.55, 'rgba(12,13,16,0.7)');
  shade.addColorStop(1, 'rgba(12,13,16,0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);

  g.fillStyle = ACCENT;
  g.fillRect(0, 0, 10, H);
  g.textBaseline = 'alphabetic';

  g.fillStyle = DIM;
  g.font = `700 30px ${COND}`;
  g.fillText(CIRCUIT.toUpperCase(), 64, 92);

  g.fillStyle = INK;
  g.font = `800 200px ${COND}`;
  g.fillText(time, 56, 280);

  let y = 360;
  if (best) {
    g.font = `800 34px ${COND}`;
    const w = g.measureText('BEST LAP').width;
    g.fillStyle = ACCENT;
    g.fillRect(64, 314, w + 28, 50);
    g.fillStyle = '#14110f';
    g.fillText('BEST LAP', 78, 351);
    y = 424;
  }
  g.fillStyle = INK;
  g.font = `700 36px ${COND}`;
  g.fillText(`IN THE ${CARS[carId].name.toUpperCase()}`, 64, y);

  g.fillStyle = DIM;
  g.font = `500 28px ${BODY}`;
  g.fillText('Can you beat it?', 64, H - 44);
  g.fillStyle = ACCENT;
  g.font = `700 30px ${COND}`;
  g.textAlign = 'right';
  g.fillText('ADIAKYS.GITHUB.IO', W - 56, H - 44);
  g.textAlign = 'left';

  outline(g, map, W - 330, 40, 280, 200);
  return c;
}

function outline(g, pts, x, y, w, h) {
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const k = Math.min(w / (x1 - x0), h / (z1 - z0));
  const ox = x + (w - (x1 - x0) * k) / 2, oy = y + (h - (z1 - z0) * k) / 2;
  g.beginPath();
  pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](ox + (p.x - x0) * k, oy + (z1 - p.z) * k));
  g.closePath();
  g.lineJoin = g.lineCap = 'round';
  g.lineWidth = 12;
  g.strokeStyle = 'rgba(12,13,16,0.6)';
  g.stroke();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  // The start line.
  g.fillStyle = ACCENT;
  g.beginPath();
  g.arc(ox + (pts[0].x - x0) * k, oy + (z1 - pts[0].z) * k, 9, 0, Math.PI * 2);
  g.fill();
}
