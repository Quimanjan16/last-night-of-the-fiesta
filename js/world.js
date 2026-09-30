// ============================================================
//  WORLD — ang 3D na Barrio San Isidro (Three.js, low-poly).
//  WASD = lakad, Shift = takbo, E = kausap, drag = ikot ng camera.
// ============================================================
import * as THREE from 'three';

const host = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec5ea);
scene.fog = new THREE.Fog(0x8ec5ea, 60, 230);
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 800);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 260 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

// ---------------- Helpers ----------------
// Toon (cel) shading: 3 antas ng liwanag para sa "cartoon" na itsura
const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: toonRamp }));
  return matCache.get(color);
}
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, extra));
const BOX = new THREE.BoxGeometry(1, 1, 1);

function box(parent, w, h, d, color, x, y, z, o = {}) {
  const m = new THREE.Mesh(BOX, o.material || mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function mesh(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function textTexture(text, bg, fg, w = 512, h = 96, font = 'bold 56px monospace') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = fg;
  x.font = font;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ---------------- Collisions ----------------
const circles = [];
const rects = [];
const addCircle = (x, z, r) => circles.push({ x, z, r });
const addRect = (x0, z0, x1, z1) => rects.push({ x0, z0, x1, z1 });
function collide(p, rad = 0.45) {
  for (const c of circles) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad;
    if (d < m && d > 1e-4) {
      p.x = c.x + (dx / d) * m;
      p.z = c.z + (dz / d) * m;
    }
  }
  for (const b of rects) {
    if (p.x > b.x0 - rad && p.x < b.x1 + rad && p.z > b.z0 - rad && p.z < b.z1 + rad) {
      const opts = [
        [b.x0 - rad - p.x, 0],
        [b.x1 + rad - p.x, 0],
        [0, b.z0 - rad - p.z],
        [0, b.z1 + rad - p.z],
      ].sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
      p.x += opts[0][0];
      p.z += opts[0][1];
    }
  }
  for (const n of Object.values(npcs)) {
    if (!n.visible) continue;
    const dx = p.x - n.position.x, dz = p.z - n.position.z, d = Math.hypot(dx, dz), m = (n.userData.radius || 0.45) + rad;
    if (d < m && d > 1e-4) {
      p.x = n.position.x + (dx / d) * m;
      p.z = n.position.z + (dz / d) * m;
    }
  }
  p.x = Math.max(-88, Math.min(88, p.x));
  p.z = Math.max(-92, Math.min(58, p.z));
}

// ---------------- Night-reactive things ----------------
const glowMats = []; // bintana at ilaw na umiilaw sa gabi
function glowMat(color = 0x3a2a18, glow = 0xffc766) {
  const m = new THREE.MeshToonMaterial({ color, emissive: glow, emissiveIntensity: 0, gradientMap: toonRamp });
  glowMats.push(m);
  return m;
}
const nightLights = [];
const flames = [];

// ============================================================
//  PAGGAWA NG MUNDO
// ============================================================
function buildGround() {
  const g = mesh(scene, new THREE.PlaneGeometry(400, 400), mat(0x5d8a3a), 0, 0, 0);
  g.rotation.x = -Math.PI / 2;
  g.castShadow = false;
  g.userData.noEdge = true;
  // mga tuft ng damo
  const R = rng(5), tufts = [];
  for (let i = 0; i < 700; i++) {
    const x = -90 + R() * 180, z = -90 + R() * 150;
    if (Math.abs(z - 42) < 5 || (x > -2 && x < 32 && z > -15 && z < 15) || Math.abs(x) < 2.5) continue;
    tufts.push([x, z, 0.5 + R() * 0.6, R() * 3]);
  }
  const tg = new THREE.ConeGeometry(0.18, 0.6, 3);
  const ti = new THREE.InstancedMesh(tg, mat(0x4f7a2e), tufts.length);
  const d = new THREE.Object3D();
  tufts.forEach(([x, z, s, r], i) => {
    d.position.set(x, 0.3 * s, z);
    d.scale.setScalar(s);
    d.rotation.set(0, r, 0);
    d.updateMatrix();
    ti.setMatrixAt(i, d.matrix);
  });
  ti.userData.noEdge = true;
  scene.add(ti);
  const flat = (w, d, color, x, z, y = 0.02) => {
    const m = mesh(scene, new THREE.PlaneGeometry(w, d), mat(color), x, y, z);
    m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
    return m;
  };
  // Kalsada
  flat(190, 8, 0x6f6a64, 0, 42);
  for (let x = -90; x < 90; x += 6) flat(2.5, 0.25, 0xe8dcc0, x, 42, 0.03);
  // Mga daanang lupa
  flat(4, 96, 0xa08462, 0, -8);
  flat(24, 4, 0xa08462, -14, 9);
  flat(4, 16, 0xa08462, -38, -24);
  flat(40, 3, 0xa08462, -18, -18);
  // Plaza
  flat(32, 28, 0xb8a88c, 15, 0, 0.03);
  for (let i = 0; i <= 8; i++) flat(0.12, 28, 0x9c8c72, -1 + i * 4, 0, 0.04);
  for (let i = 0; i <= 7; i++) flat(32, 0.12, 0x9c8c72, 15, -14 + i * 4, 0.04);
}

function buildChurch() {
  const g = new THREE.Group();
  g.position.set(15, 0, -21);
  scene.add(g);
  const wall = 0xe6d5b8, trim = 0xc4ae8a, roof = 0x8a4a3a;
  box(g, 12, 9, 18, wall, 0, 4.5, 0);
  box(g, 12.4, 0.6, 18.4, trim, 0, 9, 0);
  // bubong (dalawang hilig)
  box(g, 7.4, 0.5, 19, roof, -3.2, 10.6, 0, { rz: 0.55 });
  box(g, 7.4, 0.5, 19, roof, 3.2, 10.6, 0, { rz: -0.55 });
  // kampanaryo
  box(g, 5, 17, 5, wall, 0, 8.5, 9.5);
  box(g, 5.6, 0.6, 5.6, trim, 0, 17, 9.5);
  const top = mesh(g, new THREE.ConeGeometry(3.9, 4, 4), mat(roof), 0, 19.3, 9.5);
  top.rotation.y = Math.PI / 4;
  box(g, 0.3, 2.4, 0.3, 0xd4af37, 0, 22.4, 9.5);
  box(g, 1.4, 0.3, 0.3, 0xd4af37, 0, 22.8, 9.5);
  box(g, 2, 2.4, 0.3, 0x3b2a1a, 0, 13.5, 12.05);
  mesh(g, new THREE.SphereGeometry(0.7, 6, 5), mat(0xb8860b), 0, 13.3, 11.6);
  // pinto at bintana
  box(g, 2.6, 4.2, 0.3, 0x4a2e17, 0, 2.1, 12.05);
  const win = glowMat(0x4a3a5a, 0xffcf70);
  for (const x of [-4.2, 4.2]) box(g, 1.4, 2.6, 0.2, 0, x, 5, 9.05, { material: win });
  for (const z of [-5, 0, 5]) {
    box(g, 0.2, 2.6, 1.4, 0, 6.05, 5, z, { material: win });
    box(g, 0.2, 2.6, 1.4, 0, -6.05, 5, z, { material: win });
  }
  addRect(9, -30, 21, -9);
}

function buildHouse(x, z, w, d, wallC, roofC, opts = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (opts.ry) g.rotation.y = opts.ry;
  scene.add(g);
  const lift = opts.stilts ? 1.6 : 0;
  if (opts.stilts) {
    for (const sx of [-w / 2 + 0.3, w / 2 - 0.3]) for (const sz of [-d / 2 + 0.3, d / 2 - 0.3]) box(g, 0.35, lift, 0.35, 0x5b4020, sx, lift / 2, sz);
    box(g, w + 0.4, 0.3, d + 0.4, 0x6b4a2a, 0, lift, 0);
  }
  const h = opts.h || 3;
  box(g, w, h, d, wallC, 0, lift + h / 2, 0);
  const roof = mesh(g, new THREE.ConeGeometry(Math.max(w, d) * 0.82, opts.roofH || 2.6, 4), mat(roofC), 0, lift + h + (opts.roofH || 2.6) / 2, 0);
  roof.rotation.y = Math.PI / 4;
  const win = glowMat(0x3a2a18, 0xffc766);
  box(g, 1.2, 1, 0.12, 0, -w / 4, lift + h * 0.55, d / 2 + 0.02, { material: win });
  box(g, 1.2, 1, 0.12, 0, w / 4, lift + h * 0.55, d / 2 + 0.02, { material: win });
  box(g, 1.1, 1.9, 0.12, 0x4a3218, 0, lift + 0.95, d / 2 + 0.03);
  if (opts.stilts) for (let i = 0; i < 4; i++) box(g, 1.2, 0.18, 0.5, 0x5b4020, 0, lift - i * 0.4 - 0.1, d / 2 + 0.4 + i * 0.45);
  const c = Math.cos(opts.ry || 0), s = Math.sin(opts.ry || 0);
  const hw = Math.abs(c) * w / 2 + Math.abs(s) * d / 2, hd = Math.abs(s) * w / 2 + Math.abs(c) * d / 2;
  addRect(x - hw, z - hd, x + hw, z + hd);
  return { group: g, roof };
}

function buildSign(parent, text, bg, fg, w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: textTexture(text, bg, fg) }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

function buildStage() {
  const g = new THREE.Group();
  g.position.set(29, 0, 4);
  scene.add(g);
  box(g, 7, 1.2, 10, 0x7a5230, 0, 0.6, 0);
  box(g, 7.2, 0.15, 10.2, 0x9b6b3f, 0, 1.25, 0);
  box(g, 0.3, 5, 0.3, 0x5a3a20, 3.3, 3.5, -4.8);
  box(g, 0.3, 5, 0.3, 0x5a3a20, 3.3, 3.5, 4.8);
  box(g, 0.2, 1.6, 9.8, 0xc0392b, 3.3, 5.4, 0);
  buildSign(g, 'MALIGAYANG PISTA!', '#c0392b', '#fdd835', 9.4, 1.4, 3.18, 5.4, 0, -Math.PI / 2);
  addRect(25.5, -1, 32.5, 9);
}

function buildBanderitas() {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.28, 0, 0, 0.28, 0, 0, 0, -0.5, 0], 3));
  tri.computeVertexNormals();
  const poles = [
    [0, -12], [30, -12], [0, 12], [30, 12], [0, 0], [30, 0],
  ];
  for (const [x, z] of poles) {
    box(scene, 0.25, 6, 0.25, 0x5a3a20, x, 3, z);
    addCircle(x, z, 0.3);
  }
  const strings = [
    [[0, -12], [30, 12]], [[0, 12], [30, -12]], [[0, 0], [30, 0]], [[0, -12], [30, -12]], [[0, 12], [30, 12]],
  ];
  const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0xffffff].map((c) => new THREE.Color(c));
  const flagsData = [];
  for (const [[ax, az], [bx, bz]] of strings) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 0.75), ang = Math.atan2(bz - az, bx - ax);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = 5.8 - 1.4 * 4 * t * (1 - t);
      const p = new THREE.Vector3(lerp(ax, bx, t), y, lerp(az, bz, t));
      pts.push(p);
      if (i > 0 && i < n) flagsData.push({ p, ang });
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x333333 })));
  }
  const inst = new THREE.InstancedMesh(tri, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), flagsData.length);
  const d = new THREE.Object3D();
  flagsData.forEach((f, i) => {
    d.position.copy(f.p);
    d.rotation.set(0, -f.ang, 0);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
    inst.setColorAt(i, cols[i % cols.length]);
  });
  scene.add(inst);
}

function buildLamps() {
  for (const [x, z] of [[4, -8], [26, -8], [4, 10], [22, 12]]) {
    box(scene, 0.2, 4.2, 0.2, 0x2b2b2b, x, 2.1, z);
    box(scene, 0.5, 0.5, 0.5, 0, x, 4.4, z, { material: glowMat(0x888866, 0xffe28a), cast: false });
    addCircle(x, z, 0.25);
  }
  for (const [x, z] of [[8, 2], [22, -2]]) {
    const l = new THREE.PointLight(0xffd690, 0, 26, 1.3);
    l.position.set(x, 5, z);
    scene.add(l);
    nightLights.push({ light: l, max: 14 });
  }
}

