// ============================================================
//  TEASER (~60s) — ginagawa mula sa mismong laro at nire-record.
//  Mga cinematic shot + totoong gameplay (first person + HUD).
//  Pang-test:  trailer.html?from=25  (magsimula sa 25s)
//              trailer.html?hold=25  (huminto sa 25s)
// ============================================================
const W = 1280, H = 720, DURATION = 60.3;
const cv = document.getElementById('teaser');
const g = cv.getContext('2d');
const C = window.World.cine;
const status = (t) => (document.getElementById('status').textContent = t);
const PARAMS = new URLSearchParams(location.search);

// ---------- mga larawan (pixel art ng laro) ----------
function svgImg(svg) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="320" height="320" '));
  return img;
}
const portrait = (id) => svgImg(ART.characters[id].svg().replace('viewBox="0 0 32 64"', 'viewBox="6 0 20 22"'));
const IMG = {
  mngFace: svgImg(ART.scares.manananggal()),
  tikFace: svgImg(ART.scares.tikbalang()),
  whiteFace: svgImg(ART.scares.whitelady()),
  lola: portrait('lola'),
  nena: portrait('nena'),
  kardo: portrait('kardo'),
};

// ---------- grain ----------
const grains = Array.from({ length: 6 }, () => {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 180;
  const x = c.getContext('2d');
  const d = x.createImageData(320, 180);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c;
});

const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => L(v, b[i], t));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const S = (name, o) => window.Sound && Sound.play(name, o);
const MUSIC = (m) => window.Sound && Sound.setScene(m, {});

