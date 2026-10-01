# The Last Night of the Fiesta (Ang Huling Gabi ng Pista)

A 3D Filipino story game that runs in the browser. You play as someone coming home from Manila to Barrio San Isidro on the eve of the town fiesta. A child has gone missing, the old balete tree has been cut down, and your choices decide how the night ends (5 endings).

- **3D version** (`index.html`): low-poly world made with Three.js. Walk around with WASD.
- **2D version** (`2d.html`): pixel-art visual novel, very light, for weak devices. Same story.

## How to play

With XAMPP (Apache) running, open: **http://localhost/Vince%20Game/**

| Key | Action |
|---|---|
| **Mouse** | Look around (just move it — no click needed; click to lock the mouse, Esc to free it) |
| **W A S D** | Walk (arrow keys ← → also turn) |
| **Shift** | Run |
| **E** | Interact with what you are looking at |
| **Space / Enter / click** | Continue dialogue |
| **1–4** | Pick a choice |
| **I / J / M** | Bag / Quests / Map |
| **Tab** or **☰ Menu** | Menu: bag, quests, map, save, load, log, sound, language, text speed, jumpscares |
| **F** | Whip (during the manananggal hunt) |

On phones, an on-screen joystick and an **E** button appear.

Follow the yellow diamond marker and the **LAYUNIN** (objective) box at the top of the screen.

> The 3D version loads Three.js from the internet (jsDelivr CDN), so the first load needs a connection. If it can't load, the game automatically falls back to the 2D version.

## Chapters

The game is planned as 5 chapters, each with different creatures from Philippine folklore:

1. **The Last Night of the Fiesta** — Tikbalang & Manananggal (playable)
2. Under the Acacia — Kapre & Duwende
3. The Drowned Bell — Sirena & Siyokoy
4. Cries in the Cane Field — Tiyanak & Aswang
5. The Night the Moon Was Eaten — Bakunawa

At the end of a chapter, the **Creature Files** explain the creatures you met (folklore, origins, weaknesses). They stay unlocked on the title screen.

## Health & stats

- **HP bar:** the manananggal wounds you (−34 HP per hit). Garlic and the rosary block a hit. At 0 HP, press Try again.
- **Stats as icons:** Kindness ❤, Courage 🔥, Trust 🤝 — one icon per point.

## Quests, inventory & map

- **🎒 Inventory (I):** items you collect, with descriptions of what they do.
- **📋 Quests (J):** active and finished quests. The active ones also show on screen while walking.
- **🗺️ Map (M):** full labeled map. A round minimap sits in the corner while walking.
- **Lola's Lost Rosary** (side quest): find it by the church for +1 Kindness. It also protects you once.
- **The Anti-Aswang Kit:** find garlic, salt, and a stingray tail around the barrio.
- **Survive the Night:** a manananggal hunts you until the midnight bell.
  - **F** whips her away (6s cooldown). **Shift** runs, limited by stamina.
  - Garlic and the rosary each save you once.
  - The coconut oil meter shows how close she is. The tik-tik sound gets *quieter* as she gets closer.
  - Optional: find her hidden lower body and salt it to win early (+1 Courage, +1 Trust).
  - If she catches you, press **Try again** to restart the hunt.

Add items in `STORY.items`, quests in `STORY.quests`, and item locations in `STORY.pickups` (story.js). A scene with `at: 'quest:<id>'` waits until that quest is done, and a scene with `survive: {...}` starts a survival chase.

## Languages

The game defaults to **English**. Players can switch to **Filipino** anytime: use the **🌐 Language** button on the title screen, or the **🌐 EN/TL** button in the top bar during play (the current line and choices switch instantly). The choice is remembered.

- Story text lives in `js/story.js` as `T('English', 'Filipino')`.
- Menu and button text lives in `js/i18n.js` (the `UI` table). To add another language (e.g. Bisaya), add it to `LANGS` and `UI` in `i18n.js`, and give `T()` a third argument in the story.

## Sound

All music and sound effects are generated live in code (Web Audio API), so there are no audio files to download.

