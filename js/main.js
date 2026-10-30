import { buildTrack, SEG, ROAD_W, ROOF, WALLS } from './track.js';
import { makeArt } from './art.js';
import { createInput } from './input.js';
import { SPONSORS, readSponsorInfo } from './sponsors.js';

const canvas = document.getElementById('track');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const $ = (id) => document.getElementById(id);

// Camera and car.
const FOV = 100;
const CAM_H = 1000;
const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW = 300;
const PLAYER_Z = CAM_H * CAM_DEPTH;
const MAX_SPEED = SEG * 60;
const ACCEL = MAX_SPEED / 5;
const BRAKING = -MAX_SPEED;
const DECEL = -MAX_SPEED / 5;
const OFFROAD_DECEL = -MAX_SPEED / 2;
const OFFROAD_LIMIT = MAX_SPEED / 4;
const CENTRIFUGAL = 0.3;
const CAR_HALF = 0.16;    // half the car's width, in half road widths

const COLORS = {
  ground: { side: ['#25332d', '#22302a'], road: ['#2c2e33', '#2a2c30'], wall: ['#c9c6bd', '#b9b6ad'] },
  ramp: { side: ['#34373d', '#303338'], road: ['#3a3c41', '#36383d'], wall: ['#5b5e66', '#53565e'] },
  roof: { side: ['#6f7176', '#6a6c71'], road: ['#45474c', '#424449'], wall: ['#8d8f94', '#84868b'] },
  kerb: ['#d63a2f', '#f2f0ea'],
  edge: ['#5a5c62', '#55575d'],
  lane: '#e8e6df',
  fog: [44, 40, 58],
};

const track = buildTrack();
const info = readSponsorInfo();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let art;

// ?at=600 starts the car at that segment, to look at one part of the track.
const startAt = Number(new URLSearchParams(location.search).get('at')) || 0;
const car = { position: (startAt * SEG) % track.length, x: 0, speed: 0, bump: 0 };
const lap = { n: 1, start: 0, last: null, best: readBest(), time: 0 };
let skyOffset = 0;
let W = 0, H = 0;

const input = createInput({
  canvas,
  onCalibrate(text) {
    $('cal').hidden = !text;
    if (text) $('cal-step').textContent = text;
  },
});
$('cal-skip').addEventListener('click', () => input.skipCalibration());
$('recal').addEventListener('click', () => input.recalibrate());

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = canvas.width = Math.round(innerWidth * dpr);
  H = canvas.height = Math.round(innerHeight * dpr);
  const m = mini.getBoundingClientRect();
  mini.width = Math.round(m.width * dpr);
  mini.height = Math.round(m.height * dpr);
}
addEventListener('resize', resize);

// ---- Driving ----------------------------------------------------------------

const segAt = (z) => track.segments[Math.floor(z / SEG) % track.segments.length];

function autopilot(seg, sp) {
  const scroll = input.scroll();
  const cruise = reduceMotion && Math.abs(scroll) < 0.05 ? 0 : 0.5 + Math.max(0, scroll) * 0.45;
  const target = MAX_SPEED * cruise * (1 - Math.min(Math.abs(seg.curve) / 12, 0.25));
  return {
    steer: clamp(sp * seg.curve * CENTRIFUGAL - car.x * 1.5, -1, 1),
    throttle: car.speed < target ? 1 : 0,
    brake: car.speed > target * 1.1 || scroll < -0.3 ? 0.6 : 0,
  };
}