function buildJeepney() {
  const g = new THREE.Group();
  g.position.set(8, 0, 40);
  scene.add(g);
  box(g, 7, 2, 2.6, 0xdfe3e8, 0, 1.5, 0);
  box(g, 2, 1.2, 2.3, 0xcfd4da, 4.4, 1.1, 0);
  box(g, 6.6, 0.3, 2.8, 0xc0392b, -0.1, 2.65, 0);
  box(g, 7.05, 0.25, 2.65, 0x1e5aa8, 0, 1.0, 0);
  box(g, 7.05, 0.2, 2.65, 0xf1c40f, 0, 0.8, 0);
  box(g, 6, 0.7, 2.66, 0x2c3e50, -0.3, 2.0, 0);
  box(g, 0.1, 0.9, 2.2, 0x95a5a6, 5.42, 1.2, 0);
  box(g, 0.2, 0.5, 0.15, 0xbdc3c7, 4.9, 1.95, 0);
  box(g, 0.4, 0.2, 0.15, 0xbdc3c7, 5.0, 2.2, 0);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
  for (const [x, z] of [[-2.2, 1.3], [-2.2, -1.3], [3.8, 1.3], [3.8, -1.3]]) {
    const w = mesh(g, wheelGeo, mat(0x1b1b1b), x, 0.5, z);
    w.rotation.x = Math.PI / 2;
  }
  buildSign(g, 'SAN ISIDRO', '#c0392b', '#f1c40f', 5.5, 0.5, -0.1, 2.65, 1.42);
  addRect(4.5, 38.6, 13.9, 41.4);
}

function buildShed() {
  const g = new THREE.Group();
  g.position.set(-14, 0, 36);
  scene.add(g);
  for (const [x, z] of [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]]) box(g, 0.2, 2.6, 0.2, 0x6b4a2e, x, 1.3, z);
  box(g, 5, 0.25, 3.2, 0xc0392b, 0, 2.7, 0);
  box(g, 3.6, 0.15, 0.8, 0x8a6d3b, 0, 0.6, -0.8);
  addRect(-16.2, 34.6, -11.8, 35.4);
}

function buildCoconut(x, z, h) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const lean = (x * 7 + z * 3) % 5 * 0.03;
  let px = 0, py = 0;
  for (let i = 0; i < h; i++) {
    box(g, 0.35, 1.02, 0.35, i % 2 ? 0x7a5a3a : 0x664a2f, px, py + 0.5, 0);
    py += 1;
    px += lean;
  }
  const leaf = mat(0x3f7d3a);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const m = box(g, 2.8, 0.08, 0.6, 0, px + Math.cos(a) * 1.3, py - 0.2, Math.sin(a) * 1.3, { material: leaf });
    m.rotation.y = -a;
    m.rotation.z = -0.35;
  }
  for (let i = 0; i < 3; i++) mesh(g, new THREE.SphereGeometry(0.2, 5, 4), mat(0x5a3d1e), px + Math.cos(i * 2) * 0.25, py - 0.35, Math.sin(i * 2) * 0.25);
  addCircle(x, z, 0.35);
}

function buildRice() {
  const x0 = 46, x1 = 88, z0 = -36, z1 = 32;
  const p = mesh(scene, new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat(0x7cb342), (x0 + x1) / 2, 0.03, (z0 + z1) / 2);
  p.rotation.x = -Math.PI / 2;
  p.castShadow = false;
  const rows = Math.floor((z1 - z0) / 1.2);
  const inst = new THREE.InstancedMesh(BOX, mat(0x5f8f2f), rows);
  const d = new THREE.Object3D();
  for (let i = 0; i < rows; i++) {
    d.position.set((x0 + x1) / 2, 0.2, z0 + 0.6 + i * 1.2);
    d.scale.set(x1 - x0 - 1, 0.4, 0.45);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  inst.receiveShadow = true;
  scene.add(inst);
  // Pilapil
  box(scene, x1 - x0, 0.3, 0.8, 0x8a7350, (x0 + x1) / 2, 0.15, z0);
  box(scene, 0.8, 0.3, z1 - z0, 0x8a7350, x0, 0.15, (z0 + z1) / 2);
  // Kalabaw
  const k = new THREE.Group();
  k.position.set(62, 0, 2);
  k.rotation.y = 0.8;
  scene.add(k);
  const kc = 0x4a4a52;
  box(k, 1.2, 1.1, 2.4, kc, 0, 1.2, 0);
  for (const [x, z] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0.9], [0.4, 0.9]]) box(k, 0.3, 0.8, 0.3, kc, x, 0.4, z);
  box(k, 0.8, 0.8, 0.9, kc, 0, 1.45, 1.5);
  box(k, 1.8, 0.18, 0.2, 0xd8d0c0, 0, 1.95, 1.3);
  box(k, 0.18, 0.35, 0.2, 0xd8d0c0, -0.85, 2.1, 1.3);
  box(k, 0.18, 0.35, 0.2, 0xd8d0c0, 0.85, 2.1, 1.3);
  addCircle(62, 2, 1.4);
}

const forestTrunks = [];
function buildForest() {
  const R = rng(42);
  const spots = [];
  for (let i = 0; i < 260 && spots.length < 170; i++) {
    const x = -86 + R() * 172, z = -44 - R() * 48;
    if (Math.abs(x) < 3.2) continue; // daan
    if (Math.hypot(x, z + 64) < 12) continue; // lugar ng balete
    spots.push([x, z, 0.8 + R() * 0.7]);
  }
  // ilang puno sa likod ng kubo
  for (const s of [[-50, -38, 1.1], [-46, -42, 1], [-52, -30, 1.2], [-30, -40, 0.9]]) spots.push(s);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 4, 6);
  const leafGeo = new THREE.IcosahedronGeometry(2.6, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, mat(0x4a3322), spots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, mat(0x2f5a2a), spots.length);
  const leaves2 = new THREE.InstancedMesh(leafGeo, mat(0x264d24), spots.length);
  const d = new THREE.Object3D();
  spots.forEach(([x, z, s], i) => {
    d.position.set(x, 2 * s, z);
    d.scale.set(s, s, s);
    d.rotation.set(0, 0, 0);
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    d.position.set(x, 5.2 * s, z);
    d.rotation.set(0, i, 0);
    d.updateMatrix();
    leaves.setMatrixAt(i, d.matrix);
    d.position.set(x + 0.4, 6.8 * s, z - 0.3);
    d.scale.set(s * 0.7, s * 0.7, s * 0.7);
    d.updateMatrix();
    leaves2.setMatrixAt(i, d.matrix);
    addCircle(x, z, 0.55 * s);
    forestTrunks.push([x, z]);
  });
  for (const m of [trunks, leaves, leaves2]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
}

let sapling;
function buildBalete() {
  const g = new THREE.Group();
  g.position.set(0, 0, -64);
  scene.add(g);
  mesh(g, new THREE.CylinderGeometry(3, 3.4, 2, 10), mat(0x3d2f22), 0, 1, 0);
  mesh(g, new THREE.CylinderGeometry(2.95, 2.95, 0.1, 10), mat(0x8b7355), 0, 2.02, 0);
  mesh(g, new THREE.CylinderGeometry(1.8, 1.8, 0.12, 10), mat(0xa08566), 0, 2.05, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = box(g, 3.2, 0.5, 0.6, 0x2e231a, Math.cos(a) * 3.6, 0.2, Math.sin(a) * 3.6);
    r.rotation.y = -a;
    r.rotation.z = -0.15;
  }
  // mga kandila at alay
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI + 0.3;
    box(g, 0.12, 0.4, 0.12, 0xf5f0e0, Math.cos(a) * 2.2, 2.3, Math.sin(a) * 2.2);
  }
  sapling = new THREE.Group();
  sapling.userData.dynamic = true;
  sapling.position.set(0, 2, 0.6);
  box(sapling, 0.15, 1.4, 0.15, 0x5a3d1e, 0, 0.7, 0);
  mesh(sapling, new THREE.IcosahedronGeometry(0.7, 0), mat(0x6abf4b), 0, 1.6, 0);
  sapling.visible = false;
  g.add(sapling);
  addCircle(0, -64, 3.5);
}

let kubo;
const fireGroup = new THREE.Group();
function buildKubo() {
  kubo = buildHouse(-40, -34, 6, 5, 0xb89660, 0x9c7c4a, { stilts: true, h: 2.4, roofH: 2.8, ry: Math.PI / 4 });
  // halamang saging
  for (const [x, z] of [[-33, -38], [-46, -28]]) {
    box(scene, 0.4, 3, 0.4, 0x4b6b2a, x, 1.5, z);
    for (let i = 0; i < 4; i++) {
      const l = box(scene, 2.2, 0.08, 0.7, 0x5b8c32, x + Math.cos(i * 1.6), 3, z + Math.sin(i * 1.6));
      l.rotation.y = -i * 1.6;
      l.rotation.z = -0.4;
    }
    addCircle(x, z, 0.3);
  }
  fireGroup.position.set(-40, 0, -34);
  const coneGeo = new THREE.ConeGeometry(0.6, 2.2, 5);
  const R = rng(7);
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Mesh(coneGeo, basic(i % 2 ? 0xff6a1a : 0xffc23f, { transparent: true, opacity: 0.9 }));
    f.position.set((R() - 0.5) * 6, 3 + R() * 3, (R() - 0.5) * 5);
    fireGroup.add(f);
    flames.push(f);
  }
  const fl = new THREE.PointLight(0xff6a1a, 30, 40, 1.2);
  fl.position.set(0, 5, 0);
  fireGroup.add(fl);
  fireGroup.visible = false;
  scene.add(fireGroup);
}

// Malayong Bulkang Mayon at mga burol
function buildScenery() {
  const mMat = new THREE.MeshLambertMaterial({ color: 0x6f8fa3, fog: false, flatShading: true });
  const mayon = new THREE.Mesh(new THREE.ConeGeometry(150, 150, 9), mMat);
  mayon.position.set(-80, 70, -420);
  scene.add(mayon);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(34, 34, 9), new THREE.MeshLambertMaterial({ color: 0xe8eef2, fog: false, flatShading: true }));
  cap.position.set(-80, 128, -420);
  scene.add(cap);
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x55775f, fog: false, flatShading: true });
  for (const [x, z, r, h] of [[160, -330, 90, 55], [260, -200, 80, 40], [-260, -250, 90, 50], [-300, 60, 80, 36], [280, 120, 70, 30]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), hillMat);
    hill.position.set(x, h / 2 - 2, z);
    scene.add(hill);
  }
  scenery.mountains = [[mMat, 0x6f8fa3], [hillMat, 0x55775f], [cap.material, 0xe8eef2]];
}
const scenery = {};

// Bituin, buwan, alitaptap
let stars, moon, fireflies;
function buildSky() {
  const R = rng(3), pos = [];
  for (let i = 0; i < 500; i++) {
    const a = R() * Math.PI * 2, e = 0.12 + R() * 1.3, r = 380;
    pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }));
  scene.add(stars);
  moon = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 10), basic(0xf3efd5, { fog: false, transparent: true, opacity: 0 }));
  moon.position.set(120, 190, -300);
  scene.add(moon);
  const fp = [];
  for (let i = 0; i < 90; i++) fp.push(-60 + R() * 120, 0.8 + R() * 3, -40 - R() * 40);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xfff27a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0 }));
  scene.add(fireflies);
}