- **Music** changes with the scene: kulintang and agung by day, a slow night theme, dabakan drums during the torch mob, a heartbeat in the fog, and a fiesta tune for the best ending.
- **Ambience:** crickets at night, birds by day, wind in the fog, crackling fire.
- **Effects:** footsteps, dialogue blips, choices, stat changes, knocking, the tikbalang's laugh and growl, and ending chimes.
- Turn sound on/off with the **🔊 Tunog** button (title screen or top bar). Sound starts after your first click or key press, because browsers block autoplay.

Add a sound cue to any story line with `sfx`, e.g. `{ text: 'TOK! TOK!', sfx: 'knock' }`, and set a scene's music with `music: 'fiesta'`. Available names are in `js/audio.js`.

## Files

| File | What it contains |
|---|---|
| `index.html` | 3D version page |
| `2d.html` | 2D version page |
| `css/style.css` | UI look and feel |
| `js/story.js` | **The story.** Scenes, dialogue, choices, endings, and where each scene happens in 3D |
| `js/i18n.js` | Language system and menu translations (English / Filipino) |
| `js/engine.js` | Dialogue, choices, stats, save/load, endings |
| `js/world.js` | 3D world: map, buildings, characters, movement, camera, lighting |
| `js/art.js` | 2D pixel-art backgrounds and portraits (2D version; fallback portraits in 3D) |
| `js/audio.js` | Generated music, ambience, and sound effects |
| `assets/people/` | Character models, textures, and motion-capture animations |

## Graphics & credits

- **People:** [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) avatars and motion-capture animations (MIT, see `assets/people/LICENSE.md`), converted to small web textures and JSON clips. The game turns them pale, blood-spattered and hollow-eyed at night, and makes them stare at you.
- **Textures, ferns, shrubs, chairs:** [Poly Haven](https://polyhaven.com) (CC0), streamed at runtime.
- **Engine:** [three.js](https://threejs.org) with bloom, ACES tone mapping, and soft shadows. **☰ Menu → Graphics** switches between High and Low.

## Writing the story (`js/story.js`)

```js
eksena_id: {
  bg: 'plaza',                            // 2D background
  world: {                                // 3D setup (optional; carries over to later scenes)
    time: 'night',                        // day | dusk | night | fog | dawn
    place: { lola: 'house_lola' },        // who is visible and where (anchors in world.js ANCH)
    crowd: true, villagers: true, fire: true, sapling: true,
    teleport: 'balete_front',             // move the player (one-time)
  },
  at: 'lola',                             // player must walk here first: an NPC id or 'loc:plaza' / 'loc:balete'
  goal: 'Pumunta kay Lola.',              // objective text shown while walking
  lines: [
    T('Narration (English)', 'Narration (Filipino)'),
    ['lola', T('Dialogue is [character, text].', 'Ganito ang dialogue.')],
    ['you', 'The player speaks with "you". {name} becomes the player name.'],
    ['tess', 'Only shown if a condition is true.', { if: has('someFlag') }],
  ],
  choices: [
    { text: 'Be kind', effects: { loob: 1 }, next: 'next_scene' },
    { text: 'Only if brave enough', if: st('tapang', 2), next: 'other' },
    { text: 'Remember something', set: { flagName: true }, next: 'x' },
  ],
  // or instead of choices:
  // next: 'scene_id'   or   next: (s) => (s.stats.tiwala >= 2 ? 'a' : 'b')
  // ending: 'ending_id'
}
```

**Jumpscares:** add `scare: 'tikbalang'` (or `beth`, `whitelady`) to a line, e.g. `{ text: '...NAKATAYO SIYA.', scare: 'tikbalang' }`. For a scare while walking, add `walkScare: { type: 'tikbalang', at: 25, after: 'text shown afterwards' }` to a scene with `at` (it fires when the player gets within `at` meters). Players can turn scares off with the **👻 Jumpscares** button on the title screen.

**Stats:** `loob` (kindness), `tapang` (courage), `tiwala` (the barrio's trust).

**Testing tip:** in the browser console, `World.teleportTo('balete_front')` moves the player instantly (anchor names are in `ANCH` in `world.js`).
