// ============================================================
//  AUDIO — musika at tunog na ginagawa gamit ang Web Audio API.
//  Walang audio files: ang kulintang, agung, kuliglig, atbp. ay
//  "sinisintesays" habang tumatakbo ang laro.
// ============================================================
(function () {
  const KEY = 'sanisidro.sound';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

  let ctx = null, master, musicBus, sfxBus, ambBus, reverb, noiseBuf, wetGain;
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
    const len = ctx.sampleRate * 4.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        // madilim: unti-unting nawawala ang matataas na tunog
        const k = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.5 - k * 0.42);
        d[i] = lp * Math.pow(1 - k, 2.4) * (i < ctx.sampleRate * 0.02 ? 0 : 1);
      }
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    wetGain = wet;
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

  // Music box: parang laruang tumutugtog ng oyayi, sira-sira at may "wow" ng lumang tape
  function musicBox(f, t, vol, dest = musicBus) {
    const det = 1 + (Math.random() - 0.5) * 0.012;
    for (const [mul, v, d] of [[1, 1, 2.6], [2.01, 0.35, 1.4], [3.98, 0.12, 0.7], [5.4, 0.05, 0.4]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul * det;
      lfo.frequency.value = 0.6 + Math.random() * 0.5;
      lg.gain.value = f * mul * 0.006;
      lfo.connect(lg);
      lg.connect(o.frequency);
      env(g, t, vol * v, 0.003, d);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      lfo.start(t);
      o.stop(t + d + 0.05);
      lfo.stop(t + d + 0.05);
    }
  }
  // Kantang multo: "aaah" na koro gamit ang formant filter
  function choir(freqs, t, dur, vol) {
    const vowels = [[800, 1150], [400, 800], [350, 2000]];
    const vw = vowels[Math.floor(Math.random() * vowels.length)];
    for (const f of freqs) {
      for (const det of [0.995, 1.004]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f * det;
        vib.frequency.value = 4.5 + Math.random();
        vg.gain.value = f * 0.008;
        vib.connect(vg);
        vg.connect(o.frequency);
        const mix = ctx.createGain();
        mix.gain.value = 1;
        for (const ff of vw) {
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = ff;
          bp.Q.value = 9;
          o.connect(bp);
          bp.connect(mix);
        }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
        g.gain.setValueAtTime(vol, t + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, t + dur);
        mix.connect(g);
        g.connect(musicBus);
        o.start(t);
        vib.start(t);
        o.stop(t + dur + 0.05);
        vib.stop(t + dur + 0.05);
      }
    }
  }
  // Mga biyolin na magkakadikit ang nota (dissonant cluster) na may tremolo
  function strings(freqs, t, dur, vol, trem = 0) {
    for (const f of freqs) {
      const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(4000, f * 3);
      bp.Q.value = 0.8;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      if (trem) {
        const l = ctx.createOscillator(), lg = ctx.createGain(), tg = ctx.createGain();
        l.frequency.value = trem;
        lg.gain.value = 0.5;
        tg.gain.value = 0.5;
        l.connect(lg);
        lg.connect(tg.gain);
        o.connect(bp);
        bp.connect(tg);
        tg.connect(g);
        l.start(t);
        l.stop(t + dur + 0.05);
      } else {
        o.connect(bp);
        bp.connect(g);
      }
      g.connect(musicBus);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
  // Matinis na kaskas ng biyolin (sul ponticello)
  function screech(t, vol = 0.04) {
    const o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    const f = 1400 + Math.random() * 900;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.5 : 0.6), t + 2.2);
    hp.type = 'highpass';
    hp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(hp);
    hp.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 2.5);
  }
  // Napakababang ugong na nararamdaman sa dibdib
  function sub(t, dur = 4, vol = 0.22) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(34 + Math.random() * 6, t);
    o.frequency.linearRampToValueAtTime(29, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
    noise(t, dur, vol * 0.25, musicBus, 'lowpass', 90);
  }
  // Kampana sa malayo
  function farBell(t, vol = 0.12) {
    const f = 146.8;
    for (const [m, v, d] of [[1, 1, 6], [2.4, 0.4, 4], [3.0, 0.25, 3], [4.2, 0.1, 2]]) tone('sine', f * m, t, d, vol * v, musicBus, 0.004);
  }
  // Kulintang na sira ang tono: bumababa ang nota habang tumutunog
  function bentGong(f, t, vol) {
    tone('sine', f, t, 2.4, vol, musicBus, 0.004, f * 0.86);
    tone('sine', f * 2.76, t, 0.8, vol * 0.25, musicBus, 0.003, f * 2.3);
  }
  // Oyayi (orihinal na himig na pentatonic) — [nota sa semitone mula A3, haba sa beat]
  const OYAYI = [[7, 2], [10, 1], [12, 2], [10, 1], [7, 3], [5, 2], [3, 1], [5, 2], [7, 1], [0, 3], [7, 2], [10, 1], [15, 2], [12, 1], [10, 3], [7, 2], [5, 1], [3, 2], [5, 1], [0, 4]];
  let oyayiI = 0, oyayiNext = 0;
  // Pulso ng takot sa bass (parang tibok ng orasan)
  const PULSE = [0, 0, 1, 0, 0, 1, 0, 0];

  // ---------------- Musika ----------------
  const P = [0, 2, 4, 7, 9]; // pentatonic (kulintang)
  const M = [0, 3, 5, 7, 10]; // minor pentatonic
  // box: oyayi sa music box; choir: multong koro; str: biyolin na dissonant; sub: ugong; bells: kampana; bend: sirang kulintang
  const MOODS = {
    title: { bpm: 60, root: 220, scale: M, rest: 1, vol: 0.0001, box: 0.06, choir: [110, 116.5], choirVol: 0.025, sub: 32, bells: 0.012, drone: [55, 58.3], droneVol: 0.05, wet: 0.75 },
    day: { bpm: 96, root: 523.3, scale: P, rest: 0.45, vol: 0.09, agung: 16, bass: [130.8, 196], clicks: true, drone: [65.4, 98], droneVol: 0.025, wet: 0.45 },
    dusk: { bpm: 72, root: 440, scale: M, rest: 0.62, vol: 0.08, bend: 0.03, box: 0.035, choir: [110, 130.8], choirVol: 0.02, drone: [55, 82.4], droneVol: 0.04, wet: 0.6 },
    night: { bpm: 64, root: 220, scale: M, rest: 0.9, vol: 0.06, bend: 0.05, choir: [110, 116.5, 164.8], choirVol: 0.025, str: [220, 233.1], strVol: 0.012, sub: 32, bells: 0.008, voices: 0.012, drone: [55, 58.3], droneVol: 0.06, wet: 0.75 },
    fog: { bpm: 58, root: 220, scale: M, rest: 0.95, vol: 0.05, heart: true, str: [110, 116.5, 123.5], strVol: 0.014, sub: 16, scrape: 0.02, voices: 0.02, drone: [41.2, 43.7], droneVol: 0.08, wet: 0.8 },
    tense: { bpm: 128, root: 220, scale: M, rest: 0.4, vol: 0.07, pluckLead: true, toms: true, pulse: true, str: [220, 233.1, 311.1], strVol: 0.016, trem: 11, agung: 16, wet: 0.5 },
    fiesta: { bpm: 118, root: 587.3, scale: P, rest: 0.25, vol: 0.1, agung: 8, clicks: true, chords: true, drone: [73.4], droneVol: 0.02, wet: 0.45 },
    dawn: { bpm: 64, root: 523.3, scale: P, rest: 0.6, vol: 0.08, box: 0.03, pad: [130.8, 196], padVol: 0.035, wet: 0.6 },
    sad: { bpm: 52, root: 293.7, scale: M, rest: 0.8, vol: 0.06, box: 0.05, pad: [73.4, 87.3, 110], padVol: 0.04, agung: 32, wet: 0.7 },
    hunt: { bpm: 120, root: 196, scale: M, rest: 0.85, vol: 0.06, pulse: true, heart: true, toms: true, str: [196, 207.7, 233.1, 246.9], strVol: 0.02, trem: 13, sub: 16, stab: 0.03, screech: 0.025, drone: [49, 51.9], droneVol: 0.09, wet: 0.6 },
    horror: { bpm: 60, root: 110, scale: M, rest: 0.95, vol: 0.05, heart: true, str: [110, 116.5, 155.6, 164.8], strVol: 0.028, trem: 9, sub: 8, stab: 0.03, screech: 0.04, voices: 0.03, drone: [55, 58.3, 82.4], droneVol: 0.09, wet: 0.8 },
    silent: { bpm: 60, root: 220, scale: M, rest: 1, vol: 0.00001, wet: 0.6 },
    eerie: { bpm: 60, root: 220, scale: M, rest: 0.95, vol: 0.05, box: 0.04, bend: 0.03, choir: [110, 116.5], choirVol: 0.022, bells: 0.01, voices: 0.02, scrape: 0.01, drone: [65.4, 69.3], droneVol: 0.06, wet: 0.8 },
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
    const bar = beat * 32;
    if (m.box && t >= oyayiNext) {
      const [n, len] = OYAYI[oyayiI % OYAYI.length];
      musicBox(220 * Math.pow(2, n / 12) * 2, t, m.box);
      oyayiNext = t + len * beat * 2.2;
      oyayiI++;
      if (oyayiI % OYAYI.length === 0) oyayiNext += beat * 6; // pahinga bago umulit
    }
    if (m.choir && s % 32 === 0) choir(m.choir, t, bar + 1, m.choirVol || 0.02);
    if (m.str && s % 32 === 16) strings(m.str, t, bar * 0.9, m.strVol || 0.015, m.trem || 0);
    if (m.sub && s % m.sub === 0) sub(t, beat * m.sub * 0.9);
    if (m.bells && Math.random() < m.bells) farBell(t);
    if (m.bend && Math.random() < m.bend) bentGong(freqOf(m, Math.floor(Math.random() * 6)), t, 0.06);
    if (m.screech && Math.random() < m.screech) screech(t);
    if (m.voices && Math.random() < m.voices) SFX.whisper(t, { vol: 0.5 });
    if (m.pulse && PULSE[s % 8]) tone('sine', s % 16 < 8 ? 55 : 58.3, t, beat * 0.9, 0.16, musicBus, 0.005, 50);
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
      if (wetGain) wetGain.gain.setTargetAtTime(MOODS[name].wet ?? 0.55, ctx.currentTime, 0.8);
      oyayiI = 0;
      oyayiNext = 0;
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
        const base = 120 * Math.pow(0.94, i);
        o.frequency.setValueAtTime(base * 1.15, t + i * 0.17);
        o.frequency.exponentialRampToValueAtTime(base, t + i * 0.17 + 0.12);
        f.type = 'bandpass';
        f.frequency.value = 650;
        f.Q.value = 4;
        env(g, t + i * 0.17, 0.3, 0.01, 0.15);
        if (i === 0) sub(t, 2.5, 0.3);
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
    // JUMPSCARE: "BWAAM" + sigaw ng babae + kaskas ng biyolin + kabog
    scare(t) {
      SFX.scream(t, { vol: 0.9 });
      for (const f of [41.2, 43.7, 61.7, 65.4]) {
        const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(2200, t);
        fl.frequency.exponentialRampToValueAtTime(160, t + 2.5);
        env(g, t, 0.28, 0.005, 2.8);
        o.connect(fl);
        fl.connect(g);
        g.connect(sfxBus);
        o.start(t);
        o.stop(t + 2.9);
      }
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
    // Sigaw: tunog ng boses gamit ang formant (parang babaeng tumitili)
    scream(t, o) {
      const v = 0.35 * (o.vol ?? 1);
      const src = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain();
      src.type = 'sawtooth';
      src.frequency.setValueAtTime(620, t);
      src.frequency.exponentialRampToValueAtTime(980, t + 0.25);
      src.frequency.exponentialRampToValueAtTime(700, t + 1.3);
      vib.frequency.value = 7;
      vg.gain.value = 40;
      vib.connect(vg);
      vg.connect(src.frequency);
      for (const [ff, q] of [[1000, 6], [1600, 8], [2900, 10]]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = ff;
        bp.Q.value = q;
        src.connect(bp);
        bp.connect(g);
      }
      env(g, t, v, 0.02, 1.4);
      g.connect(sfxBus);
      noise(t, 1.2, v * 0.3, sfxBus, 'bandpass', 2500, 2);
      src.start(t);
      vib.start(t);
      src.stop(t + 1.5);
      vib.stop(t + 1.5);
    },
    // Busina ng jeep
    horn(t) {
      for (const [st, d] of [[0, 0.18], [0.26, 0.35]]) {
        for (const f of [392, 494]) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = f;
          env(g, t + st, 0.05, 0.01, d);
          o.connect(g);
          g.connect(sfxBus);
          o.start(t + st);
          o.stop(t + st + d + 0.05);
        }
      }
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
      SFX.scream(t + 0.05, { vol: 0.6 });
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
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 2 - 1;
      pan.connect(sfxBus);
      for (let i = 0; i < 9; i++) {
        const st = t + i * 0.12 + Math.random() * 0.08;
        // "sss", "hhh", "aaa" na pantig: magkakaibang formant
        const f = [[2400, 1600], [1100, 800], [3600, 2200]][Math.floor(Math.random() * 3)];
        noise(st, 0.16 + Math.random() * 0.22, v * (0.5 + Math.random()), pan, 'bandpass', f[0], 7, f[1]);
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

  let jeepNodes = null;
  function jeep(onJ) {
    if (!ctx) return;
    if (onJ && !jeepNodes) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      const wob = ctx.createOscillator(), wg = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 42;
      o2.type = 'square';
      o2.frequency.value = 84.5;
      wob.frequency.value = 7;
      wg.gain.value = 3;
      wob.connect(wg);
      wg.connect(o.frequency);
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      o.connect(lp);
      o2.connect(lp);
      const rumble = ctx.createBufferSource(), rf = ctx.createBiquadFilter();
      rumble.buffer = noiseBuf;
      rumble.loop = true;
      rf.type = 'lowpass';
      rf.frequency.value = 160;
      rumble.connect(rf);
      rf.connect(g);
      lp.connect(g);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 1);
      g.connect(sfxBus);
      [o, o2, wob, rumble].forEach((n) => n.start());
      // kalampag ng mga bakal
      const rattle = setInterval(() => { if (ctx) noise(ctx.currentTime, 0.04, 0.05 + Math.random() * 0.06, sfxBus, 'bandpass', 1800 + Math.random() * 1500, 4); }, 140);
      jeepNodes = { nodes: [o, o2, wob, rumble], g, rattle, o };
    } else if (!onJ && jeepNodes) {
      const j = jeepNodes;
      jeepNodes = null;
      clearInterval(j.rattle);
      j.o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.2);
      j.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
      setTimeout(() => j.nodes.forEach((n) => n.stop()), 1700);
      SFX.horn(ctx.currentTime + 0.1);
    }
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
    jeep(onJ) { init(); jeep(onJ); },
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