// ============================================================
//  MGA TAUHAN
// ============================================================
function person(o) {
  const g = new THREE.Group();
  const parts = {};
  const limb = (parent, x, y, w, h, d, color) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    parent.add(p);
    box(p, w, h, d, color, 0, -h / 2, 0);
    return p;
  };
  parts.legL = limb(g, -0.16, 0.8, 0.26, 0.8, 0.28, o.skirt ? o.skin : o.bottom);
  parts.legR = limb(g, 0.16, 0.8, 0.26, 0.8, 0.28, o.skirt ? o.skin : o.bottom);
  box(parts.legL, 0.28, 0.12, 0.36, 0x2b1d14, 0, -0.76, 0.04);
  box(parts.legR, 0.28, 0.12, 0.36, 0x2b1d14, 0, -0.76, 0.04);
  if (o.skirt) box(g, 0.8, 0.75, 0.52, o.bottom, 0, 0.6, 0);
  box(g, 0.72, 0.8, 0.42, o.top, 0, 1.2, 0);
  parts.armL = limb(g, -0.47, 1.56, 0.2, 0.72, 0.22, o.top);
  parts.armR = limb(g, 0.47, 1.56, 0.2, 0.72, 0.22, o.top);
  box(parts.armL, 0.2, 0.16, 0.22, o.skin, 0, -0.8, 0);
  box(parts.armR, 0.2, 0.16, 0.22, o.skin, 0, -0.8, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.88, 0);
  g.add(head);
  parts.head = head;
  box(head, 0.52, 0.52, 0.52, o.skin, 0, 0, 0);
  box(head, 0.08, 0.09, 0.02, 0x1b1b1b, -0.12, 0.03, 0.265);
  box(head, 0.08, 0.09, 0.02, 0x1b1b1b, 0.12, 0.03, 0.265);
  box(head, 0.14, 0.03, 0.02, 0x7a3b2e, 0, -0.13, 0.265);
  const h = o.hairC;
  const shortHair = () => {
    box(head, 0.56, 0.14, 0.56, h, 0, 0.27, 0);
    box(head, 0.56, 0.36, 0.1, h, 0, 0.09, -0.25);
    box(head, 0.06, 0.2, 0.44, h, -0.28, 0.13, -0.05);
    box(head, 0.06, 0.2, 0.44, h, 0.28, 0.13, -0.05);
  };
  switch (o.hair) {
    case 'short': shortHair(); break;
    case 'bun': shortHair(); box(head, 0.26, 0.24, 0.24, h, 0, 0.36, -0.2); break;
    case 'ponytail':
      shortHair();
      box(head, 0.14, 0.5, 0.14, h, 0, -0.1, -0.34);
      box(head, 0.18, 0.07, 0.18, 0xe53935, 0, 0.14, -0.34);
      break;
    case 'curly':
      box(head, 0.66, 0.26, 0.62, h, 0, 0.26, -0.02);
      box(head, 0.14, 0.46, 0.56, h, -0.32, 0.0, -0.06);
      box(head, 0.14, 0.46, 0.56, h, 0.32, 0.0, -0.06);
      box(head, 0.62, 0.52, 0.14, h, 0, 0.0, -0.3);
      break;
  }
  const ex = o.extra || [];
  if (ex.includes('salakot')) mesh(head, new THREE.ConeGeometry(0.66, 0.34, 8), mat(0xc8a15a), 0, 0.42, 0);
  if (ex.includes('glasses')) box(head, 0.46, 0.05, 0.02, 0x333333, 0, 0.07, 0.275);
  if (ex.includes('beard')) box(head, 0.38, 0.14, 0.04, 0xbdbdbd, 0, -0.2, 0.27);
  if (ex.includes('barong')) box(g, 0.1, 0.72, 0.02, 0xd8caa4, 0, 1.2, 0.215);
  if (ex.includes('kimona')) box(g, 0.74, 0.14, 0.44, 0xffffff, 0, 1.54, 0);
  if (ex.includes('pamaypay')) box(parts.armR, 0.04, 0.32, 0.34, 0xf7c948, 0.12, -0.82, 0.14);
  if (ex.includes('pouch')) box(g, 0.18, 0.22, 0.1, 0x7a5a2a, 0.3, 0.95, 0.22);
  if (ex.includes('flower')) box(head, 0.12, 0.12, 0.12, 0xffffff, 0.24, 0.3, 0.1);
  if (ex.includes('tee')) box(g, 0.3, 0.26, 0.02, 0xffffff, 0, 1.3, 0.215);
  if (ex.includes('backpack')) box(g, 0.5, 0.56, 0.22, 0xe67e22, 0, 1.24, -0.32);
  if (ex.includes('apron')) box(g, 0.56, 0.9, 0.03, 0x5fa8d3, 0, 1.05, 0.23);
  if (ex.includes('curlers')) for (const x of [-0.16, 0, 0.16]) box(head, 0.1, 0.1, 0.12, 0xf48fb1, x, 0.33, 0.05);
  if (ex.includes('towel')) box(g, 0.78, 0.12, 0.46, 0xffffff, 0, 1.56, 0);
  if (ex.includes('buri')) mesh(head, new THREE.CylinderGeometry(0.2, 0.55, 0.22, 10), mat(0xd9b77a), 0, 0.36, 0);
  if (ex.includes('collar')) box(g, 0.16, 0.08, 0.02, 0xffffff, 0, 1.55, 0.215);
  if (ex.includes('cross')) {
    box(g, 0.05, 0.22, 0.02, 0x333333, 0, 1.3, 0.216);
    box(g, 0.14, 0.05, 0.02, 0x333333, 0, 1.35, 0.216);
  }
  if (ex.includes('torch')) {
    // nakataas na braso, patayong sulo
    box(parts.armR, 0.08, 1.4, 0.08, 0x4a2a12, 0, -0.36, 0.24, { rx: 0.5 });
    const f = mesh(parts.armR, new THREE.ConeGeometry(0.18, 0.5, 5), basic(0xff8c1a), 0, 0.42, 0.66);
    f.rotation.x = 0.5;
    flames.push(f);
    parts.armR.rotation.x = -0.5;
    parts.noSwing = true;
  }
  g.userData.parts = parts;
  return g;
}

// Ang tikbalang: payat, matangkad, nakakuba, mahabang mukha ng kabayo,
// nagliliyab na mata, at mga ngiping nakalabas. Hindi siya nakakatawa.
function tikbalangModel() {
  const g = new THREE.Group();
  const parts = {};
  const c = 0x1c1410, hc = 0x2a1d15, bone = 0xcfc4a8;
  const limb = (x, y, w, h, d, color = c) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    g.add(p);
    box(p, w, h, d, color, 0, -h / 2, 0);
    return p;
  };
  // mahahabang binti na parang sa kabayo (nakabaluktot pabalik)
  parts.legL = limb(-0.28, 2.1, 0.24, 1.2, 0.3);
  parts.legR = limb(0.28, 2.1, 0.24, 1.2, 0.3);
  for (const L of [parts.legL, parts.legR]) {
    box(L, 0.2, 1.0, 0.24, c, 0, -1.55, -0.28, { rx: -0.35 });
    box(L, 0.34, 0.28, 0.42, 0x0a0a0a, 0, -2.0, -0.2);
  }
  // payat na katawan, nakausling tadyang, nakakuba
  const torso = new THREE.Group();
  torso.position.set(0, 2.2, 0);
  torso.rotation.x = 0.28;
  g.add(torso);
  parts.torso = torso;
  box(torso, 0.8, 1.4, 0.42, c, 0, 0.7, 0);
  for (let i = 0; i < 6; i++) box(torso, 0.7 - Math.abs(i - 2.5) * 0.06, 0.05, 0.03, 0x3a2c22, 0, 0.35 + i * 0.16, 0.22);
  box(torso, 0.08, 1.1, 0.04, 0x3a2c22, 0, 0.75, 0.22); // gulugod sa harap
  // napakahabang braso na umaabot sa tuhod, may kuko
  parts.armL = limb(-0.55, 3.35, 0.18, 2.3, 0.2);
  parts.armR = limb(0.55, 3.35, 0.18, 2.3, 0.2);
  for (const A of [parts.armL, parts.armR]) for (const x of [-0.07, 0, 0.07]) box(A, 0.03, 0.35, 0.03, bone, x, -2.45, 0.05, { rx: 0.4 });
  // leeg at ulo ng kabayo
  const head = new THREE.Group();
  head.position.set(0, 3.75, 0.35);
  g.add(head);
  parts.head = head;
  box(head, 0.22, 0.6, 0.26, c, 0, -0.35, -0.1, { rx: -0.4 }); // leeg
  box(head, 0.46, 0.55, 0.62, hc, 0, 0.1, 0);
  box(head, 0.36, 0.34, 0.75, hc, 0, -0.05, 0.62); // nguso
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.24, 0.3);
  head.add(jaw);
  parts.jaw = jaw;
  box(jaw, 0.32, 0.1, 0.7, 0x1a120c, 0, 0, 0.3);
  // mga ngipin
  for (let i = 0; i < 6; i++) {
    box(head, 0.04, 0.12, 0.04, bone, -0.13 + (i % 3) * 0.13, -0.24, 0.45 + Math.floor(i / 3) * 0.3);
    box(jaw, 0.04, 0.1, 0.04, bone, -0.12 + (i % 3) * 0.12, 0.08, 0.2 + Math.floor(i / 3) * 0.3);
  }
  box(head, 0.06, 0.06, 0.02, 0x000000, -0.1, 0.02, 0.99);
  box(head, 0.06, 0.06, 0.02, 0x000000, 0.1, 0.02, 0.99);
  box(head, 0.09, 0.3, 0.09, hc, -0.16, 0.5, -0.15, { rz: 0.2 });
  box(head, 0.09, 0.3, 0.09, hc, 0.16, 0.5, -0.15, { rz: -0.2 });
  // nagliliyab na mata (may halo na hindi natatakpan ng hamog)
  const eye = basic(0xff2a1a, { fog: false });
  box(head, 0.1, 0.08, 0.12, 0, -0.24, 0.2, 0.22, { material: eye, cast: false });
  box(head, 0.1, 0.08, 0.12, 0, 0.24, 0.2, 0.22, { material: eye, cast: false });
  const glowMat = new THREE.SpriteMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  for (const x of [-0.26, 0.26]) {
    const sp = new THREE.Sprite(glowMat);
    sp.scale.set(0.45, 0.45, 1);
    sp.position.set(x, 0.2, 0.26);
    head.add(sp);
  }
  parts.eyeGlow = glowMat;
  // gusot na itim na kiling at tatlong gintong buhok
  box(head, 0.14, 0.7, 0.9, 0x050505, 0, 0.32, -0.25);
  box(g, 0.22, 1.2, 0.3, 0x050505, 0, 3.2, -0.2, { rx: 0.3 });
  const gold = basic(0xffd54a);
  box(g, 0.035, 0.55, 0.035, 0, -0.07, 3.25, -0.4, { material: gold, rx: 0.3 });
  box(g, 0.035, 0.55, 0.035, 0, 0.0, 3.05, -0.42, { material: gold, rx: 0.3 });
  box(g, 0.035, 0.55, 0.035, 0, 0.07, 3.35, -0.38, { material: gold, rx: 0.3 });
  g.scale.setScalar(1.25);
  g.userData.parts = parts;
  g.userData.radius = 0.9;
  g.userData.tall = true;
  g.userData.headY = 3.85;
  g.userData.twitch = 0;
  return g;
}
// Paggalaw: humihinga, nanginginig ang ulo, biglang kumikislot
function animateTikbalang(n, time, dt) {
  const p = n.userData.parts;
  p.torso.rotation.x = 0.28 + Math.sin(time * 1.1) * 0.04;
  p.armL.rotation.x = Math.sin(time * 0.9) * 0.08;
  p.armR.rotation.x = -Math.sin(time * 0.9 + 1) * 0.08;
  p.armL.rotation.z = -0.06;
  p.armR.rotation.z = 0.06;
  p.jaw.rotation.x = 0.1 + Math.max(0, Math.sin(time * 2.3)) * 0.25;
  n.userData.twitch -= dt;
  if (n.userData.twitch <= 0) {
    n.userData.twitch = 0.6 + Math.random() * 2.2;
    n.userData.twitchRot = (Math.random() - 0.5) * 1.1;
    n.userData.twitchTime = 0.18;
  }
  if (n.userData.twitchTime > 0) {
    n.userData.twitchTime -= dt;
    p.head.rotation.z = n.userData.twitchRot;
  } else p.head.rotation.z = lerp(p.head.rotation.z, Math.sin(time * 0.7) * 0.15, Math.min(1, dt * 3));
  p.eyeGlow.opacity = 0.45 + Math.sin(time * 6) * 0.15;
  // mabigat na paghinga kapag malapit ka
  const d = Math.hypot(n.position.x - player.position.x, n.position.z - player.position.z);
  n.userData.breath = (n.userData.breath ?? 0) - dt;
  if (d < 14 && n.userData.breath <= 0 && window.Sound) {
    n.userData.breath = 2.4;
    Sound.play('breath', { vol: 1 - d / 14 });
  }
}

const NPC_DEFS = {
  lola: { name: 'Lola Ising', o: { skin: 0xc68a5e, hair: 'bun', hairC: 0xd8d8d8, top: 0xf3efe6, bottom: 0x7b3f61, skirt: true, extra: ['glasses', 'kimona'] }, barks: [{ en: "Be careful, apo.", tl: "Mag-ingat ka, apo." }, { en: "Have you eaten? Eat more.", tl: "Kumain ka na ba? Kain pa." }, { en: "Don't go near the balete at night.", tl: "Wag kang lalapit sa balete pag gabi." }] },
  tess: { name: 'Tess', o: { skin: 0xb97a50, hair: 'ponytail', hairC: 0x2a1a12, top: 0xe86a8a, bottom: 0x3b5a8a, extra: ['tee'] }, barks: [{ en: "Come on, help me out here!", tl: "Tara, tulungan mo ako dito!" }, { en: "I missed you, {name}! Still single, by the way.", tl: "Namiss kita, {name}! Single pa rin ako, by the way." }] },
  tonyo: { name: 'Mang Tonyo', o: { skin: 0x8e5a36, hair: 'short', hairC: 0xcfcfcf, top: 0xe9e2cf, bottom: 0x6b5a45, extra: ['salakot', 'beard', 'pouch'] }, barks: [{ en: "The forest has its own rules.", tl: "May sariling rules ang gubat." }, { en: "Tabi-tabi po...", tl: "Tabi-tabi po..." }] },
  beth: { name: 'Aling Beth', o: { skin: 0xc98d62, hair: 'curly', hairC: 0x4a2a1a, top: 0xd23c3c, bottom: 0xd23c3c, skirt: true, extra: ['pamaypay', 'flower'] }, barks: [{ en: "Hmp!", tl: "Hmp!" }, { en: "What are you looking at?", tl: "Ano'ng tinitingin-tingin mo?" }] },
  kapitan: { name: 'Kapitan Ramon', o: { skin: 0xa8703f, hair: 'short', hairC: 0x1a1a1a, top: 0xf2ead3, bottom: 0x2b2b2b, extra: ['barong'] }, barks: [{ en: "We need calm heads right now.", tl: "Kalma lang tayo, mga kababayan." }, { en: "Good evening! Don't forget to vote.", tl: "Magandang gabi! Wag kalimutang bumoto ha." }] },
  nena: { name: 'Aling Nena', o: { skin: 0xc68a5e, hair: 'bun', hairC: 0x2a1a12, top: 0xf6c1d0, bottom: 0x6a4c93, skirt: true, extra: ['apron', 'curlers'] }, barks: [{ en: "PABILI? Sure. Utang? No.", tl: "PABILI? Sige. Utang? Hindi." }, { en: "Beth told you WHAT about me?", tl: "Ano'ng sinabi ni Beth tungkol sa'kin?" }, { en: "No change. Take a candy instead.", tl: "Walang barya. Kendi na lang ang sukli." }] },
  padre: { name: 'Father Jun', o: { skin: 0xb07a52, hair: 'short', hairC: 0x1a1a1a, top: 0xf5f5f0, bottom: 0xf5f5f0, skirt: true, extra: ['glasses', 'collar', 'cross'] }, barks: [{ en: "God bless you, anak. Also, the basketball game is at 4.", tl: "God bless, anak. Tsaka yung liga, alas-kwatro." }, { en: "Have you been to confession lately? ...I can tell.", tl: "Kailan ka huling nag-confession? ...Halata eh." }] },
  kardo: { name: 'Mang Kardo', o: { skin: 0x8e5a36, hair: 'short', hairC: 0x333333, top: 0x6a8caf, bottom: 0x5a4632, extra: ['buri', 'towel'] }, barks: [{ en: "Forty years I farm here. FORTY. And I got lost.", tl: "Apatnapung taon na 'kong nagsasaka dito. APATNAPU. Tapos naligaw pa 'ko." }, { en: "My carabao's name is Brad Pitt. Don't ask.", tl: "Brad Pitt pangalan ng kalabaw ko. Wag ka nang magtanong." }] },
  tikbalang: { name: 'Tikbalang', tall: true, barks: [{ en: "...", tl: "..." }, { en: "Hhhhhhh...", tl: "Hhhhhhh..." }] },
};
const npcs = {};
function buildNPCs() {
  for (const [id, def] of Object.entries(NPC_DEFS)) {
    const m = def.tall ? tikbalangModel() : person(def.o);
    m.visible = false;
    m.userData.id = id;
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(m);
    m.userData.dynamic = true;
    npcs[id] = m;
  }
}