function update(dt) {
  input.update(dt);
  const seg = segAt(car.position + PLAYER_Z);
  const sp = car.speed / MAX_SPEED;
  const auto = input.idle();
  const c = auto ? autopilot(seg, sp) : input.state;

  const dx = dt * 2 * sp;
  car.x += dx * c.steer;
  car.x -= dx * sp * seg.curve * CENTRIFUGAL;

  if (c.throttle > 0) car.speed += ACCEL * c.throttle * dt;
  else car.speed += DECEL * dt;
  car.speed += BRAKING * c.brake * dt;
  if (Math.abs(car.x) > 1 && car.speed > OFFROAD_LIMIT) car.speed += OFFROAD_DECEL * dt;

  const wall = WALLS[seg.zone].at - CAR_HALF;
  if (Math.abs(car.x) > wall) {
    car.x = Math.sign(car.x) * wall;
    car.speed *= 0.6;
    car.bump = 1;
  }
  car.speed = clamp(car.speed, 0, MAX_SPEED);
  car.bump = Math.max(0, car.bump - dt * 3);

  const before = car.position;
  car.position = (car.position + dt * car.speed) % track.length;
  skyOffset += dt * 0.0012 * seg.curve * sp;

  lap.time += dt;
  if (car.position < before) {
    if (!auto && (lap.best === null || lap.time < lap.best)) saveBest((lap.best = lap.time));
    lap.last = lap.time;
    lap.time = 0;
    lap.n++;
  }
  return { seg, c, auto };
}

// ---- Drawing ----------------------------------------------------------------

function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = p.world.y - camY;
  p.camera.z = p.world.z - camZ;
  p.screen.scale = CAM_DEPTH / p.camera.z;
  p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
  p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
  p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
}

function quad(x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x2 - w2, y2);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x1 + w1, y1);
  ctx.closePath();
  ctx.fill();
}

const fogAt = (n) => 1 - Math.exp(-((n / DRAW) ** 2) * 3.2);
const fogStyle = (a) => `rgba(${COLORS.fog.join(',')},${a.toFixed(3)})`;

