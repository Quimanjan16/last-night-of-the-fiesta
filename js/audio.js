// ============================================================
//  AUDIO — musika at tunog na ginagawa gamit ang Web Audio API.
//  Walang audio files: ang kulintang, agung, kuliglig, atbp. ay
//  "sinisintesays" habang tumatakbo ang laro.
// ============================================================
(function () {
  const KEY = 'sanisidro.sound';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

  let ctx = null, master, musicBus, sfxBus, ambBus, reverb, noiseBuf;
  let mood = null, pattern = [], step = 0, nextT = 0;
  let want = { mood: 'title', amb: {} };
  let ambState = {};
  let windSrc = null, windGain = null;
  let switchTimer = null;

  // ---------------- Setup ----------------
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.connect(master);
    master.connect(ctx.destination);

    // Simpleng reverb (para sa alingawngaw ng gong)
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    reverb.connect(wet);
    wet.connect(comp);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.85;
    musicBus.connect(comp);
    musicBus.connect(reverb);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.75;
    sfxBus.connect(comp);
    const sfxWet = ctx.createGain();
    sfxWet.gain.value = 0.4;
    sfxBus.connect(sfxWet);
    sfxWet.connect(reverb);
    ambBus = ctx.createGain();
    ambBus.gain.value = 0.5;
    ambBus.connect(comp);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    setInterval(tick, 25);
    ambLoops();
    setScene(want.mood, want.amb, true);
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, init, { passive: true }));

  // ---------------- Mga instrumento ----------------
  function env(g, t, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f, t, dur, vol, dest, attack = 0.005, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, vol, attack, dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, dest, filterType, freq, q = 1, freq2) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    f.Q.value = q;
    env(g, t, vol, 0.004, dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }
  // Kulintang: metal na gong na may di-harmonikong overtone
  function gong(f, t, vol, dest = musicBus) {
    tone('sine', f, t, 1.3, vol, dest, 0.004);
    tone('sine', f * 2.76, t, 0.45, vol * 0.3, dest, 0.003);
    tone('sine', f * 5.4, t, 0.15, vol * 0.1, dest, 0.002);
  }
  // Agung: malaking gong na may mababang ugong
  function agung(t, vol, dest = musicBus) {
    tone('sine', 76, t, 2.6, vol, dest, 0.01, 64);
    tone('sine', 152, t, 1.2, vol * 0.3, dest, 0.01, 130);
    noise(t, 0.08, vol * 0.2, dest, 'lowpass', 300);
  }
  // Rondalla/bandurria na kinakalabit
  function pluck(f, t, vol, dur = 0.45, dest = musicBus) {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(3200, t);
    fl.frequency.exponentialRampToValueAtTime(400, t + dur);
    env(g, t, vol, 0.003, dur);
    o.connect(fl);
    fl.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function pad(freqs, t, dur, vol) {
    for (const f of freqs) {
      for (const det of [1, 1.006]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f * det;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
        g.gain.setValueAtTime(vol, t + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g);
        g.connect(musicBus);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }
  // Dabakan (tambol)
  function drum(t, vol, f0 = 140, f1 = 48, dest = musicBus) {
    tone('sine', f0, t, 0.35, vol, dest, 0.002, f1);
    noise(t, 0.04, vol * 0.25, dest, 'bandpass', 900, 1);
  }
  // Kawayang pampalo
  function click(t, vol, dest = musicBus) {
    noise(t, 0.045, vol, dest, 'bandpass', 2600, 5);
  }

  // ---------------- Horror na instrumento ----------------
  // Mababang ugong na dahan-dahang gumagalaw
  function drone(freqs, t, dur, vol) {
    for (const f of freqs) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      fl.type = 'lowpass';
      fl.frequency.value = 260;
      lfo.frequency.value = 0.07 + Math.random() * 0.08;
      lg.gain.value = 160;
      lfo.connect(lg);
      lg.connect(fl.frequency);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
      g.gain.setValueAtTime(vol, t + dur * 0.75);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(fl);
      fl.connect(g);
      g.connect(musicBus);
      o.start(t);
      lfo.start(t);
      o.stop(t + dur + 0.05);
      lfo.stop(t + dur + 0.05);
    }
  }
  // Nakakakilabot na sipol (parang boses sa malayo)
  function whistle(t) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    const f = 900 + Math.random() * 600;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 2.6);
    lfo.frequency.value = 5.5;
    lg.gain.value = 9;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 2.9);
    lfo.stop(t + 2.9);
  }
  // Biglang sirang chord (para gulatin nang kaunti)
  function stab(t) {
    for (const f of [116.5, 123.5, 155.6, 233]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      env(g, t, 0.05, 0.01, 1.6);
      o.connect(g);
      g.connect(musicBus);
      o.start(t);
      o.stop(t + 1.7);
    }
    tone('sine', 60, t, 1.2, 0.35, musicBus, 0.005, 35);
  }
  // Kaskas ng metal (parang kuko sa yero)
  function scrape(t) {
    noise(t, 1.4, 0.05, musicBus, 'bandpass', 3200, 12, 1800);
  }

  // ---------------- Musika ----------------
  const P = [0, 2, 4, 7, 9]; // pentatonic (kulintang)
  const M = [0, 3, 5, 7, 10]; // minor pentatonic
  const MOODS = {
    title: { bpm: 76, root: 392, scale: P, rest: 0.5, vol: 0.15, agung: 16, pad: [98, 146.8], padVol: 0.04 },
    day: { bpm: 108, root: 587.3, scale: P, rest: 0.32, vol: 0.12, agung: 8, bass: [146.8, 220], clicks: true },
    dusk: { bpm: 88, root: 440, scale: P, rest: 0.45, vol: 0.12, agung: 16, pad: [110, 164.8], padVol: 0.04, clicks: true },
    night: { bpm: 70, root: 440, scale: M, rest: 0.72, vol: 0.09, pad: [110, 130.8, 164.8], padVol: 0.04 },
    fog: { bpm: 60, root: 220, scale: M, rest: 0.86, vol: 0.08, pad: [73.4, 77.8], padVol: 0.06, heart: true },
    tense: { bpm: 132, root: 220, scale: M, rest: 0.15, vol: 0.09, pluckLead: true, toms: true, agung: 16 },
    fiesta: { bpm: 124, root: 587.3, scale: P, rest: 0.25, vol: 0.11, agung: 8, clicks: true, chords: true },
    dawn: { bpm: 72, root: 523.3, scale: P, rest: 0.55, vol: 0.1, pad: [130.8, 196], padVol: 0.045 },
    sad: { bpm: 58, root: 293.7, scale: M, rest: 0.7, vol: 0.08, pad: [73.4, 87.3, 110], padVol: 0.05, agung: 32 },
    hunt: { bpm: 112, root: 196, scale: M, rest: 0.8, vol: 0.07, drone: [49, 51.9], droneVol: 0.1, heart: true, toms: true, stab: 0.03, scrape: 0.02 },
    horror: { bpm: 60, root: 110, scale: M, rest: 0.93, vol: 0.06, drone: [55, 58.3, 82.4], droneVol: 0.09, heart: true, whistle: 0.05, stab: 0.025, scrape: 0.02 },
    silent: { bpm: 60, root: 220, scale: M, rest: 1, vol: 0.00001 },
    eerie: { bpm: 66, root: 220, scale: M, rest: 0.86, vol: 0.06, drone: [65.4, 69.3], droneVol: 0.07, whistle: 0.04, scrape: 0.01 },
  };
  function seeded(str) {
    let h = 2166136261;
    for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => ((h = Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0) / 4294967296;
  }
  function makePattern(name, m) {
    const R = seeded(name);
    const out = [];
    let d = 4;
    for (let i = 0; i < 32; i++) {
      if (R() < m.rest && i % 8 !== 0) { out.push(null); continue; }
      d = Math.max(0, Math.min(9, d + Math.floor(R() * 5) - 2));
      out.push(d);
    }
    // ulitin ang unang kalahati para may "himig"
    for (let i = 16; i < 24; i++) out[i] = out[i - 16];
    return out;
  }
  const freqOf = (m, deg) => {
    const n = m.scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
    return m.root * Math.pow(2, (m.scale[i] + 12 * o) / 12) / 2;
  };
  const TOMS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1];
  const CHORDS = [[293.7, 370, 440], [392, 493.9, 587.3], [440, 554.4, 659.3], [293.7, 370, 440]];

  function playStep(m, s, t) {
    const beat = 60 / m.bpm / 2;
    const n = pattern[s % 32];
    if (n != null) (m.pluckLead ? (f, tt, v) => pluck(f, tt, v * 1.2, 0.3) : gong)(freqOf(m, n), t, m.vol);
    if (m.agung && s % m.agung === 0) agung(t, 0.22);
    if (m.pad && s % 32 === 0) pad(m.pad, t, beat * 32 + 0.5, m.padVol);
    if (m.bass && s % 4 === 0) pluck(m.bass[(s / 4) % 2], t, 0.09, 0.5);
    if (m.clicks && s % 2 === 1) click(t, 0.05);
    if (m.toms && TOMS[s % 16]) drum(t, 0.22, s % 4 === 0 ? 120 : 160, 50);
    if (m.heart && s % 8 === 0) {
      drum(t, 0.3, 70, 38);
      drum(t + 0.22, 0.22, 70, 38);
    }
    if (m.drone && s % 32 === 0) drone(m.drone, t, beat * 32 + 0.6, m.droneVol || 0.08);
    if (m.whistle && Math.random() < m.whistle) whistle(t);
    if (m.stab && s > 8 && Math.random() < m.stab) stab(t);
    if (m.scrape && Math.random() < m.scrape) scrape(t);
    if (m.chords) {
      const ch = CHORDS[Math.floor(s / 8) % 4];
      pluck(ch[s % 3] / 2, t, 0.06, 0.35);
    }
  }
  function tick() {
    if (!ctx || !mood) return;
    const m = MOODS[mood];
    const beat = 60 / m.bpm / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.15) {
      playStep(m, step, nextT);
      nextT += beat;
      step++;
    }
  }
  function setMood(name, instant) {
    if (!MOODS[name]) name = 'day';
    if (name === mood) return;
    clearTimeout(switchTimer);
    const go = () => {
      mood = name;
      pattern = makePattern(name, MOODS[name]);
      step = 0;
      nextT = ctx.currentTime + 0.05;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
      musicBus.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 1.2);
    };
    if (instant || !mood) return go();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    mood = null;
    switchTimer = setTimeout(go, 650);
  }

  // ---------------- Ambience ----------------
  function chirp(t) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    pan.connect(ambBus);
    const f = 4100 + Math.random() * 600;
    for (let i = 0; i < 3; i++) tone('sine', f, t + i * 0.05, 0.03, 0.025, pan, 0.003);
  }
  function bird(t) {
    const f = 2000 + Math.random() * 900;
    tone('sine', f, t, 0.12, 0.03, ambBus, 0.01, f * 1.6);
    tone('sine', f * 1.1, t + 0.16, 0.1, 0.025, ambBus, 0.01, f * 1.7);
  }
  function crackle(t) {
    noise(t, 0.03 + Math.random() * 0.05, 0.08 + Math.random() * 0.08, ambBus, 'bandpass', 900 + Math.random() * 2500, 2);
  }
  function loop(fn, min, max, flag) {
    const run = () => {
      if (ctx && on && ambState[flag]) fn(ctx.currentTime + 0.02);
      setTimeout(run, min + Math.random() * (max - min));
    };
    run();
  }
  function ambLoops() {
    loop(chirp, 120, 520, 'crickets');
    loop(bird, 1400, 4200, 'birds');
    loop(crackle, 50, 220, 'fire');
  }
  function setWind(onW) {
    if (onW && !windSrc) {
      windSrc = ctx.createBufferSource();
      windSrc.buffer = noiseBuf;
      windSrc.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.12;
      lg.gain.value = 220;
      lfo.connect(lg);
      lg.connect(f.frequency);
      windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      windGain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 2);
      windSrc.connect(f);
      f.connect(windGain);
      windGain.connect(ambBus);
      windSrc.start();
      lfo.start();
    } else if (!onW && windSrc) {
      const s = windSrc;
      windGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      setTimeout(() => s.stop(), 1600);
      windSrc = null;
    }
  }

  function setScene(m, amb, instant) {
    clearTimeout(scareTimer);
    want = { mood: m, amb: amb || {} };
    if (!ctx) return;
    ambState = want.amb;
    setWind(!!ambState.wind);
    setMood(m, instant);
  }

  // ---------------- Sound effects ----------------
  let lastBlip = 0;
  const SFX = {
    blip(t) {
      if (t - lastBlip < 0.045) return;
      lastBlip = t;
      tone('square', 480 + Math.random() * 140, t, 0.035, 0.018, sfxBus, 0.002);
    },
    select(t) {
      tone('sine', 660, t, 0.12, 0.12, sfxBus);
      tone('sine', 990, t + 0.07, 0.18, 0.1, sfxBus);
    },
    stat_up(t) {
      [523, 659, 784].forEach((f, i) => gong(f * 2, t + i * 0.08, 0.08, sfxBus));
    },
    stat_down(t) {
      [392, 311, 262].forEach((f, i) => gong(f, t + i * 0.1, 0.09, sfxBus));
    },
    step(t) {
      noise(t, 0.07, 0.07 + Math.random() * 0.04, sfxBus, 'lowpass', 500 + Math.random() * 300);
    },
    talk(t) {
      tone('sine', 440, t, 0.09, 0.08, sfxBus, 0.005, 700);
    },
    arrive(t) {
      gong(784, t, 0.1, sfxBus);
      gong(1175, t + 0.12, 0.08, sfxBus);
    },
    knock(t) {
      for (let i = 0; i < 3; i++) {
        noise(t + i * 0.26, 0.09, 0.5, sfxBus, 'bandpass', 380, 2);
        tone('sine', 170, t + i * 0.26, 0.1, 0.35, sfxBus, 0.002, 110);
      }
    },
    laugh(t) {
      for (let i = 0; i < 6; i++) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth';
        const base = 210 * Math.pow(0.93, i);
        o.frequency.setValueAtTime(base * 1.15, t + i * 0.17);
        o.frequency.exponentialRampToValueAtTime(base, t + i * 0.17 + 0.12);
        f.type = 'bandpass';
        f.frequency.value = 800;
        f.Q.value = 3;
        env(g, t + i * 0.17, 0.22, 0.01, 0.14);
        o.connect(f);
        f.connect(g);
        g.connect(sfxBus);
        o.start(t + i * 0.17);
        o.stop(t + i * 0.17 + 0.2);
      }
    },
    growl(t) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(58, t);
      o.frequency.linearRampToValueAtTime(46, t + 1.4);
      f.type = 'lowpass';
      f.frequency.value = 320;
      lfo.frequency.value = 11;
      lg.gain.value = 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      lfo.connect(lg);
      lg.connect(g.gain);
      o.connect(f);
      f.connect(g);
      g.connect(sfxBus);
      o.start(t);
      lfo.start(t);
      o.stop(t + 1.6);
      lfo.stop(t + 1.6);
    },
    wind(t) {
      noise(t, 2.2, 0.3, sfxBus, 'bandpass', 300, 1.2, 1400);
    },
    // JUMPSCARE: malakas na hiyaw + sirang chord + malalim na kabog
    scare(t) {
      noise(t, 0.7, 0.9, sfxBus, 'highpass', 700, 0.7, 3000);
      for (const f of [311, 330, 466, 494, 740]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.9);
        env(g, t, 0.14, 0.004, 1.0);
        o.connect(g);
        g.connect(sfxBus);
        o.start(t);
        o.stop(t + 1.05);
      }
      tone('sine', 110, t, 0.8, 0.9, sfxBus, 0.002, 28);
      // "orchestra hit" at matinis na kuwerdas
      for (const f of [55, 58.3, 77.8]) tone('sawtooth', f, t, 2.2, 0.18, sfxBus, 0.003);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(2600, t + 1.2);
      env(g, t, 0.06, 0.01, 1.4);
      o.connect(g);
      g.connect(sfxBus);
      o.start(t);
      o.stop(t + 1.5);
    },
    // Nakakatawang "wah-wah-wah-waaah" (sad trombone)
    wahwah(t) {
      const notes = [392, 370, 349, 330];
      notes.forEach((f, i) => {
        const last = i === notes.length - 1;
        const st = t + i * 0.32, dur = last ? 0.9 : 0.28;
        const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f / 2, st);
        if (last) {
          const lfo = ctx.createOscillator(), lg = ctx.createGain();
          lfo.frequency.value = 6;
          lg.gain.value = 6;
          lfo.connect(lg);
          lg.connect(o.frequency);
          lfo.start(st);
          lfo.stop(st + dur);
        }
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(400, st);
        fl.frequency.linearRampToValueAtTime(1400, st + 0.08);
        fl.frequency.linearRampToValueAtTime(500, st + dur);
        env(g, st, 0.22, 0.03, dur);
        o.connect(fl);
        fl.connect(g);
        g.connect(sfxBus);
        o.start(st);
        o.stop(st + dur + 0.05);
      });
    },
    // ----- Items at quests -----
    pickup(t) {
      [880, 1175, 1568].forEach((f, i) => tone('sine', f, t + i * 0.06, 0.25, 0.09, sfxBus));
    },
    quest(t) {
      gong(587.3, t, 0.1, sfxBus);
      gong(880, t + 0.15, 0.09, sfxBus);
    },
    quest_done(t) {
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => gong(f, t + i * 0.11, 0.1, sfxBus));
    },
    // ----- Manananggal -----
    // Tik-tik: ayon sa kwento, MAS MALAKAS kapag malayo, MAHINA kapag malapit
    tiktik(t, o) {
      const v = 0.05 + (o.vol ?? 1) * 0.35;
      for (let i = 0; i < 3; i++) {
        noise(t + i * 0.16, 0.03, v, sfxBus, 'bandpass', 2400, 6);
        tone('square', 1300, t + i * 0.16, 0.02, v * 0.2, sfxBus, 0.001);
      }
    },
    flap(t, o) {
      const v = 0.05 + (o.vol ?? 1) * 0.35;
      noise(t, 0.22, v, sfxBus, 'lowpass', 500, 1, 150);
    },
    shriek(t) {
      for (const f of [880, 932, 1245]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.25);
        o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.8);
        env(g, t, 0.07, 0.02, 0.85);
        o.connect(g);
        g.connect(sfxBus);
        o.start(t);
        o.stop(t + 0.9);
      }
      noise(t, 0.6, 0.15, sfxBus, 'highpass', 2000);
    },
    whip(t) {
      noise(t, 0.12, 0.6, sfxBus, 'highpass', 1800, 1, 6000);
      tone('square', 300, t, 0.05, 0.1, sfxBus, 0.001, 90);
    },
    bubble(t) {
      for (let i = 0; i < 3; i++) tone('sine', 300 + Math.random() * 400, t + i * 0.07, 0.06, 0.06, sfxBus, 0.005, 700 + Math.random() * 500);
    },
    // Kampana ng simbahan
    bell1(t) {
      tone('sine', 196, t, 3.5, 0.3, sfxBus, 0.005);
      tone('sine', 196 * 2.4, t, 2.0, 0.12, sfxBus, 0.003);
      tone('sine', 196 * 3.0, t, 1.4, 0.08, sfxBus, 0.003);
    },
    bell(t) {
      for (let i = 0; i < 3; i++) SFX.bell1(t + i * 1.3);
    },
    breath(t, o) {
      const v = 0.08 + (o.vol ?? 1) * 0.4;
      noise(t, 0.9, v, sfxBus, 'bandpass', 380, 1.5, 700);
      noise(t + 1.0, 1.1, v * 0.8, sfxBus, 'bandpass', 600, 1.5, 260);
      tone('sawtooth', 48, t + 1.0, 1.0, v * 0.25, sfxBus, 0.1, 40);
    },
    hurt(t) {
      noise(t, 0.2, 0.7, sfxBus, 'lowpass', 900);
      tone('sine', 160, t, 0.4, 0.5, sfxBus, 0.002, 50);
      tone('sawtooth', 320, t, 0.25, 0.08, sfxBus, 0.002, 120);
    },
    // ---- Trailer ----
    // BRAAM: malaking tunog ng "horn" na parang sa pelikula
    braam(t) {
      for (const f of [36.7, 55, 73.4, 77.8, 110]) {
        const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * 0.97, t + 3.5);
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(180, t);
        fl.frequency.exponentialRampToValueAtTime(1400, t + 0.25);
        fl.frequency.exponentialRampToValueAtTime(220, t + 3.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
        o.connect(fl);
        fl.connect(g);
        g.connect(sfxBus);
        o.start(t);
        o.stop(t + 4.3);
      }
      tone('sine', 50, t, 3.0, 0.9, sfxBus, 0.004, 28);
      noise(t, 0.4, 0.3, sfxBus, 'lowpass', 400);
    },
    // Tumataas na tunog bago ang gulat
    riser(t, o) {
      const d = o.dur || 3;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + d);
      g.gain.setValueAtTime(0.0001, t + d + 0.01);
      osc.connect(g);
      g.connect(sfxBus);
      osc.start(t);
      osc.stop(t + d + 0.05);
      noise(t, d, 0.18, sfxBus, 'highpass', 400, 1, 6000);
    },
    boom(t) {
      tone('sine', 80, t, 1.8, 1.0, sfxBus, 0.002, 26);
      noise(t, 0.25, 0.4, sfxBus, 'lowpass', 300);
    },
    heart(t) {
      tone('sine', 70, t, 0.3, 0.7, sfxBus, 0.002, 38);
      tone('sine', 70, t + 0.24, 0.3, 0.5, sfxBus, 0.002, 38);
    },
    // Mga bulong: parang maraming boses na nagsasalita nang mahina
    whisper(t, o) {
      const v = 0.12 * (o.vol ?? 1);
      for (let i = 0; i < 7; i++) {
        const st = t + i * 0.13 + Math.random() * 0.08;
        noise(st, 0.18 + Math.random() * 0.2, v * (0.5 + Math.random()), sfxBus, 'bandpass', 1400 + Math.random() * 2200, 6);
      }
    },
    // Pabaligtad na cymbal: lumalakas tapos biglang tigil (bago ang title)
    swell(t, o) {
      const d = o.dur || 1.2;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      s.buffer = noiseBuf;
      f.type = 'highpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(5000, t + d);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.5, t + d);
      gn.gain.setValueAtTime(0.0001, t + d + 0.005);
      s.connect(f);
      f.connect(gn);
      gn.connect(sfxBus);
      s.start(t);
      s.stop(t + d + 0.02);
      tone('sawtooth', 55, t, d, 0.12, sfxBus, d * 0.9);
    },
    stab(t) {
      stab(t);
    },
    whoosh(t) {
      noise(t, 0.5, 0.35, sfxBus, 'bandpass', 300, 1.5, 3000);
    },
    boing(t) {
      tone('sine', 140, t, 0.45, 0.2, sfxBus, 0.005, 520);
    },
    save(t) {
      tone('sine', 880, t, 0.08, 0.1, sfxBus);
      tone('sine', 1320, t + 0.08, 0.12, 0.08, sfxBus);
    },
    ending_good(t) {
      [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => gong(f, t + i * 0.18, 0.12, sfxBus));
      agung(t, 0.3, sfxBus);
    },
    ending_bad(t) {
      agung(t, 0.4, sfxBus);
      gong(220, t + 0.3, 0.12, sfxBus);
      gong(207.7, t + 0.6, 0.12, sfxBus);
    },
  };

  function play(name, opt) {
    if (!ctx || !on || !SFX[name]) return;
    SFX[name](ctx.currentTime + 0.01, opt || {});
  }

  let scareTimer = null;
  function scareMusic(sec = 9) {
    if (!ctx) return;
    const back = want.mood;
    setMood('horror', true);
    clearTimeout(scareTimer);
    scareTimer = setTimeout(() => {
      if (want.mood === back) {
        mood = 'horror';
        setMood(back);
      }
    }, sec * 1000);
  }

  // Kinukuha ang tunog ng laro para sa pag-record ng video
  function captureStream() {
    init();
    if (!ctx) return null;
    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    return dest.stream;
  }

  window.Sound = {
    play,
    setScene,
    captureStream,
    scareMusic,
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
      init();
      if (ctx) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.1);
      return on;
    },
  };
})();