// Mga taong may sulo at mga taga-barrio
const crowd = new THREE.Group();
const villagers = new THREE.Group();
let crowdLight;
function buildCrowds() {
  const R = rng(99);
  const tops = [0x5a2a2a, 0x3a3a5a, 0x4a4a2a, 0x2a4a3a, 0x5a4a3a];
  for (let i = 0; i < 14; i++) {
    const p = person({ skin: 0x8a5a3a, hair: 'short', hairC: 0x111111, top: tops[i % tops.length], bottom: 0x2a2a2a, extra: i % 2 ? ['torch'] : [] });
    const a = (i / 14) * Math.PI * 1.2 + 0.2, r = 5 + R() * 3;
    p.position.set(15 + Math.cos(a) * r * 0.9, 0, 11 + Math.sin(a) * r * 0.5);
    p.rotation.y = Math.atan2(15 - p.position.x, 4 - p.position.z);
    crowd.add(p);
  }
  crowdLight = new THREE.PointLight(0xff8c3a, 0, 30, 1.2);
  crowdLight.position.set(15, 3, 13);
  crowd.add(crowdLight);
  crowd.visible = false;
  crowd.userData.dynamic = true;
  scene.add(crowd);
  const cols = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0xf06292, 0x8e24aa, 0x00acc1];
  const spots = [[6, -6], [11, -9], [24, -6], [26, 10], [5, 6], [12, 12], [20, -10], [3, -2]];
  spots.forEach(([x, z], i) => {
    const p = person({ skin: [0xb97a50, 0xa8703f, 0xc68a5e][i % 3], hair: i % 3 ? 'short' : 'ponytail', hairC: 0x1a1a1a, top: cols[i], bottom: 0x3b3b4a, skirt: i % 4 === 1 });
    p.position.set(x, 0, z);
    p.rotation.y = R() * 6;
    villagers.add(p);
  });
  villagers.visible = false;
  villagers.userData.dynamic = true;
  scene.add(villagers);
}

// Player
let player;
function buildPlayer() {
  player = person({ skin: 0xb07a52, hair: 'short', hairC: 0x1a1a1a, top: 0x3f7fbf, bottom: 0x2e3f5e, extra: ['backpack'] });
  player.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  player.userData.dynamic = true;
  scene.add(player);
}

// Marka ng layunin
const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), basic(0xffd23f, { fog: false, depthTest: false, transparent: true }));
marker.renderOrder = 999;
marker.visible = false;
scene.add(marker);

// ============================================================
//  MGA LUGAR (x, z, harap)
// ============================================================
const ANCH = {
  start: [2, 36, Math.PI],
  shed_lola: [-12, 33.5],
  house_lola: [-21, 11.5],
  house_kapitan: [-18.2, 9.2],
  house_beth: [-19, 6.8],
  plaza_tess: [20, 5],
  plaza_kapitan: [8, -4],
  plaza_beth: [10, -6],
  kubo_tonyo: [-35, -29.5],
  mob_beth: [13, 8.5],
  mob_kapitan: [18, 9.5],
  mob_tess: [22, 5],
  mob_lola: [9, 5],
  b_tonyo: [-4, -57.5],
  b_lola: [4, -57.5],
  b_kapitan: [-7, -55.5],
  b_beth: [7, -55.5],
  b_tess: [1.5, -55],
  b_tik: [0, -69.5],
  balete_front: [0, -52.5, Math.PI],
  fiesta: [15, 11, Math.PI],
  f_lola: [12, 6],
  f_tonyo: [15, 5.5],
  f_beth: [18, 6],
  f_tess: [21, 7.5],
  f_kapitan: [9, 7.5],
  kubo_front: [-29.5, -23, Math.PI + 0.7],
  kubo_beth: [-34.5, -28.5],
  plaza_center: [15, 9, Math.PI],
  house_front: [-19, 8.5, -Math.PI / 2],
  nena_store: [9.6, 23.4],
  padre_church: [18, -7.4],
  kardo_field: [48.5, -2],
  f_nena: [6, 10],
  f_padre: [24, 9.5],
  f_kardo: [3.5, 4],
  mob_nena: [10.5, 12.5],
};
const LOCS = {
  plaza: { x: 15, z: 2, r: 11, label: 'Plaza' },
  balete: { x: 0, z: -64, r: 10, label: 'Tuod ng balete' },
};

// ============================================================
//  ORAS NG ARAW (liwanag, langit, hamog)
// ============================================================
const TIMES = {
  day: { sky: 0x8ec5ea, fog: 0xbcd8ea, near: 60, far: 230, hs: 0xdfefff, hg: 0x5a6a3a, hi: 1.0, sun: 0xfff2d8, si: 1.7, dir: [0.5, 1, 0.35], night: 0, mtn: 1 },
  dusk: { sky: 0xe08a6a, fog: 0xc07a7a, near: 45, far: 190, hs: 0xffc8a0, hg: 0x3a2a3a, hi: 0.7, sun: 0xff9a5a, si: 1.2, dir: [-1, 0.3, 0.25], night: 0.45, mtn: 0.6 },
  night: { sky: 0x0b1230, fog: 0x10183a, near: 25, far: 125, hs: 0x5a6aaa, hg: 0x101018, hi: 0.55, sun: 0x9fb4ff, si: 0.45, dir: [0.4, 1, -0.5], night: 1, mtn: 0.15 },
  fog: { sky: 0x3a4250, fog: 0x7c8696, near: 2, far: 26, hs: 0x8a96aa, hg: 0x202428, hi: 0.55, sun: 0x9fb4ff, si: 0.25, dir: [0.4, 1, -0.5], night: 1, mtn: 0 },
  dawn: { sky: 0xf0c3a0, fog: 0xd8b8a8, near: 40, far: 200, hs: 0xffe0c8, hg: 0x4a4a3a, hi: 0.9, sun: 0xffc890, si: 1.3, dir: [1, 0.35, 0.2], night: 0.15, mtn: 0.8 },
};
const cur = { sky: new THREE.Color(), fog: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), sun: new THREE.Color(), near: 60, far: 230, hi: 1, si: 1.5, dir: new THREE.Vector3(0.5, 1, 0.35), night: 0, mtn: 1 };
let targetTime = TIMES.day;
function setTime(name, instant) {
  targetTime = TIMES[name] || TIMES.day;
  if (instant) stepTime(1);
}
const tmpC = new THREE.Color();
function stepTime(t) {
  const T = targetTime;
  for (const k of ['sky', 'fog', 'hs', 'hg', 'sun']) cur[k].lerp(tmpC.set(T[k]), t);
  for (const k of ['near', 'far', 'hi', 'si', 'night', 'mtn']) cur[k] = lerp(cur[k], T[k], t);
  cur.dir.lerp(new THREE.Vector3(...T.dir).normalize(), t);
  scene.background.copy(cur.sky);
  skyDome.material.uniforms.top.value.copy(cur.sky);
  skyDome.material.uniforms.bottom.value.copy(cur.fog);
  scene.fog.color.copy(cur.fog);
  scene.fog.near = cur.near;
  scene.fog.far = cur.far;
  hemi.color.copy(cur.hs);
  hemi.groundColor.copy(cur.hg);
  hemi.intensity = cur.hi;
  sun.color.copy(cur.sun);
  sun.intensity = cur.si;
  stars.material.opacity = cur.night * (1 - Math.min(1, (60 - Math.min(60, cur.far)) / 30));
  moon.material.opacity = cur.night > 0.6 && cur.far > 60 ? cur.night : 0;
  fireflies.material.opacity = cur.night * 0.9;
  for (const m of glowMats) m.emissiveIntensity = cur.night * 0.95;
  for (const n of nightLights) n.light.intensity = cur.night * n.max;
  if (scenery.mountains) {
    for (const [m, base] of scenery.mountains) {
      m.visible = cur.mtn > 0.05;
      m.color.set(base).multiplyScalar(0.2 + cur.mtn * 0.8);
    }
  }
}

// ============================================================
//  INPUT at CAMERA
// ============================================================
const keys = {};
let yaw = 0, pitch = 0;
let camMode = 'title';
let focusId = null;
let objective = null;
let walkScare = null, walkScareFired = false;
let scareHold = 0, scareRestore = null;
// Cinematic mode (para sa teaser): ang trailer ang kumokontrol sa camera
const cine = { active: false, fp: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60, onFrame: null };
let arrivedGuard = false;
const $ = (s) => document.querySelector(s);

// ---- Keyboard ----
// Kapag binitawan ang key sa labas ng laro, hindi natatanggap ang "keyup".
// Kaya nililinis ang keys kapag: nawala/bumalik ang focus, lumabas ang mouse
// sa page, na-release ang mouse-look (Esc), o bumalik sa paglalakad mula sa usapan.
const keyTime = {};
function clearKeys() {
  for (const k in keys) keys[k] = false;
}
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return clearKeys(); // shortcut ng browser, hindi galaw
  keys[e.code] = true;
  keyTime[e.code] = performance.now();
  const mode = window.Game && Game.mode;
  if (mode === 'explore' && e.code !== 'Escape' && e.code !== 'Tab' && !document.pointerLockElement) lockMouse();
  if (e.code === 'KeyF' && mode === 'explore') whip();
  if (e.code === 'Escape' && bigMapOpen) toggleMap(false);
  if (mode === 'explore' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    interact();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  keyTime[e.code] = performance.now();
});
window.addEventListener('blur', clearKeys);
window.addEventListener('focus', clearKeys);
window.addEventListener('pagehide', clearKeys);
document.addEventListener('visibilitychange', clearKeys);
document.documentElement.addEventListener('mouseleave', () => {
  if (!document.pointerLockElement) clearKeys();
});
// Nakatago ang cursor habang naglalakad. Kapag pinindot ang Esc (na nagpapakawala
// sa mouse), bubukas ang Menu. Lumalabas ang cursor sa usapan at sa menu.
let selfExit = false;
function lockMouse() {
  if (document.pointerLockElement || !window.Game || Game.mode !== 'explore' || bigMapOpen) return;
  const el = document.getElementById('game');
  if (!el.requestPointerLock) return;
  try {
    const pr = el.requestPointerLock();
    if (pr && pr.catch) pr.catch(() => {});
  } catch (err) {}
}
function releaseMouse() {
  if (!document.pointerLockElement) return;
  selfExit = true;
  document.exitPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  if (!locked) clearKeys();
  $('#game').classList.toggle('looking', locked);
  // Esc habang naglalakad: bitawan ang mouse at buksan ang Menu
  if (!locked && !selfExit && window.Game && Game.mode === 'explore' && Game.openMenu) Game.openMenu();
  if (!locked) selfExit = false;
});
function checkStuckKeys(mode) {
  if (mode === 'explore' && checkStuckKeys.prevMode !== 'explore') clearKeys();
  checkStuckKeys.prevMode = mode;
}

