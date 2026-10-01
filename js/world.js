// ============================================================
//  WORLD — ang 3D na Barrio San Isidro (Three.js, low-poly).
//  WASD = lakad, Shift = takbo, E = kausap, drag = ikot ng camera.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const gltfManager = new THREE.LoadingManager();
gltfManager.setURLModifier((u) => u.replace(/\/Models\/gltf\/1k\/([^/]+)\/textures\//, '/Models/jpg/1k/$1/'));
const gltfLoader = new GLTFLoader(gltfManager);

// Graphics quality: 'high' (bloom, soft shadows) o 'low'
let GFX = 'high';
try { GFX = localStorage.getItem('sanisidro.gfx') || 'high'; } catch (e) {}

const host = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: document.body.classList.contains('trailer') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, GFX === 'high' ? 1.5 : 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = GFX === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
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
sun.shadow.mapSize.set(GFX === 'high' ? 2048 : 1024, GFX === 'high' ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 260 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

// ---------------- Helpers ----------------
// PBR na materyales + "grime" shader: dumi, mantsa, at AO sa may lupa para hindi plastik ang itsura
const shaderTime = { value: 0 };
// ---- Mga totoong litratong texture (Poly Haven, CC0) na nakalapat sa world-space (triplanar) ----
const PH = (slug) => `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${slug}/${slug}_diff_1k.jpg`;
const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');
const WHITE_TEX = (() => {
  const t = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();
const texCache = new Map();
function photoTex(slug) {
  if (!texCache.has(slug)) {
    const u = { value: WHITE_TEX };
    texCache.set(slug, u);
    texLoader.load(PH(slug), (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      u.value = t;
    }, undefined, () => console.warn('texture failed', slug));
  }
  return texCache.get(slug);
}
// Lahat ng materyales: dumi/mantsa, AO sa may lupa, at (kung may tex) litratong texture + relief
const allSurfaceMats = [];
function addGrime(m, o = {}) {
  const strength = o.grime ?? 1;
  const tex = o.tex ? photoTex(o.tex) : null;
  const scale = { value: o.scale ?? 0.4 };
  const bump = { value: o.bump ?? 1.0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shaderTime;
    if (tex) {
      sh.uniforms.uTex = tex;
      sh.uniforms.uTexScale = scale;
      sh.uniforms.uBump = bump;
    }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${o.wind ? `{ vec4 wp0 = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp0 = instanceMatrix * wp0;
#endif
  wp0 = modelMatrix * wp0;
  float sway = sin(uTime * 1.7 + wp0.x * 0.35 + wp0.z * 0.27) * 0.5 + sin(uTime * 3.1 + wp0.x) * 0.15;
  float hgt = max(0.0, position.y + ${(o.windBase ?? 0.3).toFixed(2)});
  transformed.x += sway * hgt * ${(o.windAmt ?? 0.45).toFixed(2)}; transformed.z += sway * hgt * ${((o.windAmt ?? 0.45) * 0.5).toFixed(2)}; }` : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
{ vec4 wp = vec4(transformed, 1.0);
  vec3 wn = objectNormal;
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  wn = mat3(instanceMatrix) * wn;
#endif
  vWPos = (modelMatrix * wp).xyz;
  vWNrm = normalize(mat3(modelMatrix) * wn); }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying vec3 vWNrm;
${tex ? 'uniform sampler2D uTex; uniform float uTexScale; uniform float uBump;' : ''}
float gH(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float gN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(gH(i), gH(i+vec3(1,0,0)), f.x), mix(gH(i+vec3(0,1,0)), gH(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(gH(i+vec3(0,0,1)), gH(i+vec3(1,0,1)), f.x), mix(gH(i+vec3(0,1,1)), gH(i+vec3(1,1,1)), f.x), f.y), f.z); }
vec3 gPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surf_pos)), sy = normalize(dFdy(surf_pos));
  vec3 r1 = cross(sy, surf_norm), r2 = cross(surf_norm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surf_norm - grad);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float gHgt = 0.5;
${tex ? `{ vec3 bw = pow(abs(vWNrm), vec3(4.0)); bw /= max(1e-4, dot(bw, vec3(1.0)));
  vec3 P = vWPos * uTexScale;
  // dalawang sukat para hindi halata ang pag-ulit ng texture
  vec4 tA = texture2D(uTex, P.zy) * bw.x + texture2D(uTex, P.xz) * bw.y + texture2D(uTex, P.xy) * bw.z;
  vec3 Q = vWPos * uTexScale * 0.27 + 0.37;
  vec4 tB = texture2D(uTex, Q.zy) * bw.x + texture2D(uTex, Q.xz) * bw.y + texture2D(uTex, Q.xy) * bw.z;
  float mixv = smoothstep(0.3, 0.7, gN(vWPos * 0.09));
  vec4 tc = mix(tA, tB, mixv * 0.45);
  diffuseColor.rgb *= tc.rgb * 1.6;
  gHgt = dot(tc.rgb, vec3(0.333)); }` : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float n = gN(vWPos * 1.7) * 0.5 + gN(vWPos * 6.3) * 0.3 + gN(vWPos * 21.0) * 0.2;
  float grime = mix(0.74, 1.1, n);
  float ao = smoothstep(0.0, 1.1, vWPos.y) * 0.4 + 0.6;
  float streak = smoothstep(0.55, 0.9, gN(vec3(vWPos.x * 3.0, vWPos.y * 0.25, vWPos.z * 3.0)));
  diffuseColor.rgb *= mix(1.0, grime * ao * (1.0 - streak * 0.25), ${strength.toFixed(2)}); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (gN(vWPos * 4.0) - 0.5) * 0.25 + (0.5 - gHgt) * 0.3, 0.05, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
${tex ? '{ float hh = gHgt * uBump * 0.06; normal = gPerturb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)) * 1.0, faceDirection); }' : ''}`);
  };
  m.customProgramCacheKey = () => 'grime' + strength + (o.wind ? 'w' + (o.windAmt ?? '') : '') + (tex ? 't' : '');
  allSurfaceMats.push(m);
  return m;
}
// Kulay → litratong texture (para sa mga lumang tawag na mat(color))
const TEXMAP = {
  0x5d8a3a: { tex: 'leafy_grass', scale: 0.32, color: 0xa8b090 },
  0x6f6a64: { tex: 'asphalt_02', scale: 0.22, color: 0x8a8a8a },
  0xa08462: { tex: 'stony_dirt_path', scale: 0.3, color: 0xb0a090 },
  0xb8a88c: { tex: 'cobblestone_floor_01', scale: 0.4, color: 0xa8a49a },
  0xe6d5b8: { tex: 'coral_stone_wall', scale: 0.3, color: 0xcfc4b0 },
  0xc4ae8a: { tex: 'coral_fort_wall_01', scale: 0.4, color: 0xb0a088 },
  0x8a4a3a: { tex: 'clay_roof_tiles_02', scale: 0.45, color: 0xa07060 },
  0xb89660: { tex: 'bamboo_wall', scale: 0.45, color: 0xb0a080 },
  0x9c7c4a: { tex: 'thatch_roof_angled', scale: 0.35, color: 0xa09070 },
  0x5b4020: { tex: 'rough_wood', scale: 0.6, color: 0x8a7a68 },
  0x6b4a2a: { tex: 'weathered_planks', scale: 0.5, color: 0x8a7a68 },
  0x7a5230: { tex: 'wood_planks', scale: 0.5, color: 0x9a8070 },
  0x9b6b3f: { tex: 'wood_planks', scale: 0.5, color: 0xa88a70 },
  0x5a3a20: { tex: 'rough_wood', scale: 0.6, color: 0x7a6a58 },
  0x6b4a2e: { tex: 'rough_wood', scale: 0.6, color: 0x8a7a68 },
  0x8a6d3b: { tex: 'weathered_planks', scale: 0.6, color: 0x9a8a70 },
  0x4a2e17: { tex: 'dark_wooden_planks', scale: 0.6, color: 0x8a7a70 },
  0x4a3218: { tex: 'dark_wooden_planks', scale: 0.6, color: 0x8a7a70 },
  0x3b2a1a: { tex: 'dark_wooden_planks', scale: 0.6, color: 0x6a5a50 },
  0x3d2f22: { tex: 'bark_willow', scale: 0.5, color: 0x7a7068 },
  0x2e231a: { tex: 'bark_willow', scale: 0.6, color: 0x6a6058 },
  0x8b7355: { tex: 'rough_wood', scale: 0.4, color: 0xa09080 },
  0xa08566: { tex: 'rough_wood', scale: 0.6, color: 0xb0a090 },
  0x8a7350: { tex: 'brown_mud_dry', scale: 0.4, color: 0x9a8a78 },
  0x7cb342: { tex: 'brown_mud_leaves_01', scale: 0.25, color: 0x6a8a50 },
  0x4a4a52: { tex: 'brown_mud', scale: 0.8, color: 0x606068 },
};
// Metal (jeepney na stainless, poste)
const METALS = { 0xdfe3e8: 0.25, 0xcfd4da: 0.3, 0xbdc3c7: 0.2, 0x95a5a6: 0.35, 0x2b2b2b: 0.55, 0xd4af37: 0.3, 0xb8860b: 0.35 };
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + (o.wind ? 'w' : '') + (o.rough ?? '') + (o.grime ?? '') + (o.tex ?? '');
  if (!matCache.has(key)) {
    const plain = !Object.keys(o).length;
    const T = o.tex ? o : plain ? TEXMAP[color] : null;
    let m;
    if (plain && METALS[color] != null) {
      m = addGrime(new THREE.MeshStandardMaterial({ color, roughness: METALS[color], metalness: 0.85 }), { grime: 0.35 });
    } else {
      m = addGrime(new THREE.MeshStandardMaterial({ color: T && T.color != null ? T.color : color, roughness: o.rough ?? 0.88, metalness: 0, side: o.wind ? THREE.DoubleSide : THREE.FrontSide }), Object.assign({}, o, T ? { tex: T.tex, scale: T.scale } : {}));
    }
    matCache.set(key, m);
  }
  return matCache.get(key);
}
// Textured na materyal na may sariling tint (hal. pader ng bahay na pininturahan)
function texMat(tex, color = 0xffffff, scale = 0.4, rough = 0.9) {
  return mat(color, { tex, scale, rough, color });
}
// Balat: medyo makinis, may "subsurface" na pula sa gilid
const skinCache = new Map();
function skinMat(color) {
  if (!skinCache.has(color)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float rim = 1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += vec3(0.35, 0.08, 0.05) * pow(rim, 3.0) * diffuseColor.rgb; }`);
    };
    skinCache.set(color, m);
  }
  return skinCache.get(color);
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
  const m = addGrime(new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 0, roughness: 0.7 }), { grime: 0.5 });
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
  for (let i = 0; i < (GFX === 'high' ? 2600 : 900); i++) {
    const x = -90 + R() * 180, z = -90 + R() * 150;
    if (Math.abs(z - 42) < 5 || (x > -2 && x < 32 && z > -15 && z < 15) || Math.abs(x) < 2.5) continue;
    tufts.push([x, z, 0.5 + R() * 0.6, R() * 3]);
  }
  const tg = mergeGeometries([0, 1, 2].map((k) => new THREE.PlaneGeometry(0.9, 0.6).rotateY((k * Math.PI) / 3)));
  { const nn = tg.attributes.normal; for (let k = 0; k < nn.count; k++) nn.setXYZ(k, 0, 1, 0); }
  const ti = new THREE.InstancedMesh(tg, grassMat, tufts.length);
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
  // pader: kawayan (kubo), tabla (bahay-kahoy), o pinturang plaster
  const wallM = TEXMAP[wallC] ? mat(wallC) : wallC === 0x8a5a33 ? texMat('weathered_brown_planks', 0xb09a88, 0.5) : texMat('white_plaster_rough_01', wallC, 0.35);
  box(g, w, h, d, 0, 0, lift + h / 2, 0, { material: wallM });
  // bubong: nipa (kubo) o kalawanging yero
  const roofM = roofC === 0x9c7c4a ? mat(roofC) : texMat('rusty_corrugated_iron', roofC === 0x6b4a2e ? 0xb0a090 : 0xc09080, 0.5, 0.6);
  const roof = mesh(g, new THREE.ConeGeometry(Math.max(w, d) * 0.82, opts.roofH || 2.6, 4), roofM, 0, lift + h + (opts.roofH || 2.6) / 2, 0);
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
  const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0xd8d8d8].map((c) => new THREE.Color(c).multiplyScalar(0.55));
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

// Jeepney: makintab na stainless, makukulay na pintura sa gilid, kabayong chrome sa hood,
// upuang magkaharap sa loob, at bukas na pasukan sa likod
let jeep = null;
const jeepWheels = [];
function jeepSideTex(flip) {
  return canvasTex(1024, 256, (x, W, H) => {
    // stainless na may guhit
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dfe4ea');
    g.addColorStop(0.5, '#b8c0c8');
    g.addColorStop(1, '#8a929a');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const stripes = ['#c0392b', '#f1c40f', '#1e5aa8', '#27ae60', '#e67e22'];
    stripes.forEach((c, i) => {
      x.fillStyle = c;
      x.fillRect(0, H * 0.62 + i * 9, W, 6);
    });
    // mga apoy at bituin
    for (let i = 0; i < 14; i++) {
      x.fillStyle = stripes[i % 5];
      x.beginPath();
      const bx = 40 + i * 70;
      x.moveTo(bx, H * 0.6);
      x.quadraticCurveTo(bx + 25, H * 0.45, bx + 12, H * 0.32);
      x.quadraticCurveTo(bx + 40, H * 0.45, bx + 50, H * 0.6);
      x.fill();
    }
    x.font = 'bold 54px Impact, Arial Black, sans-serif';
    x.textAlign = 'center';
    x.lineWidth = 6;
    x.strokeStyle = '#1a1a1a';
    x.fillStyle = '#c0392b';
    x.strokeText('SAN ISIDRO', W / 2, 70);
    x.fillText('SAN ISIDRO', W / 2, 70);
    x.font = 'italic bold 30px Georgia, serif';
    x.fillStyle = '#1e3a8a';
    x.fillText('God Bless Our Trip', W / 2, H - 20);
    // kalawang at dumi
    const R = rng(flip ? 2 : 1);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(${90 + R() * 60},${50 + R() * 30},20,${R() * 0.25})`;
      x.fillRect(R() * W, R() * H, 2 + R() * 10, 1 + R() * 6);
    }
  });
}
function buildJeepney() {
  const g = new THREE.Group();
  g.position.set(8, 0, 40);
  scene.add(g);
  jeep = g;
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.22, metalness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa8231c, roughness: 0.4, metalness: 0.3 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x5a1612, roughness: 0.55 });
  const sideA = new THREE.MeshStandardMaterial({ map: jeepSideTex(false), roughness: 0.3, metalness: 0.55 });
  const sideB = new THREE.MeshStandardMaterial({ map: jeepSideTex(true), roughness: 0.3, metalness: 0.55 });
  const B = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    return b;
  };
  // likurang kaha (kung saan nakaupo ang pasahero)
  B(5.2, 0.12, 2.3, dark, -1.2, 0.95, 0); // sahig
  const sA = B(5.2, 0.85, 0.06, sideA, -1.2, 1.45, 1.15);
  const sB = B(5.2, 0.85, 0.06, sideB, -1.2, 1.45, -1.15);
  sB.rotation.y = Math.PI;
  B(5.4, 0.08, 2.5, steel, -1.2, 2.55, 0); // bubong
  B(5.5, 0.18, 2.55, red, -1.2, 2.66, 0); // gilid ng bubong
  for (const z of [-1.1, 1.1]) for (let i = 0; i < 6; i++) B(0.06, 0.65, 0.06, chrome, -3.6 + i * 0.95, 2.18, z); // mga haligi ng bintana
  for (const z of [-1.27, 1.27]) B(5.6, 0.04, 0.04, chrome, -1.2, 2.82, z); // rack sa bubong
  // mga upuang magkaharap
  for (const z of [-0.78, 0.78]) {
    B(4.6, 0.1, 0.5, seat, -1.4, 1.38, z);
    B(4.6, 0.45, 0.08, seat, -1.4, 1.72, z * 1.3);
  }
  B(4.8, 0.03, 0.03, chrome, -1.4, 2.35, 0); // hawakan sa kisame
  // likurang pasukan at tuntungan
  B(0.06, 1.45, 0.4, steel, -3.82, 1.7, 0.95);
  B(0.06, 1.45, 0.4, steel, -3.82, 1.7, -0.95);
  B(0.5, 0.06, 1.2, chrome, -4.05, 0.62, 0);
  // harap: hood, ihawan, ilaw, salamin
  B(1.9, 0.75, 2.1, steel, 2.35, 1.2, 0);
  B(0.08, 0.6, 1.6, chrome, 3.32, 1.15, 0);
  for (let i = 0; i < 7; i++) B(0.1, 0.5, 0.04, dark, 3.34, 1.15, -0.6 + i * 0.2);
  for (const z of [-0.85, 0.85]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), hot(3, 2.8, 2.2));
    hl.rotation.z = Math.PI / 2;
    hl.position.set(3.36, 1.25, z);
    g.add(hl);
  }
  const ws = B(0.06, 0.7, 2.0, glass, 1.3, 2.0, 0);
  ws.rotation.z = -0.15;
  B(1.2, 0.08, 2.3, steel, 1.75, 2.42, 0); // bubong ng drayber
  // mga kabayong chrome sa hood
  for (const z of [-0.5, 0.5]) {
    const h = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 8), chrome);
    body.rotation.z = Math.PI / 2;
    h.add(body);
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 4, 8), chrome);
    neck.position.set(0.13, 0.1, 0);
    neck.rotation.z = -0.6;
    h.add(neck);
    const hd = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 8), chrome);
    hd.position.set(0.21, 0.17, 0);
    hd.rotation.z = Math.PI / 2 - 0.4;
    h.add(hd);
    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), chrome);
      leg.position.set(lx, -0.1, 0);
      leg.rotation.z = lx > 0 ? 0.6 : -0.3;
      h.add(leg);
    }
    h.position.set(2.9, 1.72, z);
    g.add(h);
  }
  // mga gulong
  const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
  for (const [x, z] of [[-2.6, 1.2], [-2.6, -1.2], [2.4, 1.2], [2.4, -1.2]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.48, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.32, 24), tire);
    t.rotation.x = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 16), chrome);
    hub.rotation.x = Math.PI / 2;
    w.add(t, hub);
    w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(w);
    jeepWheels.push(w);
  }
  buildSign(g, 'SAN ISIDRO', '#c0392b', '#f1c40f', 2.0, 0.3, 3.0, 2.3, 0, Math.PI / 2);
  addRect(4.5, 38.6, 13.9, 41.4);
}

// ---------------- INTRO: sakay ng jeep → bumaba → nakita si Lola ----------------
const intro = { active: false, t: 0, done: null, cap: null };
const INTRO_T = { drive: 9, stop: 10.4, step: 13.6 };
const INTRO_START = [-66, 40]; // mula sa kanluran ng kalsada, dumaraan sa mga bahay
function startIntro(done, onCaption) {
  intro.active = true;
  intro.t = 0;
  intro.done = done;
  intro.cap = onCaption || null;
  intro.said = {};
  cine.active = true;
  cine.fp = false;
  camMode = 'cine';
  player.visible = false;
  setTime('day', true);
  jeep.position.set(INTRO_START[0], 0, INTRO_START[1]);
  if (window.Sound && Sound.jeep) Sound.jeep(true);
}
function finishIntro() {
  if (!intro.active) return;
  intro.active = false;
  jeep.position.set(8, 0, 40);
  if (window.Sound && Sound.jeep) Sound.jeep(false);
  cine.active = false;
  camMode = 'play';
  const cb = intro.done;
  intro.done = null;
  if (cb) cb();
}
const _iv = new THREE.Vector3(), _il = new THREE.Vector3();
function jeepLocal(x, y, z, out) {
  return out.set(x, y, z).applyMatrix4(jeep.matrixWorld);
}
function updateIntro(dt) {
  if (!intro.active) return;
  const prevX = jeep.position.x;
  intro.t += dt;
  const t = intro.t, T = INTRO_T;
  const k = Math.min(1, t / T.drive);
  const ease = 1 - Math.pow(1 - k, 2.4);
  jeep.position.x = lerp(INTRO_START[0], 8, ease);
  jeep.position.y = t < T.drive ? Math.abs(Math.sin(t * 9)) * 0.025 * (1 - k) + Math.sin(t * 23) * 0.006 : 0;
  jeep.rotation.z = t < T.drive ? Math.sin(t * 2.7) * 0.008 : 0;
  jeep.updateMatrixWorld(true);
  const sp = (jeep.position.x - prevX) / Math.max(dt, 1e-3);
  for (const w of jeepWheels) w.rotation.z -= (sp * dt) / 0.48;
  const say = (key, at, text) => { if (t >= at && !intro.said[key]) { intro.said[key] = true; if (intro.cap) intro.cap(key); } };
  say('c1', 0.6);
  say('c2', 4.2);
  say('para', 7.4);
  say('stop', T.drive);
  if (t >= T.drive && intro.said.stop && !intro.said.engineOff) { intro.said.engineOff = true; if (window.Sound && Sound.jeep) Sound.jeep(false); }
  if (t < T.stop) {
    // nakaupo sa likod ng jeep, nakatingin palabas sa likurang pasukan
    const vib = t < T.drive ? Math.sin(t * 31) * 0.008 + Math.sin(t * 13) * 0.01 : 0;
    jeepLocal(-1.5, 1.95 + vib, -0.62, cine.pos);
    jeepLocal(-7, 1.65, 0.35, cine.look);
    cine.fov = 62;
  } else {
    // bumaba sa likod at lumingon kay Lola
    const s = THREE.MathUtils.smoothstep(t, T.stop, T.step);
    const p0 = jeepLocal(-1.5, 1.95, -0.62, new THREE.Vector3());
    const p1 = jeepLocal(-3.9, 1.95, 0, new THREE.Vector3());
    const p2 = jeepLocal(-4.7, 1.62, -0.6, new THREE.Vector3());
    const p3 = new THREE.Vector3(2, 1.62, 36);
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    curve.getPoint(s, cine.pos);
    cine.pos.y += Math.abs(Math.sin(s * Math.PI * 5)) * 0.04 * (1 - s); // mga hakbang
    const lookOut = jeepLocal(-8, 1.6, 0, new THREE.Vector3());
    const lola = new THREE.Vector3(-12, 1.55, 33.5);
    cine.look.copy(lookOut).lerp(lola, THREE.MathUtils.smoothstep(s, 0.35, 0.95));
    cine.fov = lerp(62, 72, s);
    if (t >= T.step) finishIntro();
  }
}

function buildShed() {
  const g = new THREE.Group();
  g.position.set(-14, 0, 36);
  scene.add(g);
  for (const [x, z] of [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]]) box(g, 0.2, 2.6, 0.2, 0x6b4a2e, x, 1.3, z);
  box(g, 5, 0.25, 3.2, 0, 0, 2.7, 0, { material: texMat('corrugated_iron_02', 0xc0392b, 0.6, 0.5) });
  box(g, 3.6, 0.15, 0.8, 0x8a6d3b, 0, 0.6, -0.8);
  addRect(-16.2, 34.6, -11.8, 35.4);
}

// ============================================================
//  HALAMAN — mga dahon na pininturahan sa canvas (alpha cards),
//  niyog, saging, damo, at totoong 3D na pako at palumpong (Poly Haven)
// ============================================================
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const leafClusterTex = canvasTex(512, 512, (x, W, H) => {
  const R = rng(11);
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 210;
    const cx = W / 2 + Math.cos(a) * d, cy = H / 2 + Math.sin(a) * d * 0.9;
    const len = 26 + R() * 26, wid = 9 + R() * 9, rot = a + (R() - 0.5) * 1.2;
    const l = 14 + R() * 22, hue = 88 + R() * 34;
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    const g = x.createLinearGradient(0, -wid, 0, wid);
    g.addColorStop(0, `hsl(${hue},${45 + R() * 20}%,${l + 8}%)`);
    g.addColorStop(1, `hsl(${hue},${40 + R() * 20}%,${l - 4}%)`);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(-len / 2, 0);
    x.quadraticCurveTo(0, -wid, len / 2, 0);
    x.quadraticCurveTo(0, wid, -len / 2, 0);
    x.fill();
    x.strokeStyle = `hsla(${hue},40%,${l + 18}%,0.6)`;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(-len / 2, 0);
    x.lineTo(len / 2, 0);
    x.stroke();
    x.restore();
  }
});
const frondTex = canvasTex(128, 1024, (x, W, H) => {
  const R = rng(23);
  for (let y = 30; y < H - 10; y += 7) {
    const t = y / H, len = (W / 2 - 4) * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.75 + R() * 0.25);
    for (const s of [-1, 1]) {
      x.strokeStyle = `hsl(${85 + R() * 25},${45 + R() * 15}%,${18 + R() * 16}%)`;
      x.lineWidth = 3 + R() * 2.5;
      x.beginPath();
      x.moveTo(W / 2, y);
      x.quadraticCurveTo(W / 2 + s * len * 0.5, y + 10, W / 2 + s * len, y + 26 + R() * 10);
      x.stroke();
    }
  }
  x.strokeStyle = '#6b6a3a';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(W / 2, 0);
  x.lineTo(W / 2, H);
  x.stroke();
});
const grassTex = canvasTex(256, 256, (x, W, H) => {
  const R = rng(31);
  for (let i = 0; i < 70; i++) {
    const bx = 10 + R() * (W - 20), top = H * (0.05 + R() * 0.5), bend = (R() - 0.5) * 70;
    const wid = 3 + R() * 4;
    x.fillStyle = `hsl(${70 + R() * 40},${35 + R() * 25}%,${16 + R() * 22}%)`;
    x.beginPath();
    x.moveTo(bx - wid, H);
    x.quadraticCurveTo(bx + bend * 0.4, (H + top) / 2, bx + bend, top);
    x.quadraticCurveTo(bx + bend * 0.4 + wid * 0.5, (H + top) / 2, bx + wid, H);
    x.fill();
  }
});
const bananaTex = canvasTex(256, 1024, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#3d6b25');
  g.addColorStop(0.5, '#5d8f35');
  g.addColorStop(1, '#3a6522');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(W / 2, 0);
  x.bezierCurveTo(W + 10, H * 0.2, W + 10, H * 0.8, W / 2, H);
  x.bezierCurveTo(-10, H * 0.8, -10, H * 0.2, W / 2, 0);
  x.fill();
  x.strokeStyle = '#a8b060';
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(W / 2, 0);
  x.lineTo(W / 2, H);
  x.stroke();
  // mga punit ng dahon
  const R = rng(5);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) {
    const y = 60 + R() * (H - 120), s = R() < 0.5 ? -1 : 1;
    x.lineWidth = 2 + R() * 3;
    x.beginPath();
    x.moveTo(W / 2 + s * 8, y);
    x.lineTo(W / 2 + s * W, y + 30 + R() * 20);
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 30; i++) {
    x.strokeStyle = 'rgba(30,50,15,0.25)';
    x.lineWidth = 1;
    const y = R() * H;
    x.beginPath();
    x.moveTo(W / 2, y);
    x.lineTo(R() < 0.5 ? 0 : W, y + 40);
    x.stroke();
  }
});
function foliageMat(tex, windAmt, windBase = 0) {
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 });
  return addGrime(m, { wind: true, windAmt, windBase, grime: 0.4 });
}
const leafMat = foliageMat(leafClusterTex, 0.025);
const frondMat = foliageMat(frondTex, 0.03);
const bananaMat = foliageMat(bananaTex, 0.05);
const grassMat = foliageMat(grassTex, 0.35, 0.3);
const barkMat = texMat('bark_brown_02', 0xb0a090, 0.9, 0.95);
const palmBarkMat = texMat('palm_bark', 0xc0b0a0, 0.8, 0.95);

// Pinagsamang geometry na may "spherical" na normal (para malago ang itsura ng dahon)
function leafCards(n, center, rad, size, R) {
  const geos = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.PlaneGeometry(size * (0.8 + R() * 0.5), size * (0.8 + R() * 0.5));
    const e = new THREE.Euler(R() * Math.PI, R() * Math.PI * 2, R() * Math.PI);
    p.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e));
    const a = R() * Math.PI * 2, b = Math.acos(R() * 2 - 1);
    const off = new THREE.Vector3(Math.sin(b) * Math.cos(a) * rad.x, Math.cos(b) * rad.y, Math.sin(b) * Math.sin(a) * rad.z).multiplyScalar(0.55 + R() * 0.45);
    p.translate(center.x + off.x, center.y + off.y, center.z + off.z);
    const pos = p.attributes.position, nor = p.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.set(pos.getX(k) - center.x, (pos.getY(k) - center.y) * 0.6 + rad.y * 0.4, pos.getZ(k) - center.z).normalize();
      nor.setXYZ(k, v.x, v.y, v.z);
    }
    geos.push(p);
  }
  return mergeGeometries(geos);
}
function treeVariant(seed) {
  const R = rng(seed);
  const H = 4 + R() * 2.5;
  const wood = [];
  const trunk = new THREE.CylinderGeometry(0.2, 0.42, H, 9, 5);
  trunk.translate(0, H / 2, 0);
  const tp = trunk.attributes.position;
  for (let k = 0; k < tp.count; k++) tp.setX(k, tp.getX(k) + Math.sin(tp.getY(k) * 0.7 + seed) * 0.12);
  trunk.computeVertexNormals();
  wood.push(trunk);
  const crowns = [];
  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * Math.PI * 2 + R(), len = 1.6 + R() * 1.2, y0 = H * (0.55 + R() * 0.3);
    const br = new THREE.CylinderGeometry(0.06, 0.13, len, 6);
    br.translate(0, len / 2, 0);
    br.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, -a, 0.75 + R() * 0.3)));
    br.translate(0, y0, 0);
    wood.push(br);
    crowns.push(new THREE.Vector3(Math.cos(a) * len * 0.75, y0 + len * 0.6, Math.sin(a) * len * 0.75));
  }
  const leaves = [leafCards(26, new THREE.Vector3(0, H + 1.0, 0), new THREE.Vector3(2.4, 1.6, 2.4), 2.6, R)];
  for (const c of crowns) leaves.push(leafCards(9, c, new THREE.Vector3(1.3, 0.9, 1.3), 1.9, R));
  return { wood: mergeGeometries(wood), leaves: mergeGeometries(leaves), H };
}

// Niyog: kurbadang puno, mga palapa na nakalaylay, at mga bunga
function buildCoconut(x, z, h) {
  const R = rng(x * 13 + z * 7);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = R() * Math.PI * 2;
  scene.add(g);
  const H = h * 1.05, lean = 0.6 + R() * 1.4;
  const trunk = new THREE.CylinderGeometry(0.17, 0.26, H, 10, 16);
  trunk.translate(0, H / 2, 0);
  const tp = trunk.attributes.position;
  for (let k = 0; k < tp.count; k++) {
    const t = tp.getY(k) / H;
    tp.setX(k, tp.getX(k) + lean * t * t);
    // mga singsing ng puno ng niyog
    const ring = 1 + Math.max(0, Math.sin(tp.getY(k) * 9)) * 0.04;
    tp.setX(k, tp.getX(k) * 1);
    tp.setZ(k, tp.getZ(k) * ring);
  }
  trunk.computeVertexNormals();
  const tm = new THREE.Mesh(trunk, palmBarkMat);
  tm.castShadow = tm.receiveShadow = true;
  g.add(tm);
  const top = new THREE.Vector3(lean, H, 0);
  const fronds = [];
  const nF = 11;
  for (let i = 0; i < nF; i++) {
    const L = 3.6 + R() * 1.4, Wd = 1.1;
    const f = new THREE.PlaneGeometry(Wd, L, 1, 10);
    f.rotateX(-Math.PI / 2); // nakahiga, haba sa -Z
    f.translate(0, 0, -L / 2);
    const fp = f.attributes.position;
    const up = 0.5 + R() * 0.5;
    for (let k = 0; k < fp.count; k++) {
      const t = -fp.getZ(k) / L;
      fp.setY(k, fp.getY(k) + up * t * L * 0.5 - t * t * L * (0.75 + R() * 0.02));
      // bahagyang V na hugis ng palapa
      fp.setY(k, fp.getY(k) - Math.abs(fp.getX(k)) * 0.35);
    }
    f.computeVertexNormals();
    f.rotateY((i / nF) * Math.PI * 2 + R() * 0.3);
    f.translate(top.x, top.y, top.z);
    fronds.push(f);
  }
  const fm = new THREE.Mesh(mergeGeometries(fronds), frondMat);
  fm.castShadow = true;
  g.add(fm);
  const nutM = mat(0x4a3a1e, { rough: 0.6 });
  for (let i = 0; i < 4; i++) {
    const n = mesh(g, new THREE.SphereGeometry(0.17, 10, 8), nutM, top.x + Math.cos(i * 1.6) * 0.25, top.y - 0.3, top.z + Math.sin(i * 1.6) * 0.25);
    n.scale.set(1, 1.15, 1);
  }
  addCircle(x, z, 0.35);
}

// Halamang saging
function buildBanana(x, z) {
  const R = rng(x * 3 + z);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const stem = mesh(g, new THREE.CylinderGeometry(0.16, 0.24, 2.4, 10), mat(0x5d7a35, { rough: 0.7 }), 0, 1.2, 0);
  stem.castShadow = true;
  const leaves = [];
  for (let i = 0; i < 7; i++) {
    const L = 2.2 + R() * 0.8;
    const f = new THREE.PlaneGeometry(0.75, L, 1, 8);
    f.rotateX(-Math.PI / 2);
    f.translate(0, 0, -L / 2);
    const fp = f.attributes.position;
    for (let k = 0; k < fp.count; k++) {
      const t = -fp.getZ(k) / L;
      fp.setY(k, fp.getY(k) + t * L * 0.9 - t * t * L * 0.85);
    }
    f.computeVertexNormals();
    f.rotateY((i / 7) * Math.PI * 2 + R());
    f.translate(0, 2.3, 0);
    leaves.push(f);
  }
  const lm = new THREE.Mesh(mergeGeometries(leaves), bananaMat);
  lm.castShadow = true;
  g.add(lm);
  addCircle(x, z, 0.3);
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
  const variants = [treeVariant(1), treeVariant(2), treeVariant(3)];
  const byV = [[], [], []];
  spots.forEach((s, i) => byV[i % 3].push(s));
  const d = new THREE.Object3D();
  variants.forEach((v, vi) => {
    const list = byV[vi];
    const wood = new THREE.InstancedMesh(v.wood, barkMat, list.length);
    const leaves = new THREE.InstancedMesh(v.leaves, leafMat, list.length);
    list.forEach(([x, z, s], i) => {
      d.position.set(x, 0, z);
      d.scale.set(s * 1.25, s * 1.25, s * 1.25);
      d.rotation.set(0, (x * 3.1 + z) % 6.28, 0);
      d.updateMatrix();
      wood.setMatrixAt(i, d.matrix);
      leaves.setMatrixAt(i, d.matrix);
      addCircle(x, z, 0.55 * s);
      forestTrunks.push([x, z]);
    });
    for (const m of [wood, leaves]) {
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    }
  });
}

// Totoong 3D na modelo mula sa Poly Haven (CC0): pako, palumpong, monobloc
const PHM = (slug) => `https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/${slug}/${slug}_1k.gltf`;
function scatterModel(slug, spots, scale, opts = {}) {
  gltfLoader.load(PHM(slug), (gl) => {
    const parts = [];
    gl.scene.updateMatrixWorld(true);
    gl.scene.traverse((o) => { if (o.isMesh) parts.push(o); });
    for (const part of parts) {
      const geo = part.geometry.clone().applyMatrix4(part.matrixWorld);
      const m = part.material;
      if (opts.tint) m.color.multiplyScalar(opts.tint);
      if (opts.wind) {
        m.side = THREE.DoubleSide;
        addGrime(m, { wind: true, windAmt: opts.wind, windBase: 0, grime: 0.3 });
      }
      const inst = new THREE.InstancedMesh(geo, m, spots.length);
      const d = new THREE.Object3D();
      spots.forEach(([x, z, r, s = 1, y = 0], i) => {
        d.position.set(x, y, z);
        d.rotation.set(0, r, 0);
        d.scale.setScalar(scale * s);
        d.updateMatrix();
        inst.setMatrixAt(i, d.matrix);
      });
      inst.castShadow = opts.shadow !== false;
      inst.receiveShadow = true;
      scene.add(inst);
    }
  }, undefined, () => console.warn('model failed', slug));
}
function buildPlants() {
  const R = rng(77), hi = GFX === 'high';
  // mga pako sa gilid ng gubat at sa paligid ng balete
  const ferns = [];
  for (let i = 0; i < (hi ? 170 : 60); i++) {
    const x = -86 + R() * 172, z = -38 - R() * 54;
    if (Math.abs(x) < 2.6 || Math.hypot(x, z + 64) < 5) continue;
    ferns.push([x, z, R() * 6.28, 0.6 + R() * 0.6]);
  }
  for (let i = 0; i < 24; i++) {
    const a = R() * Math.PI * 2, r = 6 + R() * 5;
    ferns.push([Math.cos(a) * r, -64 + Math.sin(a) * r, R() * 6.28, 0.7 + R() * 0.5]);
  }
  scatterModel('fern_02', ferns, 0.85, { wind: 0.04 });
  // mga palumpong sa tabi ng bahay at bakod
  const shrubs = [[-24, 4.5], [-32, 13], [-9, -11.5], [-2.5, -13], [31, -14], [37.5, -22], [41.5, 15], [35, 21], [21, 25.5], [27.5, 25.5], [3.5, 22], [-36, -26], [-45, -30], [-44, -38], [-12, 30], [16, 30], [44, 2], [44, -12], [-60, 0], [-70, 10]];
  scatterModel('shrub_02', shrubs.map(([x, z]) => [x, z, R() * 6.28, 0.25 + R() * 0.12]), 1, { wind: 0.02 });
  // monobloc sa tindahan ni Aling Nena at sa plaza
  const chairs = [[4.5, 23, 2.6], [5.6, 24, 3.4], [11.5, 23.5, -2.5], [6, 4, 0.5], [7, 3.2, 1.2], [23, -4, 3.9]];
  scatterModel('plastic_monobloc_chair_01', chairs.map(([x, z, r]) => [x, z, r, 1]), 1, { tint: 0.5 });
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
  for (const [x, z] of [[-33, -38], [-46, -28], [-35.5, -40], [-24, 2], [2, 26]]) buildBanana(x, z);
  fireGroup.position.set(-40, 0, -34);
  const coneGeo = new THREE.ConeGeometry(0.6, 2.2, 10);
  const R = rng(7);
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Mesh(coneGeo, i % 2 ? hot(5, 1.4, 0.25, { transparent: true, opacity: 0.9 }) : hot(5, 3, 0.8, { transparent: true, opacity: 0.9 }));
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
// ---- Mas realistic na tao: bilugang katawan, mukha na may mata/ilong/kilay, kumukurap ----
const PG = {
  leg: new THREE.CapsuleGeometry(0.115, 0.56, 4, 12),
  arm: new THREE.CapsuleGeometry(0.085, 0.5, 4, 10),
  hand: new THREE.SphereGeometry(0.095, 12, 10),
  torso: new THREE.CapsuleGeometry(0.29, 0.42, 6, 16),
  shoulder: new THREE.SphereGeometry(0.13, 12, 10),
  neck: new THREE.CylinderGeometry(0.09, 0.1, 0.18, 10),
  head: new THREE.SphereGeometry(0.255, 24, 18),
  hairTop: new THREE.SphereGeometry(0.275, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
  hairBack: new THREE.SphereGeometry(0.272, 20, 14, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.78),
  eye: new THREE.SphereGeometry(0.042, 12, 10),
  iris: new THREE.SphereGeometry(0.024, 10, 8),
  ear: new THREE.SphereGeometry(0.06, 10, 8),
  nose: new THREE.ConeGeometry(0.035, 0.11, 8),
  skirt: new THREE.CylinderGeometry(0.3, 0.45, 0.75, 18, 1),
  foot: new THREE.CapsuleGeometry(0.08, 0.16, 4, 8),
  curler: new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10),
  lens: new THREE.TorusGeometry(0.055, 0.011, 6, 16),
};
const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.25 });
const irisMat = new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.1 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 });
function pm(parent, geo, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// HDR na kulay (lampas 1.0) para kumislap sa bloom
const hot = (r, g, b, extra = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(r, g, b) }, extra));

function personSimple(o) {
  const g = new THREE.Group();
  const parts = {};
  const skin = skinMat(o.skin);
  const cloth = (c) => mat(c, { rough: 0.95 });
  const limb = (parent, x, y) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    parent.add(p);
    return p;
  };
  // Mga binti (balakang sa y=0.82)
  parts.legL = limb(g, -0.15, 0.82);
  parts.legR = limb(g, 0.15, 0.82);
  for (const L of [parts.legL, parts.legR]) {
    pm(L, PG.leg, o.skirt ? skin : cloth(o.bottom), 0, -0.4, 0);
    const f = pm(L, PG.foot, mat(0x2b1d14, { rough: 0.6 }), 0, -0.77, 0.06);
    f.rotation.x = Math.PI / 2;
  }
  // Katawan (gumagalaw kapag humihinga)
  const torso = new THREE.Group();
  torso.position.set(0, 0.8, 0);
  g.add(torso);
  parts.torso = torso;
  const T = (y) => y - 0.8;
  if (o.skirt) parts.skirt = pm(g, PG.skirt, cloth(o.bottom), 0, 0.58, 0);
  else pm(torso, PG.torso, cloth(o.bottom), 0, T(0.92), 0, 1.05, 0.35, 0.72);
  pm(torso, PG.torso, cloth(o.top), 0, T(1.22), 0, 1.12, 0.92, 0.66);
  pm(torso, PG.shoulder, cloth(o.top), -0.34, T(1.52), 0, 1, 0.85, 1);
  pm(torso, PG.shoulder, cloth(o.top), 0.34, T(1.52), 0, 1, 0.85, 1);
  pm(torso, PG.neck, skin, 0, T(1.66), 0);
  // Mga braso
  parts.armL = limb(torso, -0.4, T(1.53));
  parts.armR = limb(torso, 0.4, T(1.53));
  for (const A of [parts.armL, parts.armR]) {
    pm(A, PG.arm, cloth(o.top), 0, -0.3, 0);
    pm(A, PG.hand, skin, 0, -0.7, 0.01, 0.9, 1.15, 0.8);
  }
  // Ulo
  const head = new THREE.Group();
  head.position.set(0, T(1.9), 0);
  torso.add(head);
  parts.head = head;
  pm(head, PG.head, skin, 0, 0, 0, 0.9, 1.06, 0.96);
  pm(head, PG.head, skin, 0, -0.1, 0.03, 0.66, 0.55, 0.78); // panga
  pm(head, PG.ear, skin, -0.235, 0, -0.01, 0.55, 1, 0.8);
  pm(head, PG.ear, skin, 0.235, 0, -0.01, 0.55, 1, 0.8);
  const nose = pm(head, PG.nose, skin, 0, -0.02, 0.255);
  nose.rotation.x = Math.PI / 2 + 0.35;
  parts.eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(sx * 0.09, 0.04, 0.205);
    head.add(e);
    pm(e, PG.eye, eyeWhite, 0, 0, 0, 1, 0.8, 0.6);
    pm(e, PG.iris, irisMat, 0, 0, 0.022);
    parts.eyes.push(e);
    box(head, 0.11, 0.025, 0.03, o.hairC, sx * 0.095, 0.115, 0.225, { rz: sx * -0.12, cast: false });
  }
  parts.mouth = box(head, 0.11, 0.022, 0.02, 0x6a2a22, 0, -0.12, 0.235, { cast: false });
  const h = o.hairC;
  const hm = mat(h, { rough: 0.55 });
  const shortHair = () => {
    const t = pm(head, PG.hairTop, hm, 0, 0.02, -0.01, 0.95, 1.05, 1.02);
    t.rotation.x = -0.25;
    pm(head, PG.hairBack, hm, 0, -0.02, -0.02, 0.96, 1.04, 1.0);
  };
  switch (o.hair) {
    case 'short': shortHair(); break;
    case 'bun': shortHair(); pm(head, PG.shoulder, hm, 0, 0.2, -0.24, 1.1, 1, 1); break;
    case 'ponytail': {
      shortHair();
      const pt = pm(head, PG.arm, hm, 0, -0.12, -0.32, 1.2, 0.7, 1.2);
      pt.rotation.x = 0.25;
      parts.ponytail = pt;
      pm(head, PG.iris, mat(0xe53935), 0, 0.1, -0.29, 2.5, 2.5, 2.5);
      break;
    }
    case 'curly':
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pm(head, PG.shoulder, hm, Math.cos(a) * 0.2, 0.12 + Math.sin(i * 1.7) * 0.06, Math.sin(a) * 0.17 - 0.06, 0.9, 0.9, 0.9);
      }
      pm(head, PG.hairTop, hm, 0, 0.05, -0.02, 1.08, 1.1, 1.08);
      break;
  }
  const ex = o.extra || [];
  if (ex.includes('salakot')) mesh(head, new THREE.ConeGeometry(0.66, 0.34, 18), mat(0xc8a15a, { rough: 0.8 }), 0, 0.36, 0);
  if (ex.includes('glasses')) {
    for (const sx of [-1, 1]) mesh(head, PG.lens, metalMat, sx * 0.09, 0.04, 0.245);
    box(head, 0.06, 0.012, 0.012, 0x222222, 0, 0.05, 0.25, { cast: false });
  }
  if (ex.includes('beard')) pm(head, PG.head, mat(0xbdbdbd, { rough: 0.9 }), 0, -0.15, 0.06, 0.62, 0.4, 0.72);
  if (ex.includes('barong')) box(torso, 0.1, 0.62, 0.02, 0xd8caa4, 0, T(1.22), 0.2, { cast: false });
  if (ex.includes('kimona')) pm(torso, PG.torso, cloth(0xffffff), 0, T(1.38), 0, 1.16, 0.4, 0.69);
  if (ex.includes('pamaypay')) box(parts.armR, 0.03, 0.32, 0.34, 0xf7c948, 0.1, -0.72, 0.14);
  if (ex.includes('pouch')) box(torso, 0.18, 0.22, 0.1, 0x7a5a2a, 0.3, T(0.95), 0.2);
  if (ex.includes('flower')) pm(head, PG.shoulder, mat(0xffffff, { rough: 0.6 }), 0.21, 0.2, 0.08, 0.7, 0.7, 0.7);
  if (ex.includes('tee')) box(torso, 0.28, 0.24, 0.02, 0xffffff, 0, T(1.32), 0.2, { cast: false });
  if (ex.includes('backpack')) pm(torso, PG.torso, cloth(0xe67e22), 0, T(1.22), -0.3, 0.8, 0.62, 0.4);
  if (ex.includes('apron')) box(torso, 0.52, 0.86, 0.025, 0x5fa8d3, 0, T(1.05), 0.215, { cast: false });
  if (ex.includes('curlers')) for (const x of [-0.14, 0, 0.14]) mesh(head, PG.curler, mat(0xf48fb1, { rough: 0.4 }), x, 0.24, 0.05).rotation.z = Math.PI / 2;
  if (ex.includes('towel')) pm(torso, PG.torso, cloth(0xffffff), 0, T(1.52), 0, 1.25, 0.3, 0.75);
  if (ex.includes('buri')) mesh(head, new THREE.CylinderGeometry(0.2, 0.55, 0.22, 20), mat(0xd9b77a, { rough: 0.85 }), 0, 0.3, 0);
  if (ex.includes('collar')) box(torso, 0.16, 0.06, 0.02, 0xffffff, 0, T(1.6), 0.17, { cast: false });
  if (ex.includes('cross')) {
    box(torso, 0.04, 0.2, 0.02, 0x8a7a3a, 0, T(1.3), 0.21, { cast: false });
    box(torso, 0.12, 0.04, 0.02, 0x8a7a3a, 0, T(1.35), 0.21, { cast: false });
  }
  if (ex.includes('torch')) {
    // nakataas na braso, patayong sulo
    box(parts.armR, 0.07, 1.4, 0.07, 0x4a2a12, 0, -0.36, 0.24, { rx: 0.5 });
    const f = mesh(parts.armR, new THREE.ConeGeometry(0.16, 0.5, 8), hot(4, 1.6, 0.3), 0, 0.42, 0.66);
    f.rotation.x = 0.5;
    flames.push(f);
    parts.armR.rotation.x = -0.5;
    parts.noSwing = true;
  }
  g.userData.parts = parts;
  g.userData.blink = Math.random() * 4;
  return g;
}

// ============================================================
//  MGA TAO — totoong 3D na tao (Microsoft RocketBox, MIT) na binihisan
//  bilang mga Pilipino (daster, barong, camisa de chino, sando, tsinelas),
//  kayumangging balat at itim na buhok. Sa gabi: maputla, may dugo,
//  itim na mata, nakatitig. Dito rin ginagawa ang manananggal at tikbalang.
// ============================================================
const PEOPLE = 'assets/people/';
const PERSON_SCALE = 0.0105; // cm → m (~1.8 m na tao)
const ANIMS = {
  f: { idle: ['f_idle_neutral_01', 'f_idle_look_around_01', 'f_idle_roll_head_01'], talk: ['f_gestic_talk_neutral_01', 'f_gestic_talk_nervous_01'], angry: ['f_gestic_talk_angry_01'] },
  m: { idle: ['m_idle_neutral_01', 'm_idle_look_around_01', 'm_idle_roll_head_01'], talk: ['m_gestic_talk_neutral_01', 'm_gestic_talk_nervous_01'], angry: ['m_idle_angry_01', 'm_gestic_listen_angry_01', 'm_cheer_01'] },
};
const C3 = (hex) => new THREE.Color(hex);
const MORENA = 0x9a6a4c, KAYUMANGGI = 0x8a5a3c, MAPUTI = 0xb08468;
// Mga bihis. Mga sukat ay sa cm ng bind pose (Z = taas).
//  top/bottom: kulay; pat: 0 payak, 1 bulaklak (daster), 2 burda (barong), 3 guhit, 4 plaid
//  sleeve: hanggang saan ang manggas (|x| cm; 21 = walang manggas, 30 = maikli, 55 = mahaba)
//  dress: hanggang saang taas ang bestida (cm); bare: mas mababa rito = balat; feet: tsinelas
const STYLES = {
  lola: { model: 'lola', sex: 'f', skin: MORENA, hair: 0xd8d4cc, top: 0xb79ac8, top2: 0xf2d6e4, pat: 1, sleeve: 30, dress: 42, bare: 42, scale: 0.95, hunch: 0.22, bun: true },
  tess: { model: 'tess', sex: 'f', skin: MORENA, hair: 0x0c0a09, top: 0xf2c94c, top2: 0x1e3a8a, pat: 0, sleeve: 30, bottom: 0x3a5a8a },
  beth: { model: 'beth', sex: 'f', skin: KAYUMANGGI, hair: 0x0c0a09, top: 0x9c1c2c, top2: 0xf4d35e, pat: 1, sleeve: 30, dress: 40, bare: 40 },
  nena: { model: 'nena', sex: 'f', skin: MORENA, hair: 0x120d0b, top: 0x2a8a8a, top2: 0xf6e7b0, pat: 1, sleeve: 30, dress: 38, bare: 38 },
  tonyo: { model: 'tonyo', sex: 'm', skin: KAYUMANGGI, hair: 0x9a958c, top: 0xe8e0c8, pat: 0, sleeve: 55, bottom: 0x5a4a38, bare: 34, hunch: 0.12 },
  kapitan: { model: 'kapitan', sex: 'm', skin: MORENA, hair: 0x14100e, top: 0xefe6cf, top2: 0xffffff, pat: 2, sleeve: 56, bottom: 0x18181a },
  padre: { model: 'padre', sex: 'm', skin: MAPUTI, hair: 0x0e0b0a, top: 0xf2f0ea, pat: 0, sleeve: 56, bottom: 0xf2f0ea, dress: 6 },
  kardo: { model: 'kardo', sex: 'm', skin: KAYUMANGGI, hair: 0x14100e, top: 0x5a7a9a, pat: 0, sleeve: 21, bottom: 0x8a7a5a, bare: 50 },
  v1: { model: 'v1', sex: 'm', skin: MORENA, hair: 0x0c0a09, top: 0xc0392b, top2: 0xffffff, pat: 3, sleeve: 30, bottom: 0x2a2a2e },
  v2: { model: 'v2', sex: 'm', skin: KAYUMANGGI, hair: 0x0c0a09, top: 0x2e5aa8, top2: 0xe8e8e8, pat: 4, sleeve: 30, bottom: 0x3a3a3a, bare: 48 },
  v3: { model: 'v3', sex: 'm', skin: KAYUMANGGI, hair: 0x0c0a09, top: 0xd8d0b8, pat: 0, sleeve: 21, bottom: 0x4a4038, bare: 48 },
  v4: { model: 'v4', sex: 'f', skin: MORENA, hair: 0x0c0a09, top: 0x6a8a3a, top2: 0xf0e0a0, pat: 1, sleeve: 30, dress: 40, bare: 40 },
  v5: { model: 'v5', sex: 'f', skin: MORENA, hair: 0x0c0a09, top: 0xe8d8e8, pat: 0, sleeve: 30, bottom: 0x5a3a6a, dress: 40, bare: 40 },
  // Mga nilalang
  whitelady: { model: 'nena', sex: 'f', skin: 0xb8b0a8, hair: 0x050404, top: 0xeeeae2, pat: 0, sleeve: 56, bottom: 0xeeeae2, dress: 0, force: 1, longHair: true, coverFace: true },
  mng: { model: 'mng', sex: 'f', skin: 0x9a9488, hair: 0x050404, top: 0x3a0a10, pat: 0, sleeve: 24, bottom: 0x3a0a10, force: 1, cut: 101, longHair: true },
  mngLow: { model: 'mng', sex: 'f', skin: 0x9a9488, hair: 0x050404, top: 0x3a0a10, bottom: 0x2a2a30, sleeve: 24, force: 1, headCut: 101 },
  tik: { model: 'v3', sex: 'm', skin: 0x2a1e18, hair: 0x050404, fur: 1, force: 1, headCut: 150, scale: 2.15 }, // higante (~3.9 m)
};
const STYLE_KEYS = Object.keys(STYLES);
// tela ng daster (bulaklakin) para sa palda
const dressMats = {};
function dressMat(st) {
  const k = st.top + ':' + st.top2;
  if (!dressMats[k]) {
    const top = '#' + C3(st.top).getHexString(), fl = '#' + C3(st.top2 ?? st.top).getHexString();
    const t = canvasTex(256, 256, (x, W, H) => {
      x.fillStyle = top;
      x.fillRect(0, 0, W, H);
      const R = rng(7);
      for (let i = 0; i < (st.pat === 1 ? 22 : 0); i++) {
        const cx = R() * W, cy = R() * H, r = 9 + R() * 7;
        x.fillStyle = fl;
        for (let k2 = 0; k2 < 5; k2++) {
          const a = (k2 / 5) * Math.PI * 2;
          x.beginPath();
          x.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = '#d9a23a';
        x.beginPath();
        x.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
        x.fill();
      }
      // tupi ng tela
      for (let i = 0; i < 18; i++) {
        x.fillStyle = 'rgba(0,0,0,' + (0.05 + R() * 0.08) + ')';
        x.fillRect((i / 18) * W, 0, 4 + R() * 6, H);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1.5);
    dressMats[k] = new THREE.MeshStandardMaterial({ map: t, color: 0xb0b0b0, roughness: 0.92, side: THREE.DoubleSide });
  }
  return dressMats[k];
}
// Gaano kakilabot ngayon (0 = araw, 1 = gabi/takot); itinatakda sa stepTime
const creep = { value: 0.2 };
const fbxManager = new THREE.LoadingManager();
// gamit natin ang sariling JPG; huwag nang i-load ang TGA na nasa loob ng FBX
fbxManager.addHandler(/\.tga$/i, { load: () => new THREE.Texture(), setPath() { return this; }, setCrossOrigin() { return this; } });
const fbxLoader = new FBXLoader(fbxManager);
const peopleTex = new THREE.TextureLoader();
const clipCache = {};
function loadClip(name) {
  if (!clipCache[name]) clipCache[name] = fetch(PEOPLE + 'anims/' + name + '.json').then((r) => r.json()).then((j) => THREE.AnimationClip.parse(j));
  return clipCache[name];
}
const ptexCache = {};
function ptex(dir, file, srgb = true) {
  const k = dir + '/' + file;
  if (!ptexCache[k]) {
    const t = peopleTex.load(PEOPLE + k);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    ptexCache[k] = t;
  }
  return ptexCache[k];
}

const PEOPLE_GLSL = `
varying vec3 vObj;
uniform float uCreep, uForce;
uniform vec3 uSkinT, uHairC, uTopC, uTop2C, uBotC, uEyeL, uEyeR;
uniform float uPat, uSleeve, uDress, uBare, uCut, uFur, uHeadCut, uHasBot;
float cH(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float cN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(cH(i), cH(i+vec3(1,0,0)), f.x), mix(cH(i+vec3(0,1,0)), cH(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(cH(i+vec3(0,0,1)), cH(i+vec3(1,0,1)), f.x), mix(cH(i+vec3(0,1,1)), cH(i+vec3(1,1,1)), f.x), f.y), f.z); }
// bulaklak na disenyo ng daster (sa object space, cm)
float flower(vec3 p) {
  vec2 q = vec2(p.x + p.y * 0.7, p.z) / 9.0;
  vec2 id = floor(q), f = fract(q) - 0.5;
  vec2 o = vec2(cH(vec3(id, 1.0)), cH(vec3(id, 2.0))) - 0.5;
  vec2 d = f - o * 0.4;
  float a = atan(d.y, d.x), r = length(d);
  float petals = 0.16 + 0.07 * cos(a * 5.0 + cH(vec3(id, 3.0)) * 6.0);
  return smoothstep(petals, petals - 0.03, r) - smoothstep(0.06, 0.03, r) * 0.6;
}
`;
const PEOPLE_COLOR = (kind) => `
{ vec3 c = diffuseColor.rgb;
  float creepK = max(uCreep, uForce);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float skin = smoothstep(0.02, 0.12, c.r - c.b) * smoothstep(0.03, 0.2, lum) * (1.0 - smoothstep(0.75, 0.95, lum));
  vec3 P = vObj; float ax = abs(P.x);
  ${kind === 'body' ? `
  // --- damit ---
  // hinahati ayon sa posisyon sa katawan (hindi sa kulay)
  bool arm = ax > 21.0 && P.z > 85.0;
  float shade = clamp(lum * 1.9, 0.25, 1.35);
  bool armCloth = arm && ax <= min(uSleeve, 53.0);
  bool torsoCloth = !arm && P.z > 9.0 && P.z < 138.0;
  bool bare = (arm && !armCloth) || (!arm && P.z < uBare && P.z > 9.0);
  bool feet = P.z <= 9.0;
  if (feet) { if (uBare > 0.0) c = mix(vec3(0.05, 0.04, 0.035), uSkinT * 0.55, smoothstep(3.0, 9.0, P.z)); else c *= 0.7; skin = 0.0; } // tsinelas at maputik na paa, o sapatos
  else if (bare) { c = uSkinT * (0.88 + (lum - 0.4) * 0.25); skin = 0.0; }
  else if (torsoCloth || armCloth) {
    bool isTop = P.z > 102.0 || arm || (uDress > 0.0 && P.z > uDress);
    vec3 base = isTop || uHasBot < 0.5 ? uTopC : uBotC;
    vec3 col = base;
    if (isTop || uHasBot < 0.5) {
      if (uPat == 1.0) col = mix(base, uTop2C, clamp(flower(P), 0.0, 1.0));
      if (uPat == 2.0) { float e = sin(P.z * 3.1) * sin(P.x * 3.1 + P.z * 1.4); col = mix(base, uTop2C, smoothstep(0.55, 0.95, e) * step(-20.0, P.y)); }
      if (uPat == 3.0) col = mix(base, uTop2C, step(0.5, fract(P.z / 5.0)) * 0.7);
      if (uPat == 4.0) col = mix(base, uTop2C, max(step(0.75, fract(P.z / 7.0)), step(0.75, fract(P.x / 7.0))) * 0.55);
    }
    c = col * shade;
    skin = 0.0;
  }
  // balahibo ng tikbalang
  if (uFur > 0.5) {
    float strand = cN(vec3(P.x * 1.5, P.y * 1.5, P.z * 0.25)) * 0.6 + cN(P * 4.0) * 0.4;
    c = uSkinT * (0.35 + strand * 0.9) * clamp(lum * 1.6, 0.5, 1.2);
    skin = 0.0;
  }` : ''}
  ${kind === 'head' ? `
  // --- buhok: itaas at likod ng ulo (batay sa mata) ---
  float eyeZ = uEyeL.z, eyeY = uEyeL.y;
  bool hairZone = P.z > eyeZ + 4.5 || (P.y > eyeY + 9.0 && P.z > eyeZ - 9.0) || (ax > 7.5 && P.z > eyeZ + 1.0 && P.y > eyeY + 4.0);
  if (hairZone && lum < 0.55 && skin < 0.95) { c = uHairC * (0.55 + lum * 1.2) + vec3(cN(P * 3.0) * 0.04); skin = 0.0; }
  if (uFur > 0.5) c = uSkinT * (0.4 + lum);` : ''}
  // --- kulay ng balat (kayumanggi) ---
  c = mix(c, uSkinT * clamp(lum * 1.75, 0.35, 1.35), skin * 0.85);
  // --- kilabot (gabi) ---
  float pale = creepK * 0.65;
  vec3 ash = vec3(lum) * vec3(0.9, 0.95, 0.9) * 1.1;
  c = mix(c, ash, skin * pale);
  float bruise = smoothstep(0.62, 0.85, cN(P * 0.09)) * skin * creepK;
  c = mix(c, c * vec3(0.55, 0.42, 0.6), bruise * 0.7);
  c *= 0.84 + cN(P * 0.35) * 0.22;
  float sp = cN(P * 0.6 + 3.1) * 0.7 + cN(P * 2.3) * 0.3;
  float blood = smoothstep(0.74, 0.8, sp) * smoothstep(0.35, 0.9, creepK);
  c = mix(c, vec3(0.16, 0.0, 0.01), blood * 0.9);
  ${kind === 'head' ? `
  float de = min(distance(P, uEyeL), distance(P, uEyeR));
  c = mix(c, c * vec3(0.32, 0.18, 0.2), smoothstep(3.8, 1.7, de) * (0.2 + creepK * 0.6));
  c = mix(c, vec3(0.012, 0.006, 0.006), smoothstep(1.68, 1.56, de) * smoothstep(0.55, 0.95, creepK));` : ''}
  diffuseColor.rgb = c * (1.0 - creepK * 0.1);
  gBlood = blood; }`;

// Gumawa ng materyal para sa isang estilo (bihis)
function peopleMat(kind, st, eyes, opts = {}) {
  const dir = st.model;
  const m = new THREE.MeshStandardMaterial({
    map: ptex(dir, kind === 'head' ? 'head.jpg' : 'body.jpg'),
    normalMap: ptex(dir, kind === 'head' ? 'headn.jpg' : 'bodyn.jpg', false),
    roughness: kind === 'head' ? 0.6 : 0.88,
    metalness: 0,
    side: st.cut ? THREE.DoubleSide : THREE.FrontSide,
  });
  const u = {
    uCreep: creep,
    uForce: { value: st.force || 0 },
    uSkinT: { value: C3(st.skin) },
    uHairC: { value: C3(st.hair) },
    uTopC: { value: C3(st.top ?? 0x777777) },
    uTop2C: { value: C3(st.top2 ?? st.top ?? 0x777777) },
    uBotC: { value: C3(st.bottom ?? st.top ?? 0x777777) },
    uHasBot: { value: st.bottom != null ? 1 : 0 },
    uPat: { value: st.pat || 0 },
    uSleeve: { value: st.sleeve ?? 30 },
    uDress: { value: st.dress ?? 0 },
    uBare: { value: st.bare ?? 0 },
    uCut: { value: st.cut ?? -1 },
    uFur: { value: st.fur || 0 },
    uHeadCut: { value: st.headCut ?? 999 },
    uEyeL: eyes.l,
    uEyeR: eyes.r,
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PEOPLE_GLSL)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vObj.z < uCut) discard;                 // manananggal: putol sa baywang
if (vObj.z > uHeadCut) discard;             // tikbalang: ulo ng kabayo ang kapalit`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat gBlood = 0.0;\n' + PEOPLE_COLOR(kind) + `
if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.22, 0.01, 0.02); // loob ng hiwa: laman at dugo`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.15, gBlood);' + (st.fur ? '\nroughnessFactor = 0.75;' : ''));
  };
  m.customProgramCacheKey = () => 'people3' + kind;
  return m;
}
function hairCardMat(st) {
  if (st.headCut) return new THREE.MeshBasicMaterial({ visible: false });
  const m = new THREE.MeshStandardMaterial({ map: ptex(st.model, 'opacity.png'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.65, metalness: 0, color: C3(st.hair) });
  // ang texture ay gamit lang sa hugis (alpha); ang kulay ng buhok ay mula sa estilo
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  diffuseColor.rgb *= 0.6 + dot(sampledDiffuseColor.rgb, vec3(0.333)) * 0.8;
  diffuseColor.a *= sampledDiffuseColor.a;
#endif`);
  };
  m.customProgramCacheKey = () => 'haircard';
  return m;
}

const templates = {};
function loadTemplate(styleKey) {
  if (!templates[styleKey]) {
    const st = STYLES[styleKey];
    templates[styleKey] = new Promise((res, rej) => {
      fbxLoader.load(PEOPLE + st.model + '/model.fbx', (o) => {
        const eyes = { l: { value: new THREE.Vector3(0, -999, 0) }, r: { value: new THREE.Vector3(0, -999, 0) } };
        const mats = { body: peopleMat('body', st, eyes), head: peopleMat('head', st, eyes), opacity: null };
        o.traverse((c) => {
          if (!c.isMesh) return;
          c.material = [].concat(c.material).map((mm) => {
            if (/opacity/i.test(mm.name)) return mats.opacity || (mats.opacity = hairCardMat(st));
            return /head/i.test(mm.name) ? mats.head : mats.body;
          });
          if (c.material.length === 1) c.material = c.material[0];
          c.castShadow = c.receiveShadow = true;
          c.frustumCulled = false;
        });
        // posisyon ng mata sa bind-space ng mesh (Z-up): boneInverses → bindMatrixInverse
        o.updateMatrixWorld(true);
        let skinMesh = null;
        o.traverse((c) => { if (c.isSkinnedMesh) skinMesh = c; });
        if (skinMesh) {
          const inv = skinMesh.bindMatrixInverse.clone();
          const sk = skinMesh.skeleton;
          sk.bones.forEach((b, i) => {
            const side = /Bip01_LEye$/.test(b.name) ? eyes.l : /Bip01_REye$/.test(b.name) ? eyes.r : null;
            if (side) side.value.setFromMatrixPosition(sk.boneInverses[i].clone().invert()).applyMatrix4(inv);
          });
        }
        o.animations = [];
        res(o);
      }, undefined, rej);
    });
  }
  return templates[styleKey];
}

// ---------- mga dagdag na bahagi ----------
// Mahabang buhok (white lady / manananggal): maraming hibla na nakalaylay
function longHair(st) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: C3(st.hair), roughness: 0.45, side: THREE.DoubleSide });
  const R = rng(91);
  const geos = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2;
    const front = Math.cos(a) > 0.2; // sa harap: tinatakpan ang mukha (white lady lang)
    if (front && !st.coverFace) continue;
    const L = front ? 0.45 + R() * 0.25 : 0.6 + R() * 0.35;
    const strip = new THREE.PlaneGeometry(0.035 + R() * 0.02, L, 1, 6);
    strip.translate(0, -L / 2, 0);
    const pos = strip.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const t = -pos.getY(k) / L;
      pos.setZ(k, pos.getZ(k) + Math.sin(t * 3 + i) * 0.02 + t * 0.03);
    }
    strip.rotateY(-a + Math.PI / 2);
    strip.translate(Math.sin(a) * 0.085, 0.05 + R() * 0.03, Math.cos(a) * 0.1);
    geos.push(strip);
  }
  const mesh2 = new THREE.Mesh(mergeGeometries(geos), m);
  mesh2.castShadow = true;
  g.add(mesh2);
  return g;
}
// Ulo ng kabayo ng tikbalang: hinulma mula sa sphere — mahabang nguso, malalim na mata, nakangiwing ngipin
function horseHead() {
  const g = new THREE.Group();
  const hide = addGrime(new THREE.MeshStandardMaterial({ color: 0x6a5648, roughness: 0.62, metalness: 0.02 }), { tex: 'bark_willow', scale: 16, bump: 3.5, grime: 1.2 });
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = (v.z + 1) / 2; // 0 likod → 1 nguso
    const muzzle = THREE.MathUtils.smoothstep(t, 0.4, 0.95);
    const tip = THREE.MathUtils.smoothstep(t, 0.85, 1.0);
    // malapad na pisngi/panga sa likod, makitid na nguso, bilugang ilong sa dulo
    const cheek = Math.exp(-((t - 0.35) ** 2) * 40) * Math.max(0, -v.y);
    const w = THREE.MathUtils.lerp(0.115, 0.068, muzzle) + tip * 0.012 + cheek * 0.02;
    const h = THREE.MathUtils.lerp(0.16, 0.088, muzzle) + tip * 0.012;
    let x = v.x * w, y = v.y * h * (v.y < 0 ? 1 + cheek * 1.6 : 1), z = v.z * (v.z > 0 ? 0.5 : 0.17);
    y -= muzzle * muzzle * 0.16; // nakayuko ang nguso
    y += Math.max(0, v.y) * (1 - muzzle) * 0.025; // bukol ng noo
    // butas sa pisngi: mga buto na lumilitaw (payat, parang bangkay)
    x *= 1 - Math.exp(-((t - 0.55) ** 2) * 60) * 0.12;
    // butas ng ilong
    const nose = Math.exp(-((x * x * 200 + (y + 0.12) ** 2 * 300 + (z - 0.44) ** 2 * 400)));
    z -= nose * 0.01;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const skull = new THREE.Mesh(geo, hide);
  g.add(skull);
  // panga na bumubuka
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.06, -0.05);
  const jg = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
  const jp = jg.attributes.position;
  for (let i = 0; i < jp.count; i++) {
    v.fromBufferAttribute(jp, i);
    const t = (v.z + 1) / 2;
    jp.setXYZ(i, v.x * THREE.MathUtils.lerp(0.11, 0.055, t), v.y * 0.05, v.z * 0.24 + 0.2 - t * t * 0.05);
  }
  jg.computeVertexNormals();
  jaw.add(new THREE.Mesh(jg, hide));
  g.add(jaw);
  // ngipin (dilaw, magulo)
  const toothM = new THREE.MeshStandardMaterial({ color: 0xcdbf9a, roughness: 0.35 });
  // mga ngipin ng kabayo sa harap: patag, dilaw, nakangiwi (nakalabas ang gilagid)
  const gum = new THREE.MeshStandardMaterial({ color: 0x5a1a1e, roughness: 0.3 });
  const gums = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI), gum);
  gums.position.set(0, -0.155, 0.43);
  gums.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI);
  g.add(gums);
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6 - 0.5) * 2.2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03 + Math.random() * 0.01, 0.01), toothM);
    tooth.position.set(Math.sin(a) * 0.045, -0.165, 0.43 + Math.cos(a) * 0.045);
    tooth.rotation.set(0.25, a, (Math.random() - 0.5) * 0.3);
    g.add(tooth);
  }
  // malalalim na mata na kumikinang na pula
  const sock = new THREE.MeshStandardMaterial({ color: 0x050202, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), sock);
    s.position.set(sx * 0.1, 0.045, 0.06);
    g.add(s);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), hot(5, 0.5, 0.2, { fog: false }));
    e.position.set(sx * 0.116, 0.045, 0.068);
    g.add(e);
    // tainga
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), hide);
    ear.position.set(sx * 0.07, 0.17, -0.06);
    ear.rotation.set(-0.3, 0, sx * -0.25);
    g.add(ear);
  }
  // kiling (mane): mahahabang itim na buhok pababa sa batok
  const mane = longHair({ hair: 0x050404 });
  mane.position.set(0, 0.12, -0.1);
  mane.scale.set(0.7, 1.6, 1.3);
  g.add(mane);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.jaw = jaw;
  return g;
}
// Pakpak ng paniki: may mga buto at manipis na balat na may ugat
const wingTex = canvasTex(512, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2a1416');
  g.addColorStop(1, '#140a0c');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  const R = rng(3);
  for (let i = 0; i < 160; i++) {
    x.strokeStyle = `rgba(${90 + R() * 60},${10 + R() * 20},${20 + R() * 20},${0.25 + R() * 0.3})`;
    x.lineWidth = 0.5 + R() * 1.5;
    x.beginPath();
    let px = R() * W, py = R() * H;
    x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += (R() - 0.5) * 40; py += (R() - 0.5) * 40; x.lineTo(px, py); }
    x.stroke();
  }
});
function batWing(sx) {
  const g = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0x3a2a26, roughness: 0.5 });
  const memb = new THREE.MeshStandardMaterial({ map: wingTex, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });
  // dulo ng mga daliri ng pakpak
  const tips = [[1.9, 0.55], [2.25, 0.05], [1.95, -0.55], [1.25, -0.9], [0.45, -0.75]];
  const root = new THREE.Vector3(0, 0, 0), elbow = new THREE.Vector3(0.9, 0.35, 0);
  const pts = [];
  const add = (a, b) => {
    const len = a.distanceTo(b);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, len, 6), bone);
    c.position.copy(a).add(b).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(c);
  };
  add(root, elbow);
  const tipV = tips.map(([x, y]) => new THREE.Vector3(x, y, 0));
  tipV.forEach((t) => add(elbow, t));
  // balat sa pagitan ng mga daliri (may lubog na hugis)
  const verts = [], uvs = [];
  const ring = [root, ...tipV];
  for (let i = 1; i < ring.length - 1; i++) {
    const a = elbow, b = ring[i], c = ring[i + 1];
    const mid = b.clone().add(c).multiplyScalar(0.5).lerp(a, 0.28); // kurba papasok
    for (const [p1, p2, p3] of [[a, b, mid], [a, mid, c]]) for (const q of [p1, p2, p3]) { verts.push(q.x, q.y, q.z); uvs.push(q.x / 2.3, (q.y + 1) / 2); }
  }
  for (const q of [root, elbow, tipV[4]]) { verts.push(q.x, q.y, q.z); uvs.push(q.x / 2.3, (q.y + 1) / 2); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  mg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  mg.computeVertexNormals();
  g.add(new THREE.Mesh(mg, memb));
  g.scale.set(sx, 1, 1);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// Bituka na nakalawit
function entrails() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x5a0a14, roughness: 0.18, metalness: 0.1 });
  const m2 = new THREE.MeshStandardMaterial({ color: 0x7a2a3a, roughness: 0.25 });
  const R = rng(17);
  for (let i = 0; i < 6; i++) {
    const pts = [];
    let x = (R() - 0.5) * 0.16, z = (R() - 0.5) * 0.1;
    const segs = 4 + Math.floor(R() * 4);
    for (let k = 0; k < segs; k++) {
      pts.push(new THREE.Vector3(x, -k * 0.09, z));
      x += (R() - 0.5) * 0.1;
      z += (R() - 0.5) * 0.08;
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.01 + R() * 0.014, 8), i % 3 ? m : m2);
    tube.castShadow = true;
    g.add(tube);
  }
  return g;
}