function drawSky(playerY) {
  const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
  sky.addColorStop(0, '#0e1424');
  sky.addColorStop(0.6, '#3b2f4a');
  sky.addColorStop(1, '#c8735a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H / 2 + 2);
  ctx.fillStyle = 'rgb(' + COLORS.fog.join(',') + ')';
  ctx.fillRect(0, H / 2, W, H / 2);

  // The higher the car, the lower the skyline sits under the horizon.
  const lift = playerY / ROOF;
  layer(art.alps, 0.35, H / 2 + lift * H * 0.015, H * 0.16);
  layer(art.city, 1, H / 2 + lift * H * 0.035, H * 0.13);
}

function layer(img, speed, bottom, height) {
  const w = (img.width * height) / img.height;
  let x = -(((skyOffset * speed * W) % w) + w) % w;
  for (; x < W; x += w) ctx.drawImage(img, x, bottom - height, w + 1, height);
}

function drawRoad() {
  const base = segAt(car.position);
  const basePct = (car.position % SEG) / SEG;
  const player = segAt(car.position + PLAYER_Z);
  const playerPct = ((car.position + PLAYER_Z) % SEG) / SEG;
  const playerY = lerp(player.p1.world.y, player.p2.world.y, playerPct);

  drawSky(playerY);

  let maxy = H;
  let x = 0;
  let dx = -(base.curve * basePct);
  const n = track.segments.length;

  for (let i = 0; i < DRAW; i++) {
    const s = track.segments[(base.index + i) % n];
    const looped = s.index < base.index ? track.length : 0;
    s.clip = maxy;
    s.fog = fogAt(i);
    project(s.p1, car.x * ROAD_W - x, playerY + CAM_H, car.position - looped);
    project(s.p2, car.x * ROAD_W - x - dx, playerY + CAM_H, car.position - looped);
    x += dx;
    dx += s.curve;
    s.visible = !(s.p1.camera.z <= CAM_DEPTH || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy);
    if (!s.visible) continue;
    segment(s);
    maxy = s.p1.screen.y;
  }

  for (let i = DRAW - 1; i > 0; i--) {
    const s = track.segments[(base.index + i) % n];
    for (const sp of s.sprites) sprite(s, sp);
    if (s.visible) { wall(s, -1); wall(s, 1); }
  }
  return playerY;
}

function segment(s) {
  const { p1: { screen: a }, p2: { screen: b } } = s;
  const col = COLORS[s.zone];
  const k = s.dark ? 1 : 0;

  ctx.fillStyle = col.side[k];
  ctx.fillRect(0, b.y, W, a.y - b.y);

  const r1 = a.w / 7, r2 = b.w / 7;
  const kerb = Math.abs(s.curve) > 0.5 ? COLORS.kerb[k] : COLORS.edge[k];
  quad(a.x - a.w - r1 / 2, a.y, r1 / 2, b.x - b.w - r2 / 2, b.y, r2 / 2, kerb);
  quad(a.x + a.w + r1 / 2, a.y, r1 / 2, b.x + b.w + r2 / 2, b.y, r2 / 2, kerb);
  quad(a.x, a.y, a.w, b.x, b.y, b.w, col.road[k]);

  if (s.index < 3) {
    // Start line: a row of checks across the road.
    const cells = 16;
    for (let c = 0; c < cells; c++) {
      if ((c + s.index) % 2) continue;
      const t1 = -1 + (2 * c) / cells, t2 = -1 + (2 * (c + 1)) / cells;
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath();
      ctx.moveTo(a.x + a.w * t1, a.y);
      ctx.lineTo(b.x + b.w * t1, b.y);
      ctx.lineTo(b.x + b.w * t2, b.y);
      ctx.lineTo(a.x + a.w * t2, a.y);
      ctx.fill();
    }
  } else if (!s.dark) {
    quad(a.x, a.y, a.w / 60, b.x, b.y, b.w / 60, COLORS.lane);
  }

  if (s.fog > 0.01) {
    ctx.fillStyle = fogStyle(s.fog);
    ctx.fillRect(0, b.y, W, a.y - b.y);
  }
}

function wall(s, side) {
  const { at, h } = WALLS[s.zone];
  const a = s.p1.screen, b = s.p2.screen;
  if (s.p1.camera.z <= CAM_DEPTH) return;
  const xa = a.x + side * at * a.w, xb = b.x + side * at * b.w;
  const ha = h * a.scale * W / 2, hb = h * b.scale * W / 2;
  ctx.fillStyle = COLORS[s.zone].wall[s.dark ? 1 : 0];
  ctx.beginPath();
  ctx.moveTo(xa, a.y);
  ctx.lineTo(xb, b.y);
  ctx.lineTo(xb, b.y - hb);
  ctx.lineTo(xa, a.y - ha);
  ctx.closePath();
  ctx.fill();
  if (s.fog > 0.01) { ctx.fillStyle = fogStyle(s.fog); ctx.fill(); }
}

function sprite(s, sp) {
  const a = s.p1.screen;
  if (s.p1.camera.z <= CAM_DEPTH) return;
  const kind = sp.kind === 'board' ? art.boards[sp.id] : art[sp.kind];
  const img = kind.img;
  const w = kind.w * a.scale * W / 2;
  const h = (w * img.height) / img.width;
  const x = a.x + sp.offset * a.w * 1 + (sp.offset < 0 ? -w : 0);
  const y = a.y - h;
  const hidden = Math.max(0, y + h - s.clip);
  if (hidden >= h || w < 1) return;
  const srcH = img.height * (1 - hidden / h);
  ctx.drawImage(img, 0, 0, img.width, srcH, x, y, w, h - hidden);
  if (s.fog > 0.01) {
    ctx.globalAlpha = s.fog;
    ctx.fillStyle = fogStyle(1);
    ctx.fillRect(x, y, w, h - hidden);
    ctx.globalAlpha = 1;
  }
}

function drawCar(c) {
  const img = art.car;
  const narrow = innerWidth <= 720;
  const w = narrow ? W * 0.5 : Math.min(W * 0.3, H * 0.62);
  const h = (w * img.height) / img.width;
  const sp = car.speed / MAX_SPEED;
  const shake = (Math.random() - 0.5) * (sp * 3 + car.bump * 14) * (W / 1400);
  const x = W / 2 + c.steer * w * 0.06;
  // On phones the project list sits along the bottom edge.
  const y = H - h * 0.55 - (narrow ? 80 * (W / innerWidth) : H * 0.03) + shake;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(c.steer * 0.05);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (c.brake > 0.1) {
    const k = w / img.width;
    ctx.fillStyle = '#ff2a1a';
    ctx.shadowColor = '#ff2a1a';
    ctx.shadowBlur = 30 * k * 3;
    ctx.fillRect(-w / 2 + 304 * k, -h / 2 + 214 * k, 32 * k, 16 * k);
  }
  ctx.restore();
}

function drawMinimap() {
  const pts = track.map;
  const w = mini.width, h = mini.height;
  if (!w) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const pad = w * 0.1;
  const k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxZ - minZ));
  const ox = (w - (maxX - minX) * k) / 2, oz = (h - (maxZ - minZ) * k) / 2;
  const at = (p) => [ox + (p.x - minX) * k, oz + (p.z - minZ) * k];

  mctx.clearRect(0, 0, w, h);
  mctx.lineCap = mctx.lineJoin = 'round';
  mctx.lineWidth = w * 0.03;
  mctx.strokeStyle = 'rgba(242,240,234,0.85)';
  mctx.beginPath();
  pts.forEach((p, i) => (i ? mctx.lineTo(...at(p)) : mctx.moveTo(...at(p))));
  mctx.closePath();
  mctx.stroke();

  const [cx, cz] = at(pts[Math.floor(car.position / SEG) % pts.length]);
  mctx.fillStyle = SPONSORS.simrig.bg;
  mctx.beginPath();
  mctx.arc(cx, cz, w * 0.045, 0, Math.PI * 2);
  mctx.fill();
}