// Buwan: nasa (120, 190, -300)
const PLAZA_EYE = [15, 1.7, 8];
const MOON_DIR = (() => {
  const v = [120 - 15, 190 - 1.7, -300 - 8];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

const CAPTION = (t0, t1, str, color = '#fff3d6') => ({ t0, t1, str, font: 'italic 40px "IM Fell English SC"', y: 612, color });
const CARD = (t0, t1, str, y = 360, size = 34, color = '#e8d8c0') => ({ t0, t1, str, font: `${size}px "IM Fell English SC"`, y, color, spacing: 2 });

// ============================================================
//  MGA SHOT
// ============================================================
// Gameplay: ang oras ng hampas at ng paglingon (para tugma ang tunog at ang galaw)
const CHASE = { t0: 33.0, t1: 37.0, hit: 35.6 };
const FOG = { t0: 41.0, t1: 45.5, turn: 44.6, scare: 44.95 };

const SHOTS = [
  // ---- COLD OPEN ----
  {
    t0: 0, t1: 3.2, black: true,
    text: [
      CARD(0.3, 1.6, 'IN THE PHILIPPINES,', 330, 26, '#bdb4a0'),
      CARD(1.5, 3.1, 'SOME TREES ARE NOT JUST TREES.', 385, 30, '#d9cbb0'),
    ],
  },
  // ---- ARAW: masaya pa ----
  {
    t0: 3.2, t1: 7.0, letterbox: true, grade: 'contrast(1.08) saturate(1.1) sepia(0.12)',
    setup() {
      C.fp(false);
      C.time('day');
      C.world({ villagers: true });
      C.place({ tess: 'plaza_tess', padre: 'padre_church', nena: 'nena_store', kapitan: 'plaza_kapitan' });
    },
    cam: (k) => ({ pos: LV([66, 36, 64], [40, 17, 32], ease(k)), look: LV([15, 3, 0], [12, 4, -6], ease(k)), fov: 55 }),
    text: [CAPTION(3.7, 6.8, 'You came home for the fiesta.')],
  },
  {
    t0: 7.0, t1: 10.0, gameplay: true, grade: 'contrast(1.08) saturate(1.05)',
    setup() {
      C.fp(true, false);
      C.time('day');
      C.world({});
      C.place({ lola: 'shed_lola' });
    },
    cam: (k) => ({ pos: LV([-11.2, 1.62, 36.2], [-11.4, 1.62, 35.7], k), look: [-12, 1.8, 33.5], fov: 72 }),
    hud: {
      stats: { hp: 100, loob: 0, tapang: 0, tiwala: 0 },
      objective: 'Find Lola Ising at the jeepney stop.',
      talk: { name: 'Lola Ising', img: 'lola', t0: 7.2, dur: 1.6, str: "APO! Look how big you've gotten! ...You got fat, didn't you?" },
    },
  },
  {
    t0: 10.0, t1: 12.5, gameplay: true, grade: 'contrast(1.08) saturate(1.05)',
    setup() {
      C.fp(true, false);
      C.time('day');
      C.place({ nena: 'nena_store' });
    },
    cam: (k) => ({ pos: LV([9.0, 1.62, 25.8], [9.2, 1.62, 25.4], k), look: [9.6, 1.85, 23.4], fov: 72 }),
    hud: {
      stats: { hp: 100, loob: 1, tapang: 0, tiwala: 0 },
      objective: "Do Lola's errands around the barrio.",
      talk: { name: 'Aling Nena', img: 'nena', t0: 10.15, dur: 1.4, str: 'No change. Here, take three White Rabbits instead.' },
    },
  },
  {
    t0: 12.5, t1: 15.8, gameplay: true, grade: 'contrast(1.12) saturate(0.95) sepia(0.1)',
    setup() {
      C.fp(true, false);
      C.time('dusk');
      C.place({ kardo: 'kardo_field' });
    },
    cam: (k) => ({ pos: LV([51.2, 1.62, -0.2], [50.8, 1.62, -0.6], k), look: [48.5, 1.85, -2], fov: 72 }),
    hud: {
      stats: { hp: 100, loob: 1, tapang: 0, tiwala: 1 },
      objective: "Do Lola's errands around the barrio.",
      talk: { name: 'Mang Kardo', img: 'kardo', t0: 12.65, dur: 2.3, str: "If you ever hear laughing at night, anak... don't look back." },
    },
  },
  { t0: 15.8, t1: 16.5, black: true },
  // ---- DAPIT-HAPON: nagbabago ang lahat ----
  {
    t0: 16.5, t1: 19.5, letterbox: true, grade: 'contrast(1.2) saturate(0.6) sepia(0.2) brightness(0.9)',
    setup() {
      C.fp(false);
      C.time('dusk');
      C.world({});
      C.place({});
    },
    cam: (k) => ({ pos: LV([0, 1.7, -46], [0, 1.9, -55.5], ease(k)), look: [0, 1.2, -64], fov: 50 }),
    text: [CAPTION(16.9, 19.3, 'But this year, something was cut down.', '#e8d8c0')],
  },
  {
    t0: 19.5, t1: 22.5, letterbox: true, grade: 'contrast(1.3) saturate(0.5) brightness(0.95)', flicker: true,
    setup() {
      C.fp(false);
      C.time('night');
      C.place({});
    },
    cam: (k, t) => ({
      pos: LV([15, 1.6, -0.5], [15, 1.7, -4.5], ease(k)).map((v, i) => v + (i === 0 && t > 21.1 && t < 21.5 ? Math.sin(t * 90) * 0.08 : 0)),
      look: [15, 15.5, -11.5],
      fov: 50,
    }),
    text: [CAPTION(19.9, 22.3, 'Every midnight, the church bell rings... by itself.', '#e8d8c0')],
  },
  {
    t0: 22.5, t1: 25.5, letterbox: true, grade: 'contrast(1.25) saturate(0.55) brightness(1.1)', flicker: true,
    setup() {
      C.fp(false);
      C.time('night');
      C.place({ tikbalang: [6.2, -67.5, Math.atan2(-2 - 6.2, -56 - -67.5)] });
      C.light([3.5, 5.5, -62], 70, 0x8fa4ff);
    },
    end() {
      C.light(null, 0);
    },
    cam: (k) => ({ pos: LV([-3, 1.7, -53.5], [-1.5, 1.8, -57], ease(k)), look: LV([5, 2.4, -67.5], [6, 3.6, -67.5], ease(k)), fov: 46 }),
    text: [CAPTION(23.0, 25.3, '...and something remembers.', '#e8c8c0')],
  },
  {
    t0: 25.5, t1: 27.5, letterbox: true, grade: 'contrast(1.3) saturate(0.4) brightness(0.95)', flicker: true,
    setup() {
      C.fp(false);
      C.time('night');
      C.place({});
      C.world({});
    },
    cam: (k) => ({ pos: LV([-31, 1.6, -24], [-32.5, 1.65, -26], ease(k)), look: [-40, 3, -34], fov: 48 }),
  },
  {
    t0: 27.5, t1: 29.5, letterbox: true, grade: 'contrast(1.3) saturate(0.5) brightness(0.9)',
    setup() {
      C.fp(false);
      C.time('night');
      C.place({});
    },
    cam: () => ({ pos: PLAZA_EYE, look: PLAZA_EYE.map((v, i) => v + MOON_DIR[i] * 60 + (i === 1 ? -6 : 0)), fov: 50 }),
    each(k) {
      // lumilipad ang manananggal sa harap ng buwan
      const center = PLAZA_EYE.map((v, i) => v + MOON_DIR[i] * 26);
      const right = [Math.cos(0.3), 0, Math.sin(0.3)];
      const p = center.map((v, i) => v + right[i] * L(-16, 16, k) + (i === 1 ? Math.sin(k * 9) * 0.6 - 3 : 0));
      C.mng(true, p, Math.atan2(right[0], right[2]));
    },
    end() {
      C.mng(false);
    },
  },
  // ---- TIK... TIK... ----
  {
    t0: 29.5, t1: 33.0, black: true,
    text: [
      CARD(29.7, 31.2, 'Tik... tik... tik...', 340, 34, '#bdb4a0'),
      CARD(31.0, 32.9, "When it's quiet... she's close.", 400, 36, '#e05050'),
    ],
  },
  // ---- GAMEPLAY: ang habulan ----
  {
    t0: CHASE.t0, t1: CHASE.t1, gameplay: true, grade: 'contrast(1.25) saturate(0.55) brightness(0.9)',
    setup() {
      C.fp(true, true);
      C.time('night');
      C.place({});
    },
    cam(k, t) {
      const z = L(13, 2, k);
      const bob = Math.sin(t * 17) * 0.06;
      return { pos: [15 + Math.sin(t * 8.5) * 0.08, 1.62 + bob, z], look: [15, 1.9, z - 10], fov: 80 };
    },
    each(k, t) {
      // dumadagit siya mula sa harap; hinampas mo siya
      const hitK = (CHASE.hit - CHASE.t0) / (CHASE.t1 - CHASE.t0);
      const zHit = L(13, 2, hitK) - 2.2;
      let p;
      if (t < CHASE.hit) p = LV([15, 7, -28], [15, 2.1, zHit], clamp01((t - CHASE.t0) / (CHASE.hit - CHASE.t0)));
      else p = LV([15, 2.1, zHit], [15, 9, -34], clamp01((t - CHASE.hit) / 1.0));
      C.mng(true, p, 0);
      this.dist = Math.abs(p[2] - L(13, 2, k)) + Math.abs(p[1] - 1.6);
    },
    end() {
      C.mng(false);
    },
    hud: { stats: { hp: 66, loob: 2, tapang: 1, tiwala: 2 }, objective: 'SURVIVE until the midnight bell!', survival: true },
  },
  // ---- ANG BARRIO AY NAGWAWALA ----
  {
    t0: 37.0, t1: 38.6, letterbox: true, grade: 'contrast(1.3) saturate(0.8) sepia(0.3) brightness(0.95)',
    setup() {
      C.fp(false);
      C.time('night');
      C.world({ crowd: true });
      C.place({ beth: 'mob_beth', kapitan: 'mob_kapitan', nena: 'mob_nena' });
    },
    cam: (k) => ({ pos: LV([15, 1.8, 25], [15, 2.1, 20], ease(k)), look: [14, 2.3, 10], fov: 50 }),
    text: [CAPTION(37.2, 38.5, 'The barrio turns on itself.', '#ffb08a')],
  },
  {
    t0: 38.6, t1: 40.0, letterbox: true, grade: 'contrast(1.3) saturate(0.9) brightness(0.95)', flicker: true,
    setup() {
      C.fp(false);
      C.time('night');
      C.world({ fire: true });
      C.place({ beth: 'kubo_beth' });
    },
    end() {
      C.world({});
    },
    cam: (k) => ({ pos: LV([-28, 1.7, -21.5], [-29.5, 1.9, -23.5], ease(k)), look: [-40, 4, -34], fov: 48 }),
  },
  { t0: 40.0, t1: 41.0, black: true },
  // ---- GAMEPLAY: huwag kang lilingon ----
  {
    t0: FOG.t0, t1: FOG.t1, gameplay: true, grade: 'contrast(1.25) saturate(0.4) brightness(0.9)', flicker: true,
    setup() {
      C.fp(true, false);
      C.time('fog');
      C.place({});
    },
    cam(k, t) {
      const z = L(-38, -46.5, clamp01((t - FOG.t0) / (FOG.turn - FOG.t0)));
      const bob = Math.sin(t * 9) * 0.045;
      const turn = ease(clamp01((t - FOG.turn) / 0.32)); // biglang lumingon
      const yaw = Math.PI * turn;
      return { pos: [0, 1.62 + bob, z], look: [-Math.sin(yaw) * 10, 1.55, z - Math.cos(yaw) * 10], fov: 70 };
    },
    each(k, t) {
      if (t >= FOG.turn && !this.tik) {
        // ang tikbalang ay nasa likod mo mismo
        this.tik = true;
        C.place({ tikbalang: [0, -46.5 + 1.9, Math.PI, 1.62 - 3.85 * 1.25 + 0.15] });
      }
    },
    end() {
      C.place({});
    },
    hud: { stats: { hp: 100, loob: 2, tapang: 2, tiwala: 1 }, objective: 'Go alone to the balete stump up north. Hurry!', noHudAfter: FOG.scare - 0.05 },
  },
  { t0: 45.5, t1: 46.5, black: true },
  // ---- MONTAGE ng mga mukha ----
  { t0: 46.5, t1: 48.5, black: true, montage: true },
  // ---- TITLE ----
  { t0: 48.5, t1: 54.0, title: true },
  {
    t0: 54.0, t1: 56.6, black: true,
    text: [
      CARD(54.1, 56.5, 'The fiesta is tomorrow.', 320, 38, '#e8d8c0'),
      CARD(54.9, 56.5, 'Hope you survive tonight.', 378, 40, '#e05050'),
      { t0: 55.5, t1: 56.5, str: 'Free to play  ·  itch.io', font: '22px "Special Elite"', y: 470, color: '#e0b25c' },
    ],
  },
  { t0: 56.6, t1: DURATION, black: true },
];

// Mga tunog at musika sa takdang oras
const CUES = [
  [0.05, () => MUSIC('eerie')],
  [0.4, () => S('tiktik', { vol: 0.9 })],
  [1.9, () => S('whisper', { vol: 0.6 })],
  [3.2, () => { MUSIC('day'); S('bell1'); }],
  [7.3, () => S('talk')],
  [12.7, () => S('talk')],
  [14.0, () => MUSIC('silent')],
  [15.0, () => S('laugh')],
  [15.8, () => { S('boom'); S('heart'); }],
  [16.6, () => MUSIC('eerie')],
  [18.2, () => S('heart')],
  [19.5, () => { MUSIC('horror'); S('whoosh'); }],
  [19.9, () => S('bell1')],
  [21.1, () => S('bell1')],
  [22.5, () => S('whoosh')],
  [23.2, () => S('breath', { vol: 0.9 })],
  [24.5, () => S('growl')],
  [25.5, () => S('whisper', { vol: 1 })],
  [26.8, () => S('stab')],
  [27.6, () => S('shriek')],
  [28.4, () => S('flap', { vol: 1 })],
  [29.5, () => MUSIC('silent')],
  [29.8, () => S('tiktik', { vol: 1 })],
  [30.6, () => S('tiktik', { vol: 0.45 })],
  [31.4, () => S('tiktik', { vol: 0.12 })],
  [32.6, () => S('heart')],
  [33.0, () => { MUSIC('hunt'); S('shriek'); }],
  [34.2, () => S('flap', { vol: 1 })],
  [34.9, () => S('flap', { vol: 1 })],
  [CHASE.hit, () => { C.swing(); S('whip'); S('shriek'); }],
  [37.0, () => { S('boom'); S('whisper', { vol: 0.8 }); }],
  [38.6, () => S('whoosh')],
  [40.0, () => { MUSIC('silent'); S('heart'); }],
  [40.8, () => S('heart')],
  [41.4, () => S('breath', { vol: 0.5 })],
  [41.6, () => S('heart')],
  [42.3, () => S('heart')],
  [42.4, () => S('riser', { dur: 2.2 })],
  [42.9, () => S('heart')],
  [43.3, () => S('whisper', { vol: 0.9 })],
  [43.45, () => S('heart')],
  [43.9, () => S('heart')],
  [44.3, () => S('heart')],
  [FOG.turn, () => S('whoosh')],
  [FOG.scare, () => { S('scare'); S('growl'); }],
  [45.5, () => MUSIC('silent')],
  [46.5, () => { S('boom'); S('stab'); }],
  [46.8, () => S('boom')],
  [47.1, () => { S('boom'); S('shriek'); }],
  [47.3, () => S('swell', { dur: 1.2 })],
  [47.4, () => S('boom')],
  [47.65, () => S('boom')],
  [47.9, () => S('boom')],
  [48.5, () => { S('braam'); MUSIC('horror'); }],
  [54.0, () => S('whisper', { vol: 0.6 })],
  [56.6, () => MUSIC('silent')],
  [56.8, () => S('tiktik', { vol: 1 })],
  [57.6, () => S('tiktik', { vol: 0.3 })],
  [58.1, () => S('tiktik', { vol: 0.06 })],
  [58.45, () => { S('scare'); S('shriek'); }],
];
// Mga pagkislap
const FLASH = [
  [15.8, 0.25, '#fff'],
  [19.5, 0.15, '#fff'],
  [22.5, 0.15, '#fff'],
  [CHASE.hit, 0.2, '#fff'],
  [37.0, 0.2, '#b00'],
  [FOG.scare, 0.5, '#fff'],
  [48.5, 0.4, '#b00'],
  [58.45, 0.35, '#fff'],
];
const SHAKE = [
  [21.1, 0.4, 5],
  [CHASE.hit, 0.45, 10],
  [FOG.scare, 0.7, 22],
  [46.5, 2.0, 12],
  [48.5, 0.5, 8],
  [58.45, 0.55, 26],
];
// Mga "subliminal" na mukha: ilang frame lang
const SUBLIM = [
  [21.4, 0.07, 'tikFace', 0.55],
  [26.8, 0.1, 'whiteFace', 0.8],
  [36.3, 0.06, 'mngFace', 0.5],
  [42.7, 0.06, 'tikFace', 0.45],
];
// Montage bago ang title
const MONTAGE = [
  [46.5, 'tikFace'], [46.8, 'mngFace'], [47.1, 'whiteFace'], [47.4, 'tikFace'],
  [47.65, 'mngFace'], [47.9, 'whiteFace'], [48.1, 'tikFace'], [48.3, 'mngFace'],
];
const GLITCH = [[25.4, 25.65], [37.9, 38.1], [46.5, 48.5], [58.3, 58.5]];

// ============================================================
//  PAGGUHIT (compositor)
// ============================================================
function spacedText(str, x, y, spacing) {
  if (!spacing) return g.fillText(str, x, y);
  const chars = [...str];
  const total = chars.reduce((s, c) => s + g.measureText(c).width + spacing, -spacing);
  let cx = x - total / 2;
  g.textAlign = 'left';
  for (const c of chars) {
    g.fillText(c, cx, y);
    cx += g.measureText(c).width + spacing;
  }
  g.textAlign = 'center';
}
function drawText(tx, t) {
  const a = clamp01((t - tx.t0) / 0.45) * clamp01((tx.t1 - t) / 0.45);
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.font = tx.font;
  g.textAlign = 'center';
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 12;
  g.fillStyle = tx.color;
  spacedText(tx.str, W / 2, tx.y, tx.spacing || 0);
  g.restore();
}
function panel(x, y, w, h, border = '#e0b25c') {
  g.fillStyle = 'rgba(20,12,28,0.78)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = border;
  g.lineWidth = 2;
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function wrap(str, x, y, maxW, lh) {
  const words = str.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
}
function face(name, alpha = 1, scale = 1) {
  const img = IMG[name];
  if (!img || !img.complete) return;
  g.save();
  g.globalAlpha = alpha;
  g.imageSmoothingEnabled = false;
  const s = H * scale;
  g.drawImage(img, W / 2 - s / 2, H / 2 - s / 2, s, s);
  g.restore();
}
// Ang HUD ng laro (iginuhit para sa gameplay shots)
function drawHUD(h, t, shot) {
  g.save();
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  panel(12, 12, 214, 98);
  g.font = '20px VT323';
  g.fillStyle = '#ff6b6b';
  g.fillText('HP', 22, 36);
  g.fillStyle = '#0f0a16';
  g.fillRect(52, 24, 124, 14);
  g.fillStyle = '#e04848';
  g.fillRect(52, 24, 124 * (h.stats.hp / 100), 14);
  g.fillStyle = '#f4ecd8';
  g.fillText(String(h.stats.hp), 184, 36);
  const rows = [['Kindness', '#e2574c', '❤', h.stats.loob], ['Courage', '#f39c3d', '🔥', h.stats.tapang], ['Trust', '#5fb3e0', '🤝', h.stats.tiwala]];
  rows.forEach(([n, c, ic, v], i) => {
    g.fillStyle = c;
    g.font = '18px VT323';
    g.fillText(n, 22, 60 + i * 18);
    g.textAlign = 'right';
    g.font = '14px sans-serif';
    g.fillText(v > 0 ? ic.repeat(v) : '—', 216, 60 + i * 18);
    g.textAlign = 'left';
  });
  panel(W - 132, 12, 120, 40);
  g.font = '24px VT323';
  g.fillStyle = '#f4ecd8';
  g.fillText('☰ Menu', W - 116, 40);
  g.font = '21px VT323';
  const ow = g.measureText(h.objective).width + 150;
  panel(W / 2 - ow / 2, 62, ow, 34);
  g.fillStyle = '#e0b25c';
  g.fillRect(W / 2 - ow / 2 + 12, 69, 98, 20);
  g.fillStyle = '#1a1020';
  g.fillText('OBJECTIVE', W / 2 - ow / 2 + 18, 85);
  g.fillStyle = '#f4ecd8';
  g.fillText(h.objective, W / 2 - ow / 2 + 122, 86);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
  g.fill();
  if (h.survival) {
    const k = clamp01((t - shot.t0) / (shot.t1 - shot.t0));
    const d = shot.dist ?? 30;
    const danger = clamp01(1 - d / 30);
    const rg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    rg.addColorStop(0, 'rgba(170,0,0,0)');
    rg.addColorStop(1, `rgba(170,0,0,${0.8 * danger})`);
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
    panel(W - 262, 64, 250, 124, '#c0392b');
    g.font = '32px VT323';
    g.fillStyle = '#ffd54a';
    g.textAlign = 'center';
    g.fillText(`🔔 11:${String(Math.floor(L(44, 52, k))).padStart(2, '0')} PM`, W - 137, 100);
    g.textAlign = 'left';
    const bar = (y, ic, v, c) => {
      g.font = '18px sans-serif';
      g.fillText(ic, W - 250, y + 12);
      g.fillStyle = '#0f0a16';
      g.fillRect(W - 220, y, 196, 12);
      g.fillStyle = c;
      g.fillRect(W - 220, y, 196 * v, 12);
    };
    bar(112, '🏃', L(0.9, 0.25, k), k > 0.7 ? '#e2574c' : '#5fd35f');
    bar(136, '🫙', danger, '#e8742c');
    g.font = '20px VT323';
    g.fillStyle = t < CHASE.hit ? '#8fd18f' : '#b9a88a';
    g.fillText(t < CHASE.hit ? '[F] Whip: READY' : `[F] Whip: ${Math.ceil(6 - (t - CHASE.hit))}s`, W - 250, 178);
  }
  if (h.talk) {
    const bx = W / 2 - 460, by = H - 186, bw = 920, bh = 160;
    const grd = g.createLinearGradient(0, by, 0, by + bh);
    grd.addColorStop(0, 'rgba(42,26,54,0.95)');
    grd.addColorStop(1, 'rgba(20,12,28,0.95)');
    g.fillStyle = grd;
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = '#e0b25c';
    g.lineWidth = 3;
    g.strokeRect(bx, by, bw, bh);
    for (let x = bx + 10; x < bx + bw - 10; x += 36) {
      g.fillStyle = 'rgba(192,57,43,0.6)';
      g.fillRect(x, by + 7, 10, 4);
      g.fillStyle = 'rgba(253,216,53,0.6)';
      g.fillRect(x + 10, by + 7, 10, 4);
      g.fillStyle = 'rgba(30,90,168,0.6)';
      g.fillRect(x + 20, by + 7, 10, 4);
    }
    g.fillStyle = '#2a1a3a';
    g.fillRect(bx + 16, by + 22, 100, 110);
    g.imageSmoothingEnabled = false;
    if (IMG[h.talk.img] && IMG[h.talk.img].complete) g.drawImage(IMG[h.talk.img], bx + 16, by + 22, 100, 110);
    g.imageSmoothingEnabled = true;
    g.strokeRect(bx + 16, by + 22, 100, 110);
    g.font = 'bold 20px "Pixelify Sans"';
    const nw = g.measureText(h.talk.name).width + 28;
    g.fillStyle = '#e0b25c';
    g.fillRect(bx + 18, by - 16, nw, 30);
    g.fillStyle = '#1a1020';
    g.fillText(h.talk.name, bx + 32, by + 6);
    const n = Math.floor(clamp01((t - h.talk.t0) / (h.talk.dur || 1.5)) * h.talk.str.length);
    if (n > (h.talk._n || 0) && n % 2 === 0) S('blip');
    h.talk._n = n;
    g.font = '28px VT323';
    g.fillStyle = '#f4ecd8';
    wrap(h.talk.str.slice(0, n), bx + 136, by + 56, bw - 160, 30);
  }
  g.restore();
}
function drawTitle(t, T0, T1) {
  const k = t - T0;
  const rg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.6);
  rg.addColorStop(0, `rgba(120,0,0,${0.35 + Math.sin(t * 3) * 0.05})`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, W, H);
  const flick = Math.random() < 0.06 ? 0.4 : 1;
  const a = clamp01(k / 0.25) * clamp01((T1 - t) / 0.4) * flick;
  g.save();
  g.textAlign = 'center';
  g.globalAlpha = a;
  g.shadowColor = '#ff1a1a';
  g.shadowBlur = 26;
  g.fillStyle = '#f2e6d0';
  g.font = '30px "IM Fell English SC"';
  spacedText('THE LAST NIGHT', W / 2, 280, 10);
  g.font = '86px "IM Fell English SC"';
  const jx = Math.random() < 0.08 ? (Math.random() - 0.5) * 14 : 0;
  spacedText('OF THE FIESTA', W / 2 + jx, 370, 6);
  g.shadowBlur = 0;
  g.globalAlpha = a * clamp01((k - 0.8) / 0.5);
  g.font = 'italic 26px "IM Fell English SC"';
  g.fillStyle = '#c9b89a';
  g.fillText('Ang Huling Gabi ng Pista', W / 2, 418);
  g.globalAlpha = a * clamp01((k - 1.8) / 0.5);
  g.font = '20px "Special Elite"';
  g.fillStyle = '#d33';
  spacedText('CHAPTER 1  ·  TIKBALANG & MANANANGGAL', W / 2, 480, 3);
  g.restore();
}
function glitch(t) {
  if (!GLITCH.some(([a, b]) => t >= a && t < b)) return;
  // ilang pahalang na hiwa ng screen na umuusog
  for (let i = 0; i < 6; i++) {
    const y = Math.floor(Math.random() * H), h = 8 + Math.floor(Math.random() * 60);
    const dx = (Math.random() - 0.5) * 80;
    g.drawImage(cv, 0, y, W, h, dx, y, W, h);
  }
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = 0.35;
  g.drawImage(cv, 6, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(255,40,40,0.25)';
  g.fillRect(0, 0, W, H);
  g.restore();
}
function effects(t, shot) {
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.72)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  if (shot && shot.flicker && Math.random() < 0.09) {
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(0, 0, W, H);
  }
  glitch(t);
  g.save();
  g.globalAlpha = 0.14;
  g.globalCompositeOperation = 'overlay';
  g.drawImage(grains[Math.floor(Math.random() * grains.length)], 0, 0, W, H);
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  if (shot && shot.letterbox) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, 78);
    g.fillRect(0, H - 78, W, 78);
  }
  for (const [ft, dur, col] of FLASH) {
    if (t >= ft && t < ft + dur) {
      g.save();
      g.globalAlpha = 1 - (t - ft) / dur;
      g.fillStyle = col;
      g.fillRect(0, 0, W, H);
      g.restore();
    }
  }
}