function buildPerson(g, o, tpl) {
  const st = STYLES[o.style];
  const model = SkeletonUtils.clone(tpl);
  const sc = PERSON_SCALE * (st.scale || 1);
  model.scale.setScalar(sc);
  if (o.stretch) model.scale.set(sc * o.stretch[0], sc * o.stretch[1], sc * o.stretch[0]);
  g.add(model);
  const bones = {};
  model.traverse((c) => { if (c.isBone) bones[c.name.replace('Bip01_', '')] = c; });
  model.updateMatrixWorld(true);
  const ex = o.extra || [];
  const head = bones.Head;
  const hp = new THREE.Vector3();
  head.getWorldPosition(hp);
  const gp = g.getWorldPosition(new THREE.Vector3());
  // tuktok ng ulo mula sa buto ng ulo (ang Box3 ng skinned mesh ay mali dahil Z-up ang geometry)
  const headY = hp.y - gp.y, topY = headY + 0.19 * (st.scale || 1);
  const put = (bone, obj, x, y, z, rx = 0, ry = 0, rz = 0) => {
    g.add(obj);
    obj.position.set(x, y, z);
    obj.rotation.set(rx, ry, rz);
    g.updateMatrixWorld(true);
    bone.attach(obj);
    obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return obj;
  };
  const M = (geo, material) => new THREE.Mesh(geo, material);
  const hairM = mat(st.hair, { rough: 0.55 });
  if (st.bun) put(head, M(new THREE.SphereGeometry(0.055, 16, 12), hairM), 0, topY - 0.06, -0.09);
  if (st.longHair) put(head, longHair(st), 0, topY - 0.05, -0.01);
  if (ex.includes('salakot')) put(head, M(new THREE.ConeGeometry(0.3, 0.15, 24), mat(0xc8a15a, { rough: 0.8 })), 0, topY + 0.02, 0);
  if (ex.includes('buri')) {
    put(head, M(new THREE.CylinderGeometry(0.08, 0.11, 0.1, 20), mat(0xd9b77a, { rough: 0.85 })), 0, topY + 0.01, -0.01);
    put(head, M(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 24), mat(0xd9b77a, { rough: 0.85 })), 0, topY - 0.04, -0.01);
  }
  if (ex.includes('glasses')) {
    const eyeY = headY + 0.085 * (st.scale || 1);
    for (const sx of [-1, 1]) put(head, M(new THREE.TorusGeometry(0.021, 0.0028, 6, 20), metalMat), sx * 0.033, eyeY, 0.072);
    put(head, M(new THREE.BoxGeometry(0.022, 0.003, 0.003), metalMat), 0, eyeY + 0.004, 0.075);
  }
  if (ex.includes('collar')) put(bones.Neck, M(new THREE.BoxGeometry(0.03, 0.022, 0.004), mat(0xffffff, { rough: 0.5 })), 0, headY - 0.06, 0.068);
  if (ex.includes('cross')) {
    put(bones.Spine2, M(new THREE.BoxGeometry(0.014, 0.06, 0.006), metalMat), 0, headY - 0.3, 0.12);
    put(bones.Spine2, M(new THREE.BoxGeometry(0.04, 0.012, 0.006), metalMat), 0, headY - 0.285, 0.12);
  }
  if (ex.includes('towel')) put(bones.Neck, M(new THREE.TorusGeometry(0.1, 0.03, 8, 20), mat(0xffffff, { rough: 0.95 })), 0, headY - 0.12, -0.01, Math.PI / 2 + 0.25, 0, 0);
  if (ex.includes('flower')) put(head, M(new THREE.SphereGeometry(0.025, 12, 10), mat(0xff5a8a, { rough: 0.6 })), 0.08, topY - 0.06, 0.03);
  if (ex.includes('curlers')) for (const x of [-0.04, 0, 0.04]) put(head, M(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), mat(0xf48fb1, { rough: 0.4 })), x, topY - 0.01, 0.02, 0, 0, Math.PI / 2);
  if (ex.includes('apron')) put(bones.Pelvis, M(new THREE.BoxGeometry(0.32, 0.5, 0.01), mat(0xf4f0e6, { rough: 0.9 })), 0, headY - 0.75, 0.13, -0.05, 0, 0);
  if (ex.includes('pamaypay')) put(bones.R_Hand, M(new THREE.CircleGeometry(0.13, 18, 0, Math.PI), mat(0xd9b77a, { rough: 0.7 })), -0.0, headY - 0.75, 0.15, 0, 0, Math.PI / 2);
  if (st.dress > 8 && st.bottom == null) {
    // palda ng daster: mula baywang hanggang ibaba ng tuhod
    const sc0 = PERSON_SCALE * (st.scale || 1);
    const waist = 98 * sc0, hem = st.dress * sc0;
    const prof = [[0.14, waist + 0.04], [0.165, waist - 0.05], [0.19, waist - 0.25], [0.215, (waist + hem) / 2], [0.235, hem]].map(([x, y]) => new THREE.Vector2(x * (st.scale || 1), y));
    const sk = M(new THREE.LatheGeometry(prof, 32), dressMat(st));
    sk.scale.z = 0.8;
    put(bones.Pelvis, sk, 0, 0, 0.005);
  }
  let horse = null;
  if (st.headCut) {
    horse = horseHead();
    const hs = st.scale || 1;
    horse.scale.setScalar(hs * 1.15);
    put(head, horse, 0, headY + 0.1 * hs, 0.06 * hs, 0.45, 0, 0); // nakayuko
  }
  let torch = false;
  if (ex.includes('torch')) {
    const hand = bones.R_Hand;
    const b = new THREE.Vector3();
    hand.getWorldPosition(b);
    const t = new THREE.Group();
    const stick = M(new THREE.CylinderGeometry(0.018, 0.026, 0.8, 8), mat(0x4a2a12, { rough: 0.9 }));
    stick.position.y = 0.25;
    t.add(stick);
    const f = M(new THREE.ConeGeometry(0.07, 0.3, 10), hot(4, 1.6, 0.3));
    f.position.y = 0.8;
    t.add(f);
    flames.push(f);
    g.add(t);
    t.position.copy(g.worldToLocal(b.clone()));
    torch = { obj: t, hand };
  }
  const sex = st.sex;
  const mixer = new THREE.AnimationMixer(model);
  const rig = { model, bones, mixer, sex, actions: {}, cur: null, kind: 'idle', timer: 2 + Math.random() * 6, look: 0, lookP: 0, blink: 2 + Math.random() * 4, twitch: 4 + Math.random() * 8, tw: 0, headY, topY, torch, talkT: 0, hunch: st.hunch || 0, horse, style: o.style };
  g.userData.rig = rig;
  g.userData.parts = null;
  const names = [...ANIMS[sex].idle, ...ANIMS[sex].talk, ...(o.crowd || o.angry ? ANIMS[sex].angry : [])];
  Promise.all(names.map(loadClip)).then((clips) => {
    clips.forEach((c) => (rig.actions[c.name] = mixer.clipAction(c)));
    playClip(rig, o.crowd || o.angry ? pick(ANIMS[sex].angry) : ANIMS[sex].idle[0], 0);
  });
  if (g.userData.onRig) g.userData.onRig(rig);
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function playClip(rig, name, fade = 0.5) {
  const a = rig.actions[name];
  if (!a || rig.cur === a) return;
  a.reset();
  a.time = Math.random() * a.getClip().duration;
  a.play();
  if (rig.cur) rig.cur.crossFadeTo(a, fade, false);
  rig.cur = a;
}

