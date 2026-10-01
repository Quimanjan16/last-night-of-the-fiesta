// ============================================================
//  ENGINE — nagpapatakbo ng kwento: dialogue, pagpili, stats,
//  save/load, at mga wakas.
//  Kapag may 3D world (js/world.js), ang mga eksenang may `at`
//  ay kailangang puntahan muna ng player bago magsimula.
// ============================================================
(function () {
  const $ = (s) => document.querySelector(s);
  const KEYS = { save: 'sanisidro.save', auto: 'sanisidro.auto', endings: 'sanisidro.endings', settings: 'sanisidro.settings' };
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const POS = { left: 22, center: 50, right: 78 };
  const SPEEDS = [{ ms: 45 }, { ms: 22 }, { ms: 8 }, { ms: 0 }];
  // Wika: t('key') para sa interface, L({en, tl}) para sa teksto ng kwento
  const t = (k, v) => (window.I18N ? I18N.t(k, v) : k);
  const L = (v) => (window.I18N ? I18N.L(v) : v && typeof v === 'object' ? v.en : v);
  const speedLabel = () => t('speeds')[settings.speed];
  const W = () => window.World || null;
  const snd = (name) => window.Sound && Sound.play(name);

  let S = null; // estado ng laro
  let mode = 'title'; // title | explore | play | choice | ending
  let modalOpen = false;
  let typing = null;
  let settings = Object.assign({ speed: 1, scares: true }, store.get(KEYS.settings, {}));
  let scareUntil = 0;
  let currentBg = null;
  const bgCache = {}, charCache = {};

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (x) => String(L(x) ?? '').replace(/\{name\}/g, S ? S.name : '');
  const resolve = (v) => (typeof v === 'function' ? v(S) : v);
  const scene = () => STORY.scenes[S.scene];

  function fresh(name) {
    const stats = {};
    Object.keys(STORY.stats).forEach((k) => (stats[k] = 0));
    return { name, scene: STORY.start, line: 0, phase: 'talk', stats, flags: {}, world: {}, inv: {}, collected: {}, quests: {}, hp: 100, log: [], checkpoint: null };
  }

  // Ginagawang {who, text, chars, if, name} ang bawat linya
  function norm(l) {
    if (typeof l === 'string') return { text: l };
    if (l && typeof l === 'object' && !Array.isArray(l) && !('text' in l)) return { text: l };
    if (Array.isArray(l)) return Object.assign({ who: l[0], text: l[1] }, l[2] || {});
    return l;
  }
  const lines = () => scene().lines.map(norm).filter((l) => !l.if || l.if(S));

  function speakerName(l) {
    if (l.name) return L(l.name);
    if (!l.who) return '';
    if (l.who === 'you') return S.name;
    if (l.who === 'crowd') return t('crowd');
    const c = ART.characters[l.who];
    return c ? c.name : l.who;
  }

  // ---------------- Background (2D lang) ----------------
  function setBg(id) {
    if (W() || id === currentBg) return;
    currentBg = id;
    const make = ART.backgrounds[id];
    if (!make) return console.warn('Walang background na:', id);
    const html = bgCache[id] || (bgCache[id] = make());
    const layer = document.createElement('div');
    layer.className = 'bg-layer';
    layer.innerHTML = html;
    const bg = $('#bg');
    bg.appendChild(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('show')));
    setTimeout(() => {
      while (bg.children.length > 1) bg.removeChild(bg.firstChild);
    }, 900);
  }

  // ---------------- Portraits ----------------
  function charsFor(ls, upto) {
    let c = scene().chars || [];
    for (let i = 0; i <= upto && i < ls.length; i++) if (ls[i].chars) c = ls[i].chars;
    return c.map((s) => {
      const [id, pos] = s.split(':');
      return { id, pos: pos || 'center' };
    });
  }

  function renderChars(list, who) {
    const layer = $('#chars');
    const existing = {};
    layer.querySelectorAll('.char').forEach((el) => (existing[el.dataset.id] = el));
    const keep = new Set();
    list.forEach(({ id, pos }) => {
      const def = ART.characters[id];
      if (!def) return console.warn('Walang character na:', id);
      keep.add(id);
      let el = existing[id];
      if (!el || el.classList.contains('leaving')) {
        el = document.createElement('div');
        el.className = 'char' + (def.tall ? ' tall' : '');
        el.dataset.id = id;
        el.innerHTML = charCache[id] || (charCache[id] = def.svg());
        el.style.left = (POS[pos] ?? 50) + '%';
        layer.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      }
      el.style.left = (POS[pos] ?? 50) + '%';
      const speaking = who === id;
      el.classList.toggle('dim', !!who && !speaking && who !== 'you');
      el.classList.toggle('talking', speaking);
    });
    Object.entries(existing).forEach(([id, el]) => {
      if (!keep.has(id)) {
        el.classList.add('leaving');
        el.classList.remove('show');
        setTimeout(() => el.remove(), 450);
      }
    });
  }

  // ---------------- Text ----------------
  function stopTyping() {
    if (typing) clearInterval(typing.timer);
    typing = null;
  }
  function finishTyping() {
    if (!typing) return;
    $('#text').textContent = typing.full;
    stopTyping();
    $('#box').classList.add('ready');
  }
  function typeText(full) {
    stopTyping();
    const el = $('#text');
    $('#box').classList.remove('ready');
    const ms = SPEEDS[settings.speed].ms;
    if (!ms) {
      el.textContent = full;
      $('#box').classList.add('ready');
      return;
    }
    let i = 0;
    el.textContent = '';
    typing = {
      full,
      timer: setInterval(() => {
        i += 1;
        el.textContent = full.slice(0, i);
        if (full[i - 1] && full[i - 1] !== ' ') snd('blip');
        if (i >= full.length) finishTyping();
      }, ms),
    };
  }

  function showLine(instant, noLog) {
    const ls = lines();
    if (S.line >= ls.length) return endOfScene();
    const l = ls[S.line];
    const chars = charsFor(ls, S.line);
    renderChars(chars, l.who);
    if (W()) W().onLine(l, chars.map((c) => c.id));
    const name = speakerName(l);
    $('#nametag').textContent = fmt(name);
    setPortrait(l.who);
    if (l.sfx && !instant) snd(l.sfx);
    if (l.scare && !instant) jumpscare(l.scare);
    if (!instant) {
      if (l.give) [].concat(l.give).forEach((it) => giveItem(it));
      if (l.quest) [].concat(l.quest).forEach(startQuest);
      if (l.take) [].concat(l.take).forEach((it) => useItem(it));
    }
    $('#text').classList.toggle('narr', !l.who);
    const text = fmt(l.text);
    if (instant) {
      stopTyping();
      $('#text').textContent = text;
      $('#box').classList.add('ready');
    } else typeText(text);
    if (!noLog) {
      S.log.push({ who: fmt(name), text });
      if (S.log.length > 200) S.log.shift();
    }
  }

  // Maliit na mukha ng nagsasalita sa dialogue box
  const portraitCache = {};
  function setPortrait(who) {
    const el = $('#portrait');
    if (!el) return;
    const def = who === 'you' ? ART.player : ART.characters[who];
    if (!def) {
      el.innerHTML = '';
      $('#box').classList.remove('has-portrait');
      return;
    }
    const key = who;
    if (!portraitCache[key]) portraitCache[key] = def.svg().replace('viewBox="0 0 32 64"', 'viewBox="6 0 20 22"');
    if (el.dataset.who !== key) {
      el.innerHTML = portraitCache[key];
      el.dataset.who = key;
    }
    $('#box').classList.add('has-portrait');
  }

  // ---------------- Jumpscare ----------------
  function jumpscare(type, after) {
    const afterText = after ? fmt(after) : '';
    if (!settings.scares) {
      snd('boing');
      if (afterText && W()) W().bark(afterText);
      return;
    }
    scareUntil = performance.now() + 1100;
    snd('scare');
    if (window.Sound) Sound.scareMusic();
    const g = $('#game'), el = $('#scare');
    g.classList.remove('shake');
    void g.offsetWidth;
    g.classList.add('shake');
    if (W() && type === 'tikbalang') {
      // sa 3D: ang mismong tikbalang ang sumusugod sa camera
      W().scare();
      el.innerHTML = '';
      el.className = 'flash-only';
    } else {
      el.innerHTML = ART.scares[type] ? ART.scares[type]() : '';
      el.className = '';
    }
    void el.offsetWidth;
    el.classList.add('go');
    setTimeout(() => {
      el.classList.remove('go');
      g.classList.remove('shake');
      if (afterText && W()) W().bark(afterText);
    }, 1100);
  }

  // Musika at tunog sa paligid batay sa eksena
  function soundFor(sc) {
    const w = (S && S.world) || {};
    const time = w.time || 'day';
    const mood = (sc && sc.music) || (w.crowd ? 'tense' : w.place && w.place.tikbalang ? 'fog' : { day: 'day', dusk: 'dusk', night: 'night', fog: 'fog', dawn: 'dawn' }[time] || 'day');
    // mas makapal na grain at kupas na kulay kapag nakakatakot ang eksena
    $('#game').classList.toggle('scary', ['horror', 'eerie', 'hunt', 'fog'].includes(mood));
    if (!window.Sound) return;
    Sound.setScene(mood, {
      crickets: (time === 'night' || time === 'dusk') && !w.crowd,
      birds: time === 'day' || time === 'dawn',
      wind: time === 'fog',
      fire: !!w.fire,
    });
  }

  function advance() {
    if (mode !== 'play' || modalOpen) return;
    if (performance.now() < scareUntil) return;
    if (typing) return finishTyping();
    S.line += 1;
    showLine();
  }

  // ---------------- Scene flow ----------------
  function worldHints(sc) {
    const w = Object.assign({}, sc.world || {});
    delete w.teleport;
    return w;
  }

  function goto(id) {
    const sc = STORY.scenes[id];
    if (!sc) {
      console.error('Walang eksenang:', id);
      toast('Error: walang eksenang "' + id + '"', '#e2574c');
      return;
    }
    S.scene = id;
    S.line = 0;
    ensureState();
    S.phase = sc.survive && W() ? 'survive' : sc.at && W() ? 'explore' : 'talk';
    S.world = Object.assign({}, S.world, worldHints(sc));
    if (sc.effects) applyEffects(sc.effects);
    if (sc.set) Object.assign(S.flags, sc.set);
    if (sc.give) [].concat(sc.give).forEach((it) => giveItem(it));
    if (sc.quest) [].concat(sc.quest).forEach(startQuest);
    // 2D: walang malalakaran, kaya kusang makukuha ang mga gamit ng misyon
    if (!W() && sc.at && sc.at.startsWith('quest:')) autoCollect(sc.at.slice(6));
    checkQuests();
    store.set(KEYS.auto, S);
    soundFor(sc);
    if (W()) W().setup(S.world, { teleport: sc.world && sc.world.teleport });
    if (S.phase === 'survive') startSurvival();
    else if (S.phase === 'explore') startExplore();
    else enterScene();
  }

  // Malayang paglalakad hanggang marating ang `at` ng eksena
  function startExplore() {
    mode = 'explore';
    stopTyping();
    closeChoices();
    renderChars([], null);
    $('#game').classList.add('exploring');
    $('#objective-text').textContent = fmt(scene().goal || '');
    W().setObjective(scene().at, scene().walkScare || null);
    W().setEvents(Object.assign({}, scene().events || {}));
    renderStats();
    renderTracker();
    // natapos na ang misyon habang may kausap? ituloy na ang kwento
    const at = scene().at || '';
    if (at.startsWith('quest:') && S.quests && S.quests[at.slice(6)] === 'done') setTimeout(arrive, 700);
  }

  function arrive() {
    if (mode !== 'explore') return;
    S.phase = 'talk';
    store.set(KEYS.auto, S);
    W().setObjective(null);
    snd(scene().at.startsWith('loc:') ? 'arrive' : 'talk');
    enterScene();
  }

  function enterScene() {
    mode = 'play';
    $('#game').classList.remove('exploring');
    closeChoices();
    setBg(scene().bg);
    const ls = lines();
    if (S.line >= ls.length && ls.length) {
      // galing sa save habang may pagpipilian
      S.line = ls.length - 1;
      showLine(true);
      S.line = ls.length;
      endOfScene();
    } else showLine();
    renderStats();
  }

  function endOfScene() {
    const sc = scene();
    if (sc.ending) return showEnding(sc.ending);
    if (sc.choices) return showChoices(sc.choices.filter((c) => !c.if || c.if(S)));
    if (sc.next === '@back') return back();
    if (sc.next) return goto(resolve(sc.next));
    console.warn('Walang next/choices/ending ang eksenang', S.scene);
  }

  // ---------------- Items at Quests ----------------
  function ensureState() {
    if (!S) return;
    S.inv = S.inv || {};
    if (S.hp == null) S.hp = 100;
    S.collected = S.collected || {};
    S.quests = S.quests || {};
  }
  function giveItem(id, quiet) {
    ensureState();
    const it = STORY.items && STORY.items[id];
    if (!it || S.collected[id]) return;
    S.collected[id] = true;
    S.inv[id] = (S.inv[id] || 0) + 1;
    if (!quiet) {
      snd('pickup');
      toast(`${it.icon} ${t('itemGot', { name: L(it.name) })}`, '#ffd54a');
    }
    checkQuests();
    renderTracker();
  }
  const hasItem = (id) => !!(S && S.inv && S.inv[id] > 0);
  function useItem(id) {
    if (!hasItem(id)) return false;
    S.inv[id] -= 1;
    if (!S.inv[id]) delete S.inv[id];
    renderTracker();
    return true;
  }
  function startQuest(id) {
    ensureState();
    const q = STORY.quests && STORY.quests[id];
    if (!q || S.quests[id]) return;
    S.quests[id] = 'active';
    snd('quest');
    toast(`📋 ${t('questNew')}: ${L(q.title)}`, '#8fd18f');
    checkQuests();
    renderTracker();
  }
  function stepDone(st) {
    if (st.item) return !!S.collected[st.item];
    if (st.flag) return !!S.flags[st.flag];
    return false;
  }
  function checkQuests() {
    if (!S || !S.quests) return;
    for (const [id, state] of Object.entries(S.quests)) {
      if (state !== 'active') continue;
      const q = STORY.quests[id];
      if (!q.steps.filter((st) => !st.optional).every(stepDone)) continue;
      S.quests[id] = 'done';
      snd('quest_done');
      toast(`✅ ${t('questDone')}: ${L(q.title)}`, '#8fd18f');
      if (q.reward) applyEffects(q.reward);
      if (mode === 'explore' && scene().at === 'quest:' + id) setTimeout(arrive, 900);
    }
    renderTracker();
  }
  function autoCollect(qid) {
    Object.entries(STORY.pickups || {}).forEach(([id, p]) => {
      if (p.quest === qid) giveItem(id);
    });
  }
  // Mga gamit na dapat makita sa 3D na mundo ngayon
  function pickups() {
    if (!S || !S.quests) return [];
    return Object.entries(STORY.pickups || {})
      .filter(([id, p]) => S.quests[p.quest] === 'active' && !S.collected[id])
      .map(([id, p]) => ({ id, x: p.at[0], z: p.at[1], quest: p.quest, name: L(STORY.items[id].name) }));
  }
  // Maliit na listahan ng misyon sa screen habang naglalakad
  function renderTracker() {
    const el = $('#questTracker');
    if (!el) return;
    if (!S || !S.quests) return (el.innerHTML = '');
    el.innerHTML = Object.entries(S.quests)
      .filter(([, st]) => st === 'active')
      .map(([id]) => {
        const q = STORY.quests[id];
        const steps = q.steps
          .map((st) => `<li class="${stepDone(st) ? 'done' : ''}${st.optional ? ' opt' : ''}">${stepDone(st) ? '☑' : '☐'} ${esc(L(st.text))}</li>`)
          .join('');
        return `<div class="qt"><b>${q.side ? '⭐' : '📋'} ${esc(L(q.title))}</b><ul>${steps}</ul></div>`;
      })
      .join('');
  }
  // Bag na may mga kahon (slot): laging 12 kahon, walang laman man o meron
  const INV_SLOTS = 12;
  function showInventory() {
    if (!S) return;
    ensureState();
    const ids = Object.keys(S.inv);
    let slots = '';
    for (let i = 0; i < Math.max(INV_SLOTS, ids.length); i++) {
      const id = ids[i];
      const it = id && STORY.items[id];
      slots += it
        ? `<button class="slot full" data-slot="${id}" title="${esc(L(it.name))}"><span class="slot-icon">${it.icon}</span>${S.inv[id] > 1 ? `<span class="slot-n">×${S.inv[id]}</span>` : ''}</button>`
        : '<div class="slot empty"></div>';
    }
    overlay(
      `<div class="card inv-card" data-panel="inv">
        <div class="title-logo small">🎒 ${t('inventory')}</div>
        <div class="slots">${slots}</div>
        <div class="slot-detail" id="slotDetail">${ids.length ? `<span class="muted">${t('pickSlot')}</span>` : `<span class="muted">${t('empty')}</span>`}</div>
        <div class="btns"><button class="btn" data-go="closeModal">${t('close')}</button></div>
      </div>`
    );
    const detail = $('#slotDetail');
    document.querySelectorAll('#overlay .slot.full').forEach((b) => {
      const show = () => {
        const it = STORY.items[b.dataset.slot];
        document.querySelectorAll('#overlay .slot.sel').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        detail.innerHTML = `<span class="slot-icon big">${it.icon}</span><span><b>${esc(L(it.name))}</b><br><small>${esc(L(it.desc))}</small></span>`;
      };
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        show();
      });
      b.addEventListener('mouseenter', show);
    });
    const first = document.querySelector('#overlay .slot.full');
    if (first) first.dispatchEvent(new Event('mouseenter'));
  }
  function showQuests() {
    if (!S) return;
    ensureState();
    const list = Object.entries(S.quests)
      .sort((a, b) => (a[1] === 'done') - (b[1] === 'done'))
      .map(([id, st]) => {
        const q = STORY.quests[id];
        const steps = q.steps
          .map((x) => `<li class="${stepDone(x) ? 'done' : ''}">${stepDone(x) ? '☑' : '☐'} ${esc(L(x.text))}${x.optional ? ` <span class="muted">(${t('optional')})</span>` : ''}</li>`)
          .join('');
        return `<li class="quest ${st}"><div class="q-head"><b>${esc(L(q.title))}</b> <span class="tag">${st === 'done' ? '✅ ' + t('completed') : q.side ? '⭐ ' + t('sideQuest') : '📋 ' + t('mainQuest')}</span></div><small class="muted">${esc(L(q.desc))}</small><ul>${steps}</ul></li>`;
      })
      .join('');
    overlay(
      `<div class="card quest-card" data-panel="quests">
        <div class="title-logo small">📋 ${t('quests')}</div>
        <ul class="quests">${list || `<li class="muted">${t('noQuests')}</li>`}</ul>
        <div class="btns"><button class="btn" data-go="closeModal">${t('close')}</button></div>
      </div>`
    );
  }

  // ---------------- Mga utos: kausapin ang mga taga-barrio ----------------
  // Ang quest step na { talk: 'nena', scene: 'nena_pabili', flag: '...' } ay
  // magpapatugtog ng maikling eksena kapag kinausap ang taong iyon.
  function findErrand(id) {
    if (!S || !S.quests) return null;
    for (const [qid, st] of Object.entries(S.quests)) {
      if (st !== 'active') continue;
      for (const step of STORY.quests[qid].steps) if (step.talk === id && step.scene && !stepDone(step)) return step;
    }
    return null;
  }
  const canTalk = (id) => mode === 'explore' && !!findErrand(id);
  function talkTo(id) {
    const step = findErrand(id);
    if (!step || mode !== 'explore') return false;
    S.returnTo = S.scene;
    goto(step.scene);
    return true;
  }
  // bumalik sa paglalakad pagkatapos ng maikling eksena
  function back() {
    const r = S.returnTo;
    S.returnTo = null;
    S.scene = r;
    S.line = 0;
    S.phase = 'explore';
    store.set(KEYS.auto, S);
    soundFor(scene());
    startExplore();
    checkQuests();
  }

  // ---------------- Survival (habulan ng manananggal) ----------------
  function startSurvival() {
    const sc = scene();
    mode = 'explore';
    stopTyping();
    closeChoices();
    renderChars([], null);
    const snap = JSON.parse(JSON.stringify(S));
    snap.checkpoint = null;
    snap.surviveSnap = null;
    snap.log = [];
    S.surviveSnap = snap;
    store.set(KEYS.auto, S);
    $('#game').classList.add('exploring', 'surviving');
    $('#objective-text').textContent = fmt(sc.goal || '');
    W().setObjective(null);
    W().startHunt(Object.assign({}, sc.survive));
    renderStats();
    renderTracker();
  }
  function surviveEnd(result) {
    if (!S || S.phase !== 'survive') return;
    const sc = scene();
    $('#game').classList.remove('surviving');
    if (result === 'caught') {
      mode = 'caught';
      jumpscare('manananggal');
      setTimeout(showCaught, 1300);
      return;
    }
    S.phase = 'talk';
    S.hp = 100;
    S.flags.nakaligtas = true;
    if (result === 'salt') S.flags.pinatay_manananggal = true;
    checkQuests();
    goto(sc.survive.win[result] || sc.survive.win.bell);
  }
  function showCaught() {
    overlay(
      `<div class="card ending-card">
        <div class="title-logo small">${t('caughtTitle')}</div>
        <p>${t('caughtText')}</p>
        <div class="btns">
          <button class="btn primary" data-go="retryHunt">${t('retryHunt')}</button>
          <button class="btn" data-go="toTitle">${t('mainMenu')}</button>
        </div>
      </div>`,
      { cls: 'ending-overlay' }
    );
  }

  // ---------------- Choices ----------------
  function showChoices(list) {
    mode = 'choice';
    store.set(KEYS.auto, S);
    const box = $('#choices');
    box.innerHTML = '';
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="num">${i + 1}</span>${esc(fmt(c.text))}`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        choose(c);
      });
      box.appendChild(b);
    });
    box.classList.add('open');
  }
  function closeChoices() {
    $('#choices').classList.remove('open');
    $('#choices').innerHTML = '';
  }

  function choose(c) {
    if (mode !== 'choice') return;
    const snap = JSON.parse(JSON.stringify(S));
    snap.checkpoint = null;
    snap.log = [];
    S.checkpoint = snap;
    S.log.push({ who: '→', text: fmt(c.text) });
    snd('select');
    if (c.effects) applyEffects(c.effects);
    if (c.set) Object.assign(S.flags, c.set);
    closeChoices();
    goto(resolve(c.next));
  }

  // ---------------- Stats ----------------
  function applyEffects(fx) {
    Object.entries(fx).forEach(([k, v]) => {
      if (!(k in S.stats)) return;
      S.stats[k] += v;
      snd(v > 0 ? 'stat_up' : 'stat_down');
      const d = STORY.stats[k];
      toast(`${d.icon} ${v > 0 ? '+' : ''}${v} ${L(d.label)}`, d.color);
    });
    renderStats();
  }
  // Stats bilang mga icon: Kindness 2 = ❤❤. Negatibo = 💔.
  function statIcons(icon, v) {
    if (v <= 0) return v < 0 ? '💔'.repeat(Math.min(3, -v)) : '<span class="muted">—</span>';
    return icon.repeat(Math.min(6, v)) + (v > 6 ? `<small>+${v - 6}</small>` : '');
  }
  // Dugo sa gilid ng screen kapag mababa ang HP
  function bloodScreen() {
    const el = document.getElementById('bloodscreen');
    if (!el) return;
    const hp = S && S.hp != null ? S.hp : 100;
    el.style.opacity = hp >= 100 ? 0 : Math.min(1, ((100 - hp) / 100) * 1.25);
  }
  function renderStats() {
    bloodScreen();
    const el = $('#stats');
    if (!S) return (el.innerHTML = '');
    ensureState();
    const hp = Math.max(0, Math.round(S.hp));
    el.innerHTML =
      `<div class="hp" title="Health"><span class="hp-label">HP</span><div class="hp-bar"><i style="width:${hp}%" class="${hp <= 34 ? 'low' : ''}"></i></div><b>${hp}</b></div>` +
      Object.entries(STORY.stats)
        .map(([k, d]) => `<div class="stat" title="${esc(L(d.desc))}" style="--c:${d.color}"><span class="stat-name">${esc(L(d.label))}</span><span class="stat-icons">${statIcons(d.icon, S.stats[k])}</span></div>`)
        .join('');
  }
  // Tinamaan ang player (hal. ng manananggal). Ibinabalik ang natitirang HP.
  function damage(n) {
    if (!S) return 0;
    ensureState();
    S.hp = Math.max(0, S.hp - n);
    snd('hurt');
    const g = $('#game');
    g.classList.remove('hurt');
    void g.offsetWidth;
    g.classList.add('hurt');
    renderStats();
    return S.hp;
  }
  function heal(n) {
    if (!S) return;
    ensureState();
    S.hp = Math.min(100, S.hp + n);
    renderStats();
  }
  function toast(msg, color) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.borderColor = color || 'var(--accent)';
    t.style.color = color || 'var(--ink)';
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }

  // ---------------- Overlays ----------------
  function overlay(html, opts = {}) {
    const o = $('#overlay');
    o.className = 'overlay' + (opts.cls ? ' ' + opts.cls : '');
    o.innerHTML = html;
    o.hidden = false;
    modalOpen = true;
    o.querySelectorAll('[data-go]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        actions[b.dataset.go]();
      })
    );
  }
  function closeOverlay() {
    const o = $('#overlay');
    o.hidden = true;
    o.innerHTML = '';
    modalOpen = false;
    // bumalik sa paglalakad: itago ulit ang cursor
    if (mode === 'explore' && W()) W().lockMouse();
  }

  const unlocked = () => store.get(KEYS.endings, []);
  const totalEndings = () => Object.keys(STORY.endings).length;

  function showTitle() {
    mode = 'title';
    stopTyping();
    closeChoices();
    S = null;
    renderStats();
    renderTracker();
    $('#game').classList.add('on-title');
    $('#game').classList.remove('exploring', 'surviving');
    if (W()) W().titleMode();
    if (window.Sound) Sound.setScene('title', { crickets: true });
    $('#game').classList.remove('scary');
    setBg('plaza');
    renderChars([], null);
    $('#text').textContent = '';
    $('#nametag').textContent = '';
    const auto = store.get(KEYS.auto, null), manual = store.get(KEYS.save, null);
    const controls = W() ? t('hint3d') : t('hint2d');
    const typedName = $('#nameInput') ? $('#nameInput').value : store.get('sanisidro.name', STORY.defaultName);
    overlay(
      `<div class="card title-card">
        <div class="title-logo">${esc(L(STORY.title))}</div>
        <div class="chapter-tag">${t('chapter')} ${STORY.chapter ? STORY.chapter.n : 1}: ${esc(L(STORY.chapter ? STORY.chapter.title : ''))}</div>
        <div class="subtitle">${esc(L(STORY.subtitle))}</div>
        <label class="name-label">${t('nameQuestion')}
          <input id="nameInput" maxlength="16" value="${esc(typedName)}" autocomplete="off">
        </label>
        <div class="btns">
          <button class="btn primary" data-go="newGame">${t('newGame')}</button>
          ${auto ? `<button class="btn" data-go="continueGame">${t('continue')}</button>` : ''}
          ${manual ? `<button class="btn" data-go="loadGame">${t('loadSave')}</button>` : ''}
          <button class="btn" data-go="chapters">📚 ${t('chapters')}</button>
          <button class="btn" data-go="gallery">${t('endings')} (${unlocked().length}/${totalEndings()})</button>
          ${loreUnlocked().length ? `<button class="btn" data-go="bestiary">📖 ${t('creatureFiles')}</button>` : ''}
          <button class="btn small" data-go="toggleLang" id="titleLangBtn">${langLabel()}</button>
          <button class="btn small" data-go="toggleSound" id="titleSoundBtn">${soundLabel()}</button>
          <button class="btn small" data-go="toggleScares" id="titleScareBtn">${scareLabel()}</button>
        </div>
        <p class="hint">${controls}<br>${t('hintChoices')}</p>
      </div>`,
      { cls: 'title-overlay' }
    );
    const inp = $('#nameInput');
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') actions.newGame();
      e.stopPropagation();
    });
  }

  function beginPlay() {
    closeOverlay();
    $('#game').classList.remove('on-title');
    currentBg = null;
  }

  function startNew(name) {
    beginPlay();
    S = fresh(name);
    goto(STORY.start);
  }

  function resume(state) {
    beginPlay();
    S = state;
    if (!S.log) S.log = [];
    if (!S.world) S.world = {};
    ensureState();
    if (S.phase === 'survive' && W()) return goto(S.scene); // magsimula ulit ang habulan
    if (S.returnTo && !W()) S.returnTo = null;
    const sc = scene();
    soundFor(sc);
    if (W()) W().setup(S.world, { teleport: sc.world && sc.world.teleport, resume: true, at: sc.at });
    if (S.phase === 'explore' && W() && sc.at) startExplore();
    else enterScene();
  }

  let lastEnding = null;
  function showEnding(id, quiet) {
    mode = 'ending';
    const e = STORY.endings[id];
    const list = unlocked();
    const isNew = quiet ? !!(lastEnding && lastEnding.isNew) : !list.includes(id);
    lastEnding = { id, isNew };
    if (!list.includes(id)) store.set(KEYS.endings, list.concat(id));
    store.del(KEYS.auto);
    if (!quiet) snd(e.bad ? 'ending_bad' : 'ending_good');
    // Unang beses matapos ang kabanata: ipaliwanag muna ang mga nilalang
    if (!quiet && !lastEnding.loreShown) {
      lastEnding.loreShown = true;
      unlockLore();
      return showLore(0, () => showEnding(id, true));
    }
    const statLine = Object.entries(STORY.stats)
      .map(([k, d]) => `<span style="color:${d.color}">${d.icon} ${esc(L(d.label))} ${S.stats[k]}</span>`)
      .join(' &nbsp; ');
    overlay(
      `<div class="card ending-card">
        <div class="ending-kind">${esc(L(e.kind))}${isNew ? ` <span class="new">${t('new')}</span>` : ''}</div>
        <div class="title-logo small">${esc(L(e.title))}</div>
        <p>${esc(L(e.text))}</p>
        <p class="stat-line">${statLine}</p>
        <p class="muted">${t('endingCount', { n: unlocked().length, total: totalEndings() })}</p>
        <div class="btns">
          <button class="btn primary" data-go="newGameSameName">${t('playAgain')}</button>
          <button class="btn" data-go="bestiary">📖 ${t('creatureFiles')}</button>
          <button class="btn" data-go="toTitle">${t('mainMenu')}</button>
        </div>
      </div>`,
      { cls: 'ending-overlay' }
    );
  }

  // ---------------- Mga Kabanata at Creature Files ----------------
  const loreUnlocked = () => store.get('sanisidro.lore', []);
  function unlockLore() {
    const have = loreUnlocked();
    const ids = (STORY.chapter && STORY.chapter.creatures) || [];
    store.set('sanisidro.lore', Array.from(new Set(have.concat(ids))));
  }
  let loreDone = null;
  function showLore(i, done) {
    if (done) loreDone = done;
    const ids = (STORY.chapter && STORY.chapter.creatures) || [];
    const id = ids[i];
    const c = STORY.lore && STORY.lore[id];
    if (!c) {
      const cb = loreDone;
      loreDone = null;
      return cb ? cb() : closeOverlay();
    }
    const art = ART.characters[id] ? ART.characters[id].svg().replace('viewBox="0 0 32 64"', 'viewBox="0 0 32 48"') : '';
    const facts = (L(c.facts) || []).map((f) => `<li>${esc(f)}</li>`).join('');
    overlay(
      `<div class="card lore-card" data-panel="lore">
        <div class="ending-kind">📖 ${t('creatureFiles')} · ${i + 1}/${ids.length}</div>
        <div class="title-logo small">${esc(L(c.name))}</div>
        <div class="lore-body">
          <div class="lore-art">${art}</div>
          <div class="lore-text">
            <p class="lore-sub">${esc(L(c.subtitle))}</p>
            <p>${esc(L(c.text))}</p>
            <ul class="lore-facts">${facts}</ul>
          </div>
        </div>
        <div class="btns"><button class="btn primary" data-go="loreNext">${i + 1 < ids.length ? t('next') : t('continue')}</button></div>
      </div>`
    );
    showLore.index = i;
  }
  function showBestiary() {
    const have = loreUnlocked();
    const all = Object.entries(STORY.lore || {});
    const items = all
      .map(([id, c]) =>
        have.includes(id)
          ? `<li class="got"><b>${esc(L(c.name))}</b> <span class="muted">— ${esc(L(c.subtitle))}</span><br><small>${esc(L(c.text))}</small></li>`
          : `<li class="locked"><b>???</b> <span class="muted">— ${t('locked')}</span></li>`
      )
      .join('');
    overlay(
      `<div class="card log-card">
        <div class="title-logo small">📖 ${t('creatureFiles')}</div>
        <ul class="gallery">${items}</ul>
        <div class="btns"><button class="btn" data-go="${S && mode !== 'ending' ? 'closeModal' : mode === 'ending' ? 'backToEnding' : 'toTitle'}">${t('back')}</button></div>
      </div>`
    );
  }
  function showChapters() {
    const list = (STORY.chapters || [])
      .map(
        (ch) => `<li class="${ch.playable ? 'got' : 'locked'}"><b>${t('chapter')} ${ch.n}: ${esc(L(ch.title))}</b><br><small class="muted">${esc(L(ch.creatures))}</small>${
          ch.playable ? `<br><button class="btn small" data-go="newGame">${t('play')}</button>` : `<br><small>🔒 ${t('comingSoon')}</small>`
        }</li>`
      )
      .join('');
    overlay(
      `<div class="card log-card">
        <div class="title-logo small">📚 ${t('chapters')}</div>
        <ul class="gallery">${list}</ul>
        <div class="btns"><button class="btn" data-go="toTitle">${t('back')}</button></div>
      </div>`
    );
  }

  function showGallery() {
    const got = unlocked();
    const items = Object.entries(STORY.endings)
      .map(([id, e]) =>
        got.includes(id)
          ? `<li class="got"><b>${esc(L(e.title))}</b> <span class="muted">— ${esc(L(e.kind))}</span><br><small>${esc(L(e.text))}</small></li>`
          : `<li class="locked"><b>???</b> <span class="muted">— ${t('locked')}</span></li>`
      )
      .join('');
    overlay(
      `<div class="card">
        <div class="title-logo small">${t('endings')}</div>
        <p class="muted">${t('discovered', { n: got.length, total: totalEndings() })}</p>
        <ul class="gallery">${items}</ul>
        <div class="btns"><button class="btn" data-go="${S ? 'closeModal' : 'toTitle'}">${t('back')}</button></div>
      </div>`
    );
  }

  function showLog() {
    if (!S) return;
    const items = S.log
      .slice(-80)
      .map((l) => (l.who === '→' ? `<li class="picked">➜ ${esc(l.text)}</li>` : `<li>${l.who ? `<b>${esc(l.who)}:</b> ` : ''}${esc(l.text)}</li>`))
      .join('');
    overlay(
      `<div class="card log-card">
        <div class="title-logo small">${t('history')}</div>
        <ul class="log">${items || `<li class="muted">${t('nothingYet')}</li>`}</ul>
        <div class="btns"><button class="btn" data-go="closeModal">${t('close')}</button></div>
      </div>`
    );
    const ul = document.querySelector('.log');
    ul.scrollTop = ul.scrollHeight;
  }

  // ---------------- Actions ----------------
  const actions = {
    newGame() {
      const inp = $('#nameInput');
      const name = ((inp && inp.value) || STORY.defaultName).trim() || STORY.defaultName;
      store.set('sanisidro.name', name);
      startNew(name);
    },
    newGameSameName() {
      startNew(S ? S.name : STORY.defaultName);
    },
    continueGame() {
      const s = store.get(KEYS.auto, null);
      if (s) resume(s);
    },
    loadGame() {
      const s = store.get(KEYS.save, null);
      if (!s) return toast(t('noSave'));
      resume(s);
      toast(t('loaded'));
    },
    saveGame() {
      if (!S || mode === 'ending') return;
      store.set(KEYS.save, S);
      snd('save');
      toast(t('saved'));
    },
    toggleLang() {
      if (!window.I18N) return;
      const fromMenu = !!document.querySelector('#overlay [data-panel="menu"]');
      I18N.next();
      refreshLanguage();
      if (fromMenu) actions.menu();
      toast(t('langSwitched'));
    },
    toggleGfx() {
      const w = W();
      if (!w || !w.setGraphics) return;
      w.setGraphics(w.getGraphics() === 'high' ? 'low' : 'high');
      const b = document.getElementById('menuGfxBtn');
      if (b) b.textContent = gfxLabel();
    },
    toggleScares() {
      settings.scares = !settings.scares;
      store.set(KEYS.settings, settings);
      ['titleScareBtn', 'menuScareBtn'].forEach((id) => {
        const b = document.getElementById(id);
        if (b) b.textContent = scareLabel();
      });
    },
    toggleSound() {
      if (!window.Sound) return;
      Sound.toggle();
      document.querySelectorAll('[data-act="sound"], #titleSoundBtn, #menuSoundBtn').forEach((b) => (b.textContent = soundLabel()));
    },
    retry() {
      if (!S || !S.checkpoint) return;
      const cp = S.checkpoint;
      cp.log = [];
      resume(cp);
    },
    gallery: showGallery,
    inventory: showInventory,
    chapters: showChapters,
    bestiary: showBestiary,
    loreNext() {
      showLore((showLore.index || 0) + 1);
    },
    backToEnding() {
      if (lastEnding) showEnding(lastEnding.id, true);
    },
    quests: showQuests,
    map() {
      if (W() && S) W().toggleMap();
    },
    retryHunt() {
      if (!S || !S.surviveSnap) return;
      const snap = JSON.parse(JSON.stringify(S.surviveSnap));
      closeOverlay();
      S = snap;
      S.surviveSnap = null;
      goto(S.scene);
    },
    log: showLog,
    closeModal: closeOverlay,
    toTitle: showTitle,
    speed() {
      settings.speed = (settings.speed + 1) % SPEEDS.length;
      store.set(KEYS.settings, settings);
      updateSpeedBtn();
      toast(t('textSpeed', { s: speedLabel() }));
    },
    menu() {
      if (!S) return;
      overlay(
        `<div class="card menu-card" data-panel="menu">
          <div class="title-logo small">☰ Menu</div>
          <div class="btns menu-grid">
            <button class="btn" data-go="inventory">🎒 ${t('inventory')}</button>
            <button class="btn" data-go="quests">📋 ${t('quests')}</button>
            ${W() ? `<button class="btn" data-go="mapFromMenu">🗺️ ${t('map')}</button>` : ''}
            <button class="btn" data-go="saveGame">💾 Save</button>
            <button class="btn" data-go="loadGame">📂 Load</button>
            <button class="btn" data-go="log">📜 ${t('history')}</button>
            <button class="btn" data-go="toggleSound" id="menuSoundBtn">${soundLabel()}</button>
            <button class="btn" data-go="toggleLang" id="menuLangBtn">${langLabel()}</button>
            <button class="btn" data-go="speed" id="menuSpeedBtn">⏩ ${speedLabel()}</button>
            <button class="btn" data-go="toggleScares" id="menuScareBtn">${scareLabel()}</button>
            ${W() && W().setGraphics ? `<button class="btn" data-go="toggleGfx" id="menuGfxBtn">${gfxLabel()}</button>` : ''}
            <button class="btn" data-go="quitToTitle">🏠 ${t('mainMenu')}</button>
            <button class="btn primary" data-go="closeModal">▶ ${t('resume')}</button>
          </div>
        </div>`
      );
    },
    mapFromMenu() {
      closeOverlay();
      actions.map();
    },
    quitToTitle() {
      if (confirm(t('confirmMenu'))) showTitle();
    },
  };
  function gfxLabel() {
    const hi = W() && W().getGraphics && W().getGraphics() === 'high';
    return '✨ ' + t('graphics') + ': ' + (hi ? t('gfxHigh') : t('gfxLow'));
  }
  function scareLabel() {
    return settings.scares ? t('scaresOn') : t('scaresOff');
  }
  function soundLabel() {
    return window.Sound && Sound.on ? t('soundOn') : t('soundOff');
  }
  function langLabel() {
    return t('language', { lang: window.I18N ? I18N.LANGS[I18N.lang] : 'English' });
  }
  function updateSpeedBtn() {
    const b = document.querySelector('[data-act="speed"]');
    if (b) b.textContent = '⏩ ' + speedLabel();
    const mb = document.getElementById('menuSpeedBtn');
    if (mb) mb.textContent = '⏩ ' + speedLabel();
  }

  // Palitan ang wika kahit naglalaro: i-refresh ang lahat ng nakikitang teksto
  function refreshLanguage() {
    if (window.I18N) I18N.applyStatic();
    updateSpeedBtn();
    document.querySelectorAll('[data-act="sound"]').forEach((b) => (b.textContent = soundLabel()));
    const lb = document.querySelector('[data-act="lang"]');
    if (lb) lb.textContent = '🌐 ' + (window.I18N ? I18N.lang.toUpperCase() : 'EN');
    if (mode === 'title') return showTitle();
    if (!S) return;
    renderStats();
    if (modalOpen && mode !== 'ending') closeOverlay();
    if (mode === 'explore') {
      $('#objective-text').textContent = fmt(scene().goal || '');
    } else if (mode === 'play') {
      showLine(true, true);
    } else if (mode === 'choice') {
      const cur = S.line;
      S.line = lines().length - 1;
      showLine(true, true);
      S.line = cur;
      showChoices(scene().choices.filter((c) => !c.if || c.if(S)));
    } else if (mode === 'ending' && lastEnding) {
      showEnding(lastEnding.id, true);
    }
  }

  // ---------------- Input ----------------
  function bind() {
    $('#box').addEventListener('click', advance);
    $('#stage-click').addEventListener('click', advance);
    document.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.blur();
        const a = { save: 'saveGame', load: 'loadGame', log: 'log', speed: 'speed', menu: 'menu', endings: 'gallery', sound: 'toggleSound', lang: 'toggleLang', inv: 'inventory', quests: 'quests', map: 'map' }[b.dataset.act];
        actions[a]();
      })
    );
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (modalOpen) {
        const panel = document.querySelector('#overlay [data-panel]');
        if ((e.key === 'Escape' || (panel && ((k === 'i' && panel.dataset.panel === 'inv') || (k === 'j' && panel.dataset.panel === 'quests')))) && mode !== 'title' && mode !== 'ending' && mode !== 'caught') closeOverlay();
        return;
      }
      if (S && mode !== 'title' && mode !== 'ending' && mode !== 'caught') {
        if (e.key === 'Tab' || (e.key === 'Escape' && (mode === 'explore' || mode === 'play'))) {
          e.preventDefault();
          return actions.menu();
        }
        if (k === 'i') return showInventory();
        if (k === 'j') return showQuests();
        if (k === 'm') return actions.map();
      }
      if (mode === 'play' && (k === ' ' || k === 'enter' || k === 'e')) {
        e.preventDefault();
        advance();
      } else if (mode === 'choice' && /^[1-9]$/.test(k)) {
        const btn = document.querySelectorAll('#choices .choice')[+k - 1];
        if (btn) btn.click();
      } else if (k === 'l' && S) showLog();
    });
  }

  // Para sa 3D world
  window.Game = {
    get mode() { return modalOpen && mode !== 'title' ? 'modal' : mode; },
    get state() { return S; },
    arrive,
    toast,
    jumpscare,
    openMenu: () => {
      if (!modalOpen && S) actions.menu();
    },
    pickups,
    fmt,
    damage,
    heal,
    canTalk,
    talkTo,
    collect: (id) => giveItem(id),
    hasItem,
    useItem,
    surviveEnd,
  };

  // Iniaayos ang pwesto ng mga panel batay sa taas ng top bar at objective (para sa makitid na screen)
  function watchLayout() {
    const g = $('#game'), hud = $('#hud'), obj = $('#objective');
    const apply = () => {
      g.style.setProperty('--hud-h', hud.offsetHeight + 'px');
      g.style.setProperty('--obj-h', obj && obj.offsetParent ? obj.offsetHeight + 'px' : '0px');
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(apply);
      ro.observe(hud);
      if (obj) ro.observe(obj);
    }
    window.addEventListener('resize', apply);
    setInterval(apply, 500);
    apply();
  }

  window.addEventListener('DOMContentLoaded', () => {
    watchLayout();
    const loading = $('#loading');
    if (loading) loading.remove();
    document.getElementById('game').classList.toggle('mode3d', !!W());
    bind();
    refreshLanguage();
  });
})();