// ============================================================
//  TAKBO NG TEASER
// ============================================================
let running = false, t0 = 0, cueI = 0, cur = null, onDone = null;
const shotAt = (t) => SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];

function prepare(t) {
  const s = shotAt(t);
  if (s !== cur) {
    if (cur && cur.end) cur.end();
    cur = s;
    s.tik = false;
    if (s.setup) s.setup();
  }
  const k = clamp01((t - s.t0) / (s.t1 - s.t0));
  if (s.each) s.each(k, t);
  if (s.cam) {
    const c = s.cam(k, t);
    C.cam(c.pos, c.look, c.fov);
  }
}

C.onFrame((dt, glCanvas) => {
  if (!running) return;
  const HOLD = parseFloat(PARAMS.get('hold'));
  const t = isNaN(HOLD) ? (performance.now() - t0) / 1000 : HOLD;
  while (cueI < CUES.length && CUES[cueI][0] <= t) CUES[cueI++][1]();
  // gamitin ang shot na naihanda para sa frame na ito (para tugma ang camera at ang HUD)
  const s = cur || shotAt(t);
  g.save();
  for (const [st, dur, amp] of SHAKE) {
    if (t >= st && t < st + dur) {
      const a = amp * (1 - (t - st) / dur);
      g.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }
  }
  g.fillStyle = '#000';
  g.fillRect(-40, -40, W + 80, H + 80);
  if (!s.black && !s.title) {
    g.filter = s.grade || 'none';
    g.drawImage(glCanvas, 0, 0, W, H);
    g.filter = 'none';
    if (s.hud && !(s.hud.noHudAfter && t > s.hud.noHudAfter)) drawHUD(s.hud, t, s);
  }
  if (s.title) drawTitle(t, s.t0, s.t1);
  if (s.montage) {
    // mabilis na salitan ng mga mukha
    let img = null;
    for (const [mt, name] of MONTAGE) if (t >= mt) img = name;
    if (img) face(img, 1, 1 + ((t * 7) % 1) * 0.25);
  }
  for (const [st, dur, name, alpha] of SUBLIM) if (t >= st && t < st + dur) face(name, alpha, 1.2);
  (s.text || []).forEach((tx) => drawText(tx, t));
  // huling gulat: mukha ng manananggal
  if (t >= 58.45 && t < 58.95) face('mngFace', 1, 1 + (t - 58.45) * 0.8);
  g.restore();
  effects(t, s);
  if (t >= DURATION) {
    running = false;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (onDone) onDone();
    return;
  }
  prepare(t + dt);
});