// Bawat frame: galaw, titig sa player, kurap, ngisi, kislot
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const _ax = new THREE.Vector3(), _vh = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function rotWorld(b, axis, ang) {
  if (!b || Math.abs(ang) < 1e-4) return;
  b.getWorldQuaternion(_qa);
  _qa.premultiply(_qb.setFromAxisAngle(axis, ang));
  b.parent.getWorldQuaternion(_qc);
  b.quaternion.copy(_qc.invert().multiply(_qa));
  b.updateMatrixWorld(true);
}
function worldYaw(n) {
  let y = 0;
  for (let o = n; o && o !== scene; o = o.parent) y += o.rotation.y;
  return y;
}
function humanTick(n, dt, s = {}) {
  const r = n.userData.rig;
  if (!r) return;
  const A = ANIMS[r.sex];
  const want = s.crowd ? 'angry' : s.talking ? 'talk' : 'idle';
  r.timer -= dt;
  if (want !== r.kind || r.timer <= 0) {
    r.kind = want;
    r.timer = want === 'idle' ? 6 + Math.random() * 9 : 4 + Math.random() * 4;
    playClip(r, pick(A[want] || A.idle));
  }
  if (r.cur) r.cur.timeScale = s.crowd ? 1.1 : 0.85 - creep.value * 0.2;
  r.mixer.update(dt);
  r.model.updateMatrixWorld(true);
  const B = r.bones;
  const facing = worldYaw(n);
  const live = !!r.cur;
  // ang mata ay walang track: ibalik muna sa orihinal
  for (const e of [B.LEye, B.REye]) { if (!e) continue; if (!e.userData.q0) e.userData.q0 = e.quaternion.clone(); e.quaternion.copy(e.userData.q0); }
  // kuba (lola, tikbalang)
  if (r.hunch && live) {
    _ax.set(Math.cos(facing), 0, -Math.sin(facing));
    rotWorld(B.Spine1, _ax, r.hunch * 0.6);
    rotWorld(B.Neck, _ax, -r.hunch * 0.4);
  }
  if (r.torch) {
    r.torch.hand.getWorldPosition(_vh);
    r.torch.obj.position.copy(n.worldToLocal(_vh)).add(new THREE.Vector3(0, -0.15, 0));
    const tt = performance.now() / 700 + n.id;
    r.torch.obj.rotation.set(Math.sin(tt) * 0.12, 0, Math.cos(tt * 1.3) * 0.12);
  }
  if (s.stare !== false && B.Head && live) {
    B.Head.getWorldPosition(_vh);
    const dx = camera.position.x - _vh.x, dz = camera.position.z - _vh.z, dy = camera.position.y - _vh.y;
    let yaw = Math.atan2(dx, dz) - facing;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const close = Math.hypot(dx, dz) < (s.range || 14);
    const tYaw = close ? Math.max(-1.2, Math.min(1.2, yaw)) : 0;
    const tPitch = close ? Math.max(-0.5, Math.min(0.5, Math.atan2(dy, Math.hypot(dx, dz)))) : 0;
    const sp = 2 + creep.value * 6;
    r.look = lerp(r.look, tYaw, Math.min(1, dt * sp));
    r.lookP = lerp(r.lookP, tPitch, Math.min(1, dt * sp));
    rotWorld(B.Neck, _up, r.look * 0.45);
    rotWorld(B.Head, _up, r.look * 0.55);
    _ax.set(Math.cos(facing + r.look), 0, -Math.sin(facing + r.look));
    rotWorld(B.Head, _ax, -r.lookP * 0.8);
    r.twitch -= dt;
    if (r.twitch < 0) { r.twitch = 3 + Math.random() * (10 - creep.value * 6); r.tw = 0.18; }
    _ax.set(Math.sin(facing), 0, Math.cos(facing));
    if (r.tw > 0) {
      r.tw -= dt;
      rotWorld(B.Head, _ax, Math.sin(r.tw * 60) * 0.12 * Math.max(creep.value, r.horse ? 1 : 0));
    }
    rotWorld(B.Head, _ax, creep.value * 0.18 * Math.sin(performance.now() / 4000 + n.id));
    for (const e of [B.LEye, B.REye]) rotWorld(e, _up, Math.max(-0.35, Math.min(0.35, yaw - r.look)));
  }
  // kurap: bihira; sa gabi nakadilat nang malaki
  r.blink -= dt;
  if (r.blink < 0) r.blink = 3 + Math.random() * 5 + creep.value * 8;
  const closing = r.blink < 0.11;
  for (const bn of ['LEyeBlinkTop', 'REyeBlinkTop']) {
    const b = B[bn];
    if (!b) continue;
    if (!b.userData.base) b.userData.base = b.position.clone();
    b.position.copy(b.userData.base);
    b.position.y += closing ? 0.9 : -creep.value * 0.3;
  }
  r.talkT += dt;
  for (const [bn, sx] of [['LMouthCorner', 1], ['RMouthCorner', -1]]) {
    const b = B[bn];
    if (!b) continue;
    if (!b.userData.base) b.userData.base = b.position.clone();
    b.position.copy(b.userData.base);
    const grin = creep.value > 0.6 ? (creep.value - 0.6) * 2.5 : 0;
    b.position.x += sx * grin * 0.5;
    b.position.y += grin * 0.4;
  }
  for (const bn of ['LUpperlip', 'RUpperlip']) {
    const b = B[bn];
    if (!b) continue;
    if (!b.userData.base) b.userData.base = b.position.clone();
    b.position.copy(b.userData.base);
    if (s.talking) b.position.y += Math.abs(Math.sin(r.talkT * 13 + Math.sin(r.talkT * 4) * 2)) * 0.35;
  }
  // panga ng kabayo
  if (r.horse) r.horse.userData.jaw.rotation.x = 0.08 + Math.max(0, Math.sin(r.talkT * 2.3)) * 0.35 + (s.talking ? Math.abs(Math.sin(r.talkT * 9)) * 0.25 : 0);
}

