// The engine, synthesised: no recordings, just oscillators at the firing
// frequency of the car's engine, a bit of noise for the intake, a soft clip
// for grit and a filter that opens with the throttle. Off until switched on;
// browsers only let a page make sound after a click or a key anyway.
const store = {
  get() { try { return localStorage.getItem('sound') === 'on'; } catch { return false; } },
  set(on) { try { localStorage.setItem('sound', on ? 'on' : 'off'); } catch { /* private mode */ } },
};

export function createEngineSound() {
  let ac = null, n = null;
  let wanted = store.get();
  let paused = false;

  function build() {
    ac = new AudioContext();
    const osc = (type, gain) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      g.gain.value = gain;
      o.connect(g);
      o.start();
      return { o, g };
    };
    // The firing pulse, the lump of half the firing order, the whine an octave up.
    const fire = osc('sawtooth', 0.5), half = osc('square', 0.22), whine = osc('sawtooth', 0.08);
    const noise = ac.createBufferSource();
    noise.buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noise.buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.loop = true;
    const intake = ac.createBiquadFilter();
    intake.type = 'bandpass';
    intake.Q.value = 1.2;
    const breath = ac.createGain();
    breath.gain.value = 0;
    noise.connect(intake).connect(breath);
    noise.start();

    const grit = ac.createWaveShaper();
    grit.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh(((i / 1023) * 2 - 1) * 2.5));
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 2;
    const master = ac.createGain();
    master.gain.value = 0;
    for (const s of [fire.g, half.g, whine.g, breath]) s.connect(grit);
    grit.connect(tone).connect(master).connect(ac.destination);
    n = { fire, half, whine, intake, breath, tone, master };
  }

  const set = (param, v) => param.setTargetAtTime(v, ac.currentTime, 0.03);

  function apply() {
    if (!ac) return;
    if (wanted && !paused) ac.resume();
    else ac.suspend();
  }

  // A click or a key anywhere starts the sound if it was left on last time.
  const wake = () => {
    if (!wanted) return;
    if (!ac) build();
    apply();
  };
  addEventListener('pointerdown', wake);
  addEventListener('keydown', wake);
  document.addEventListener('visibilitychange', () => {
    if (ac) document.hidden ? ac.suspend() : apply();
  });

  return {
    get on() { return wanted; },
    toggle() {
      wanted = !wanted;
      store.set(wanted);
      if (wanted && !ac) build();
      apply();
      return wanted;
    },
    // Silent while the casino room is open or the camera is on a billboard.
    pause(p) {
      if (p === paused) return;
      paused = p;
      apply();
    },
    // Each frame: the revs, the throttle (0..1) and the car's engine (cars.js).
    update(rpm, throttle, spec) {
      if (!ac || ac.state !== 'running') return;
      const { cylinders, bright } = spec.engine;
      const f = (rpm / 60) * (cylinders / 2);
      const load = rpm / spec.limiter;
      set(n.fire.o.frequency, f);
      set(n.half.o.frequency, f / 2);
      set(n.whine.o.frequency, f * 2);
      set(n.whine.g.gain, 0.04 + 0.14 * bright * load);
      set(n.intake.frequency, f * 3);
      set(n.breath.gain, 0.05 + 0.3 * throttle);
      set(n.tone.frequency, 250 + 900 * load + 2600 * throttle * bright);
      set(n.master.gain, 0.05 + 0.08 * throttle + 0.05 * load);
    },
  };
}