function start(done) {
  C.begin();
  cueI = 0;
  cur = null;
  SHOTS.forEach((s) => (s.tik = false));
  const from = parseFloat(PARAMS.get('from')) || 0;
  while (cueI < CUES.length && CUES[cueI][0] < from) cueI++;
  prepare(from);
  onDone = done;
  document.body.classList.add('playing');
  setTimeout(() => {
    t0 = performance.now() - from * 1000;
    running = true;
  }, 400);
}

// ============================================================
//  MGA BUTTON
// ============================================================
document.getElementById('btnPreview').onclick = () => {
  start(() => {
    document.body.classList.remove('playing');
    status('Done. Press Record to save it as a video.');
  });
};
document.getElementById('btnRecord').onclick = () => {
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const type = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type) return status('Sorry, this browser cannot record video. Try Chrome or Edge.');
  const stream = cv.captureStream(30);
  const audio = Sound.captureStream();
  if (audio) audio.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: type.split(';')[0] });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `last-night-of-the-fiesta-teaser.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.classList.remove('playing');
    status(`Saved! Check your Downloads folder: last-night-of-the-fiesta-teaser.${ext}`);
  };
  rec.start(250);
  start(() => setTimeout(() => rec.stop(), 150));
};

document.fonts.ready.then(() => status('Ready. Press Preview to watch, or Record to save the video.'));
g.fillStyle = '#000';
g.fillRect(0, 0, W, H);