let drag = null;
const gameEl = document.getElementById('game');
const LOOK = 0.0022;
gameEl.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, input, .overlay, #choices, #bigmap, #joystick')) return;
  const mode = window.Game && Game.mode;
  if (mode === 'explore' && !document.pointerLockElement && e.pointerType === 'mouse' && gameEl.requestPointerLock) {
    try {
      const pr = gameEl.requestPointerLock();
      if (pr && pr.catch) pr.catch(() => {});
    } catch (err) {}
  }
  drag = { x: e.clientX, y: e.clientY };
});
// Pagtingin gamit ang mouse — hindi na kailangang mag-click o mag-drag:
// igalaw ang mouse pakanan = tumingin pakanan. Sa gilid ng screen, tuloy-tuloy ang ikot.
const hoverMouse = { inside: false, nx: 0.5, ny: 0.5 };
window.addEventListener('pointermove', (e) => {
  const r = gameEl.getBoundingClientRect();
  hoverMouse.nx = (e.clientX - r.left) / r.width;
  hoverMouse.ny = (e.clientY - r.top) / r.height;
  hoverMouse.inside = hoverMouse.nx >= 0 && hoverMouse.nx <= 1 && hoverMouse.ny >= 0 && hoverMouse.ny <= 1;
  const mode = window.Game && Game.mode;
  if (mode !== 'explore' || bigMapOpen) return;
  if (document.pointerLockElement) {
    yaw -= e.movementX * LOOK;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - e.movementY * LOOK));
  } else if (e.pointerType === 'mouse' || !e.pointerType) {
    // hover look: sumusunod ang tingin sa galaw ng mouse
    const mx = e.movementX || 0, my = e.movementY || 0;
    if (Math.abs(mx) < 200 && Math.abs(my) < 200) {
      yaw -= mx * 0.0042;
      pitch = Math.max(-1.1, Math.min(1.1, pitch - my * 0.003));
    }
  } else if (drag) {
    // touch: i-drag ang daliri para tumingin
    yaw -= (e.clientX - drag.x) * 0.005;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
  }
});
gameEl.addEventListener('pointerleave', () => (hoverMouse.inside = false));
// Kapag nasa gilid ng screen ang mouse, patuloy na umiikot ang tingin
function edgeTurn(dt, mode) {
  if (mode !== 'explore' || document.pointerLockElement || !hoverMouse.inside || bigMapOpen) return;
  const E = 0.1;
  if (hoverMouse.nx < E) yaw += dt * 2.4 * (1 - hoverMouse.nx / E);
  else if (hoverMouse.nx > 1 - E) yaw -= dt * 2.4 * (1 - (1 - hoverMouse.nx) / E);
}
window.addEventListener('pointerup', () => (drag = null));

// ---- Touch joystick (para sa cellphone) ----
const joy = { active: false, x: 0, y: 0, id: null };
const joyEl = $('#joystick'), knob = $('#joystick .knob');
if (joyEl) {
  joyEl.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joy.active = true;
    joy.id = e.pointerId;
    joyEl.setPointerCapture(e.pointerId);
    moveJoy(e);
  });
  joyEl.addEventListener('pointermove', (e) => joy.active && e.pointerId === joy.id && moveJoy(e));
  const end = () => {
    joy.active = false;
    joy.x = joy.y = 0;
    knob.style.transform = '';
  };
  joyEl.addEventListener('pointerup', end);
  joyEl.addEventListener('pointercancel', end);
}
function moveJoy(e) {
  const r = joyEl.getBoundingClientRect();
  let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  joy.x = x;
  joy.y = y;
  knob.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
}
const actBtn = $('#act-btn');
if (actBtn) actBtn.addEventListener('click', (e) => { e.stopPropagation(); if (Game.mode === 'explore') interact(); });
const whipBtn = $('#whip-btn');
if (whipBtn) whipBtn.addEventListener('click', (e) => { e.stopPropagation(); if (Game.mode === 'explore') whip(); });

// ============================================================
//  PAKIKIPAG-USAP
// ============================================================
function objectiveTarget() {
  if (!objective) return null;
  if (objective.startsWith('quest:')) return null; // walang waypoint: hanapin gamit ang mga hint
  if (objective.startsWith('loc:')) {
    const l = LOCS[objective.slice(4)];
    return l ? { x: l.x, z: l.z, y: 3.5, loc: true, r: l.r, label: l.label } : null;
  }
  const n = npcs[objective];
  if (!n || !n.visible) return null;
  return { x: n.position.x, z: n.position.z, y: n.userData.tall ? 4.6 : 2.9, npc: objective, label: NPC_DEFS[objective].name };
}

