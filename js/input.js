// Keyboard, touch, gamepads and wheels, all reduced to steer (-1..1),
// throttle and brake (0..1). Nobody driving for a while hands over to the autopilot.
const IDLE_MS = 6000;
const STEER_RATE = 3.5;   // keyboard steering, units per second

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

export function createInput({ canvas, onCalibrate }) {
  const state = { steer: 0, throttle: 0, brake: 0, source: 'auto', device: null, lastActive: -Infinity };
  const keys = new Set();
  const touches = new Map();
  let scrollBoost = 0;
  let calibration = null;

  const active = (source) => {
    state.source = source;
    state.lastActive = performance.now();
  };

  const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  addEventListener('keydown', (e) => {
    if (!KEYS.includes(e.code) || e.target.closest?.('input, textarea, feeling-lucky')) return;
    e.preventDefault();
    keys.add(e.code);
    active('keys');
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  addEventListener('wheel', (e) => {
    if (e.target.closest?.('.panel')) return;
    scrollBoost = Math.max(-1, Math.min(1, scrollBoost + Math.sign(e.deltaY) * 0.25));
  }, { passive: true });

  const touch = (e) => {
    for (const t of e.changedTouches) {
      if (e.type === 'touchend' || e.type === 'touchcancel') touches.delete(t.identifier);
      else touches.set(t.identifier, t.clientX / innerWidth);
    }
    if (touches.size) active('touch');
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
    canvas.addEventListener(type, touch, { passive: true });

  function pad() {
    for (const p of navigator.getGamepads?.() ?? []) if (p && p.connected) return p;
    return null;
  }

  function readPad(p, dt) {
    if (calibration) return stepCalibration(p);
    let steer, throttle, brake;
    if (p.mapping === 'standard') {
      steer = Math.abs(p.axes[0]) > 0.12 ? p.axes[0] : 0;
      throttle = p.buttons[7]?.value ?? 0;
      brake = p.buttons[6]?.value ?? 0;
    } else {
      const cal = store.get('wheel:' + p.id);
      if (!cal) return startCalibration(p);
      const norm = (a) => (p.axes[a.index] - a.rest) / (a.full - a.rest);
      steer = clamp(norm(cal.steer), -1, 1);
      throttle = clamp(norm(cal.throttle), 0, 1);
      brake = clamp(norm(cal.brake), 0, 1);
    }
    state.device = p.id.replace(/\s*\(.*\)\s*/g, ' ').trim();
    if (Math.abs(steer) > 0.04 || throttle > 0.04 || brake > 0.04)
      active(p.mapping === 'standard' ? 'pad' : 'wheel');
    if (state.source === 'pad' || state.source === 'wheel') {
      state.steer = steer;
      state.throttle = throttle;
      state.brake = brake;
      return true;
    }
    return false;
  }

  // Wheels put their axes anywhere, so ask: turn, press throttle, press brake.
  // The axis that moves most is the one; it counts once it comes back.
  const STEPS = [
    ['steer', 'Turn the wheel a quarter to the right, then back to centre.'],
    ['throttle', 'Press the throttle all the way, then release it.'],
    ['brake', 'Press the brake all the way, then release it.'],
  ];

  function startCalibration(p) {
    calibration = { id: p.id, step: 0, result: {} };
    beginStep(p);
    return false;
  }

  function beginStep(p) {
    calibration.rest = [...p.axes];
    calibration.peak = p.axes.map(() => 0);
    calibration.peakValue = [...p.axes];
    onCalibrate(STEPS[calibration.step][1]);
  }

  function stepCalibration(p) {
    const c = calibration;
    const taken = Object.values(c.result).map((a) => a.index);
    let best = -1;
    p.axes.forEach((v, i) => {
      if (taken.includes(i)) return;
      const d = Math.abs(v - c.rest[i]);
      if (d > c.peak[i]) { c.peak[i] = d; c.peakValue[i] = v; }
      if (best < 0 || c.peak[i] > c.peak[best]) best = i;
    });
    if (best >= 0 && c.peak[best] > 0.4 && Math.abs(p.axes[best] - c.rest[best]) < 0.1) {
      c.result[STEPS[c.step][0]] = { index: best, rest: c.rest[best], full: c.peakValue[best] };
      if (++c.step === STEPS.length) {
        store.set('wheel:' + c.id, c.result);
        calibration = null;
        onCalibrate(null);
      } else beginStep(p);
    }
    return false;
  }

  return {
    state,
    skipCalibration() {
      calibration = null;
      onCalibrate(null);
    },
    recalibrate() {
      const p = pad();
      if (p && p.mapping !== 'standard') startCalibration(p);
    },
    hasWheel: () => { const p = pad(); return !!p && p.mapping !== 'standard'; },
    idle: () => performance.now() - state.lastActive > IDLE_MS,
    scroll() {
      const s = scrollBoost;
      scrollBoost *= 0.96;
      return s;
    },
    update(dt) {
      const p = pad();
      if (p && readPad(p, dt)) return;

      if (state.source === 'touch' && touches.size) {
        const xs = [...touches.values()];
        const target = xs.some((x) => x < 0.33) ? -1 : xs.some((x) => x > 0.67) ? 1 : 0;
        state.steer = approach(state.steer, target, STEP(dt));
        state.throttle = 1;
        state.brake = 0;
        return;
      }

      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      const target = left === right ? 0 : left ? -1 : 1;
      state.steer = approach(state.steer, target, STEP(dt));
      state.throttle = keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0;
      state.brake = keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0;
    },
  };
}

const STEP = (dt) => STEER_RATE * dt;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, step) => (v < t ? Math.min(t, v + step) : Math.max(t, v - step));
