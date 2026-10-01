// ============================================================
//  I18N — mga wika ng laro (English = default, Filipino).
//  Mga teksto ng kwento: nasa story.js bilang T('english', 'filipino').
//  Mga teksto ng interface (menu, buttons): nasa UI sa ibaba.
// ============================================================
(function () {
  const KEY = 'sanisidro.lang';
  const LANGS = { en: 'English', tl: 'Filipino' };
  let lang = 'en';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS[saved]) lang = saved;
  } catch (e) {}

  const UI = {
    en: {
      loading: 'Loading Barrio San Isidro...',
      objective: 'OBJECTIVE',
      controls: '<b>Mouse</b> look · <b>WASD</b> walk · <b>Shift</b> run · <b>E</b> interact · <b>I</b> bag · <b>J</b> quests · <b>M</b> map · <b>Esc</b> free mouse',
      clickToLook: '🖱️ Press any key or click to start looking around · Esc = Menu',
      nameQuestion: "What's your name?",
      newGame: 'New Game',
      continue: 'Continue',
      loadSave: 'Load Save',
      endings: 'Endings',
      hint3d: 'First person: <b>move the mouse</b> to look around &nbsp;·&nbsp; <b>WASD</b> walk &nbsp;·&nbsp; <b>Shift</b> run<br><b>E</b> interact with what you look at &nbsp;·&nbsp; <b>Space</b> continue dialogue &nbsp;·&nbsp; <b>Esc</b> free the mouse',
      hint2d: 'Click or press <kbd>Space</kbd> to continue. Press <kbd>1</kbd>–<kbd>4</kbd> to choose.',
      hintChoices: 'Every choice you make changes the ending.',
      soundOn: '🔊 Sound: ON',
      soundOff: '🔇 Sound: OFF',
      scaresOn: '👻 Jumpscares: ON',
      scaresOff: '😇 Jumpscares: OFF',
      language: '🌐 Language: {lang}',
      new: 'NEW!',
      endingCount: "You've found {n} of {total} endings.",
      retry: 'Retry last choice',
      playAgain: 'Play again from the start',
      startOver: 'Start over',
      mainMenu: 'Main Menu',
      discovered: '{n} / {total} discovered',
      locked: 'not yet discovered',
      back: 'Back',
      history: 'History',
      nothingYet: 'Nothing yet.',
      close: 'Close',
      noSave: 'No saved game.',
      loaded: 'Game loaded.',
      saved: 'Game saved! 💾',
      textSpeed: 'Text speed: {s}',
      graphics: 'Graphics', gfxHigh: 'High', gfxLow: 'Low (faster)',
      confirmMenu: 'Return to the main menu? (Your game is autosaved.)',
      speeds: ['Slow', 'Normal', 'Fast', 'Instant'],
      crowd: 'Crowd',
      talkTo: '[E] Talk to {name}',
      btnSave: '💾 Save',
      btnLoad: '📂 Load',
      btnLog: '📜 Log',
      btnMenu: '☰ Menu',
      langSwitched: 'Language: English',
      inventory: 'Inventory',
      quests: 'Quests',
      map: 'Map',
      empty: 'Your bag is empty. Items you find will appear in these slots.',
      pickSlot: 'Hover or click an item to read about it.',
      questNew: 'New quest',
      questDone: 'Quest complete',
      sideQuest: 'Side quest',
      mainQuest: 'Quest',
      completed: 'Completed',
      optional: 'optional',
      noQuests: 'No quests yet.',
      itemGot: 'Got: {name}',
      pickUp: '[E] Pick up {name}',
      sprinkle: '[E] Sprinkle salt on her body!',
      needSalt: 'You need SALT for this!',
      whipReady: '[F] Whip: READY',
      whipCd: '[F] Whip: {s}s',
      noWhip: 'No whip',
      frenzy: "She's getting desperate! Almost midnight...",
      savedBy: '{item} saved you! She recoils!',
      whipHit: 'WHAP! She shrieks and flies back!',
      caughtTitle: 'The manananggal got you!',
      caughtText: 'Try again — whip her with F when she swoops, run smart (watch your stamina), and keep your garlic.',
      retryHunt: 'Try again',
      stamina: 'Stamina',
      danger: 'Oil',
      bell: 'Midnight bell',
      mapHint: 'M — close map',
      you: 'You',
      btnInv: '🎒',
      btnQuests: '📋',
      btnMap: '🗺️',
      hit: 'Her claws rake your back! Get away!',
      resume: 'Resume',
      chapter: 'Chapter',
      chapters: 'Chapters',
      play: 'Play',
      comingSoon: 'Coming soon',
      creatureFiles: 'Creature Files',
      next: 'Next',
    },
    tl: {
      loading: 'Loading Barrio San Isidro...',
      objective: 'MISSION',
      controls: '<b>Mouse</b> tingin · <b>WASD</b> lakad · <b>Shift</b> takbo · <b>E</b> interact · <b>I</b> inventory · <b>J</b> quests · <b>M</b> map · <b>Esc</b> menu',
      clickToLook: '🖱️ Pindot ng kahit anong key o i-click para magsimula · Esc = Menu',
      nameQuestion: 'Anong pangalan mo?',
      newGame: 'New Game',
      continue: 'Continue',
      loadSave: 'Load Save',
      endings: 'Endings',
      hint3d: 'First person: <b>mouse</b> para tumingin &nbsp;·&nbsp; <b>WASD</b> lakad &nbsp;·&nbsp; <b>Shift</b> takbo<br><b>E</b> interact &nbsp;·&nbsp; <b>Space</b> next &nbsp;·&nbsp; <b>Esc</b> menu',
      hint2d: 'I-click o pindot ng <kbd>Space</kbd> para tumuloy. <kbd>1</kbd>–<kbd>4</kbd> para pumili.',
      hintChoices: 'May epekto ang bawat choice mo sa ending.',
      soundOn: '🔊 Sound: ON',
      soundOff: '🔇 Sound: OFF',
      scaresOn: '👻 Jumpscares: ON',
      scaresOff: '😇 Jumpscares: OFF',
      language: '🌐 Language: {lang}',
      new: 'NEW!',
      endingCount: '{n} sa {total} endings na ang nakuha mo.',
      retry: 'Balikan ang last choice',
      playAgain: 'Laro ulit mula umpisa',
      startOver: 'Umpisa ulit',
      mainMenu: 'Main Menu',
      discovered: '{n} / {total} unlocked',
      locked: 'locked pa',
      back: 'Back',
      history: 'History',
      nothingYet: 'Wala pa.',
      close: 'Close',
      noSave: 'Walang save.',
      loaded: 'Na-load na.',
      saved: 'Na-save na! 💾',
      textSpeed: 'Text speed: {s}',
      graphics: 'Graphics', gfxHigh: 'High', gfxLow: 'Low (mas mabilis)',
      confirmMenu: 'Balik sa Main Menu? (Naka-autosave naman.)',
      speeds: ['Slow', 'Normal', 'Fast', 'Instant'],
      crowd: 'Mga tao',
      talkTo: '[E] Kausapin si {name}',
      btnSave: '💾 Save',
      btnLoad: '📂 Load',
      btnLog: '📜 Log',
      btnMenu: '☰ Menu',
      langSwitched: 'Language: Filipino',
      inventory: 'Inventory',
      quests: 'Quests',
      map: 'Map',
      empty: 'Wala pang laman ang bag mo. Dito lalabas ang mga makukuha mo.',
      pickSlot: 'I-hover o i-click ang item para makita ang details.',
      questNew: 'New quest',
      questDone: 'Quest complete',
      sideQuest: 'Side quest',
      mainQuest: 'Quest',
      completed: 'Tapos na',
      optional: 'optional',
      noQuests: 'Wala pang quest.',
      itemGot: 'Nakuha mo: {name}',
      pickUp: '[E] Kunin ang {name}',
      sprinkle: '[E] Budburan ng asin!',
      needSalt: 'Kailangan mo ng ASIN dito!',
      whipReady: '[F] Whip: READY',
      whipCd: '[F] Whip: {s}s',
      noWhip: 'Walang whip',
      frenzy: 'Nagwawala na siya! Malapit na mag-midnight...',
      savedBy: 'Niligtas ka ng {item}! Umatras siya!',
      whipHit: 'PAK! Sumigaw siya at lumipad palayo!',
      caughtTitle: 'Nahuli ka ng manananggal!',
      caughtText: 'Try ulit — i-whip siya gamit ang F kapag lumalapit, tumakbo nang maayos (bantayan ang stamina), at wag sayangin ang bawang.',
      retryHunt: 'Try ulit',
      stamina: 'Stamina',
      danger: 'Langis',
      bell: 'Midnight bell',
      mapHint: 'M — close map',
      you: 'Ikaw',
      btnInv: '🎒',
      btnQuests: '📋',
      btnMap: '🗺️',
      hit: 'Kinalmot ka niya! Takbo!',
      resume: 'Resume',
      chapter: 'Chapter',
      chapters: 'Chapters',
      play: 'Play',
      comingSoon: 'Coming soon',
      creatureFiles: 'Creature Files',
      next: 'Next',
    },
  };

  function t(key, vars) {
    let s = (UI[lang] && UI[lang][key]) ?? UI.en[key] ?? key;
    if (vars && typeof s === 'string') for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  // Kunin ang teksto sa kasalukuyang wika mula sa { en, tl }
  function L(v) {
    if (v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'tl' in v)) return v[lang] ?? v.en ?? v.tl;
    return v;
  }
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
    document.documentElement.lang = lang === 'tl' ? 'tl' : 'en';
  }

  window.I18N = {
    LANGS,
    get lang() { return lang; },
    set(l) {
      if (!LANGS[l]) return;
      lang = l;
      try { localStorage.setItem(KEY, l); } catch (e) {}
      applyStatic();
    },
    next() {
      const keys = Object.keys(LANGS);
      this.set(keys[(keys.indexOf(lang) + 1) % keys.length]);
    },
    t,
    L,
    applyStatic,
  };
})();
