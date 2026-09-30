// ============================================================
//  ART — lahat ng graphics ay ginuguhit gamit ang SVG (pixel style).
//  Walang image files kaya napakagaan ng laro.
//  Backgrounds: 320x180 na "pixels". Characters: 32x64 na "pixels".
// ============================================================
(function () {
  const r = (x, y, w, h, c, o) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${o != null ? ` opacity="${o}"` : ''}/>`;
  const poly = (pts, c, o) => `<polygon points="${pts}" fill="${c}"${o != null ? ` opacity="${o}"` : ''}/>`;
  const circ = (x, y, rad, c, o) =>
    `<circle cx="${x}" cy="${y}" r="${rad}" fill="${c}"${o != null ? ` opacity="${o}"` : ''}/>`;
  const txt = (x, y, s, size, c) =>
    `<text x="${x}" y="${y}" font-family="monospace" font-weight="bold" font-size="${size}" fill="${c}" text-anchor="middle">${s}</text>`;
  const wrap = (body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">${body}</svg>`;

  // Seeded random para pare-pareho ang itsura tuwing bubuksan
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const bands = (colors, y0, h) => colors.map((c, i) => r(0, y0 + i * h, 320, h + 1, c)).join('');
  function stars(n, seed, maxY) {
    const R = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = Math.floor(R() * 320), y = Math.floor(R() * maxY), big = R() > 0.85;
      s += r(x, y, big ? 2 : 1, big ? 2 : 1, '#ffffff', (0.4 + R() * 0.6).toFixed(2));
    }
    return s;
  }

  // ---------- Mga bahagi ----------
  function coconut(x, y, h) {
    let s = '';
    for (let i = 0; i < h; i += 4) {
      const dx = Math.round(Math.sin(i / 14) * 3);
      s += r(x + dx, y - i, 3, 4, i % 8 ? '#7a5a3a' : '#664a2f');
    }
    const tx = x + Math.round(Math.sin(h / 14) * 3) + 1, ty = y - h;
    const g = '#3f7d3a', d = '#2d6130';
    s += r(tx - 13, ty - 1, 13, 2, g) + r(tx - 17, ty + 1, 5, 2, g) + r(tx - 19, ty + 3, 3, 2, g);
    s += r(tx + 1, ty - 1, 13, 2, g) + r(tx + 13, ty + 1, 5, 2, g) + r(tx + 17, ty + 3, 3, 2, g);
    s += r(tx - 8, ty - 5, 7, 2, d) + r(tx + 2, ty - 5, 7, 2, d) + r(tx - 3, ty - 4, 6, 4, d);
    s += r(tx - 1, ty + 1, 2, 2, '#5a3d1e') + r(tx + 1, ty + 2, 2, 2, '#4a3218');
    return s;
  }

  function jeepney(x, y) {
    let s = '';
    s += r(x + 4, y - 6, 66, 6, '#c0392b') + r(x + 4, y - 7, 66, 1, '#e74c3c');
    s += txt(x + 37, y - 2, 'SAN ISIDRO', 4.5, '#f1c40f');
    s += r(x, y, 74, 20, '#dfe3e8') + r(x + 74, y + 6, 14, 14, '#cfd4da');
    s += r(x + 8, y + 3, 56, 7, '#2c3e50');
    for (let i = 0; i < 5; i++) s += r(x + 18 + i * 11, y + 3, 2, 7, '#dfe3e8');
    s += r(x, y + 12, 88, 2, '#1e5aa8') + r(x, y + 14, 88, 2, '#f1c40f') + r(x, y + 16, 88, 1, '#c0392b');
    s += r(x + 86, y + 9, 3, 9, '#95a5a6') + r(x + 86, y + 7, 3, 2, '#f9e79f');
    s += r(x + 80, y + 2, 3, 4, '#bdc3c7') + r(x + 78, y + 1, 3, 2, '#bdc3c7'); // kabayong palamuti
    s += circ(x + 16, y + 21, 6, '#1b1b1b') + circ(x + 16, y + 21, 2, '#7f8c8d');
    s += circ(x + 72, y + 21, 6, '#1b1b1b') + circ(x + 72, y + 21, 2, '#7f8c8d');
    return s;
  }

  function banderitas(y0, sag, rows) {
    const cols = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#ffffff'];
    let s = '';
    for (let row = 0; row < rows; row++) {
      for (let x = 0; x < 320; x += 10) {
        const y = Math.round(y0 + row * 18 + sag * Math.sin((Math.PI * x) / 320));
        s += r(x, y - 1, 10, 1, '#2b2b2b', 0.7);
        s += poly(`${x},${y} ${x + 8},${y} ${x + 4},${y + 7}`, cols[(x / 10 + row * 3) % cols.length]);
      }
    }
    return s;
  }

  function crowdWithTorches() {
    const R = rng(11);
    let s = '';
    for (let i = 0; i < 16; i++) {
      const x = i * 21 - 6 + Math.floor(R() * 6), y = 150 + Math.floor(R() * 8);
      if (i % 3 === 1) {
        s += r(x + 12, y - 30, 2, 30, '#4a2a12');
        s += `<g class="flicker">${r(x + 10, y - 38, 6, 8, '#ff8c1a')}${r(x + 11, y - 42, 4, 5, '#ffd23f')}</g>`;
        s += circ(x + 13, y - 36, 18, '#ff9a3c', 0.16);
      }
      s += r(x, y, 17, 40, '#140b0b') + circ(x + 8, y - 5, 6, '#140b0b');
    }
    return s;
  }

  // ---------- Backgrounds ----------
  function kalsada() {
    let b = bands(['#7fb4d9', '#94c1dc', '#b0d0da', '#d3dccb', '#efd5a4', '#f4c68a'], 0, 16);
    b += circ(252, 44, 11, '#fff1c1') + circ(252, 44, 20, '#fff1c1', 0.25);
    b += r(40, 24, 30, 5, '#ffffff', 0.7) + r(48, 20, 18, 4, '#ffffff', 0.7) + r(170, 30, 36, 5, '#ffffff', 0.6);
    // Bulkang Mayon sa malayo
    b += poly('30,96 92,34 98,34 164,96', '#6f8fa3') + poly('84,42 92,34 98,34 106,42 100,46 92,44', '#e8eef2');
    b += poly('150,96 210,66 280,80 320,72 320,96', '#5f8a6b');
    // Palayan
    b += r(0, 92, 320, 40, '#7cb342');
    for (let i = 0; i < 7; i++) b += r(0, 94 + i * 6, 320, 2, i % 2 ? '#8bc34a' : '#689f38');
    b += coconut(20, 120, 50) + coconut(58, 116, 40) + coconut(292, 122, 56) + coconut(268, 118, 38);
    // Kalsada
    b += r(0, 130, 320, 50, '#8d7b68') + r(0, 130, 320, 3, '#a8957f') + r(0, 177, 320, 3, '#6e5f50');
    for (let x = 6; x < 320; x += 30) b += r(x, 154, 14, 2, '#e8dcc0');
    b += jeepney(118, 118);
    // Waiting shed
    b += r(12, 136, 34, 3, '#6b4a2e') + r(14, 139, 3, 18, '#6b4a2e') + r(41, 139, 3, 18, '#6b4a2e') + r(10, 132, 38, 4, '#c0392b');
    return wrap(b);
  }

  function bahay() {
    let b = '';
    for (let x = 0; x < 320; x += 20) b += r(x, 0, 20, 132, (x / 20) % 2 ? '#6e4527' : '#7a4e2d') + r(x, 0, 1, 132, '#4d2f18');
    b += r(0, 0, 320, 8, '#3e2512');
    // Bintanang capiz
    b += r(104, 18, 112, 76, '#3b2414');
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 5; j++) b += r(108 + i * 15, 22 + j * 14, 13, 12, j < 2 ? '#e9dcc0' : '#d8c6a0', 0.85);
    b += r(158, 18, 4, 76, '#3b2414');
    b += r(98, 94, 124, 5, '#4d2f18');
    // Altar na may Santo Niño
    b += r(16, 96, 58, 36, '#4a2c17') + r(14, 92, 62, 5, '#5b3620');
    b += r(40, 72, 10, 20, '#b71c1c') + r(42, 66, 6, 6, '#e0b089') + r(41, 63, 8, 3, '#d4af37') + r(37, 74, 16, 3, '#d4af37');
    b += r(24, 84, 3, 8, '#f5f0e0') + r(24, 81, 3, 3, '#ffcc4d') + r(62, 84, 3, 8, '#f5f0e0') + r(62, 81, 3, 3, '#ffcc4d');
    b += circ(25, 82, 10, '#ffcf70', 0.18) + circ(63, 82, 10, '#ffcf70', 0.18);
    // Gasera
    b += r(262, 30, 1, 40, '#2b1a0e') + r(256, 70, 14, 3, '#8a6d3b') + r(259, 73, 8, 12, '#d4a24c') + r(261, 64, 4, 6, '#ffd35a');
    b += circ(263, 72, 34, '#ffcf70', 0.14) + circ(263, 72, 16, '#ffcf70', 0.2);
    // Sahig na kawayan
    for (let i = 0; i < 8; i++) b += r(0, 132 + i * 6, 320, 6, i % 2 ? '#b88d52' : '#c9a063');
    b += r(0, 132, 320, 2, '#7a5a30');
    // Banig
    b += r(170, 150, 110, 24, '#d9b77a');
    for (let i = 0; i < 11; i++) b += r(172 + i * 10, 150, 4, 24, '#c29a58');
    b += r(0, 0, 320, 180, '#1a0f2a', 0.22);
    return wrap(b);
  }

  function plaza(mode) {
    const day = mode === 'day';
    let b = day
      ? bands(['#6fb3e0', '#86c1e6', '#9fcdea', '#b8dbee', '#d2e8f0'], 0, 27)
      : bands(['#0c1230', '#111a40', '#17224f', '#1e2b5e', '#26346b'], 0, 27);
    b += day ? circ(272, 26, 12, '#fff4c2') + circ(272, 26, 22, '#fff4c2', 0.25) : stars(70, 7, 90) + circ(266, 26, 9, '#f3efd5') + circ(266, 26, 18, '#f3efd5', 0.12);
    const hc = day ? '#9aa6b0' : '#141a33', hr = day ? '#7a4a3a' : '#0e1226';
    for (let i = 0; i < 6; i++) {
      const x = 128 + i * 32, y = 92 - (i % 2) * 10;
      b += r(x, y, 26, 44, hc) + poly(`${x - 3},${y} ${x + 13},${y - 12} ${x + 29},${y}`, hr);
      b += r(x + 9, y + 12, 8, 8, day ? '#5b6770' : '#ffcf70', day ? 1 : 0.8);
    }
    // Simbahan
    const cw = day ? '#e6d5b8' : '#3a3550', cd = day ? '#c4ae8a' : '#2a2640';
    b += r(24, 58, 96, 78, cw) + poly('18,60 72,34 126,60', cd);
    b += r(52, 20, 40, 40, cw) + poly('48,22 72,6 96,22', cd);
    b += r(70, 0, 4, 10, '#d4af37') + r(66, 3, 12, 3, '#d4af37');
    b += r(64, 30, 16, 18, '#3b2a1a') + circ(72, 40, 5, '#b8860b');
    b += r(58, 100, 28, 36, '#4a2e17') + r(62, 96, 20, 4, '#4a2e17') + r(71, 100, 2, 36, '#2e1c0e');
    const win = day ? '#5a6f8a' : '#ffcf70';
    b += r(34, 76, 12, 18, win) + r(98, 76, 12, 18, win) + r(34, 72, 12, 4, cd) + r(98, 72, 12, 4, cd);
    // Lupa ng plaza
    const g = day ? '#c2ae90' : '#3a332f', gl = day ? '#a8957a' : '#2c2623';
    b += r(0, 134, 320, 46, g);
    for (let x = 0; x < 320; x += 20) b += r(x, 134, 1, 46, gl);
    b += r(0, 152, 320, 1, gl) + r(0, 168, 320, 1, gl);
    // Entablado
    b += r(186, 108, 124, 26, '#7a5230') + r(186, 104, 124, 4, '#9b6b3f');
    for (let x = 190; x < 310; x += 12) b += r(x, 110, 1, 24, '#5a3a20');
    b += r(188, 66, 4, 40, '#5a3a20') + r(304, 66, 4, 40, '#5a3a20');
    b += r(196, 68, 104, 14, '#c0392b') + txt(248, 78, 'MALIGAYANG PISTA', 7, '#fdd835');
    b += banderitas(10, 10, 3);
    if (!day) {
      const R = rng(5);
      for (let x = 4; x < 320; x += 14) {
        const y = Math.round(58 + 8 * Math.sin((Math.PI * x) / 320));
        b += r(x, y, 2, 2, '#ffe28a') + circ(x + 1, y + 1, 4, '#ffe28a', (0.15 + R() * 0.15).toFixed(2));
      }
    }
    if (mode === 'torch') b += r(0, 0, 320, 180, '#ff4a1a', 0.1) + crowdWithTorches();
    if (day) {
      // mga taong nagdiriwang
      const R = rng(21), cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#f06292'];
      for (let i = 0; i < 14; i++) {
        const x = i * 23 + Math.floor(R() * 8), y = 152 + Math.floor(R() * 10);
        b += r(x, y, 10, 22, cols[i % cols.length]) + r(x + 2, y - 7, 6, 7, '#b9825a') + r(x + 2, y - 8, 6, 2, '#2a1a12');
      }
    }
    return wrap(b);
  }

  function kubo(mode) {
    const fire = mode === 'fire';
    let b = fire
      ? bands(['#1a0707', '#3b0d0d', '#6b1a12', '#a3301a', '#d9531e'], 0, 25)
      : bands(['#2d1b4e', '#4a2a66', '#7a3b6e', '#b8586a', '#e07a5f'], 0, 25);
    if (!fire) b += circ(70, 118, 16, '#ffb070') + circ(70, 118, 28, '#ffb070', 0.2);
    // Mga puno sa likod
    const R = rng(3), tc = fire ? '#140606' : '#1d2a1e';
    for (let i = 0; i < 14; i++) {
      const x = i * 24 + Math.floor(R() * 10) - 6, h = 30 + Math.floor(R() * 40);
      b += r(x, 118 - h, 22, h + 4, tc) + r(x - 4, 118 - h + 6, 30, 10, tc);
    }
    b += r(0, 118, 320, 62, fire ? '#1f1410' : '#3d4a2a') + r(0, 118, 320, 2, fire ? '#2a1a12' : '#4d5c33');
    // Bahay kubo
    const wall = fire ? '#3b2a1a' : '#b89660', roof = fire ? '#2a1c10' : '#8a6d3b', post = '#5b4020';
    for (const x of [142, 170, 198, 222]) b += r(x, 108, 4, 30, post);
    b += r(134, 104, 98, 6, '#6b4a2a');
    b += r(140, 78, 86, 28, wall);
    for (let y = 80; y < 106; y += 4) b += r(140, y, 86, 1, fire ? '#2a1c10' : '#9c7c4a');
    b += poly('124,82 183,38 242,82', roof);
    for (let i = 0; i < 8; i++) b += r(136 + i * 12, 70 + (i % 2) * 4, 2, 10, fire ? '#1a1008' : '#6f5530');
    b += r(164, 86, 18, 13, '#2a1a0e') + r(166, 88, 14, 9, fire ? '#ff6a1a' : '#ffb347');
    b += r(196, 84, 16, 22, '#4a3218');
    // Hagdan
    b += r(200, 110, 2, 28, post) + r(212, 110, 2, 28, post);
    for (let y = 114; y < 138; y += 6) b += r(200, y, 14, 2, post);
    // Halamang saging
    b += r(270, 90, 4, 40, '#4b6b2a') + poly('272,90 250,78 256,92', '#5b8c32') + poly('272,90 296,76 290,92', '#5b8c32') + poly('272,92 262,64 276,86', '#6aa13a');
    if (!fire) {
      b += r(170, 70, 6, 4, '#d8d0c8', 0.35) + r(174, 62, 8, 5, '#d8d0c8', 0.25) + r(170, 54, 10, 5, '#d8d0c8', 0.15);
      b += circ(173, 92, 20, '#ffb347', 0.14);
    } else {
      b += `<g class="flicker">`;
      for (let i = 0; i < 9; i++) {
        const x = 132 + i * 11, h = 14 + ((i * 7) % 12);
        b += r(x, 80 - (i % 3) * 6 - h, 8, h, '#ff6a1a') + r(x + 2, 86 - (i % 3) * 6 - h, 4, h - 6, '#ffd23f');
      }
      b += `</g>` + circ(183, 70, 70, '#ff7a2a', 0.18);
      b += r(150, 0, 60, 40, '#1a1010', 0.5) + r(160, 20, 50, 30, '#1a1010', 0.4);
    }
    return wrap(b);
  }

  function gubat(mode) {
    const dawn = mode === 'dawn', deep = mode === 'deep';
    let b = dawn
      ? bands(['#2b3a67', '#49587f', '#7b7f9e', '#c9a2a0', '#f0c3a0'], 0, 27)
      : bands(['#04060d', '#070b16', '#0b1221', '#0f182b', '#131e33'], 0, 27);
    if (!dawn) b += stars(40, 3, 70) + circ(252, 30, 11, '#e9f0ff') + circ(252, 30, 22, '#e9f0ff', 0.1);
    const R = rng(9), far = dawn ? '#2f3d3a' : '#0c1512';
    for (let i = 0; i < 17; i++) {
      const w = 8 + Math.floor(R() * 12), x = i * 20 + Math.floor(R() * 6) - 4, h = 50 + Math.floor(R() * 46);
      b += r(x, 130 - h, w, h, far) + r(x - 9, 130 - h - 8, w + 18, 14, far);
    }
    b += r(0, 0, 24, 180, '#050807') + r(20, 40, 24, 4, '#050807') + r(296, 0, 24, 180, '#050807') + r(278, 60, 20, 4, '#050807');
    b += r(0, 128, 320, 52, dawn ? '#2f3a24' : '#0a120c');
    for (let i = 0; i < 30; i++) b += r(Math.floor(R() * 320), 128 + Math.floor(R() * 50), 2, 3, dawn ? '#3f4d2e' : '#101c12');
    // Tuod ng balete
    b += r(116, 128, 88, 8, '#2e231a') + r(124, 122, 72, 8, '#34281d');
    b += r(132, 100, 56, 26, '#3d2f22');
    for (const x of [136, 148, 160, 172, 182]) b += r(x, 100, 2, 26, '#2a2018');
    b += r(132, 96, 56, 6, '#8b7355') + r(140, 97, 40, 3, '#a08566') + r(152, 98, 16, 1, '#6e5a42');
    b += r(110, 132, 14, 3, '#2e231a') + r(196, 132, 16, 3, '#2e231a');
    if (dawn) {
      b += r(159, 112, 2, 16, '#5a3d1e') + r(152, 106, 7, 4, '#6abf4b') + r(161, 104, 7, 4, '#6abf4b') + r(155, 99, 7, 5, '#7ed957');
      b += r(126, 130, 9, 3, '#4c8a3a') + r(137, 131, 9, 3, '#4c8a3a') + r(186, 130, 12, 3, '#e8e0d0');
      b += r(0, 0, 320, 180, '#ffd8a8', 0.08);
    } else {
      for (let i = 0; i < 12; i++) b += r(40 + Math.floor(R() * 240), 70 + Math.floor(R() * 70), 1, 1, '#fff27a', 0.9);
    }
    const fogA = deep ? 0.22 : 0.1;
    b += `<g class="fog">${r(-30, 108, 380, 12, '#cfd8e6', fogA)}${r(-30, 122, 380, 18, '#cfd8e6', fogA + 0.03)}${r(-30, 150, 380, 30, '#cfd8e6', fogA)}</g>`;
    b += `<g class="fog slow">${r(-30, 86, 380, 10, '#cfd8e6', fogA - 0.04)}${r(-30, 138, 380, 10, '#cfd8e6', fogA)}</g>`;
    if (deep) b += r(0, 0, 320, 180, '#9aa6b8', 0.16);
    return wrap(b);
  }

  // ---------- Characters (32x64 pixels) ----------
  function person(o) {
    const s = o.skin, h = o.hairC, t = o.top, bt = o.bottom, shade = 'rgba(0,0,0,.18)';
    let b = '';
    if (o.hair === 'ponytail') b += r(21, 7, 4, 13, h) + r(22, 19, 3, 3, h);
    // binti at paa
    b += r(11, 54, 4, 7, s) + r(17, 54, 4, 7, s) + r(10, 61, 5, 3, '#2b1d14') + r(17, 61, 5, 3, '#2b1d14');
    // pang-ibaba
    if (o.skirt) {
      b += r(8, 38, 16, 21, bt) + r(7, 50, 18, 9, bt);
      if (o.stripes) for (let y = 42; y < 58; y += 4) b += r(7, y, 18, 1, o.stripes);
    } else {
      b += r(10, 38, 12, 17, bt) + r(15, 44, 2, 11, shade);
    }
    // katawan at braso
    b += r(9, 20, 14, 19, t) + r(6, 21, 3, 15, t) + r(23, 21, 3, 15, t);
    b += r(9, 36, 14, 1, shade);
    b += r(6, 36, 3, 3, s) + r(23, 36, 3, 3, s);
    // leeg at ulo
    b += r(14, 17, 4, 4, s) + r(10, 5, 12, 13, s) + r(10, 16, 12, 2, shade);
    b += r(12, 11, 2, 2, '#1b1b1b') + r(18, 11, 2, 2, '#1b1b1b') + r(15, 15, 2, 1, '#7a3b2e');
    b += r(11, 13, 2, 1, '#e0877a', 0.5) + r(19, 13, 2, 1, '#e0877a', 0.5);
    // buhok
    switch (o.hair) {
      case 'bun':
        b += r(9, 3, 14, 5, h) + r(9, 5, 2, 8, h) + r(21, 5, 2, 8, h) + r(13, 0, 6, 4, h);
        break;
      case 'short':
        b += r(9, 3, 14, 4, h) + r(9, 5, 2, 4, h) + r(21, 5, 2, 4, h) + r(12, 7, 5, 1, h);
        break;
      case 'ponytail':
        b += r(9, 3, 14, 4, h) + r(9, 5, 2, 6, h) + r(21, 5, 2, 5, h) + r(10, 7, 6, 2, h) + r(21, 6, 3, 2, '#e53935');
        break;
      case 'curly':
        b += r(8, 2, 16, 5, h) + r(7, 4, 3, 10, h) + r(22, 4, 3, 10, h);
        b += r(10, 1, 3, 2, h) + r(15, 0, 3, 2, h) + r(20, 1, 3, 2, h) + r(11, 7, 3, 2, h) + r(18, 7, 3, 2, h);
        break;
    }
    // mga dagdag
    const ex = o.extra || [];
    if (ex.includes('wrinkles')) b += r(11, 9, 3, 1, shade) + r(18, 9, 3, 1, shade) + r(13, 16, 1, 1, shade) + r(18, 16, 1, 1, shade);
    if (ex.includes('glasses')) b += r(11, 10, 4, 1, '#3b3b3b') + r(17, 10, 4, 1, '#3b3b3b') + r(11, 13, 4, 1, '#3b3b3b') + r(17, 13, 4, 1, '#3b3b3b') + r(15, 11, 2, 1, '#3b3b3b');
    if (ex.includes('beard')) b += r(12, 16, 8, 2, '#bdbdbd') + r(14, 18, 4, 1, '#bdbdbd') + r(14, 14, 4, 1, '#bdbdbd');
    if (ex.includes('salakot')) {
      b += r(4, 5, 24, 2, '#c8a15a') + r(7, 3, 18, 2, '#b58d48') + r(11, 1, 10, 2, '#c8a15a') + r(15, 0, 2, 1, '#8a6d3b');
      b += r(9, 7, 2, 4, '#cfcfcf') + r(21, 7, 2, 4, '#cfcfcf');
    }
    if (ex.includes('barong')) {
      b += r(15, 21, 2, 15, '#d8caa4') + r(11, 24, 2, 2, '#d8caa4') + r(19, 24, 2, 2, '#d8caa4') + r(11, 30, 2, 2, '#d8caa4') + r(19, 30, 2, 2, '#d8caa4');
    }
    if (ex.includes('kimona')) b += r(9, 20, 14, 3, '#fff') + r(12, 23, 8, 1, '#d6cdb8') + r(13, 26, 6, 1, '#d6cdb8');
    if (ex.includes('pamaypay')) b += r(24, 30, 6, 6, '#f7c948') + r(25, 31, 1, 5, '#c79a2a') + r(27, 31, 1, 5, '#c79a2a');
    if (ex.includes('pouch')) b += r(20, 34, 5, 6, '#7a5a2a') + r(20, 33, 5, 1, '#5a3d1e');
    if (ex.includes('flower')) b += r(20, 3, 3, 3, '#ffffff') + r(21, 4, 1, 1, '#fdd835');
    if (ex.includes('tee')) b += r(13, 25, 6, 5, '#ffffff', 0.85) + r(15, 26, 2, 3, '#e86a8a');
    if (ex.includes('apron')) b += r(10, 24, 12, 22, '#5fa8d3') + r(12, 30, 8, 5, '#4a8cb8');
    if (ex.includes('curlers')) b += r(10, 1, 3, 3, '#f48fb1') + r(15, 0, 3, 3, '#f48fb1') + r(20, 1, 3, 3, '#f48fb1');
    if (ex.includes('towel')) b += r(8, 19, 16, 3, '#ffffff') + r(20, 22, 3, 7, '#ffffff');
    if (ex.includes('buri')) b += r(5, 4, 22, 2, '#d9b77a') + r(9, 1, 14, 3, '#c9a768');
    if (ex.includes('collar')) b += r(14, 20, 4, 2, '#ffffff') + r(15, 24, 2, 7, '#333333') + r(13, 26, 6, 2, '#333333');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64" shape-rendering="crispEdges">${b}</svg>`;
  }

  function tikbalang() {
    const body = '#2a1e16', head = '#3b2a1f', mane = '#0b0b0b', gold = '#ffd54a';
    let b = '';
    b += r(18, 0, 7, 28, mane) + r(22, 20, 4, 10, mane);
    b += r(20, 5, 1, 7, gold) + r(22, 11, 1, 7, gold) + r(19, 16, 1, 6, gold);
    b += r(11, 0, 2, 3, head) + r(16, 0, 2, 3, head);
    b += r(10, 2, 10, 12, head) + r(8, 10, 9, 11, head) + r(8, 18, 9, 2, '#2a1c14');
    b += r(9, 17, 1, 1, '#000') + r(12, 17, 1, 1, '#000');
    b += r(11, 6, 2, 2, '#ff3b3b') + r(16, 6, 2, 2, '#ff3b3b') + r(11, 6, 1, 1, '#ffd0d0') + r(16, 6, 1, 1, '#ffd0d0');
    b += r(13, 20, 8, 5, body);
    b += r(9, 24, 16, 17, body);
    for (let y = 27; y < 38; y += 3) b += r(11, y, 12, 1, '#1a120c');
    b += r(5, 24, 4, 27, body) + r(25, 24, 4, 27, body);
    b += r(4, 51, 1, 3, '#d9d0c0') + r(6, 51, 1, 3, '#d9d0c0') + r(8, 51, 1, 3, '#d9d0c0');
    b += r(25, 51, 1, 3, '#d9d0c0') + r(27, 51, 1, 3, '#d9d0c0') + r(29, 51, 1, 3, '#d9d0c0');
    b += r(11, 41, 4, 10, body) + r(10, 50, 4, 8, body) + r(19, 41, 4, 10, body) + r(20, 50, 4, 8, body);
    b += r(9, 58, 6, 6, '#111') + r(19, 58, 6, 6, '#111');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64" shape-rendering="crispEdges">${b}</svg>`;
  }

  // ---------- Jumpscare faces (32x32, full-screen) ----------
  const face = (body, bg) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${r(0, 0, 32, 32, bg)}${body}</svg>`;
  const SCARES = {
    // Si Aling Beth na naka-papaya mask at pipino sa mata
    beth: () => {
      let b = r(3, 2, 26, 9, '#4a2a1a') + r(2, 6, 5, 20, '#4a2a1a') + r(25, 6, 5, 20, '#4a2a1a');
      b += r(6, 1, 4, 3, '#f48fb1') + r(14, 0, 4, 3, '#f48fb1') + r(22, 1, 4, 3, '#f48fb1');
      b += r(7, 8, 18, 21, '#c5e1a5') + r(9, 11, 3, 2, '#aed581') + r(20, 20, 3, 2, '#aed581') + r(8, 24, 2, 3, '#aed581');
      b += r(8, 12, 7, 6, '#558b2f') + r(9, 13, 5, 4, '#dcedc8') + r(11, 14, 1, 2, '#9ccc65');
      b += r(17, 12, 7, 6, '#558b2f') + r(18, 13, 5, 4, '#dcedc8') + r(20, 14, 1, 2, '#9ccc65');
      b += r(12, 20, 8, 7, '#3b0a0a') + r(13, 20, 6, 1, '#ffffff') + r(13, 26, 6, 1, '#ffffff') + r(15, 24, 2, 2, '#c2185b');
      b += r(5, 16, 2, 2, '#ffffff') + r(25, 16, 2, 2, '#ffffff');
      return face(b, '#3a0d12');
    },
    // White lady: mahabang itim na buhok, maputlang mukha
    whitelady: () => {
      let b = r(6, 1, 20, 31, '#050505');
      b += r(10, 6, 12, 16, '#d8dce8') + r(10, 6, 12, 2, '#b8bccc');
      b += r(12, 10, 3, 5, '#000000') + r(17, 10, 3, 5, '#000000') + r(13, 12, 1, 1, '#ff2020') + r(18, 12, 1, 1, '#ff2020');
      b += r(12, 15, 1, 3, '#6a0000') + r(19, 15, 1, 3, '#6a0000');
      b += r(14, 17, 4, 6, '#000000') + r(15, 22, 2, 1, '#000000');
      b += r(10, 6, 3, 12, '#050505') + r(19, 6, 3, 9, '#050505') + r(15, 6, 2, 3, '#050505');
      b += r(9, 24, 14, 8, '#e8e8f0') + r(6, 20, 4, 12, '#050505') + r(22, 20, 4, 12, '#050505');
      return face(b, '#000000');
    },
    // Mukha ng tikbalang (ginagamit sa 2D; sa 3D ay lumalapit ang mismong modelo)
    tikbalang: () => {
      let b = r(1, 0, 7, 32, '#0b0b0b') + r(24, 0, 7, 32, '#0b0b0b');
      b += r(8, 0, 16, 22, '#3b2a1f') + r(9, 0, 3, 3, '#2a1c14') + r(20, 0, 3, 3, '#2a1c14');
      b += r(9, 15, 14, 16, '#2e2018') + r(11, 22, 3, 2, '#000000') + r(18, 22, 3, 2, '#000000');
      b += r(9, 6, 5, 4, '#ff1a1a') + r(18, 6, 5, 4, '#ff1a1a') + r(10, 7, 2, 2, '#ffd0d0') + r(19, 7, 2, 2, '#ffd0d0');
      b += r(8, 5, 7, 1, '#1a0f0a') + r(17, 5, 7, 1, '#1a0f0a');
      b += r(10, 27, 12, 3, '#e8e0c8');
      for (let x = 11; x < 22; x += 2) b += r(x, 27, 1, 3, '#2e2018');
      b += r(26, 2, 1, 14, '#ffd54a') + r(28, 6, 1, 12, '#ffd54a');
      return face(b, '#1a0000');
    },
  };

  // Manananggal: maputlang mukha, pulang mata, pangil, pakpak ng paniki
  SCARES.manananggal = () => {
    let b = r(0, 4, 8, 20, '#2a1a22') + r(24, 4, 8, 20, '#2a1a22') + r(0, 2, 5, 4, '#2a1a22') + r(27, 2, 5, 4, '#2a1a22');
    b += r(7, 1, 18, 31, '#0a0a0a');
    b += r(10, 5, 12, 15, '#d8d0c8') + r(10, 5, 12, 2, '#b8b0a8');
    b += r(11, 9, 4, 3, '#ff1a1a') + r(17, 9, 4, 3, '#ff1a1a') + r(12, 10, 1, 1, '#ffffff') + r(18, 10, 1, 1, '#ffffff');
    b += r(10, 8, 5, 1, '#3a0000') + r(17, 8, 5, 1, '#3a0000');
    b += r(12, 14, 8, 5, '#3a0000') + r(12, 14, 2, 3, '#ffffff') + r(18, 14, 2, 3, '#ffffff') + r(14, 18, 4, 1, '#8a0000');
    b += r(13, 19, 1, 3, '#8a0000') + r(19, 19, 1, 4, '#8a0000');
    b += r(10, 21, 12, 6, '#d8d0c8') + r(9, 27, 14, 2, '#7a0000') + r(11, 29, 2, 3, '#a01010') + r(15, 29, 2, 3, '#6a0000') + r(19, 29, 2, 3, '#a01010');
    return face(b, '#12040a');
  };
  function manananggal() {
    let b = r(0, 10, 8, 14, '#2a1a22') + r(24, 10, 8, 14, '#2a1a22') + r(2, 8, 6, 3, '#2a1a22') + r(24, 8, 6, 3, '#2a1a22');
    b += r(9, 3, 14, 22, '#0a0a0a');
    b += r(10, 5, 12, 13, '#d8d0c8') + r(12, 10, 2, 2, '#ff1a1a') + r(18, 10, 2, 2, '#ff1a1a');
    b += r(13, 14, 6, 2, '#3a0000') + r(14, 16, 1, 1, '#ffffff') + r(17, 16, 1, 1, '#ffffff');
    b += r(10, 20, 12, 12, '#d8d0c8') + r(7, 21, 3, 10, '#d8d0c8') + r(22, 21, 3, 10, '#d8d0c8');
    b += r(10, 32, 12, 2, '#7a0000') + r(11, 34, 2, 5, '#a01010') + r(15, 34, 2, 7, '#6a0000') + r(19, 34, 2, 4, '#a01010');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 64" shape-rendering="crispEdges">${b}</svg>`;
  }

  // Si Bogs na sakristan: bigla siyang susulpot sa likod mo
  SCARES.sakristan = () => {
    let b = r(6, 2, 20, 8, '#1a1a1a') + r(6, 6, 3, 8, '#1a1a1a') + r(23, 6, 3, 8, '#1a1a1a');
    b += r(8, 7, 16, 18, '#b9825a');
    b += r(10, 12, 5, 5, '#ffffff') + r(17, 12, 5, 5, '#ffffff') + r(12, 13, 2, 3, '#1b1b1b') + r(19, 13, 2, 3, '#1b1b1b');
    b += r(10, 19, 12, 5, '#3b0a0a') + r(11, 19, 10, 2, '#ffffff') + r(15, 19, 2, 2, '#b9825a');
    b += r(6, 25, 20, 7, '#ffffff') + r(14, 25, 4, 7, '#c0392b');
    return face(b, '#2a1a3a');
  };

  window.ART = {
    scares: SCARES,
    backgrounds: {
      kalsada: kalsada,
      bahay: bahay,
      plaza: () => plaza('night'),
      plaza_sulo: () => plaza('torch'),
      umaga: () => plaza('day'),
      kubo: () => kubo('dusk'),
      kubo_sunog: () => kubo('fire'),
      gubat: () => gubat('night'),
      gubat_umaga: () => gubat('dawn'),
      gubat_hamog: () => gubat('deep'),
    },
    // mukha ng player (para sa dialogue box)
    player: { svg: () => person({ skin: '#b07a52', hair: 'short', hairC: '#1a1a1a', top: '#3f7fbf', bottom: '#2e3f5e' }) },
    // name = pangalang lalabas sa dialogue box
    characters: {
      lola: { name: 'Lola Ising', svg: () => person({ skin: '#c68a5e', hair: 'bun', hairC: '#d8d8d8', top: '#f3efe6', bottom: '#7b3f61', skirt: true, stripes: '#5a2a45', extra: ['wrinkles', 'glasses', 'kimona'] }) },
      tess: { name: 'Tess', svg: () => person({ skin: '#b97a50', hair: 'ponytail', hairC: '#2a1a12', top: '#e86a8a', bottom: '#3b5a8a', extra: ['tee'] }) },
      tonyo: { name: 'Mang Tonyo', svg: () => person({ skin: '#8e5a36', hair: 'short', hairC: '#cfcfcf', top: '#e9e2cf', bottom: '#6b5a45', extra: ['salakot', 'beard', 'wrinkles', 'pouch'] }) },
      beth: { name: 'Aling Beth', svg: () => person({ skin: '#c98d62', hair: 'curly', hairC: '#4a2a1a', top: '#d23c3c', bottom: '#d23c3c', skirt: true, stripes: '#b02e2e', extra: ['pamaypay', 'flower'] }) },
      kapitan: { name: 'Kapitan Ramon', svg: () => person({ skin: '#a8703f', hair: 'short', hairC: '#1a1a1a', top: '#f2ead3', bottom: '#2b2b2b', extra: ['barong'] }) },
      tikbalang: { name: 'Tikbalang', svg: tikbalang, tall: true },
      manananggal: { name: 'Manananggal', svg: manananggal },
      nena: { name: 'Aling Nena', svg: () => person({ skin: '#c68a5e', hair: 'bun', hairC: '#2a1a12', top: '#f6c1d0', bottom: '#6a4c93', skirt: true, stripes: '#58407a', extra: ['apron', 'curlers'] }) },
      padre: { name: 'Father Jun', svg: () => person({ skin: '#b07a52', hair: 'short', hairC: '#1a1a1a', top: '#f5f5f0', bottom: '#f5f5f0', skirt: true, extra: ['glasses', 'collar'] }) },
      kardo: { name: 'Mang Kardo', svg: () => person({ skin: '#8e5a36', hair: 'short', hairC: '#333333', top: '#6a8caf', bottom: '#5a4632', extra: ['buri', 'towel', 'wrinkles'] }) },
      bogs: { name: 'Bogs', svg: () => person({ skin: '#b9825a', hair: 'short', hairC: '#1a1a1a', top: '#ffffff', bottom: '#c0392b', skirt: true }) },
    },
  };
})();