// person(): agad nagbabalik ng Group; ang katawan ay ilalagay kapag na-load na
function person(o) {
  const g = new THREE.Group();
  g.userData.o = o;
  g.userData.parts = null;
  const style = o.style && STYLES[o.style] ? o.style : o.key && STYLES[o.key] ? o.key : 'v2';
  loadTemplate(style).then((tpl) => buildPerson(g, Object.assign({}, o, { style }), tpl)).catch((e) => {
    console.warn('person fallback', style, e);
    const s = personSimple(o);
    for (const c of [...s.children]) g.add(c);
    g.userData.parts = s.userData.parts;
    g.userData.blink = s.userData.blink;
  });
  return g;
}

// Larawan ng mukha para sa dialogue box: kinukunan ang totoong 3D na tauhan
let portraitRenderer = null;
const portraitCacheW = {};
function portraitSource(id) {
  if (id === 'you') return player;
  if (id === 'manananggal') return mng && mng.userData.body;
  if (id === 'whitelady') return scareActors.whitelady;
  return npcs[id];
}
function portraitOf(id, w = 256, h = 288) {
  const ck = id + (creep.value > 0.6 ? ':n' : ':d') + w;
  if (portraitCacheW[ck]) return portraitCacheW[ck];
  const src = portraitSource(id);
  if (!src || !src.userData.rig) return null;
  try {
    if (!portraitRenderer) {
      portraitRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      portraitRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    portraitRenderer.setSize(w, h, false);
    const ps = new THREE.Scene();
    ps.background = new THREE.Color(0x0a0606);
    ps.fog = new THREE.Fog(0x0a0606, 1.2, 3.2);
    ps.add(new THREE.HemisphereLight(0xd8e0e8, 0x201010, 0.6));
    const key = new THREE.DirectionalLight(0xffe0c0, 2.8);
    const rim = new THREE.DirectionalLight(0xff3a2a, 1.6);
    rim.position.set(-2, 1.4, -1.5);
    ps.add(key, rim);
    const c = SkeletonUtils.clone(src.userData.rig.model);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    ps.add(c);
    c.updateMatrixWorld(true);
    // tuwid na pose (nakaharap sa camera), hindi ang kasalukuyang galaw
    c.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); });
    c.updateMatrixWorld(true);
    let hb = null;
    c.traverse((b) => { if (b.isBone && /Bip01_Head$/.test(b.name)) hb = b; });
    const hp = hb ? hb.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.62, 0);
    const tall = src.userData.rig.horse ? 0.12 : 0;
    const cam = new THREE.PerspectiveCamera(src.userData.rig.horse ? 30 : 20, w / h, 0.05, 20);
    cam.position.set(hp.x + 0.12, hp.y + 0.1 + tall, hp.z + 0.95 + tall * 2);
    cam.lookAt(hp.x, hp.y + 0.06 + tall, hp.z);
    key.position.set(hp.x + 0.6, hp.y - 0.4, hp.z + 1.5); // ilaw mula sa ibaba, parang flashlight
    key.target.position.copy(hp);
    ps.add(key.target);
    portraitRenderer.render(ps, cam);
    portraitCacheW[ck] = portraitRenderer.domElement.toDataURL('image/jpeg', 0.9);
    return portraitCacheW[ck];
  } catch (e) {
    console.warn('portrait', e);
    return null;
  }
}