// ---- HUD and the sponsor on screen -------------------------------------------

let shownSponsor = null;
let sponsorUntil = 0;

function sponsorOverlay(seg, now) {
  const zone = track.zones.find((z) => seg.index >= z.from && seg.index < z.to);
  if (zone) sponsorUntil = now + 1500;
  const id = zone?.id ?? (now < sponsorUntil ? shownSponsor : null);
  if (id === shownSponsor) return;
  shownSponsor = id;
  const box = $('lower-third');
  if (!id) { box.classList.remove('on'); return; }
  const s = SPONSORS[id], i = info[id];
  box.style.setProperty('--sponsor', s.bg);
  box.querySelector('.title').textContent = i.title;
  box.querySelector('.title').href = i.href;
  box.querySelector('.what').textContent = i.text;
  box.querySelector('.tech').textContent = i.tech;
  box.classList.add('on');
}

const fmt = (t) => (t === null ? '–:––.–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`);
let hudTick = 0;

function hud(auto) {
  if (++hudTick % 4) return;
  $('speed').textContent = Math.round((car.speed / MAX_SPEED) * 260);
  $('lap').textContent = lap.n;
  $('lap-time').textContent = fmt(lap.time);
  $('lap-last').textContent = fmt(lap.last);
  $('lap-best').textContent = fmt(lap.best);
  const s = input.state;
  $('driver').textContent = auto ? 'Autopilot' : { keys: 'Keyboard', touch: 'Touch', pad: s.device, wheel: s.device }[s.source] ?? '';
  $('recal').hidden = !input.hasWheel();
}

function readBest() {
  try { return JSON.parse(localStorage.getItem('best-lap')); } catch { return null; }
}
function saveBest(t) {
  try { localStorage.setItem('best-lap', JSON.stringify(t)); } catch { /* private mode */ }
}

// ---- Loop -------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const { seg, c, auto } = update(dt);
  drawRoad();
  drawCar(c);
  drawMinimap();
  sponsorOverlay(seg, now);
  hud(auto);
  requestAnimationFrame(frame);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

document.fonts.load('800 100px "Barlow Condensed"').catch(() => {}).finally(() => {
  art = makeArt();
  if (innerWidth < 1100) document.querySelector('.sponsors').open = false;
  resize();
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
});