// Nakaharap ba ang player dito? (first person: kinakausap/pinupulot ang tinitingnan)
function inView(x, z, maxAng = 0.75) {
  const dx = x - player.position.x, dz = z - player.position.z, d = Math.hypot(dx, dz) || 1;
  const dot = (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / d;
  return d < 1.2 || dot > Math.cos(maxAng);
}
function nearestNpc(maxD) {
  let best = null, bd = maxD;
  for (const [id, n] of Object.entries(npcs)) {
    if (!n.visible || !inView(n.position.x, n.position.z)) continue;
    const d = Math.hypot(n.position.x - player.position.x, n.position.z - player.position.z);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

let barkTimer = 0;
function interact() {
  const p = nearestPickup(2.2);
  if (p && inView(p.x, p.z)) {
    Game.collect(p.id);
    pickupTimer = 0;
    return;
  }
  if (hunt.active && lowerBody.visible && distXZ(lowerBody.position, player.position) < 2.2 && inView(lowerBody.position.x, lowerBody.position.z)) {
    if (Game.useItem('asin')) {
      Sound.play('shriek');
      return endHunt('salt');
    }
    return showBark(I18N.t('needSalt'));
  }
  const t = objectiveTarget();
  if (t && t.npc && Math.hypot(t.x - player.position.x, t.z - player.position.z) < 3.4 && inView(t.x, t.z)) {
    focusId = t.npc;
    setTimeout(() => Game.arrive(), 0);
    return;
  }
  const id = nearestNpc(3.4);
  if (id && Game.talkTo && Game.canTalk(id)) {
    focusId = id;
    setTimeout(() => Game.talkTo(id), 0);
    return;
  }
  if (id) {
    const b = NPC_DEFS[id].barks;
    const name = Game.state ? Game.state.name : '';
    const line = I18N.L(b[Math.floor(Math.random() * b.length)]).replace('{name}', name);
    showBark(`${NPC_DEFS[id].name}: "${line}"`);
  }
}
function showBark(text) {
  const el = $('#bark');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(barkTimer);
  barkTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ============================================================
//  UPDATE LOOP
// ============================================================
const tmpV = new THREE.Vector3();
const camPos = new THREE.Vector3(30, 20, 40);
const camLook = new THREE.Vector3(15, 2, 0);
let walkPhase = 0;
let promptText = '';
let objTimer = 0;

function animateWalk(obj, speed, dt, phaseRef) {
  const p = obj.userData.parts;
  if (!p) return;
  const sw = speed > 0.1 ? Math.sin(phaseRef) * Math.min(0.7, speed * 0.12) : 0;
  const k = speed > 0.1 ? 1 : Math.min(1, dt * 10);
  p.legL.rotation.x = lerp(p.legL.rotation.x, sw, k);
  p.legR.rotation.x = lerp(p.legR.rotation.x, -sw, k);
  if (!p.noSwing) p.armR.rotation.x = lerp(p.armR.rotation.x, sw * 0.8, k);
  p.armL.rotation.x = lerp(p.armL.rotation.x, -sw * 0.8, k);
}

function update(dt, time) {
  const mode = window.Game ? Game.mode : 'title';
  stepTime(Math.min(1, dt * 1.2));

  // ---- galaw ng player ----
  checkStuckKeys(mode);
  let speed = 0;
  edgeTurn(dt, mode);
  if (mode === 'explore') {
    if (keys.ArrowLeft) yaw += dt * 2.2;
    if (keys.ArrowRight) yaw -= dt * 2.2;
    let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (joy.active) { mx = joy.x; mz = joy.y; }
    const len = Math.hypot(mx, mz);
    if (len > 0.1) {
      mx /= Math.max(1, len);
      mz /= Math.max(1, len);
      const run = (keys.ShiftLeft || keys.ShiftRight || (joy.active && len > 0.95)) && !(hunt.active && hunt.exhausted);
      speed = (run ? 8.5 : 4.5) * Math.min(1, len);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const vx = rx * mx - fx * mz, vz = rz * mx - fz * mz;
      const vl = Math.hypot(vx, vz) || 1;
      player.position.x += (vx / vl) * speed * dt;
      player.position.z += (vz / vl) * speed * dt;
      collide(player.position);
    }
  }
  player.rotation.y = yaw + Math.PI;
  if (document.pointerLockElement && mode !== 'explore') releaseMouse();
  if (gameEl.dataset.mode !== mode) gameEl.dataset.mode = mode;
  const prevStep = Math.floor(walkPhase / Math.PI);
  walkPhase += dt * speed * 2.1;
  animateWalk(player, speed, dt, walkPhase);
  staminaTick(dt, speed > 6);
  if (whipAnim > 0) whipAnim -= dt;
  updateViewModel(dt, time, speed, mode);
  if (speed > 0.1 && Math.floor(walkPhase / Math.PI) !== prevStep && window.Sound) Sound.play('step');

  // ---- mga NPC: humaharap sa player ----
  for (const n of Object.values(npcs)) {
    if (!n.visible) continue;
    const dx = player.position.x - n.position.x, dz = player.position.z - n.position.z;
    if (scareHold > 0 && n === npcs.tikbalang) {
      // nakaharap sa camera habang nanggugulat
      n.rotation.y = Math.atan2(camera.position.x - n.position.x, camera.position.z - n.position.z);
    } else if (Math.hypot(dx, dz) < 12) n.rotation.y = lerpAngle(n.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
    const p = n.userData.parts;
    if (p) {
      if (n.userData.tall) animateTikbalang(n, time, dt);
      else p.head.position.y = 1.88 + Math.sin(time * 2 + n.position.x) * 0.015;
    }
  }
  for (const f of flames) f.scale.set(1, 0.75 + Math.random() * 0.5, 1);
  if (scareHold > 0) {
    scareHold -= dt;
    const n = npcs.tikbalang;
    n.position.y = Math.sin(time * 40) * 0.05 + scareRestore.y;
    if (scareHold <= 0) {
      n.visible = scareRestore.v;
      n.position.copy(scareRestore.p);
      n.rotation.y = scareRestore.r;
    }
  }
  if (crowd.visible) crowdLight.intensity = 10 + Math.random() * 3;
  syncPickups(dt, time);
  updateHunt(dt, time, mode);
  updateEvents(dt, time, mode);
  updateMaps(dt, mode);

  // ---- layunin ----
  const t = objectiveTarget();
  marker.visible = !!t && mode === 'explore';
  $('#objective-arrow').style.visibility = t ? 'visible' : 'hidden';
  if (!t && mode === 'explore') $('#objective-dist').textContent = '';
  promptText = '';
  if (t) {
    marker.position.set(t.x, t.y + Math.sin(time * 3) * 0.2, t.z);
    marker.rotation.y += dt * 2;
    const d = Math.hypot(t.x - player.position.x, t.z - player.position.z);
    if (mode === 'explore') {
      if (walkScare && !walkScareFired && d < walkScare.at) {
        walkScareFired = true;
        Game.jumpscare(walkScare.type, walkScare.after);
      }
      if (t.npc && d < 3.4 && inView(t.x, t.z)) promptText = I18N.t('talkTo', { name: t.label });
      if (t.loc && d < t.r && !arrivedGuard) {
        arrivedGuard = true;
        setTimeout(() => Game.arrive(), 250);
      }
      objTimer -= dt;
      if (objTimer <= 0) {
        objTimer = 0.25;
        $('#objective-dist').textContent = d > 4 ? `${Math.round(d)}m` : '';
      }
      // compass: arrow na nakaturo sa layunin, batay sa direksyon ng camera
      const dx = t.x - player.position.x, dz = t.z - player.position.z;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
      $('#objective-arrow').style.transform = `rotate(${ang}rad)`;
    }
  }
  if (mode === 'explore' && !promptText) {
    const p = nearestPickup(2.2);
    if (p && inView(p.x, p.z)) promptText = I18N.t('pickUp', { name: p.name });
    else if (hunt.active && lowerBody.visible && distXZ(lowerBody.position, player.position) < 2.2 && inView(lowerBody.position.x, lowerBody.position.z)) promptText = Game.hasItem('asin') ? I18N.t('sprinkle') : I18N.t('needSalt');
  }
  if (mode === 'explore' && !promptText) {
    const id = nearestNpc(3.4);
    if (id) promptText = Game.canTalk && Game.canTalk(id) ? I18N.t('talkTo', { name: NPC_DEFS[id].name }) : `[E] ${NPC_DEFS[id].name}`;
  }
  const pr = $('#prompt');
  if (pr.textContent !== promptText) pr.textContent = promptText;
  pr.classList.toggle('show', !!promptText);

  // ---- camera ----
  if (cine.active) {
    camera.position.copy(cine.pos);
    camera.lookAt(cine.look);
    if (Math.abs(camera.fov - cine.fov) > 0.01) {
      camera.fov = cine.fov;
      camera.updateProjectionMatrix();
    }
    // para humarap ang mga tauhan sa camera
    player.position.set(cine.pos.x, 0, cine.pos.z);
  } else if (mode === 'title' || camMode === 'title') {
    const a = time * 0.05;
    camPos.lerp(new THREE.Vector3(15 + Math.cos(a) * 42, 18, 2 + Math.sin(a) * 42), Math.min(1, dt * 3));
    camera.position.copy(camPos);
    camera.lookAt(15, 3, 0);
    camera.fov = 55;
    camera.updateProjectionMatrix();
  } else {
    // FIRST PERSON: ang mata ng player
    const talking = mode !== 'explore' && focusId && npcs[focusId] && npcs[focusId].visible && scareHold <= 0;
    if (talking) {
      // tumingin sa mukha ng kausap
      const n = npcs[focusId];
      const dx = n.position.x - player.position.x, dz = n.position.z - player.position.z, dl = Math.hypot(dx, dz);
      const minD = n.userData.tall ? 3.2 : 1.7;
      if (dl < minD && dl > 0.01) {
        player.position.x -= (dx / dl) * (minD - dl) * Math.min(1, dt * 5);
        player.position.z -= (dz / dl) * (minD - dl) * Math.min(1, dt * 5);
      }
      const headY = (n.userData.headY || 1.9) * n.scale.y;
      yaw = lerpAngle(yaw, Math.atan2(-dx, -dz), Math.min(1, dt * 4));
      pitch = lerp(pitch, Math.atan2(headY - 1.62, Math.max(0.5, dl)), Math.min(1, dt * 4));
    }
    const bob = speed > 0.1 ? Math.sin(walkPhase * 2) * 0.045 * Math.min(1.4, speed / 4.5) : 0;
    camPos.set(player.position.x, 1.62 + bob, player.position.z);
    camera.position.copy(camPos);
    camera.rotation.set(pitch, yaw, Math.sin(walkPhase) * 0.006 * Math.min(1, speed / 4.5));
    const wantFov = speed > 6 ? 80 : 72;
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov = lerp(camera.fov, wantFov, Math.min(1, dt * 6));
      camera.updateProjectionMatrix();
    }
  }

  // ---- anino sumusunod sa player ----
  const focus = mode === 'title' ? new THREE.Vector3(15, 0, 0) : player.position;
  sun.target.position.copy(focus);
  sun.position.copy(focus).add(cur.dir.clone().multiplyScalar(120));
}

// ============================================================
//  ITEMS (pickups) — mga gamit na nakakalat sa mundo
// ============================================================
function itemModel(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'bawang':
      for (const [x, z] of [[0, 0], [0.14, 0.08], [-0.12, 0.1], [0.02, -0.14]]) mesh(g, new THREE.SphereGeometry(0.16, 6, 5), mat(0xf4efe4), x, 0.16, z);
      box(g, 0.05, 0.22, 0.05, 0x9ccc65, 0, 0.4, 0);
      break;
    case 'asin':
      box(g, 0.36, 0.46, 0.24, 0xffffff, 0, 0.23, 0);
      box(g, 0.37, 0.14, 0.25, 0x1e5aa8, 0, 0.28, 0);
      break;
    case 'buntot': {
      box(g, 1.5, 0.06, 0.1, 0x6d5b4b, 0.2, 0.12, 0, { rz: 0.15 });
      box(g, 0.28, 0.14, 0.16, 0x3e2e22, -0.6, 0.12, 0);
      break;
    }
    case 'rosaryo': {
      const tor = mesh(g, new THREE.TorusGeometry(0.22, 0.035, 4, 12), mat(0x6d4c41), 0, 0.25, 0);
      tor.rotation.x = Math.PI / 2;
      box(g, 0.05, 0.24, 0.05, 0xd4af37, 0, 0.25, 0.32);
      box(g, 0.14, 0.05, 0.05, 0xd4af37, 0, 0.31, 0.32);
      break;
    }
    default:
      box(g, 0.3, 0.3, 0.3, 0xffd54a, 0, 0.2, 0);
  }
  // maliit na kislap — nakikita lang kapag malapit ka na (walang waypoint)
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  spark.scale.set(0.25, 0.25, 1);
  spark.position.set(0.15, 0.45, 0);
  g.add(spark);
  g.userData.spark = spark;
  g.userData.dynamic = true;
  return g;
}
const pickupMeshes = {};
let pickupList = [];
let pickupTimer = 0;
function syncPickups(dt, time) {
  pickupTimer -= dt;
  if (pickupTimer <= 0) {
    pickupTimer = 0.3;
    pickupList = window.Game && Game.state && Game.pickups ? Game.pickups() : [];
    const want = new Set(pickupList.map((p) => p.id));
    for (const [id, m] of Object.entries(pickupMeshes)) {
      if (!want.has(id)) {
        scene.remove(m);
        delete pickupMeshes[id];
      }
    }
    for (const p of pickupList) {
      if (pickupMeshes[p.id]) continue;
      const m = itemModel(p.id);
      m.position.set(p.x, 0.3, p.z);
      scene.add(m);
      pickupMeshes[p.id] = m;
    }
  }
  for (const m of Object.values(pickupMeshes)) {
    m.rotation.y += dt * 0.8;
    m.position.y = 0.05;
    const near = Math.hypot(m.position.x - player.position.x, m.position.z - player.position.z) < 9;
    m.userData.spark.visible = near && Math.sin(time * 5 + m.position.z) > 0.3;
  }
}
function nearestPickup(maxD) {
  let best = null, bd = maxD;
  for (const p of pickupList) {
    const d = Math.hypot(p.x - player.position.x, p.z - player.position.z);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

// ============================================================
//  ANG MANANANGGAL — habulan hanggang hatinggabi
// ============================================================
const hunt = { active: false, time: 0, total: 150, stamina: 100, exhausted: false, running: false, whipCd: 0, state: 'wander', stun: 0, target: new THREE.Vector3(), tik: 0, flap: 0, bub: 0, frenzy: false };
let mng, lowerBody, whipAnim = 0;
// Mga taguan ng ibabang katawan: madilim at malayo sa daan
const LOWER_SPOTS = [[-47, -25], [74, 26], [26, -34], [-58, -48], [42, -52], [-70, 20], [83, -30], [-25, -52], [36, 26], [-44, 40]];
const PATROL = [[15, 0], [-20, 10], [-36, -26], [0, -38], [30, 20], [8, 34], [45, -10], [-10, -12], [-40, 25]];
const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function buildManananggal() {
  mng = new THREE.Group();
  const skin = 0xd8d0c8, hair = 0x0a0a0a;
  box(mng, 0.7, 0.75, 0.4, skin, 0, 0, 0);
  box(mng, 0.72, 0.16, 0.42, 0x7a0000, 0, -0.43, 0);
  for (let i = 0; i < 5; i++) box(mng, 0.08, 0.45 + (i % 3) * 0.25, 0.08, i % 2 ? 0xa01010 : 0x6a0000, -0.24 + i * 0.12, -0.7 - (i % 3) * 0.12, (i % 2) * 0.08 - 0.04);
  const armL = box(mng, 0.18, 0.8, 0.2, skin, -0.47, -0.05, 0.25);
  const armR = box(mng, 0.18, 0.8, 0.2, skin, 0.47, -0.05, 0.25);
  armL.rotation.x = armR.rotation.x = -1.1;
  const head = new THREE.Group();
  head.position.set(0, 0.68, 0);
  mng.add(head);
  box(head, 0.5, 0.55, 0.5, skin, 0, 0, 0);
  box(head, 0.56, 0.3, 0.56, hair, 0, 0.22, -0.02);
  box(head, 0.6, 1.2, 0.14, hair, 0, -0.3, -0.28);
  box(head, 0.1, 0.9, 0.4, hair, -0.29, -0.2, -0.05);
  box(head, 0.1, 0.9, 0.4, hair, 0.29, -0.2, -0.05);
  const eye = basic(0xff2020, { fog: false });
  box(head, 0.11, 0.08, 0.04, 0, -0.12, 0.05, 0.26, { material: eye, cast: false });
  box(head, 0.11, 0.08, 0.04, 0, 0.12, 0.05, 0.26, { material: eye, cast: false });
  box(head, 0.24, 0.1, 0.04, 0x3a0000, 0, -0.15, 0.26);
  box(head, 0.04, 0.09, 0.03, 0xffffff, -0.07, -0.2, 0.28);
  box(head, 0.04, 0.09, 0.03, 0xffffff, 0.07, -0.2, 0.28);
  // pakpak ng paniki
  const wingMat = new THREE.MeshToonMaterial({ color: 0x2a1a22, gradientMap: toonRamp, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.3, 0, 2.6, 0.7, 0, 2.3, -0.4, 0, 0, 0.3, 0, 2.3, -0.4, 0, 1.3, -0.8, 0, 0, 0.3, 0, 1.3, -0.8, 0, 0.3, -0.45, 0], 3));
  wingGeo.computeVertexNormals();
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.position.set(-0.3, 0.2, -0.2);
  wr.position.set(0.3, 0.2, -0.2);
  const ml = new THREE.Mesh(wingGeo, wingMat);
  ml.scale.x = -1;
  wl.add(ml);
  wr.add(new THREE.Mesh(wingGeo, wingMat));
  mng.add(wl, wr);
  mng.userData.wl = wl;
  mng.userData.wr = wr;
  mng.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  mng.visible = false;
  scene.add(mng);

  lowerBody = new THREE.Group();
  box(lowerBody, 0.74, 0.55, 0.44, 0x3b3b4a, 0, 1.08, 0);
  box(lowerBody, 0.76, 0.12, 0.46, 0x7a0000, 0, 1.4, 0);
  box(lowerBody, 0.26, 0.82, 0.28, skin, -0.16, 0.41, 0);
  box(lowerBody, 0.26, 0.82, 0.28, skin, 0.16, 0.41, 0);
  box(lowerBody, 0.3, 0.1, 0.36, 0x2b1d14, -0.16, 0.05, 0.04);
  box(lowerBody, 0.3, 0.1, 0.36, 0x2b1d14, 0.16, 0.05, 0.04);
  // mantsa ng dugo sa lupa (hindi kumikinang)
  box(lowerBody, 1.1, 0.02, 0.8, 0x3a0404, 0.2, 0.01, 0.1, { cast: false });
  lowerBody.visible = false;
  scene.add(lowerBody);
}
function pickPatrol() {
  const p = PATROL[Math.floor(Math.random() * PATROL.length)];
  hunt.target.set(p[0] + (Math.random() - 0.5) * 8, 0, p[1] + (Math.random() - 0.5) * 8);
}
function startHunt(opts) {
  Object.assign(hunt, { active: true, time: opts.seconds || 150, total: opts.seconds || 150, stamina: 100, exhausted: false, running: false, whipCd: 0, state: 'wander', stun: 0, frenzy: false, tik: 1, flap: 0, bub: 0, sense: 12 });
  mng.position.set(0, 6, -60);
  mng.visible = true;
  pickPatrol();
  const sp = LOWER_SPOTS[Math.floor(Math.random() * LOWER_SPOTS.length)];
  lowerBody.position.set(sp[0], 0, sp[1]);
  lowerBody.rotation.y = Math.random() * 6;
  lowerBody.visible = true;
  $('#sv-danger-row').style.display = Game.hasItem('langis') ? '' : 'none';
}
function stopHunt() {
  hunt.active = false;
  mng.visible = false;
  lowerBody.visible = false;
  $('#redvignette').style.opacity = 0;
}
function endHunt(result) {
  if (!hunt.active) return;
  stopHunt();
  Game.surviveEnd(result);
}
function stunMng(sec) {
  hunt.state = 'stunned';
  hunt.stun = sec;
}
function whip() {
  if (!hunt.active || hunt.whipCd > 0 || !Game.hasItem('buntot')) return;
  hunt.whipCd = 6;
  whipAnim = 0.35;
  Sound.play('whip');
  if (distXZ(mng.position, player.position) < 5.5 && hunt.state !== 'stunned') {
    stunMng(4.5);
    Sound.play('shriek');
    showBark(I18N.t('whipHit'));
  }
}
function staminaTick(dt, running) {
  if (!hunt.active) return;
  if (running) {
    hunt.stamina -= 24 * dt;
    if (hunt.stamina <= 0) {
      hunt.stamina = 0;
      hunt.exhausted = true;
    }
  } else hunt.stamina = Math.min(100, hunt.stamina + 14 * dt);
  if (hunt.exhausted && hunt.stamina > 30) hunt.exhausted = false;
  hunt.running = running;
}
function updateHunt(dt, time, mode) {
  const f = Math.sin(time * 12);
  mng.userData.wl.rotation.y = 0.3 + f * 0.6;
  mng.userData.wr.rotation.y = -0.3 - f * 0.6;
  if (!hunt.active) return;
  if (mode !== 'explore') return; // naka-pause habang bukas ang menu
  const pz = player.position;
  const dx = pz.x - mng.position.x, dz = pz.z - mng.position.z, d = Math.hypot(dx, dz);
  hunt.time -= dt;
  hunt.whipCd = Math.max(0, hunt.whipCd - dt);
  if (hunt.time <= 30 && !hunt.frenzy) {
    hunt.frenzy = true;
    showBark(I18N.t('frenzy'));
    Sound.play('shriek');
  }
  if (hunt.time <= 0) {
    Sound.play('bell');
    return endHunt('bell');
  }
  const detect = hunt.running ? 34 : 20;
  let speed, tx = hunt.target.x, tz = hunt.target.z;
  if (hunt.state === 'stunned') {
    hunt.stun -= dt;
    speed = 8;
    tx = mng.position.x - dx;
    tz = mng.position.z - dz;
    if (hunt.stun <= 0) {
      hunt.state = 'wander';
      pickPatrol();
    }
  } else if (hunt.state === 'hunt') {
    tx = pz.x;
    tz = pz.z;
    speed = hunt.frenzy ? 6.6 : 5.6;
    if (d > 45) {
      hunt.state = 'wander';
      pickPatrol();
    }
  } else {
    speed = 4.5;
    // pana-panahon, naaamoy niya kung nasaan ka at doon siya maghahanap
    hunt.sense = (hunt.sense ?? 12) - dt;
    if (hunt.sense <= 0) {
      hunt.sense = hunt.frenzy ? 9 : 15;
      hunt.target.set(pz.x + (Math.random() - 0.5) * 16, 0, pz.z + (Math.random() - 0.5) * 16);
      Sound.play('shriek');
    }
    if (Math.hypot(hunt.target.x - mng.position.x, hunt.target.z - mng.position.z) < 2) pickPatrol();
    if (d < detect) {
      hunt.state = 'hunt';
      Sound.play('shriek');
    }
  }
  const mx = tx - mng.position.x, mz = tz - mng.position.z, ml = Math.hypot(mx, mz) || 1;
  mng.position.x += (mx / ml) * speed * dt;
  mng.position.z += (mz / ml) * speed * dt;
  const wantY = hunt.state === 'hunt' && d < 7 ? 1.7 : 5.5 + Math.sin(time * 1.5) * 0.6;
  mng.position.y = lerp(mng.position.y, wantY, Math.min(1, dt * 2.2));
  mng.rotation.y = Math.atan2(dx, dz);
  // nahuli ka?
  if (hunt.state === 'hunt' && d < 1.4 && mng.position.y < 2.7) {
    const saver = Game.useItem('bawang') ? 'bawang' : Game.useItem('rosaryo') ? 'rosaryo' : null;
    if (saver) {
      stunMng(6);
      Sound.play('shriek');
      showBark(I18N.t('savedBy', { item: I18N.L(STORY.items[saver].name) }));
    } else {
      // sugat: -34 HP, tapos lalayo muna siya
      if (Game.damage(34) <= 0) return endHunt('caught');
      stunMng(3);
      Sound.play('shriek');
      showBark(I18N.t('hit'));
    }
  }
  // tunog: tik-tik (malakas kapag malayo), pakpak kapag malapit, kulo ng langis
  hunt.tik -= dt;
  if (hunt.tik <= 0) {
    hunt.tik = 1 + Math.random() * 0.7;
    Sound.play('tiktik', { vol: Math.min(1, Math.max(0.05, d / 40)) });
  }
  hunt.flap -= dt;
  if (d < 14 && hunt.flap <= 0) {
    hunt.flap = 0.45;
    Sound.play('flap', { vol: 1 - d / 14 });
  }
  const danger = Math.max(0, Math.min(1, 1 - d / 35));
  hunt.bub -= dt;
  if (Game.hasItem('langis') && danger > 0.4 && hunt.bub <= 0) {
    hunt.bub = 1.2 - danger;
    Sound.play('bubble');
  }
  // HUD
  const mins = Math.min(59, Math.floor((1 - hunt.time / hunt.total) * 60));
  $('#sv-time').textContent = `11:${String(mins).padStart(2, '0')} PM`;
  $('#sv-stamina').style.width = hunt.stamina + '%';
  $('#sv-stamina').classList.toggle('low', hunt.exhausted);
  $('#sv-danger').style.width = danger * 100 + '%';
  $('#sv-oil').classList.toggle('boil', danger > 0.5);
  $('#redvignette').style.opacity = Math.max(0, 1 - d / 16) * 0.85;
  $('#sv-whip').textContent = !Game.hasItem('buntot') ? I18N.t('noWhip') : hunt.whipCd > 0 ? I18N.t('whipCd', { s: Math.ceil(hunt.whipCd) }) : I18N.t('whipReady');
  $('#sv-whip').classList.toggle('ready', Game.hasItem('buntot') && hunt.whipCd <= 0);
  const prot = (Game.hasItem('bawang') ? '🧄' : '') + (Game.hasItem('rosaryo') ? '📿' : '');
  $('#sv-prot').textContent = prot;
}

// ============================================================
//  MAPA — minimap sa sulok at buong mapa (M)
// ============================================================
const MAP_LABELS = [
  { x: 15, z: 0, en: 'Plaza', tl: 'Plaza' },
  { x: 15, z: -21, en: 'Church', tl: 'Simbahan' },
  { x: -28, z: 8, en: "Lola's House", tl: 'Bahay ni Lola' },
  { x: -40, z: -34, en: "Tonyo's Hut", tl: 'Kubo ni Tonyo' },
  { x: 0, z: -64, en: 'Balete Stump', tl: 'Tuod ng Balete' },
  { x: 7, z: 19, en: 'Sari-sari Store', tl: 'Sari-sari Store' },
  { x: -14, z: 36, en: 'Jeepney Stop', tl: 'Hintayan ng Jeep' },
  { x: 67, z: -2, en: 'Rice Fields', tl: 'Palayan' },
  { x: -50, z: -70, en: 'Forest', tl: 'Gubat' },
  { x: 29, z: 4, en: 'Stage', tl: 'Entablado' },
];
const MAP_B = { x0: -90, x1: 90, z0: -92, z1: 58 };
let bigMapOpen = false;
function drawMap(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let sx, ox, oz;
  if (opts.mini) {
    // nakasentro sa player, 90m ang lapad
    sx = W / 90;
    ox = player.position.x - 45;
    oz = player.position.z - (H / sx) / 2;
  } else {
    sx = Math.min(W / (MAP_B.x1 - MAP_B.x0), H / (MAP_B.z1 - MAP_B.z0));
    ox = MAP_B.x0 - (W / sx - (MAP_B.x1 - MAP_B.x0)) / 2;
    oz = MAP_B.z0 - (H / sx - (MAP_B.z1 - MAP_B.z0)) / 2;
  }
  const X = (x) => (x - ox) * sx, Z = (z) => (z - oz) * sx;
  const R = (x0, z0, x1, z1, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
  };
  ctx.fillStyle = '#3f6b2f';
  ctx.fillRect(0, 0, W, H);
  R(-90, -92, 90, -44, '#26421f'); // gubat
  R(46, -36, 88, 32, '#7cb342'); // palayan
  R(-95, 38, 95, 46, '#5f5a55'); // kalsada
  R(-2, -56, 2, 40, '#a08462'); // daan
  R(-26, 7, -2, 11, '#a08462');
  R(-40, -32, -36, -16, '#a08462');
  R(-38, -19.5, 2, -16.5, '#a08462');
  R(-1, -14, 31, 14, '#b8a88c'); // plaza
  ctx.fillStyle = '#6b5a47';
  ctx.beginPath();
  ctx.arc(X(0), Z(-64), 3.5 * sx, 0, Math.PI * 2);
  ctx.fill();
  for (const b of rects) R(b.x0, b.z0, b.x1, b.z1, '#c9a063');
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1;
  for (const b of rects) ctx.strokeRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * sx, (b.z1 - b.z0) * sx);
  if (!opts.mini) {
    ctx.font = `bold ${Math.max(16, Math.round(sx * 3.4))}px monospace`;
    ctx.textAlign = 'center';
    for (const l of MAP_LABELS) {
      const txt = I18N.lang === 'tl' ? l.tl : l.en;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillText(txt, X(l.x) + 1, Z(l.z) + 1);
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(txt, X(l.x), Z(l.z));
    }
  }
  // mga tao
  for (const n of Object.values(npcs)) {
    if (!n.visible || n.userData.id === 'tikbalang') continue;
    ctx.fillStyle = '#5fb3e0';
    ctx.beginPath();
    ctx.arc(X(n.position.x), Z(n.position.z), opts.mini ? 3 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // layunin
  const t = objectiveTarget();
  if (t) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(t.x), Z(t.z), opts.mini ? 6 : 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  // manananggal: lumalabas lang sa mapa kapag kumukulo ang langis
  if (hunt.active && Game.hasItem('langis') && distXZ(mng.position, player.position) < 30) {
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.arc(X(mng.position.x), Z(mng.position.z), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // player (arrow)
  ctx.save();
  ctx.translate(X(player.position.x), Z(player.position.z));
  ctx.rotate(-yaw);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
let mapTimer = 0;
function updateMaps(dt, mode) {
  mapTimer -= dt;
  if (mapTimer > 0) return;
  mapTimer = 0.1;
  const mini = $('#minimap');
  if (mini && (mode === 'explore' || mode === 'play' || mode === 'choice') && Game.state) drawMap(mini, { mini: true });
  if (bigMapOpen) drawMap($('#bigmap canvas'), { mini: false });
}
function toggleMap(force) {
  bigMapOpen = force ?? !bigMapOpen;
  const el = $('#bigmap');
  el.hidden = !bigMapOpen;
  if (bigMapOpen) {
    $('#bigmap-title').textContent = '🗺️ ' + I18N.t('map');
    $('#bigmap-hint').textContent = I18N.t('mapHint');
    drawMap($('#bigmap canvas'), { mini: false });
  }
}

// ============================================================
//  FIRST PERSON: flashlight at mga kamay
// ============================================================
const flash = new THREE.SpotLight(0xfff0d0, 0, 55, 0.55, 0.5, 1.1);
flash.position.set(0.25, -0.25, 0);
flash.target.position.set(0, -0.6, -6);
camera.add(flash, flash.target);
const viewModel = new THREE.Group();
camera.add(viewModel);
// kanang kamay: flashlight
const vmFlash = new THREE.Group();
vmFlash.position.set(0.32, -0.3, -0.55);
viewModel.add(vmFlash);
const vmFlashBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 8), mat(0x2b2b2b));
vmFlashBody.rotation.x = Math.PI / 2;
vmFlash.add(vmFlashBody);
const vmLens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), basic(0xfff6c8));
vmLens.position.z = -0.155;
vmFlash.add(vmLens);
const vmHandR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.16), mat(0xb07a52));
vmHandR.position.set(0, -0.03, 0.06);
vmFlash.add(vmHandR);
// kaliwang kamay: buntot pagi (lalabas kapag hawak mo ito sa habulan)
const vmWhip = new THREE.Group();
vmWhip.position.set(-0.34, -0.32, -0.6);
viewModel.add(vmWhip);
const vmHandL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.16), mat(0xb07a52));
vmWhip.add(vmHandL);
const vmTail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.9), mat(0x6d5b4b));
vmTail.position.set(0.02, 0.04, -0.45);
vmTail.rotation.x = 0.35;
vmWhip.add(vmTail);
viewModel.traverse((o) => {
  if (o.isMesh) {
    o.renderOrder = 10;
    o.castShadow = false;
  }
});
function updateViewModel(dt, time, speed, mode) {
  const fp = (camMode !== 'title' && mode !== 'title' && !cine.active) || cine.fp;
  viewModel.visible = fp && (mode === 'explore' || mode === 'modal' || cine.fp);
  const dark = cur.night > 0.35;
  flash.intensity = fp && dark ? 38 * cur.night : 0;
  vmFlash.visible = dark;
  vmWhip.visible = (hunt.active && Game.hasItem && Game.hasItem('buntot')) || (cine.fp && cine.whip);
  const sway = speed > 0.1 ? Math.sin(walkPhase) * 0.02 : Math.sin(time * 1.5) * 0.004;
  vmFlash.position.set(0.32 + sway, -0.3 + Math.abs(sway) * 0.6, -0.55);
  // hampas ng buntot pagi
  const w = Math.max(0, whipAnim / 0.35);
  vmWhip.rotation.set(-w * 1.6, w * 0.8, w * 0.6);
  vmWhip.position.x = -0.34 + w * 0.3;
}