// ---------------- Mga nilalang ----------------
// Tikbalang: payat at napakatangkad na katawan (mahahabang biyas), ulo ng kabayo
function tikbalangModel() {
  const g = person({ style: 'tik', angry: true });
  g.userData.radius = 1.4;
  g.userData.tall = true;
  g.userData.headY = 3.7;
  g.userData.twitch = 0;
  return g;
}
function animateTikbalang(n, time, dt) {
  if (n.userData.rig) {
    n.userData.rig.hunch = 0.35;
    humanTick(n, dt, { range: 30 });
  }
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
    const m = def.tall ? tikbalangModel() : person(Object.assign({ key: id }, def.o));
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
// ============================================================
//  DUGO — mga mantsa sa lupa, pader, at pinto (lumilitaw lang sa gabi)
// ============================================================
function bloodTexture(kind, seed) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), R = rng(seed);
  const blob = (cx, cy, r, a) => {
    const g = x.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, `rgba(92,0,6,${a})`);
    g.addColorStop(0.7, `rgba(145,8,12,${a * 0.95})`);
    g.addColorStop(1, 'rgba(120,8,10,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
  };
  if (kind === 'splat') {
    blob(128, 128, 70, 1);
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, d = 40 + R() * 80;
      blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 4 + R() * 16, 0.9);
    }
    for (let i = 0; i < 9; i++) {
      // tilamsik na pahaba
      const a = R() * Math.PI * 2;
      x.strokeStyle = 'rgba(90,2,6,0.9)';
      x.lineWidth = 2 + R() * 5;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(128 + Math.cos(a) * 50, 128 + Math.sin(a) * 50);
      x.lineTo(128 + Math.cos(a) * (90 + R() * 30), 128 + Math.sin(a) * (90 + R() * 30));
      x.stroke();
    }
  } else if (kind === 'drops') {
    for (let i = 0; i < 18; i++) blob(20 + R() * 216, 20 + R() * 216, 3 + R() * 10, 0.95);
  } else if (kind === 'drag') {
    // bakas ng kinaladkad
    for (let k = 0; k < 4; k++) {
      x.strokeStyle = `rgba(${110 + k * 10},4,8,${0.6 - k * 0.1})`;
      x.lineWidth = 26 - k * 5 + R() * 6;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(128 + (R() - 0.5) * 30, 0);
      for (let y = 0; y <= S; y += 32) x.lineTo(128 + (R() - 0.5) * 34 + (k - 1.5) * 12, y);
      x.stroke();
    }
    for (let i = 0; i < 14; i++) blob(128 + (R() - 0.5) * 120, R() * S, 3 + R() * 9, 0.9);
  } else if (kind === 'hand') {
    x.fillStyle = "rgba(140,6,10,0.92)";
    x.beginPath();
    x.ellipse(128, 160, 52, 60, 0, 0, Math.PI * 2);
    x.fill();
    const fingers = [[-48, -40, -0.5], [-22, -82, -0.12], [6, -92, 0], [32, -82, 0.12], [-80, 10, -1.1]];
    for (const [fx, fy, r] of fingers) {
      x.save();
      x.translate(128 + fx, 160 + fy);
      x.rotate(r);
      x.beginPath();
      x.ellipse(0, 0, 13, 40, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    // tumutulong dugo pababa
    for (let i = 0; i < 5; i++) {
      x.lineWidth = 4 + R() * 5;
      x.strokeStyle = 'rgba(95,3,7,0.9)';
      x.beginPath();
      const sx = 90 + R() * 80;
      x.moveTo(sx, 190);
      x.lineTo(sx + (R() - 0.5) * 4, 210 + R() * 46);
      x.stroke();
    }
  }
  // dumi/tekstura para hindi plain
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (R() - 0.5) * 30;
    img.data[i] = Math.max(0, img.data[i] + n);
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const bloodMats = {};
function bloodMat(kind) {
  if (!bloodMats[kind]) {
    bloodMats[kind] = new THREE.MeshStandardMaterial({
      map: bloodTexture(kind, kind.length * 31 + 7), transparent: true, depthWrite: false,
      roughness: 0.18, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
  }
  return bloodMats[kind];
}
const bloodGroup = new THREE.Group();
const BLOOD_PLANE = new THREE.PlaneGeometry(1, 1);
// sa lupa: (x, z, laki, ikot); sa pader: may normal
function bloodFloor(kind, x, z, w, h = w, r = 0, parent = bloodGroup, y = 0.035) {
  const m = new THREE.Mesh(BLOOD_PLANE, bloodMat(kind));
  m.rotation.set(-Math.PI / 2, 0, r);
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.renderOrder = 2;
  parent.add(m);
  return m;
}
function bloodWall(kind, x, y, z, ry, w, h = w) {
  const m = new THREE.Mesh(BLOOD_PLANE, bloodMat(kind));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.scale.set(w, h, 1);
  m.renderOrder = 2;
  bloodGroup.add(m);
  return m;
}
function buildBlood() {
  // Paligid ng tuod ng balete: malaking mantsa at bakas ng kinaladkad papunta sa gubat
  bloodFloor('splat', 2.8, -59.6, 3.2, 3.2, 0.4);
  bloodFloor('drag', -1.5, -57, 1.4, 6, 0.5);
  bloodFloor('drops', -4.2, -52, 2.4, 2.4, 1.2);
  bloodFloor('splat', -4, -68, 2.2, 2.2, 2.1);
  // pahid sa ibabaw ng tuod
  bloodFloor('drops', 0.6, -64.3, 2.5, 2.5, 0.9, bloodGroup, 2.09);
  // patak-patak sa daan sa gubat
  for (let z = -46; z > -52; z -= 3.2) bloodFloor('drops', (z % 2) * 0.6, z, 1.6, 1.6, z);
  bloodFloor('drag', 0.3, -38, 1.1, 5, 0.1);
  // malapit sa kubo ni Tonyo
  bloodFloor('splat', -31.5, -26.5, 1.8, 1.8, 0.7);
  bloodFloor('drops', -28.8, -24.2, 1.8, 1.8, 2.2);
  // tatak ng kamay sa pinto ng simbahan
  bloodWall('hand', 15.6, 1.5, -8.78, 0, 0.6, 0.7);
  bloodWall('hand', 14.3, 1.1, -8.78, 0.15, 0.5, 0.6);
  bloodFloor('drops', 15, -7.4, 1.8, 1.8, 0.3);
  // palayan
  bloodFloor('splat', 46, -6, 2.4, 2.4, 1.7);
  bloodFloor('drag', 43.5, -7.5, 1.2, 4.5, 1.3);
  bloodGroup.visible = false;
  scene.add(bloodGroup);
}

function buildCrowds() {
  const R = rng(99);
  const tops = [0x5a2a2a, 0x3a3a5a, 0x4a4a2a, 0x2a4a3a, 0x5a4a3a];
  for (let i = 0; i < 14; i++) {
    const p = person({ key: ['v1', 'v2', 'v3', 'v4', 'kardo', 'v5', 'tonyo'][i % 7], crowd: true, skin: 0x8a5a3a, hair: 'short', hairC: 0x111111, top: tops[i % tops.length], bottom: 0x2a2a2a, extra: i % 2 ? ['torch'] : [] });
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
    const p = person({ key: ['v4', 'v1', 'v5', 'v2', 'v3', 'v4', 'v1', 'v5'][i], skin: [0xb97a50, 0xa8703f, 0xc68a5e][i % 3], hair: i % 3 ? 'short' : 'ponytail', hairC: 0x1a1a1a, top: cols[i], bottom: 0x3b3b4a, skirt: i % 4 === 1 });
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
  player = person({ key: 'v2', skin: 0xb07a52, hair: 'short', hairC: 0x1a1a1a, top: 0x3f7fbf, bottom: 0x2e3f5e, extra: ['backpack'] });
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
  start: [2, 36, -1.747], // nakaharap kay Lola sa hintayan
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
  day: { sky: 0x8ec5ea, fog: 0xbcd8ea, near: 60, far: 230, hs: 0xdfefff, hg: 0x5a6a3a, hi: 1.25, sun: 0xfff2d8, si: 2.5, dir: [0.5, 1, 0.35], night: 0, mtn: 1 },
  dusk: { sky: 0xe08a6a, fog: 0xc07a7a, near: 45, far: 190, hs: 0xffc8a0, hg: 0x3a2a3a, hi: 1.0, sun: 0xff9a5a, si: 1.8, dir: [-1, 0.3, 0.25], night: 0.45, mtn: 0.6 },
  night: { sky: 0x0b1230, fog: 0x10183a, near: 25, far: 125, hs: 0x5a6aaa, hg: 0x161622, hi: 1.15, sun: 0x9fb4ff, si: 0.95, dir: [0.4, 1, -0.5], night: 1, mtn: 0.15 },
  fog: { sky: 0x3a4250, fog: 0x7c8696, near: 2, far: 26, hs: 0x8a96aa, hg: 0x202428, hi: 1.0, sun: 0x9fb4ff, si: 0.45, dir: [0.4, 1, -0.5], night: 1, mtn: 0 },
  dawn: { sky: 0xf0c3a0, fog: 0xd8b8a8, near: 40, far: 200, hs: 0xffe0c8, hg: 0x4a4a3a, hi: 1.15, sun: 0xffc890, si: 1.9, dir: [1, 0.35, 0.2], night: 0.15, mtn: 0.8 },
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
  for (const m of glowMats) m.emissiveIntensity = cur.night * 0.75;
  bloodGroup.visible = cur.night > 0.55;
  creep.value = 0.35 + cur.night * 0.65;
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
  if (obj.userData.rig) {
    if (obj.visible) humanTick(obj, dt, { stare: false });
    return;
  }
  const p = obj.userData.parts;
  if (!p) return;
  const sw = speed > 0.1 ? Math.sin(phaseRef) * Math.min(0.7, 0.3 + speed * 0.06) : 0;
  const k = speed > 0.1 ? 1 : Math.min(1, dt * 10);
  p.legL.rotation.x = lerp(p.legL.rotation.x, sw, k);
  p.legR.rotation.x = lerp(p.legR.rotation.x, -sw, k);
  if (!p.noSwing) p.armR.rotation.x = lerp(p.armR.rotation.x, sw * 0.8, k);
  p.armL.rotation.x = lerp(p.armL.rotation.x, -sw * 0.8, k);
}

// ---------------- NPC brain ----------------
let speakerId = null; // sino ang nagsasalita ngayon (para sa bibig at kumpas)
function blinkTick(n, dt) {
  const p = n.userData.parts, ud = n.userData;
  if (!p || !p.eyes) return;
  ud.blink -= dt;
  if (ud.blink < 0) ud.blink = 2 + Math.random() * 4;
  const closed = ud.blink < 0.12 ? 0.1 : 1;
  for (const e of p.eyes) e.scale.y = closed;
}
// Ang bawat taga-barrio ay may "home". Kapag malayo ang player, naglalakad-lakad sila
// sa paligid nito; kapag lumapit ka o may usapan, humihinto sila at humaharap sa iyo.
function npcBrain(n, id, dt, time, dist, faceAng, canWander, range = 1.6) {
  const ud = n.userData, p = ud.parts;
  if (!ud.rig && (!p || !p.torso)) return;
  // Kung inilipat ng kuwento/cine ang NPC, iyon ang bagong home
  if (!ud.home || !ud.last || Math.abs(n.position.x - ud.last.x) > 0.01 || Math.abs(n.position.z - ud.last.z) > 0.01) {
    ud.home = n.position.clone();
    ud.target = null;
    ud.wait = 1 + Math.random() * 3;
    ud.seed = ud.seed ?? Math.random() * 100;
    ud.phase = 0;
  }
  const near = dist < 6.5;
  const talking = id && speakerId === id && (Game.mode === 'play' || Game.mode === 'choice');
  let speed = 0;
  if (canWander && !near && !ud.rig) {
    if (!ud.target) {
      ud.wait -= dt;
      if (ud.wait <= 0) {
        const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * range;
        ud.target = new THREE.Vector3(ud.home.x + Math.cos(a) * r, 0, ud.home.z + Math.sin(a) * r);
      }
    } else {
      const tx = ud.target.x - n.position.x, tz = ud.target.z - n.position.z, d = Math.hypot(tx, tz);
      if (d < 0.15) {
        ud.target = null;
        ud.wait = 2 + Math.random() * 5;
      } else {
        speed = 1.05;
        n.rotation.y = lerpAngle(n.rotation.y, Math.atan2(tx, tz), Math.min(1, dt * 5));
        const ox = n.position.x, oz = n.position.z;
        n.position.x += (tx / d) * speed * dt;
        n.position.z += (tz / d) * speed * dt;
        collide(n.position, 0.35);
        // naharangan: maghanap ng ibang puntahan
        if (Math.hypot(n.position.x - ox, n.position.z - oz) < speed * dt * 0.3) { ud.target = null; ud.wait = 0.5; }
      }
    }
  } else if (near || !canWander) {
    ud.target = null;
    if (dist < 12) n.rotation.y = lerpAngle(n.rotation.y, faceAng, Math.min(1, dt * 4));
  }
  if (ud.rig) {
    const look = near && dist < 12 ? 0 : speed === 0 ? Math.sin(time * 0.37 + ud.seed) * 0.6 * Math.max(0, Math.sin(time * 0.13 + ud.seed * 2)) : 0;
    humanTick(n, dt, { talking, range: 16 });
    ud.last = n.position.clone();
    return;
  }
  ud.phase += dt * speed * 4.2;
  animateWalk(n, speed, dt, ud.phase);
  // hinga
  const br = Math.sin(time * 1.6 + ud.seed);
  p.torso.scale.set(1 + br * 0.008, 1 + br * 0.012, 1 + br * 0.015);
  p.torso.position.y = 0.8 + (speed > 0 ? Math.abs(Math.sin(ud.phase)) * 0.04 : 0);
  // lingon-lingon kapag walang ginagawa, titig sa player kapag malapit
  let hy = 0, hx = 0;
  if (near && dist < 12) {
    hy = 0;
    hx = -0.08;
  } else if (speed === 0) {
    hy = Math.sin(time * 0.37 + ud.seed) * 0.5 * Math.max(0, Math.sin(time * 0.13 + ud.seed * 2));
    hx = Math.sin(time * 0.23 + ud.seed) * 0.08;
  }
  p.head.rotation.y = lerp(p.head.rotation.y, hy, Math.min(1, dt * 3));
  p.head.rotation.x = lerp(p.head.rotation.x, hx + (talking ? Math.sin(time * 5) * 0.04 : 0), Math.min(1, dt * 3));
  blinkTick(n, dt);
  // bibig at kumpas ng kamay habang nagsasalita
  if (p.mouth) p.mouth.scale.y = 0.022 * (talking ? 1 + Math.abs(Math.sin(time * 14 + Math.sin(time * 5) * 2)) * 3.5 : 1);
  if (speed === 0 && !p.noSwing) {
    const g = talking ? Math.sin(time * 2.6 + ud.seed) : 0;
    p.armR.rotation.x = lerp(p.armR.rotation.x, talking ? -0.55 + g * 0.35 : Math.sin(time * 1.6 + ud.seed) * 0.03, Math.min(1, dt * 4));
    p.armR.rotation.z = lerp(p.armR.rotation.z, talking ? 0.25 + g * 0.1 : 0.06, Math.min(1, dt * 4));
    p.armL.rotation.z = lerp(p.armL.rotation.z, talking ? -0.15 - Math.max(0, -g) * 0.25 : -0.06, Math.min(1, dt * 4));
  }
  ud.last = n.position.clone();
}

function update(dt, time) {
  const mode = window.Game ? Game.mode : 'title';
  stepTime(Math.min(1, dt * 1.2));
  updateIntro(dt);

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

  // ---- mga NPC: buhay na galaw (lakad-lakad, hinga, kurap, lingon, kumpas habang nagsasalita) ----
  const calm = mode === 'explore' && !hunt.active && !cine.active;
  for (const [id, n] of Object.entries(npcs)) {
    if (!n.visible) continue;
    const dx = player.position.x - n.position.x, dz = player.position.z - n.position.z;
    const dist = Math.hypot(dx, dz);
    const p = n.userData.parts;
    if (scareHold > 0 && scareRestore && n === scareRestore.n) {
      // nakaharap sa camera habang nanggugulat
      n.rotation.y = Math.atan2(camera.position.x - n.position.x, camera.position.z - n.position.z);
    } else if (n.userData.tall) {
      if (dist < 12) n.rotation.y = lerpAngle(n.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
    } else {
      npcBrain(n, id, dt, time, dist, Math.atan2(dx, dz), calm);
    }
    if (n.userData.tall) animateTikbalang(n, time, dt);
  }
  if (villagers.visible) for (const v of villagers.children) npcBrain(v, null, dt, time, v.position.distanceTo(player.position), Math.atan2(player.position.x - v.position.x, player.position.z - v.position.z), mode === 'explore' || mode === 'title', 3.5);
  if (crowd.visible) {
    // nagkukumpulan: umuugoy, tinataas-baba ang sulo, sumisigaw
    crowd.children.forEach((c, i) => {
      if (c.userData.rig) {
        humanTick(c, dt, { crowd: true, range: 22 });
        return;
      }
      const p = c.userData.parts;
      if (!p) return;
      const s = time * 2.2 + i * 1.3;
      p.torso.rotation.z = Math.sin(s * 0.5) * 0.05;
      p.torso.rotation.x = 0.04 + Math.sin(s * 0.7) * 0.04;
      p.head.rotation.y = Math.sin(s * 0.31) * 0.4;
      if (p.noSwing) p.armR.rotation.x = -0.5 + Math.max(0, Math.sin(s * 1.6)) * -0.6;
      else p.armL.rotation.x = Math.max(0, Math.sin(s * 1.6 + 1)) * -2.2;
      c.position.y = Math.max(0, Math.sin(s * 1.6)) * 0.05;
      blinkTick(c, dt);
    });
  }
  for (const f of flames) f.scale.set(1, 0.75 + Math.random() * 0.5, 1);
  if (scareHold > 0) {
    scareHold -= dt;
    const n = scareRestore.n, f = scareRestore.f;
    const k = 1 - scareHold; // 0 → 1
    const dist = 1.7 - Math.min(1, k * 2.2) * 1.15; // sumusugod
    n.position.set(camera.position.x + f.x * dist + Math.sin(time * 47) * 0.03, Math.sin(time * 40) * 0.04 + scareRestore.y, camera.position.z + f.z * dist);
    if (n.userData.rig) humanTick(n, dt, { crowd: true, range: 40 });
    scareLight.position.set(camera.position.x + f.x * (dist - 0.5), camera.position.y - 0.2, camera.position.z + f.z * (dist - 0.5));
    scareLight.intensity = Math.random() < 0.45 ? 0.4 : 3.5;
    if (scareHold <= 0) {
      n.visible = scareRestore.v;
      n.position.copy(scareRestore.p);
      n.rotation.y = scareRestore.r;
      scareLight.intensity = 0;
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
  // Itaas na katawan ng babae na putol sa baywang, may bituka, pakpak ng paniki at mahabang buhok
  mng = new THREE.Group();
  const body = person({ style: 'mng', angry: true });
  body.position.set(0, -1.0, 0);
  mng.add(body);
  mng.userData.body = body;
  const guts = entrails();
  guts.position.set(0, 0.04, 0);
  mng.add(guts);
  mng.userData.guts = guts;
  // patak ng dugo mula sa hiwa
  const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0x400006 }));
  drip.position.set(0.04, -0.3, 0.02);
  mng.add(drip);
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.position.set(-0.1, 0.42, -0.12);
  wr.position.set(0.1, 0.42, -0.12);
  wl.add(batWing(-1));
  wr.add(batWing(1));
  mng.add(wl, wr);
  mng.userData.wl = wl;
  mng.userData.wr = wr;
  mng.visible = false;
  scene.add(mng);

  // Ang naiwang ibabang katawan: nakatayo sa dilim, bukas ang hiwa
  lowerBody = new THREE.Group();
  const legs = person({ style: 'mngLow' });
  lowerBody.add(legs);
  lowerBody.userData.legs = legs;
  const gl = entrails();
  gl.scale.set(0.8, 0.35, 0.8);
  gl.position.set(0, 1.08, 0);
  gl.rotation.x = Math.PI;
  lowerBody.add(gl);
  bloodFloor('splat', 0.2, 0.1, 2.2, 2.2, 0.6, lowerBody, 0.03);
  bloodFloor('drag', 1.6, 1.4, 0.9, 3, 2.4, lowerBody, 0.03);
  lowerBody.visible = false;
  scene.add(lowerBody);
  // i-load na agad ang mga panakot para handa sa jumpscare
  setTimeout(() => { scareActorFor('whitelady'); scareActorFor('sakristan'); }, 0);
}
// Mga panakot na wala sa listahan ng NPC
const scareActors = {};
function sheetGhost() {
  // kumot na multo (kalokohan ng sakristan... pero nakakatakot pa rin sa dilim)
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, y = 1.85 - t * 1.85;
    const r = t < 0.15 ? Math.sin((t / 0.15) * Math.PI / 2) * 0.17 : 0.17 + (t - 0.15) * 0.38;
    prof.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const geo = new THREE.LatheGeometry(prof, 40);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
    const k = Math.max(0, 1.4 - y) * 0.06;
    p.setX(i, p.getX(i) + Math.sin(a * 7 + y * 4) * k);
    p.setZ(i, p.getZ(i) + Math.cos(a * 5 + y * 3) * k);
  }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.95, side: THREE.DoubleSide }));
  cloth.castShadow = true;
  g.add(cloth);
  const hole = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), hole);
    e.position.set(sx * 0.06, 1.72, 0.165);
    e.scale.y = 1.4;
    g.add(e);
  }
  return g;
}
function scareActorFor(type) {
  if (type === 'tikbalang') return npcs.tikbalang;
  if (type === 'manananggal') return mng;
  if (type === 'beth') return npcs.beth;
  if (type === 'whitelady') {
    if (!scareActors.whitelady) {
      scareActors.whitelady = person({ style: 'whitelady' });
      scareActors.whitelady.visible = false;
      scene.add(scareActors.whitelady);
    }
    return scareActors.whitelady;
  }
  if (type === 'sakristan') {
    if (!scareActors.sheet) {
      scareActors.sheet = sheetGhost();
      scareActors.sheet.visible = false;
      scene.add(scareActors.sheet);
    }
    return scareActors.sheet;
  }
  return null;
}
const scareLight = new THREE.PointLight(0xff1a10, 0, 5, 1.8);
scene.add(scareLight);
const SCARE_HEAD = { tikbalang: 3.7, manananggal: 0.62, beth: 1.65, whitelady: 1.65, sakristan: 1.7 };
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
  mng.userData.wl.rotation.set(0, 0.35, -f * 0.65);
  mng.userData.wr.rotation.set(0, -0.35, f * 0.65);
  if (mng.visible) {
    const b = mng.userData.body;
    if (b.userData.rig) humanTick(b, dt, { crowd: true, range: 40 });
    mng.userData.guts.rotation.set(Math.sin(time * 2.7) * 0.18, 0, Math.sin(time * 2.1) * 0.12);
  }
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
    speakerId = who && npcs[who] ? who : null;
    if (who && who !== 'you' && npcs[who] && npcs[who].visible) focusId = who;
    else if (!focusId || !npcs[focusId] || !npcs[focusId].visible) {
      focusId = (chars || []).find((c) => npcs[c] && npcs[c].visible) || null;
    }
  },
  // Jumpscare: ang mismong nilalang (3D) ay biglang susugod sa harap ng camera
  scare(type = 'tikbalang') {
    const n = scareActorFor(type);
    if (!n) return false;
    if (scareHold > 0 && scareRestore && scareRestore.n !== n) {
      scareRestore.n.visible = scareRestore.v;
      scareRestore.n.position.copy(scareRestore.p);
    }
    if (scareHold <= 0 || scareRestore.n !== n) scareRestore = { n, v: n.visible, p: n.position.clone(), r: n.rotation.y };
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.y = 0;
    f.normalize();
    scareRestore.f = f;
    scareRestore.y = camera.position.y - (SCARE_HEAD[type] || 1.65) + (type === 'manananggal' ? 0 : 0.05);
    n.rotation.y = Math.atan2(-f.x, -f.z);
    n.visible = true;
    scareHold = 1.1;
    return true;
  },
  bark: (text) => showBark(text),
  // simula ng laro: sakay ng jeep → bababa → si Lola
  intro: (done, onCaption) => startIntro(done, onCaption),
  skipIntro: () => { if (intro.active) intro.t = Math.max(intro.t, INTRO_T.step - 0.05); },
  portrait: (id, w, h) => portraitOf(id, w, h),
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
  _dbg: () => ({ hunt, mng: mng.position, lower: lowerBody.position, player: player.position, scene, renderer, npcs, sun, bloom, villagers, step: (dt) => update(dt, performance.now() / 1000) }),
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
buildPlants();
buildBalete();
buildKubo();
buildScenery();
buildSky();
buildNPCs();
buildCrowds();
buildPlayer();
buildManananggal();
buildBlood();
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

World.titleMode();
stepTime(1);

// ---------------- Post-processing (bloom + tone mapping) ----------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.6, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
bloom.enabled = GFX === 'high';

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function setGraphics(q) {
  GFX = q === 'low' ? 'low' : 'high';
  try { localStorage.setItem('sanisidro.gfx', GFX); } catch (e) {}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, GFX === 'high' ? 1.5 : 1));
  bloom.enabled = GFX === 'high';
  renderer.shadowMap.type = GFX === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.needsUpdate = true;
  scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
  resize();
}
World.setGraphics = setGraphics;
World.getGraphics = () => GFX;

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  shaderTime.value = now / 1000;
  update(dt, now / 1000);
  if (renderer.domElement.width && renderer.domElement.height) composer.render(dt);
  if (cine.onFrame) cine.onFrame(dt, renderer.domElement);
});