// ============================================================
//  NAKAKATAKOT NA MGA PANGYAYARI
//  stalk: sa gabi, paminsan-minsang nakikita ang tikbalang sa malayo
//  flyover: lumilipad ang manananggal sa ibabaw ng mga bubong
// ============================================================
let stalk = false;
const ev = { stalkT: 25, stalkShow: 0, flyover: null, flyT: 0, flyActive: 0, flyFrom: new THREE.Vector3(), flyTo: new THREE.Vector3() };
function setEvents(e) {
  e = e || {};
  ev.flyover = e.flyover || null;
  ev.flyT = e.flyover ? e.flyover.after : 0;
  if (e.stalk != null) stalk = e.stalk;
}
function updateEvents(dt, time, mode) {
  const tk = npcs.tikbalang;
  // --- tikbalang na nakamasid mula sa malayo ---
  if (ev.stalkShow > 0) {
    ev.stalkShow -= dt;
    const d = distXZ(tk.position, player.position);
    const looking = inView(tk.position.x, tk.position.z, 0.2);
    if (ev.stalkShow <= 0 || d < 16 || (looking && ev.stalkShow < 2.2) || mode !== 'explore') {
      tk.visible = false;
      ev.stalkShow = 0;
    }
  } else if (stalk && mode === 'explore' && !hunt.active && !tk.visible && cur.night > 0.5) {
    ev.stalkT -= dt;
    if (ev.stalkT <= 0) {
      ev.stalkT = 28 + Math.random() * 25;
      // lumabas sa gilid ng paningin, 30m ang layo, malapit sa mga puno
      const side = Math.random() < 0.5 ? -1 : 1;
      const a = yaw + side * (0.35 + Math.random() * 0.3);
      const px = player.position.x - Math.sin(a) * 32, pz = player.position.z - Math.cos(a) * 32;
      tk.position.set(px, 0, pz);
      tk.rotation.y = Math.atan2(player.position.x - px, player.position.z - pz);
      tk.visible = true;
      ev.stalkShow = 3.2;
      Sound.play('breath', { vol: 0.35 });
    }
  }
  // --- manananggal na lumilipad sa itaas ---
  if (ev.flyover && mode === 'explore' && !hunt.active) {
    ev.flyT -= dt;
    if (ev.flyT <= 0 && !ev.flyActive) {
      ev.flyActive = 4.5;
      const a = yaw + Math.PI / 2;
      ev.flyFrom.set(player.position.x + Math.sin(a) * 40 - Math.sin(yaw) * 18, 14, player.position.z + Math.cos(a) * 40 - Math.cos(yaw) * 18);
      ev.flyTo.set(player.position.x - Math.sin(a) * 40 - Math.sin(yaw) * 18, 11, player.position.z - Math.cos(a) * 40 - Math.cos(yaw) * 18);
      mng.visible = true;
      Sound.play('shriek');
      showBark(Game.fmt ? Game.fmt(ev.flyover.text) : '');
      ev.flyover = null;
    }
  }
  if (ev.flyActive > 0) {
    ev.flyActive -= dt;
    const k = 1 - ev.flyActive / 4.5;
    mng.position.lerpVectors(ev.flyFrom, ev.flyTo, k);
    mng.rotation.y = Math.atan2(ev.flyTo.x - ev.flyFrom.x, ev.flyTo.z - ev.flyFrom.z);
    if (ev.flyActive <= 1.5 && ev.flyActive + dt > 1.5) Sound.play('flap', { vol: 0.8 });
    if (ev.flyActive <= 0 && !hunt.active) mng.visible = false;
  }
}

// ============================================================
//  API PARA SA ENGINE
// ============================================================
function placeAt(obj, name) {
  const a = ANCH[name];
  if (!a) return false;
  obj.position.set(a[0], 0, a[1]);
  return true;
}
function teleport(name) {
  const a = ANCH[name];
  if (!a) return;
  player.position.set(a[0], 0, a[1]);
  if (a[2] != null) {
    player.rotation.y = a[2];
    yaw = a[2] + Math.PI;
  }
  pitch = 0;
  camPos.set(player.position.x, 1.62, player.position.z);
  const f = $('#fade');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}
function setFire(on) {
  fireGroup.visible = on;
  kubo.roof.material = mat(on ? 0x2a1c10 : 0x9c7c4a);
}

window.World = {
  setup(ws, opts = {}) {
    camMode = 'play';
    player.visible = false;
    stalk = !!ws.stalk;
    setTime(ws.time || 'day', !!opts.resume);
    const place = ws.place || {};
    for (const [id, n] of Object.entries(npcs)) n.visible = !!place[id] && placeAt(n, place[id]);
    crowd.visible = !!ws.crowd;
    villagers.visible = !!ws.villagers;
    setFire(!!ws.fire);
    sapling.visible = !!ws.sapling;
    if (opts.teleport) teleport(opts.teleport);
    else if (opts.resume) {
      // galing sa save: ilagay ang player malapit sa kausap, o sa plaza
      const near = opts.at ? null : Object.values(npcs).find((n) => n.visible);
      if (near) {
        teleport('plaza_center');
        player.position.set(near.position.x, 0, near.position.z + 3);
        collide(player.position);
      } else teleport(opts.at === 'loc:plaza' ? 'start' : 'plaza_center');
    }
  },
  setObjective(at, ws) {
    objective = at;
    walkScare = ws || null;
    walkScareFired = false;
    arrivedGuard = false;
    focusId = null;
    if (!at) $('#objective-dist').textContent = '';
  },
  onLine(line, chars) {
    const who = line.who;
    if (who && who !== 'you' && npcs[who] && npcs[who].visible) focusId = who;
    else if (!focusId || !npcs[focusId] || !npcs[focusId].visible) {
      focusId = (chars || []).find((c) => npcs[c] && npcs[c].visible) || null;
    }
  },
  // Jumpscare: biglang lilitaw ang tikbalang sa harap mismo ng camera
  scare() {
    const n = npcs.tikbalang;
    if (scareHold <= 0) scareRestore = { v: n.visible, p: n.position.clone(), r: n.rotation.y };
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.y = 0;
    f.normalize();
    const y = camera.position.y - n.userData.headY * n.scale.y + 0.1;
    scareRestore.y = y;
    n.position.set(camera.position.x + f.x * 1.9, y, camera.position.z + f.z * 1.9);
    n.rotation.y = Math.atan2(-f.x, -f.z);
    n.visible = true;
    scareHold = 1.0;
  },
  bark: (text) => showBark(text),
  // Para sa pag-test: World.teleportTo('balete_front') sa browser console
  teleportTo: teleport,
  playerPos: () => ({ x: +player.position.x.toFixed(2), z: +player.position.z.toFixed(2) }),
  startHunt,
  stopHunt,
  cine: {
    begin() {
      cine.active = true;
      camMode = 'cine';
      player.visible = false;
      stalk = false;
      setEvents({ stalk: false });
    },
    cam(p, l, fov) {
      cine.pos.set(p[0], p[1], p[2]);
      cine.look.set(l[0], l[1], l[2]);
      if (fov) cine.fov = fov;
    },
    fp(on, whipOn) {
      cine.fp = !!on;
      cine.whip = !!whipOn;
    },
    swing() {
      whipAnim = 0.35;
    },
    time(name) {
      setTime(name, true);
    },
    // { lola: 'shed_lola' } o { tikbalang: [x, z, rotY] }
    place(map) {
      for (const [id, n] of Object.entries(npcs)) {
        const a = map[id];
        if (!a) {
          n.visible = false;
          continue;
        }
        n.visible = true;
        if (typeof a === 'string') placeAt(n, a);
        else {
          n.position.set(a[0], a[3] || 0, a[1]);
          if (a[2] != null) n.rotation.y = a[2];
        }
      }
    },
    world(o) {
      crowd.visible = !!o.crowd;
      villagers.visible = !!o.villagers;
      setFire(!!o.fire);
    },
    mng(visible, p, ry) {
      mng.visible = !!visible;
      if (p) mng.position.set(p[0], p[1], p[2]);
      if (ry != null) mng.rotation.y = ry;
    },
    onFrame(fn) {
      cine.onFrame = fn;
    },
    // ilaw para sa cinematic shot (hal. malamig na liwanag ng buwan sa tikbalang)
    light(p, intensity, color) {
      if (!cine.light) {
        cine.light = new THREE.PointLight(0x9fb4ff, 0, 40, 1.1);
        scene.add(cine.light);
      }
      if (p) cine.light.position.set(p[0], p[1], p[2]);
      cine.light.intensity = intensity || 0;
      if (color) cine.light.color.set(color);
    },
    canvas: renderer.domElement,
  },
  lockMouse,
  releaseMouse,
  setEvents,
  // para sa pag-test lamang
  _dbg: () => ({ hunt, mng: mng.position, lower: lowerBody.position, player: player.position }),
  toggleMap: () => toggleMap(),
  titleMode() {
    stopHunt();
    toggleMap(false);
    setEvents({ stalk: false });
    stalk = false;
    releaseMouse();
    camMode = 'title';
    objective = null;
    setTime('night', true);
    for (const n of Object.values(npcs)) n.visible = false;
    crowd.visible = false;
    villagers.visible = true;
    setFire(false);
    player.visible = false;
  },
};

// ============================================================
//  SIMULAN
// ============================================================
buildGround();
buildChurch();
buildHouse(-28, 8, 8, 7, 0x8a5a33, 0x6b4a2e, { stilts: true, h: 3, roofH: 3, ry: Math.PI / 2 });
buildHouse(-6, -16, 6, 6, 0xd9c7a0, 0x7a4a3a);
buildHouse(34, -18, 6, 6, 0xa7c4a0, 0x7a4a3a);
buildHouse(38, 17, 6, 6, 0xe0b0a0, 0x6b4a2e);
buildHouse(24, 22, 6, 6, 0xc0c8e0, 0x7a4a3a);
const store = buildHouse(7, 19, 6, 5, 0xf1d27a, 0x7a4a3a);
buildSign(store.group, 'SARI-SARI STORE', '#1e5aa8', '#ffffff', 4.8, 0.8, 0, 3.4, 2.56);
buildStage();
buildBanderitas();
buildLamps();
buildJeepney();
buildShed();
for (const [x, z, h] of [[-40, 30, 9], [-30, 48, 8], [22, 48, 10], [36, 30, 8], [-8, 26, 7], [48, 44, 9], [62, 48, 8], [-52, 14, 9], [-58, -8, 8], [42, -30, 7], [30, 34, 9], [-22, 26, 8], [-64, 34, 10], [72, 40, 7], [-4, 50, 9], [-48, 46, 8]]) buildCoconut(x, z, h);
buildRice();
buildForest();
buildBalete();
buildKubo();
buildScenery();
buildSky();
buildNPCs();
buildCrowds();
buildPlayer();
buildManananggal();
mng.userData.dynamic = true;
lowerBody.userData.dynamic = true;
teleport('start');

// ============================================================
//  MGA GILID (outline) — itim na linya sa bawat gilid ng modelo
// ============================================================
function addEdges() {
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x140c08, transparent: true, opacity: 0.9 });
  const cache = new Map();
  const edgesFor = (geo) => {
    if (!cache.has(geo.uuid)) cache.set(geo.uuid, new THREE.EdgesGeometry(geo, 28));
    return cache.get(geo.uuid);
  };
  const meshes = [], instanced = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.noEdge || o.material.isMeshBasicMaterial || o.material.isShaderMaterial) return;
    if (o.material.fog === false) return; // malalayong bundok
    (o.isInstancedMesh ? instanced : meshes).push(o);
  });
  const isDynamic = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true;
    return false;
  };
  // Mga gumagalaw (tauhan): sariling linya bawat bahagi.
  // Mga hindi gumagalaw (bahay, puno...): pagsamahin sa iisang linya para mabilis.
  const mtx = new THREE.Matrix4(), v = new THREE.Vector3();
  const staticPts = [];
  scene.updateMatrixWorld(true);
  for (const m of meshes) {
    if (isDynamic(m)) {
      const l = new THREE.LineSegments(edgesFor(m.geometry), edgeMat);
      l.raycast = () => {};
      m.add(l);
    } else {
      const src = edgesFor(m.geometry).attributes.position;
      for (let j = 0; j < src.count; j++) {
        v.fromBufferAttribute(src, j).applyMatrix4(m.matrixWorld);
        staticPts.push(v.x, v.y, v.z);
      }
    }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(staticPts, 3));
  scene.add(new THREE.LineSegments(sg, edgeMat));
  // Instanced (puno, palay, banderitas): pagsamahin din ang lahat ng gilid
  for (const inst of instanced) {
    const src = edgesFor(inst.geometry).attributes.position;
    const out = new Float32Array(src.count * 3 * inst.count);
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, mtx);
      for (let j = 0; j < src.count; j++) {
        v.fromBufferAttribute(src, j).applyMatrix4(mtx);
        out.set([v.x, v.y, v.z], (i * src.count + j) * 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(out, 3));
    scene.add(new THREE.LineSegments(g, edgeMat));
  }
}

// Langit na may gradient (mula sa itaas pababa sa abot-tanaw)
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(500, 24, 12),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }',
  })
);
skyDome.renderOrder = -1;
skyDome.userData.noEdge = true;
scene.add(skyDome);

addEdges();
World.titleMode();
stepTime(1);

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt, now / 1000);
  renderer.render(scene, camera);
  if (cine.onFrame) cine.onFrame(dt, renderer.domElement);
});
