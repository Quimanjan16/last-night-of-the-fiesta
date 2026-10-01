// ============================================================
//  STORY — the whole story lives here. See README.md for the format.
//  Every text is bilingual: T('English', 'Filipino').
//
//  Stats:  loob   = kindness      (Loob)
//          tapang = courage       (Tapang)
//          tiwala = barrio's trust (Tiwala)
//
//  Jumpscare on a line:   { text: T(...), scare: 'tikbalang' }   (tikbalang | beth | whitelady)
//  Jumpscare while walking:  walkScare: { type, at: <meters from objective>, after: T(...) }
// ============================================================
const T = (en, tl) => ({ en, tl }); // bilingual text
const st = (k, n) => (s) => s.stats[k] >= n; // stat k >= n
const has = (f) => (s) => !!s.flags[f]; // flag is set
const not = (f) => (s) => !s.flags[f]; // flag not set

window.STORY = {
  title: T('The Last Night of the Fiesta', 'Ang Huling Gabi ng Pista'),
  subtitle: T('The fiesta is tomorrow. Hope you survive tonight.', 'Pista na bukas. Sana buhay ka pa.'),
  defaultName: 'Vince',
  start: 'dating',

  // Kabanata 1 (ang larong ito). Ang ibang kabanata ay idadagdag pa.
  chapter: { n: 1, title: T('The Last Night of the Fiesta', 'Ang Huling Gabi ng Pista'), creatures: ['tikbalang', 'manananggal'] },
  chapters: [
    { n: 1, playable: true, title: T('The Last Night of the Fiesta', 'Ang Huling Gabi ng Pista'), creatures: T('Tikbalang & Manananggal', 'Tikbalang at Manananggal') },
    { n: 2, title: T('Under the Acacia', 'Sa Ilalim ng Akasya'), creatures: T('Kapre & Duwende', 'Kapre at Duwende') },
    { n: 3, title: T('The Drowned Bell', 'Ang Nalunod na Kampana'), creatures: T('Sirena & Siyokoy', 'Sirena at Siyokoy') },
    { n: 4, title: T('Cries in the Cane Field', 'Iyak sa Tubuhan'), creatures: T('Tiyanak & Aswang', 'Tiyanak at Aswang') },
    { n: 5, title: T('The Night the Moon Was Eaten', 'Ang Gabing Kinain ang Buwan'), creatures: T('Bakunawa', 'Bakunawa') },
  ],

  // Creature Files: ipinapaliwanag sa dulo ng kabanata
  lore: {
    tikbalang: {
      name: T('Tikbalang', 'Tikbalang'),
      subtitle: T('The trickster of the trees and trails', "Ang manloloko ng mga puno at daan"),
      text: T(
        'A tall, bony creature from Philippine folklore with the head of a horse and the body of a man. Its limbs are so long that when it squats, its knees rise above its head. It lives in old trees like the balete, in bamboo groves, and along lonely mountain paths — and it loves to lead travelers astray until they walk in circles.',
        "Matangkad at payat na halimaw sa mga kwentong Pinoy — ulo ng kabayo, katawan ng tao. Sobrang haba ng binti nito na pag umupo, lampas sa ulo ang tuhod. Nakatira ito sa mga lumang puno tulad ng balete, sa kawayanan, at sa mga liblib na daan sa bundok. Hilig nitong iligaw ang mga dumadaan hanggang paikot-ikot na lang sila."
      ),
      facts: T(
        [
          'To escape its spell, turn your shirt inside out — or say "Tabi-tabi po" to ask permission to pass.',
          'Pluck one of the three golden hairs on its back (or ride it until it tires) and it becomes your loyal servant.',
          'A "sun shower" — rain while the sun shines — is said to be a tikbalang wedding.',
          'Many tales treat it as a guardian of nature that punishes those who destroy its home.',
        ],
        [
          "Para makawala, baligtarin mo ang damit mo — o sabihin mo ang \"Tabi-tabi po\" para magpaalam na dadaan ka.",
          "Pag nabunot mo ang isa sa tatlong gintong buhok sa likod niya (o sinakyan mo siya hanggang mapagod), magiging loyal na siya sa'yo.",
          "Pag umuulan habang maaraw, \"may ikinakasal na tikbalang\" daw.",
          "Sa maraming kwento, tagabantay siya ng kalikasan — at pinaparusahan niya ang sumisira sa bahay niya.",
        ]
      ),
    },
    manananggal: {
      name: T('Manananggal', 'Manananggal'),
      subtitle: T('The one who separates', "Ang humihiwalay ang katawan"),
      text: T(
        'By day, an ordinary — often beautiful — woman. By night, she splits her body at the waist, sprouts huge bat-like wings, and flies off to hunt, leaving her lower half standing somewhere hidden. Her name comes from the Filipino word "tanggal," meaning to remove or detach. She is one of the most famous aswang of the Visayas.',
        "Sa umaga, normal na babae lang — madalas maganda pa. Pero pag gabi, hinahati niya ang katawan niya sa baywang, tinutubuan ng malaking pakpak na parang sa paniki, tapos lumilipad para maghanap ng mabibiktima. Naiiwan ang kalahati ng katawan niya sa isang tagong lugar. Galing ang pangalan niya sa salitang \"tanggal.\" Isa siya sa pinakasikat na aswang sa Visayas."
      ),
      facts: T(
        [
          'Her weakness: sprinkle salt, crushed garlic, or ash on her abandoned lower body. She cannot rejoin it, and she perishes at sunrise.',
          'Garlic, holy objects, light, and the "buntot pagi" (stingray tail) whip are classic ways to drive her off.',
          'The "tik-tik" sound of her kin is a trick: the softer it sounds, the CLOSER the creature really is.',
          'Albularyo (folk healers) say coconut oil bubbles when an aswang is near.',
        ],
        [
          "Kahinaan niya: budburan mo ng asin, dinurog na bawang, o abo ang naiwang kalahati ng katawan niya. Hindi na siya makakabalik doon, at mamamatay siya pagsikat ng araw.",
          "Bawang, mga holy na bagay, ilaw, at ang latigong \"buntot pagi\" — yan ang mga pantaboy sa kanya.",
          "Yung \"tik-tik\" na tunog? Panloloko yan: pag humihina ang tunog, ibig sabihin PALAPIT siya nang palapit.",
          "Sabi ng mga albularyo, kumukulo raw ang langis ng niyog pag may aswang sa malapit.",
        ]
      ),
    },
  },

  stats: {
    loob: { label: T('Kindness', 'Kindness'), icon: '❤', color: '#e2574c', desc: T('Kindness and compassion', 'Pagiging mabait sa kapwa') },
    tapang: { label: T('Courage', 'Courage'), icon: '🔥', color: '#f39c3d', desc: T('Bravery', 'Pagiging matapang') },
    tiwala: { label: T('Trust', 'Trust'), icon: '🤝', color: '#5fb3e0', desc: T("The barrio's trust in you", 'Gaano ka pinagkakatiwalaan ng barrio') },
  },

  endings: {
    bayanihan: {
      title: T('Bayanihan', 'Bayanihan'),
      kind: T('Best Ending', 'Best Ending'),
      text: T('The barrio came together and Nonoy came home. Somewhere in the dark, the tikbalang is still watching.', "Nagkaisa ang barrio at nakauwi si Nonoy. Pero sa dilim, nakabantay pa rin ang tikbalang."),
    },
    kasunduan: {
      title: T('Keeper of the Balete', 'Ang Bantay ng Balete'),
      kind: T('Bittersweet Ending', 'Bittersweet Ending'),
      text: T('You saved Nonoy — in exchange for a lifetime subscription to tree care.', 'Nailigtas mo si Nonoy — kapalit ng lifetime subscription sa pag-aalaga ng puno.'),
    },
    gintong_buhok: {
      title: T('The Golden Hair', 'Ang Gintong Buhok'),
      kind: T('Victory at a Cost', 'Panalo, Pero May Kapalit'),
      text: T('The tikbalang obeys you now. It never stops watching you.', "Sumusunod na sa'yo ang tikbalang. Pero hindi ka niya tinatantanan ng tingin."),
    },
    takot: {
      title: T('Fire of Fear', 'Ang Apoy ng Takot'),
      kind: T('Bad Ending', 'Bad Ending'),
      bad: true,
      text: T('Gossip won. The hut burned. Nobody learned anything.', "Tsismis ang nanalo. Nasunog ang kubo. Walang natuto."),
    },
    ligaw: {
      title: T('Lost', 'Ligaw'),
      kind: T('Bad Ending', 'Bad Ending'),
      bad: true,
      text: T('You walked in circles through the rice fields for three days. Even the carabao pitied you.', "Tatlong araw kang paikot-ikot sa palayan. Naawa na sa'yo ang kalabaw."),
    },
  },

  // Inventory items. icon = emoji shown in the bag.
  items: {
    suka: { icon: '🍶', name: T('Vinegar', 'Suka'), desc: T("For Lola's famous adobo. Bought from Aling Nena, with candy as change.", "Para sa sikat na adobo ni Lola. Binili kay Aling Nena — kendi ang sukli.") },
    suman: { icon: '🍃', name: T('Suman', 'Suman'), desc: T("Sticky rice wrapped in banana leaves. Lola's gift for Father Jun.", "Malagkit na nakabalot sa dahon ng saging. Pasalubong ni Lola kay Father Jun.") },
    tsinelas: { icon: '🩴', name: T("Nonoy's Slipper", 'Tsinelas ni Nonoy'), desc: T('A tiny size-5 slipper from the balete stump. Proof that something took him.', "Maliit na tsinelas (size 5) na nakita sa tuod ng balete. Patunay na may kumuha sa kanya.") },
    langis: { icon: '🫙', name: T('Enchanted Coconut Oil', 'Magic na Langis'), desc: T("Mang Tonyo's oil. It bubbles when an aswang is near — the closer she is, the harder it boils.", "Langis ni Mang Tonyo. Kumukulo 'to pag malapit ang aswang — mas malakas ang kulo, mas malapit siya.") },
    bawang: { icon: '🧄', name: T('Garlic', 'Bawang'), desc: T('Classic aswang repellent. If the manananggal catches you, it saves you once.', "Classic na pangontra. Pag nahuli ka ng manananggal, ililigtas ka nito — isang beses lang.") },
    asin: { icon: '🧂', name: T('Salt', 'Asin'), desc: T("Sprinkle it on the manananggal's lower body and she can never rejoin it.", "Ibudbod mo sa naiwang kalahati ng katawan ng manananggal para hindi na siya makabalik.") },
    buntot: { icon: '🪢', name: T('Stingray Tail', 'Buntot Pagi'), desc: T('The legendary aswang whip. Press F when she swoops close to drive her back.', "Ang legendary na latigo laban sa aswang. Pindutin ang F pag lumapit siya para itaboy.") },
    rosaryo: { icon: '📿', name: T("Lola's Rosary", 'Rosaryo ni Lola'), desc: T('Lola swears by it. Protects you once from the manananggal.', "Sabi ni Lola, effective 'to. Poprotektahan ka nang isang beses.") },
  },

  // Quests. Each step is done when you have the item (item) or a flag is set (flag).
  quests: {
    utos: {
      title: T("Lola's Errands", 'Mga Utos ni Lola'),
      desc: T('Lola has a list. Lola always has a list. Get to know the barrio while you are at it.', "May listahan si Lola. Laging may listahan si Lola. Libutin mo na rin ang barrio habang nandiyan ka."),
      steps: [
        { talk: 'nena', scene: 'nena_pabili', flag: 'utos_nena', text: T("Buy vinegar at Aling Nena's sari-sari store (south of the plaza)", "Bumili ng suka sa sari-sari store ni Aling Nena (baba ng plaza)") },
        { talk: 'padre', scene: 'padre_simbahan', flag: 'utos_padre', text: T('Bring the suman to Father Jun at the church (north of the plaza)', "Ihatid ang suman kay Father Jun sa simbahan (taas ng plaza)") },
        { talk: 'kardo', scene: 'kardo_palayan', flag: 'utos_kardo', text: T('Invite Mang Kardo to dinner — he is out in the rice fields (east)', "Yayain si Mang Kardo sa hapunan — nasa palayan siya (kanan, papunta sa bukid)") },
        { talk: 'tess', scene: 'tess_banderitas', flag: 'utos_tess', text: T('Help Tess hang the banderitas at the plaza', 'Tulungan si Tess magsabit ng banderitas sa plaza') },
      ],
    },
    rosaryo: {
      side: true,
      title: T("Lola's Lost Rosary", 'Nawawalang Rosaryo ni Lola'),
      desc: T('Lola lost her rosary somewhere near the church.', 'Nawala ni Lola ang rosaryo niya malapit sa simbahan.'),
      steps: [{ item: 'rosaryo', text: T('Find the rosary near the church doors', 'Hanapin ang rosaryo malapit sa pinto ng simbahan') }],
      reward: { loob: 1 },
    },
    kit: {
      title: T('The Anti-Aswang Kit', 'Anti-Aswang Kit'),
      desc: T('Mang Tonyo says you need protection before the night gets worse.', 'Sabi ni Mang Tonyo, kailangan mo ng pangontra bago lumala ang gabi.'),
      steps: [
        { item: 'bawang', text: T("Garlic — by the steps of Lola's house", 'Bawang — sa hagdan ng bahay ni Lola') },
        { item: 'asin', text: T('Salt — in front of the sari-sari store', 'Asin — sa harap ng sari-sari store') },
        { item: 'buntot', text: T('Stingray tail — at the jeepney stop', 'Buntot pagi — sa hintayan ng jeep') },
      ],
    },
    survive: {
      title: T('Survive the Night', 'Survive the Night'),
      desc: T('A manananggal is hunting you. Survive until the midnight bell.', "Hinahanap ka ng manananggal. Mabuhay ka hanggang tumunog ang kampana pag-alas dose."),
      steps: [
        { flag: 'nakaligtas', text: T('Survive until the church bell rings', "Mabuhay hanggang tumunog ang kampana") },
        { flag: 'pinatay_manananggal', optional: true, text: T('Find her hidden lower body and salt it', "Hanapin ang tinago niyang kalahating katawan at budburan ng asin") },
      ],
    },
  },

  // Where items lie in the 3D world (x, z). They appear while their quest is active.
  pickups: {
    bawang: { quest: 'kit', at: [-22, 5] },
    asin: { quest: 'kit', at: [7, 22.8] },
    buntot: { quest: 'kit', at: [-13, 37.8] },
    rosaryo: { quest: 'rosaryo', at: [12, -7.4] },
  },

  scenes: {
    // ---------------- CHAPTER 1: HOMECOMING ----------------
    dating: {
      bg: 'kalsada',
      world: { time: 'day', place: { lola: 'shed_lola' }, teleport: 'start' },
      at: 'lola',
      goal: T('Find Lola Ising at the jeepney stop (to your left).', 'Hanapin si Lola Ising sa hintayan ng jeep (kaliwa mo).'),
      lines: [
        T('Six hours on a bus from Manila, then one more hour squeezed into a jeepney. The passenger beside you spilled buko juice on you three times.', 'Anim na oras sa bus mula Maynila, tapos isang oras pang siksikan sa jeep. Tatlong beses kang natapunan ng buko juice ng katabi mo.'),
        T('Barrio San Isidro. No signal, no Grab, no Jollibee. But the fiesta is tomorrow — and there will be lechon.', 'Barrio San Isidro. Walang signal, walang Grab, walang Jollibee. Pero pista bukas — at may lechon.'),
        ['lola', T("{name}! MY APO! Look how big you've gotten! ...You got fat, didn't you?", "{name}! APO KO! Ang laki-laki mo na! ...Tumaba ka, 'no?"), { chars: ['lola:center'] }],
        ['lola', T('Kidding! Come, come. I made suman, kalamay, and three pots of adobo. All for you.', "Joke lang! Halika na. Nagluto ako ng suman, kalamay, at tatlong kaldero ng adobo. Para sa'yo lahat 'yan.")],
        ['you', T("La, it's just me. One person.", 'La, isa lang po ako.')],
        ['lola', T('Exactly. So you better eat fast.', 'Kaya nga bilisan mo kumain.')],
      ],
      choices: [
        { text: T('Do the mano. "Mano po, La."', 'Magmano kay Lola. "Mano po, La."'), effects: { loob: 1 }, next: 'mano' },
        { text: T('Hug Lola. "La, it\'s so hot! No aircon here?"', 'Yakapin si Lola. "La, ang init! Walang aircon dito?"'), next: 'reklamo' },
        { text: T('Take a selfie first. "Wait lang, La, IG story muna."', 'Mag-selfie muna. "Wait lang La, IG story muna."'), next: 'selfie' },
      ],
    },
    mano: {
      bg: 'kalsada',
      chars: ['lola:center'],
      lines: [
        ['lola', T('God bless you, apo. Good, you still remember how to do the mano.', "God bless, apo. Buti marunong ka pa ring magmano.")],
        ['lola', T('Your cousin Jepoy gave me a fist bump. A FIST BUMP. To his own grandmother.', "Yung pinsan mong si Jepoy, nag-fist bump sa'kin. FIST BUMP. Sa lola niya.")],
      ],
      next: 'uwi',
    },
    reklamo: {
      bg: 'kalsada',
      chars: ['lola:center'],
      lines: [
        ['lola', T("Aircon? Apo, our aircon here is the breeze from the rice fields. And it's free.", 'Aircon? Apo, ang aircon natin dito ay ang hangin galing bukid. Libre pa.')],
        ['lola', T("It even comes with carabao scent. That's premium.", "May kasama pang amoy kalabaw. Premium 'yan.")],
      ],
      next: 'uwi',
    },
    selfie: {
      bg: 'kalsada',
      chars: ['lola:center'],
      lines: [
        T('You take a selfie. Lola throws a peace sign. And a duckface. Her angles are better than yours.', "Nag-selfie kayo. Nag-peace sign si Lola. Naka-duckface pa. Mas maganda pa ang anggulo niya kaysa sa'yo."),
        ['lola', T('Tag me, ha. My name on Facebook is "Ising Pogi."', 'I-tag mo ako, ha. "Ising Pogi" ang pangalan ko sa Facebook.')],
      ],
      next: 'uwi',
    },

    // ---------------- LOLA'S HOUSE & ERRANDS ----------------
    uwi: {
      music: 'day',
      bg: 'bahay',
      world: { time: 'day', place: { lola: 'house_lola' } },
      at: 'lola',
      goal: T('Follow Lola home — the house on stilts, west of the plaza.', "Sundan si Lola pauwi — yung bahay na nakatayo sa mga poste, sa kaliwa ng plaza."),
      chars: ['lola:center'],
      lines: [
        T("Lola's house: a bahay kubo on stilts with capiz windows, a Santo Niño on the altar, and a gecko that has lived here longer than you've been alive.", "Bahay ni Lola: bahay kubo na nakatayo sa mga poste, may capiz na bintana, Santo Niño sa altar, at butiking mas matagal nang nakatira dito kaysa sa'yo."),
        ['lola', T("Welcome home, apo! Put your bag down. No, not there. Not there either. ...Just hold it.", "Welcome home, apo! Ibaba mo na bag mo. Hindi diyan. Hindi rin diyan. ...Hawakan mo na lang.")],
        ['lola', T("Now, I need help. The adobo needs vinegar, Father Jun needs his suman, Kardo needs to be dragged to dinner, and Tess needs someone to hold her ladder.", "O siya, patulong naman. Kailangan ng suka para sa adobo, kailangan ni Father Jun ang suman niya, kailangang hilahin si Kardo papunta sa hapunan, at kailangan ni Tess ng taga-hawak ng hagdan.")],
        ['you', T("La, I literally just arrived.", 'La, kararating ko lang po talaga.')],
        ['lola', T("And you are already useful. Look at that. Here, take the suman.", "Tingnan mo, may silbi ka na agad. O, dalhin mo 'tong suman."), { give: ['suman'] }],
        ['lola', T("Walk around, say hello to everyone. Just... don't go near the big balete tree past the church. And stay away from Tonyo's hut by the forest.", "Ikot-ikot ka, batiin mo lahat. Basta... wag kang lalapit sa malaking balete lampas ng simbahan. At layuan mo ang kubo ni Tonyo sa gilid ng gubat."), { quest: 'utos' }],
        ['you', T('Why?', 'Bakit po?')],
        ['lola', T('Because I said so. That is the whole reason. Go.', "Kasi sinabi ko. Yun na yun. Sige na.")],
      ],
      next: 'utos_hanap',
    },
    utos_hanap: {
      music: 'day',
      bg: 'plaza',
      world: { time: 'day', villagers: true, place: { lola: 'house_lola', nena: 'nena_store', padre: 'padre_church', kardo: 'kardo_field', tess: 'plaza_tess' } },
      at: 'quest:utos',
      goal: T("Do Lola's errands around the barrio. The list is on the left. (M = map, J = quests)", "Gawin ang mga utos ni Lola sa barrio. Nasa kaliwa ang listahan. (M = map, J = quests)"),
      lines: [
        T('Vinegar: bought. Suman: delivered. Mang Kardo: invited. Banderitas: hung. Your legs: destroyed.', "Suka: nabili na. Suman: naihatid na. Mang Kardo: nayaya na. Banderitas: nakasabit na. Mga binti mo: sira na."),
        ['you', T("I'm more tired now than after a whole week of work in Manila.", "Mas pagod pa 'ko ngayon kaysa isang buong linggo ng trabaho sa Maynila.")],
        T('The sun is sinking behind the mountain. The shadows of the coconut trees stretch long across the road.', "Palubog na ang araw sa likod ng bundok. Humahaba na ang anino ng mga niyog sa kalsada."),
      ],
      next: 'utos_balik',
    },
    nena_pabili: {
      bg: 'kalsada',
      chars: ['nena:center'],
      lines: [
        T("Aling Nena's sari-sari store: part shop, part news station. Chips hang from the ceiling like fruit, and a sign reads: \"NO CREDIT. ALSO, DON'T ASK WHY.\"", "Sari-sari store ni Aling Nena: kalahating tindahan, kalahating news station. Nakasabit ang mga chichirya na parang prutas, at may karatula: \"BAWAL ANG UTANG. BAWAL DIN MAGTANONG KUNG BAKIT.\""),
        ['you', T('PABILI PO!', 'PABILI PO!')],
        ['nena', T("Yes, yes, I'm not deaf! ...Oh! You're Ising's grandkid from Manila! You got so fair. Are you taking gluta?", 'Oo na, oo na, hindi ako bingi! ...Ay! Ikaw pala ang apo ni Ising na taga-Maynila! Ang puti mo na. Nag-gluta ka, \'no?')],
        ['you', T("Vinegar and soy sauce, please. For Lola's adobo.", 'Suka at toyo po. Pang-adobo ni Lola.')],
        ['nena', T("Here. Tell Ising she's all paid up... joke. She still owes me two Cokes from 2019.", 'Heto. Sabihin mo kay Ising, bayad na siya... joke. May utang pa siyang dalawang Coke noong 2019.'), { give: ['suka'] }],
        ['nena', T("No change. Here, take three White Rabbits instead.", 'Walang barya. Heto, tatlong White Rabbit na lang ang sukli mo.')],
        ['nena', T("And apo — don't believe anything Beth tells you. She's the source of ninety percent of the fake news in this barangay. The other ten percent is me.", "At apo — wag kang maniniwala sa lahat ng sinasabi ni Beth. Siya ang source ng 90% ng fake news sa barangay. Ako yung 10%.")],
        ['nena', T("One more thing. If you ever need salt, garlic, candles — come to me. Tonight, especially.", "Isa pa. Pag kailangan mo ng asin, bawang, o kandila — dito ka sa'kin bumili. Lalo na ngayong gabi.")],
        ['you', T('Why tonight?', 'Bakit po ngayong gabi?')],
        ['nena', T('...Just a feeling. Next customer!', "...Wala lang. Kutob lang. Next!")],
      ],
      set: { utos_nena: true },
      next: '@back',
    },
    padre_simbahan: {
      bg: 'plaza',
      chars: ['padre:center'],
      lines: [
        T('The Church of San Isidro: two hundred years old, cool inside, and smelling of candle wax and floor polish. The bell tower looms over the whole barrio.', "Simbahan ng San Isidro: dalawandaang taon na, malamig sa loob, amoy kandila at floor wax. Tanaw ang kampanaryo mula kahit saan sa barrio."),
        ['padre', T("Ah! You must be {name}! Ising has been talking about you on Facebook Live all week.", "Ah! Ikaw siguro si {name}! Buong linggo kang kinukwento ni Ising sa Facebook Live.")],
        ['you', T('Father, suman from Lola.', 'Father, suman po galing kay Lola.'), { take: ['suman'] }],
        ['padre', T("Thank you! Tell Ising I'll include her in my prayers. And in the list of people who gave me suman. It's a long list. She's the only one on it.", "Salamat! Sabihin mo kay Ising, ipagdadasal ko siya. At isasama ko siya sa listahan ng mga nagbigay ng suman. Mahaba yung listahan. Siya lang yung nasa listahan.")],
        ['padre', T("The fiesta is tomorrow... but this year feels different. For three nights now, the bell has rung by itself. At exactly midnight.", "Pista na bukas... pero iba talaga pakiramdam ko ngayong taon. Tatlong gabi nang kusang tumutunog ang kampana. Saktong alas-dose ng gabi.")],
        ['padre', T("So tonight I'll ring it myself at midnight. An old tradition. They say the bell drives away... well. Things that walk at night.", "Kaya mamaya, ako na mismo ang magpapatunog nun pag-alas dose. Lumang pamahiin. Sabi nila, tinataboy daw ng kampana ang... basta. Yung mga gumagala pag gabi.")],
        T('Behind you, the confessional door creaks open. Slowly.', "Sa likod mo, dahan-dahang bumukas ang pinto ng confession booth."),
        ['bogs', T('BOOOOOO!!!', 'BOOOOOO!!!'), { scare: 'sakristan', chars: ['padre:left', 'bogs:right'] }],
        ['bogs', T("HAHAHA! Got you! I'm Bogs, the sacristan! Want some communion wafers? ...Kidding, not allowed.", 'HAHAHA! Nagulat ka po! Ako po si Bogs, sakristan! Gusto niyo po ng ostiya? ...Joke lang po, bawal.'), { sfx: 'wahwah' }],
        ['padre', T('BOGS. How many times have I told you — no scaring people inside the church!', "BOGS. Ilang beses ko nang sinabi — bawal manggulat dito sa loob ng simbahan!")],
        ['bogs', T("Sorry po, Father. I'll do it outside from now on.", "Sorry po, Father. Sa labas na lang po ako manggugulat.")],
      ],
      set: { utos_padre: true },
      next: '@back',
    },
    kardo_palayan: {
      bg: 'kalsada',
      chars: ['kardo:center'],
      lines: [
        T('The rice fields stretch all the way to the mountains, green and gold. A carabao stares at you, chewing slowly. Judging you.', "Hanggang bundok ang palayan, berde at ginto. May kalabaw na nakatitig sa'yo habang ngumunguya. Jinu-judge ka."),
        ['kardo', T("Hm? Who are you? ...Ah, Ising's grandkid! Dinner? Thank you, thank you. I'll come.", "Hm? Sino ka? ...Ah, apo ni Ising! Hapunan? Salamat, salamat. Sige, pupunta ako.")],
        ['kardo', T("Sorry, I'm a bit spaced out. Last week I got lost. Here. In my OWN rice field.", "Pasensya na, medyo lutang ako. Nung isang linggo, naligaw ako. Dito. Sa SARILI kong palayan.")],
        ['you', T('How does that even happen?', 'Paano po nangyari \'yon?')],
        ['kardo', T("Forty years I've farmed here, anak. FORTY. And one night I walked in circles for three hours. Like something kept pulling me back.", "Apatnapung taon na 'kong nagsasaka dito, anak. APATNAPU. Tapos isang gabi, tatlong oras akong paikot-ikot. Parang may humihila sa'kin pabalik.")],
        ['kardo', T("And I heard laughing. Deep. Then hoofbeats. But there are no horses here. Only Brad Pitt.", "Tapos may narinig akong tumatawa. Malalim na boses. Tapos yabag ng kabayo. Eh walang kabayo dito. Si Brad Pitt lang.")],
        ['you', T('...Who is Brad Pitt?', '...Sino po si Brad Pitt?')],
        ['kardo', T('My carabao.', 'Ang kalabaw ko.')],
        T('The carabao blinks slowly. Brad Pitt does not appreciate your tone.', "Dahan-dahang kumurap ang kalabaw. Mukhang na-offend si Brad Pitt."),
        ['kardo', T("Since they cut down the balete, the fields feel different. If you ever hear laughing at night, anak... don't look back.", "Mula nung pinutol nila yung balete, iba na ang bukid. Pag may narinig kang tumatawa pag gabi, anak... wag kang lilingon.")],
      ],
      set: { utos_kardo: true },
      next: '@back',
    },
    tess_banderitas: {
      bg: 'plaza',
      chars: ['tess:center'],
      lines: [
        T('The plaza is buzzing: kids running, titas arguing over the program, and a brand-new stage built from the wood of the old balete.', "Ang ingay sa plaza: mga batang nagtatakbuhan, mga titang nag-aaway sa program, at bagong stage na gawa sa kahoy ng lumang balete."),
        ['tess', T("{name}!! It's really you! I thought you forgot about us, city kid!", '{name}!! Ikaw nga! Akala ko nakalimutan mo na kami, taga-Maynila!')],
        ['tess', T('Me? Still the same. Single. Thanks for asking.', "Ako? Ganun pa rin. Single. Thanks sa pagtatanong.")],
        ['you', T("I didn't ask.", 'Hindi ako nagtanong.')],
        ['tess', T("I know. That's why I told you. Now hold this ladder. If I fall, catch me. If you can't catch me... good luck with your life.", "Alam ko. Kaya nga sinabi ko na. O, hawakan mo 'tong hagdan. Pag nahulog ako, saluhin mo 'ko. Pag hindi mo 'ko nasalo... bahala ka na sa buhay mo.")],
        T('You hold the ladder for twenty minutes while Tess hangs banderitas and tells you every barangay scandal since 2016.', "Twenty minutes mong hinawakan ang hagdan habang nagsasabit si Tess ng banderitas at kinukwento lahat ng chismis sa barangay mula 2016."),
        ['tess', T("There! Beautiful, right? ...But you know what? That stage is made from the old balete. I get chills every time I walk past it.", "Ayan! Ganda, 'di ba? ...Pero alam mo? Gawa sa lumang balete yang stage. Kinikilabutan ako tuwing dadaan ako diyan.")],
      ],
      set: { utos_tess: true },
      next: '@back',
    },
    utos_balik: {
      music: 'dusk',
      bg: 'kalsada',
      world: { time: 'dusk', villagers: false, stalk: true, place: { lola: 'house_lola', nena: 'nena_store', padre: 'padre_church' } },
      at: 'lola',
      goal: T('The sun is setting. Bring the vinegar home to Lola.', "Palubog na ang araw. Iuwi mo na ang suka kay Lola."),
      chars: ['lola:center'],
      lines: [
        ['lola', T("There's my vinegar! Thank you, apo. Now the adobo can finally be adobo.", "Ayan na ang suka ko! Salamat, apo. Sa wakas, magiging adobo na ang adobo."), { take: ['suka'] }],
        ['lola', T('So? Did you see the whole barrio? Still beautiful, right?', 'O, nakita mo na ang buong barrio? Maganda pa rin, \'di ba?')],
        ['you', T("Yes, La. But... on the way back, I thought I saw someone really tall at the edge of the fields. Just standing there.", "Opo, La. Pero... pauwi, parang may nakita akong sobrang tangkad sa gilid ng bukid. Nakatayo lang.")],
        T('Lola stops stirring the pot.', "Natigilan si Lola sa paghahalo ng kaldero."),
        ['lola', T("...Come inside. It's getting dark.", "...Pasok ka na. Dumidilim na.")],
      ],
      next: 'bahay',
    },

    bahay: {
      music: 'dusk',
      bg: 'bahay',
      world: { time: 'dusk', place: { lola: 'house_lola' } },
      chars: ['lola:center'],
      lines: [
        T('Night falls. The crickets are loud. A gecko on the ceiling is staring at you. Judgmentally.', "Gabi na. Maingay ang kuliglig. May butiking nakatitig sa'yo mula sa kisame. Judgmental."),
        ['lola', T("Apo, listen. Don't go out alone at night — especially near the balete tree.", "Apo, bilin ko sa'yo. Wag kang lalabas mag-isa pag gabi — lalo na sa may balete.")],
        ['lola', T('And if you ever get lost and keep walking in circles... turn your shirt inside out.', "Tsaka pag naligaw ka, tapos paikot-ikot ka lang sa isang lugar... baligtarin mo damit mo.")],
        ['you', T('La... is that a fashion statement?', "La... fashion statement po ba 'yan?")],
        ['lola', T("No, apo. It's for survival. But yes, it's also a little fashionable.", 'Hindi, apo. Pang-survival. Pero oo, medyo fashionable din.')],
        ['lola', T('Oh, and apo — I dropped my rosary somewhere by the church this afternoon. If you see it, bring it home, ha?', "Ay, apo — nahulog ko yata rosaryo ko sa may simbahan kanina. Pag nakita mo, iuwi mo ha?"), { quest: 'rosaryo' }],
      ],
      choices: [
        { text: T('"Opo, La. I\'ll remember."', '"Opo, La. Tatandaan ko po."'), set: { naniwala: true }, next: 'katok' },
        { text: T('"La, come on, that\'s just a superstition."', '"La naman, pamahiin lang po \'yan."'), next: 'pamahiin' },
      ],
    },
    pamahiin: {
      bg: 'bahay',
      chars: ['lola:center'],
      lines: [
        ['lola', T('Go ahead, laugh. Kardo said the same thing.', "Sige, tawanan mo. Ganyan din sinabi ni Kardo.")],
        ['lola', T("Now he's scared of horses. Even carousel horses. Even horse stickers.", 'Ngayon, takot na siya sa kabayo. Kahit sa carousel. Kahit sa sticker.')],
      ],
      next: 'katok',
    },

    katok: {
      bg: 'bahay',
      world: { time: 'night', place: { lola: 'house_lola', kapitan: 'house_kapitan', beth: 'house_beth' } },
      chars: ['lola:center'],
      lines: [
        { text: T('KNOCK! KNOCK! KNOCK!', 'TOK! TOK! TOK!'), sfx: 'knock' },
        T("Loud. Urgent. It's eight in the evening. Nobody knocks this late in the province... unless there's free food.", "Malakas. Parang nagmamadali. Alas-otso na ng gabi. Walang kumakatok nang ganitong oras sa probinsya... maliban kung may libreng ulam."),
        T('You slowly open the door...', 'Dahan-dahan mong binuksan ang pinto...'),
        ['you', T('AAAAAAHHHH!!! GHOOOOST!!!', 'AAAAAAHHHH!!! MULTOOOO!!!'), { scare: 'beth' }],
        ['beth', T("WHAT IS WRONG WITH YOU! It's me! Beth! I'm just wearing a papaya mask! So dramatic!", "ANO BA! Ako lang 'to! Si Beth! Naka-papaya mask lang ako! Ang OA mo!"), { sfx: 'wahwah', chars: ['lola:left', 'kapitan:center', 'beth:right'] }],
        ['kapitan', T("Aling Ising, sorry to bother you. Nonoy is missing — Pering's boy. He hasn't come home since this afternoon.", "Aling Ising, sorry po sa istorbo. Nawawala si Nonoy — anak ni Pering. Hindi pa umuuwi mula kaninang hapon.")],
        ['beth', T("And I know who did it! TONYO! The albularyo! He's an ASWANG!", "At alam ko kung sino ang may kasalanan! Si TONYO! 'Yung albularyo! ASWANG 'yan!")],
        ['lola', T("Beth, don't go accusing people...", "Beth, wag kang basta nang-aakusa...")],
        ['beth', T('Then why is he always awake at night?! Why does he grow weird plants?! Why does he never like my posts?!', "Eh bakit laging gising pag gabi?! Bakit ang weird ng mga tanim niya?! Bakit hindi niya nila-like ang mga posts ko?!")],
        ['kapitan', T('...Beth, not liking your posts is not evidence.', "...Beth, hindi ebidensya yung hindi pag-like.")],
      ],
      choices: [
        { text: T('Defend Mang Tonyo. "We have no proof. Maybe Nonoy just got lost."', "Ipagtanggol si Mang Tonyo. \"Wala pa po tayong pruweba. Baka naligaw lang si Nonoy.\""), effects: { loob: 1 }, next: 'tanggol' },
        { text: T('Listen and ask. "Kapitan, where was Nonoy last seen?"', "Makinig at magtanong. \"Kap, saan po huling nakita si Nonoy?\""), effects: { tiwala: 1 }, next: 'tanong' },
        { text: T('Stand up now. "Let\'s go find him right now!"', "Tumayo agad. \"Tara na po, hanapin na natin siya ngayon na!\""), effects: { tapang: 1 }, next: 'hanap' },
      ],
    },
    tanggol: {
      bg: 'bahay',
      chars: ['lola:left', 'kapitan:center', 'beth:right'],
      lines: [
        ['beth', T("Wow! You just got here and you're a lawyer already?", "Aba! Kararating mo lang, abogado ka na agad?")],
        ['kapitan', T("The kid is right, Beth. Nobody gets judged without evidence. Let's gather at the plaza.", "Tama yung bata, Beth. Walang huhusgahan nang walang ebidensya. Doon tayo magkita-kita sa plaza.")],
      ],
      next: 'plaza',
    },
    tanong: {
      bg: 'bahay',
      chars: ['lola:left', 'kapitan:center', 'beth:right'],
      lines: [
        ['kapitan', T('Out in the fields... near the balete tree we cut down.', "Doon sa bukid... malapit sa pinutol na balete.")],
        T('Everyone goes quiet. Even the gecko.', 'Biglang natahimik ang lahat. Pati ang butiki.'),
        ['kapitan', T('Thank you for asking calmly, anak. Vote for me next election. Just kidding. But seriously.', "Salamat sa maayos na tanong, anak. Iboto mo 'ko next election ha. Joke lang. Pero seryoso.")],
      ],
      next: 'plaza',
    },
    hanap: {
      bg: 'bahay',
      chars: ['lola:left', 'kapitan:center', 'beth:right'],
      lines: [
        ['kapitan', T("So brave! But it's dark, anak. Even my flashlight is scared.", "Tapang mo ah! Pero madilim na, anak. Pati flashlight ko natatakot.")],
        ['lola', T('Be careful, apo. And bring salt.', 'Mag-ingat ka, apo. At magdala ka ng asin.')],
        ['you', T('What for, La? To ward off the aswang?', 'Para saan po? Pangontra sa aswang?')],
        ['lola', T('No. For the dried fish. In case you get hungry.', 'Hindi. Sa tuyo. Baka magutom ka.')],
      ],
      next: 'plaza',
    },

    // ---------------- CHAPTER 2: THE PLAZA ----------------
    plaza: {
      music: 'dusk',
      bg: 'plaza',
      world: { time: 'night', villagers: true, place: { tess: 'plaza_tess', kapitan: 'plaza_kapitan', beth: 'plaza_beth', lola: 'house_lola', nena: 'nena_store', padre: 'padre_church' } },
      at: 'tess',
      goal: T('Go to the plaza and find Tess.', 'Pumunta sa plaza at hanapin si Tess.'),
      lines: [
        T('Night falls on the plaza. The fiesta prep goes on anyway: videoke on the corner, and Mang Ambo singing "My Way." Dangerous.', "Gabi na sa plaza. Tuloy pa rin ang paghahanda: may videoke sa kanto, at si Mang Ambo kumakanta ng \"My Way.\" Delikado."),
        ['tess', T("{name}! Back again? You really can't stay away from me, huh?", '{name}! Balik ka? Hindi mo talaga ako matiis, \'no?'), { chars: ['tess:center'] }],
        ['tess', T('...Okay, sorry. Bad time for jokes. You heard about Nonoy?', "...Okay, sorry. Hindi 'to oras ng joke. Narinig mo na ba yung tungkol kay Nonoy?")],
        ['tess', T("But seriously... something's off this year. Kapitan had the old balete tree cut down to build the stage.", "Seryoso... may kakaiba ngayong taon. Pinaputol ni Kap yung lumang balete para gawing stage.")],
        ['tess', T('The tree the elders make offerings to every fiesta. Since then, people keep getting lost in the fields.', "Yung punong inaalayan ng matatanda tuwing pista. Mula nun, naliligaw na ang mga tao sa bukid.")],
        ['tess', T('Mang Kardo walked in circles in his own rice field for three hours. He says he heard laughing... and hoofbeats.', "Si Mang Kardo, tatlong oras paikot-ikot sa sarili niyang palayan. May naririnig daw siyang tumatawa... tsaka yabag ng kabayo.")],
        ['tess', T('Then someone commented "hehe" on his Facebook. No profile picture. Creepy, right?', "Tapos may nag-comment daw sa Facebook niya ng \"hehe.\" Walang profile picture. Nakakatakot, 'di ba?")],
      ],
      choices: [
        { text: T('Help Tess and the neighbors with the preparations.', 'Tulungan si Tess at ang mga kapitbahay sa paghahanda.'), effects: { tiwala: 1 }, next: 'bayanihan_prep' },
        { text: T('Go see the balete stump while the moon is still bright.', 'Puntahan ang tuod ng balete habang maliwanag pa ang buwan.'), effects: { tapang: 1 }, next: 'tuod' },
      ],
    },
    bayanihan_prep: {
      bg: 'plaza',
      chars: ['tess:center'],
      lines: [
        T('You help carry tables, hang lights, and wrap suman.', 'Tumulong ka magbuhat ng mesa, magsabit ng ilaw, at magbalot ng suman.'),
        T('Three titas ask when you\'re getting married. You tell all of them "Soon po." It is not true.', 'Tatlong tita ang nagtanong kung kailan ka mag-aasawa. Sinagot mo silang lahat ng "Soon po." Hindi totoo.'),
        ['tess', T("See? You're still a child of San Isidro.", 'Ayan! Kita mo? Anak ka pa rin ng San Isidro.')],
        T('Through the chatter, you learn something: Mang Tonyo is the one who cured Nonoy when he had a fever last year. For free.', "Habang nagkukwentuhan, may nalaman ka: si Mang Tonyo pala ang nagpagaling kay Nonoy nung nilagnat 'to last year. Libre pa."),
      ],
      set: { alamGinamot: true },
      next: 'kubo',
    },
    tuod: {
      music: 'horror',
      bg: 'gubat',
      world: { stalk: true },
      at: 'loc:balete',
      goal: T('Go to the balete stump — follow the path north, past the church.', "Puntahan ang tuod ng balete — sundan ang daan pataas, lampas ng simbahan."),
      lines: [
        T('It\'s cold in the fields. In the middle, the balete stump — the cut is still fresh. There\'s even a tarpaulin: "A PROJECT OF KAPITAN RAMON."', "Malamig sa bukid. Sa gitna, ang tuod ng balete — fresh pa ang putol. May nakasabit pang tarpaulin: \"PROJECT NI KAPITAN RAMON.\""),
        T('There are tracks in the dirt. Not feet... HOOVES. But only two of them, one after the other. Something walked here on two legs.', 'May mga bakas sa lupa. Hindi paa... KUKO. Pero dalawa lang, sunud-sunod. May naglakad dito nang nakatayo.'),
        T("And by the roots, a small slipper. Nonoy's, probably.", "Tapos sa ugat ng tuod, may maliit na tsinelas. Kay Nonoy siguro."),
        T('You pick up the slipper. The crickets suddenly stop.', "Pinulot mo ang tsinelas. Biglang tumahimik ang mga kuliglig."),
        T('Silence.', 'Tahimik.'),
        T('Too much silence.', 'Masyadong tahimik.'),
        ['tikbalang', T('Hhhhh... hehhhh... HEHHHHHHH...', 'Hhhhh... hehhhh... HEHHHHHHH...'), { name: '???', scare: 'tikbalang', sfx: 'laugh' }],
        T("You run. You don't look back. The whole way home, something breathes right behind you.", 'Tumakbo ka. Hindi ka lumingon. Buong daan pauwi, may humihinga sa likod mo.'),
      ],
      set: { tsinelas: true },
      give: ['tsinelas'],
      next: 'kubo',
    },

    // ---------------- CHAPTER 3: THE ALBULARYO ----------------
    kubo: {
      music: 'eerie',
      bg: 'kubo',
      world: { stalk: true, place: { tonyo: 'kubo_tonyo', tess: 'plaza_tess', kapitan: 'plaza_kapitan', beth: 'plaza_beth', lola: 'house_lola', nena: 'nena_store' } },
      at: 'tonyo',
      goal: T('Visit Mang Tonyo at his hut by the edge of the forest (northwest).', "Puntahan si Mang Tonyo sa kubo niya sa gilid ng gubat (kaliwa, pataas)."),
      walkScare: {
        type: 'whitelady',
        at: 16,
        after: T("...It's just a blanket on a clothesline. You got scared by a blanket. A BLANKET, {name}.", '...Kumot lang pala na nakasampay. Kinabahan ka sa kumot. KUMOT, {name}.'),
      },
      lines: [
        T("At the edge of the forest, Mang Tonyo's hut. It smells of incense. And... fabric softener?", "Sa gilid ng gubat, ang kubo ni Mang Tonyo. Amoy insenso. Tsaka... Downy?"),
        ['tonyo', T("I knew you'd come. You're Ising's grandchild. I saw it in the stars.", 'Alam kong darating ka. Apo ka ni Ising. Nakita ko sa mga bituin.'), { chars: ['tonyo:center'] }],
        ['you', T('Really?', 'Talaga po?')],
        ['tonyo', T('No. Ising texted me.', 'Hindi. Nag-text si Ising.')],
        ['tonyo', T("I'm not an aswang. I'm an albularyo. I heal people, I don't eat them. I'm even vegetarian on Fridays.", "Hindi ako aswang. Albularyo ako. Nanggagamot ako, hindi nangangain. Vegetarian pa nga ako pag Friday.")],
        ['tonyo', T('Nonoy was taken by a tikbalang. The balete was its home.', 'Ang kumuha kay Nonoy ay tikbalang. Ang balete ang bahay niya.')],
        ['tonyo', T('Every fiesta, the barrio made an offering — rice cakes, tobacco, and gratitude. A panata. A sacred promise.', "Tuwing pista, may alay ang barrio — kakanin, tabako, tsaka pasasalamat. Parang pangako. Panata ang tawag dun.")],
        ['tonyo', T("The tree was cut. The promise was broken. So now he's collecting. Like the electric company. But with hooves.", "Pinutol ang puno. Nasira ang pangako. Kaya ngayon, naniningil siya. Parang Meralco. Pero may kuko.")],
      ],
      choices: [
        { text: T("Show him Nonoy's slipper and describe the tracks you found.", 'Ipakita ang tsinelas ni Nonoy at ikwento ang mga bakas na nakita mo.'), if: has('tsinelas'), effects: { loob: 1 }, set: { patunay: true }, next: 'patunay' },
        { text: T('"I believe you. What do we need to do?"', "\"Naniniwala po ako sa inyo. Ano pong dapat naming gawin?\""), effects: { loob: 1 }, next: 'tulong' },
        { text: T('"How do I know you\'re not lying? Maybe it WAS you!"', "\"Paano ko malalaman na hindi kayo nagsisinungaling? Baka kayo talaga ang may gawa nito!\""), effects: { loob: -1 }, set: { nagbintang: true }, next: 'bintang' },
      ],
    },
    patunay: {
      bg: 'kubo',
      chars: ['tonyo:center'],
      lines: [
        ['tonyo', T("Tikbalang tracks, no doubt. And this... Nonoy's slipper. Size 5. Poor kid, only one foot has a slipper now.", "Bakas nga ng tikbalang. Tsaka 'to... tsinelas ni Nonoy. Size 5. Kawawang bata, isang paa na lang may tsinelas.")],
        ['tonyo', T("But here's the good news: if he left this behind, Nonoy is still alive. He's only hiding him.", "Pero good news: kung iniwan niya 'to, buhay pa si Nonoy. Tinatago lang niya.")],
      ],
      next: 'tulong',
    },
    tulong: {
      bg: 'kubo',
      chars: ['tonyo:center'],
      lines: [
        ['tonyo', T('There are two ways.', 'Dalawa ang paraan.')],
        ['tonyo', T('One: renew the panata. The whole barrio must promise — plant a new balete and make the offering together.', "Una: ibalik ang panata. Buong barrio dapat mangako — magtanim ng bagong balete at mag-alay nang sabay-sabay.")],
        ['tonyo', T("Two: face him alone. A tikbalang has three golden hairs on its back. Pull one out, and he'll obey you.", "Pangalawa: harapin mo siya mag-isa. May tatlong gintong buhok ang tikbalang sa likod. Pag nabunot mo ang isa, susunod siya sa'yo.")],
        ['you', T('Like Pokémon?', 'Parang Pokémon po?')],
        ['tonyo', T("...Yes. Like Pokémon. But if you miss, you're the one who gets caught.", "...Oo. Parang Pokémon. Pero pag pumalya ka, ikaw ang mahuhuli.")],
      ],
      next: 'babala',
    },
    bintang: {
      bg: 'kubo',
      chars: ['tonyo:center'],
      lines: [
        T('Mang Tonyo stares at you for a long time. A cricket chirps. Awkward.', 'Matagal kang tinitigan ni Mang Tonyo. Kumanta ang kuliglig. Awkward.'),
        ['tonyo', T("That's what Beth said. And the entire barangay group chat.", "Ganyan din sinabi ni Beth. Tsaka ng buong barangay group chat.")],
        ['tonyo', T("Fine. But when you come to your senses — renew the panata. That's the only way.", "Sige. Pero pag natauhan ka — ibalik niyo ang panata. Yun lang ang paraan.")],
      ],
      next: 'babala',
    },

    // ---------------- CHAPTER 3.5: THE MANANANGGAL ----------------
    babala: {
      music: 'eerie',
      bg: 'kubo',
      chars: ['tonyo:center'],
      lines: [
        ['tonyo', T('One more thing. Something else is awake tonight. I smelled it on the wind... a manananggal.', 'Isa pa. May iba pang gising ngayong gabi. Naamoy ko sa hangin... manananggal.')],
        ['you', T('The one whose body splits in half and flies around?', "Yung nahahati ang katawan tapos lumilipad?")],
        ['tonyo', T('That one. All the fear and gossip tonight is like an eat-all-you-can buffet to her.', "Siya nga. Lahat ng takot tsaka tsismis ngayong gabi, parang eat-all-you-can sa kanya.")],
        ['tonyo', T("Remember that 'white lady' by my clothesline? ...That wasn't a blanket.", "Naaalala mo yung 'white lady' sa sampayan ko? ...Hindi kumot yun.")],
        ['you', T('I would like to go back to Manila now.', 'Gusto ko na pong bumalik sa Maynila.')],
        ['tonyo', T("Take this. Enchanted coconut oil. When it bubbles, she's near. The harder it boils, the closer she is.", "O, heto. Magic na langis ng niyog. Pag kumulo, malapit siya. Mas malakas ang kulo, mas malapit siya."), { give: ['langis'] }],
        ['tonyo', T("You'll need a proper kit: garlic, salt, and a stingray tail. Find them around the barrio — before she finds you.", "Kailangan mo ng kumpletong pangontra: bawang, asin, tsaka buntot pagi. Hanapin mo sa barrio — bago ka niya mahanap."), { quest: 'kit' }],
        ['tonyo', T('And the salt is for her lower body. She hides it somewhere while she hunts. Salt it, and she can never go back to it.', "Yung asin, para sa kalahati ng katawan niya. Tinatago niya yun habang nangangaso siya. Budburan mo, at hindi na siya makakabalik.")],
      ],
      next: 'kit_hanap',
    },
    kit_hanap: {
      music: 'eerie',
      bg: 'plaza',
      world: { time: 'night', villagers: false, place: { lola: 'house_lola', tess: 'plaza_tess', kapitan: 'plaza_kapitan', beth: 'plaza_beth', tonyo: 'kubo_tonyo', nena: 'nena_store' } },
      at: 'quest:kit',
      events: { flyover: { after: 22, text: T('Something huge just flew over the rooftops... with WINGS.', 'May napakalaking lumipad sa ibabaw ng mga bubong... may PAKPAK.') } },
      goal: T('Collect the anti-aswang kit: garlic, salt, and a stingray tail. (I = bag · J = quests · M = map)', "Kolektahin ang Anti-Aswang Kit: bawang, asin, at buntot pagi. (I = bag · J = quests · M = map)"),
      lines: [
        T('Garlic in your pocket. Salt in your hand. A stingray tail on your belt. You smell like a kitchen and look like a very confused superhero.', "May bawang sa bulsa mo. Asin sa kamay. Buntot pagi sa sinturon. Amoy-kusina ka at mukha kang superhero na naligaw."),
        ['you', T("Okay. I'm ready. ...I am not ready.", "Okay. Ready na 'ko. ...Hindi pa pala.")],
      ],
      next: 'gabi',
    },
    gabi: {
      music: 'hunt',
      bg: 'plaza',
      world: { time: 'night', villagers: false, crowd: false, place: {}, teleport: 'plaza_center' },
      lines: [
        { text: T('The church clock strikes eleven. The plaza is empty. Everyone went home early. Smart people.', "Tumunog ang orasan ng simbahan. Alas-onse na. Wala nang tao sa plaza. Umuwi na silang lahat. Matatalino."), sfx: 'bell1' },
        { text: T('Tik... tik... tik...', 'Tik... tik... tik...'), sfx: 'tiktik' },
        ['you', T('...What is that sound?', "...Anong tunog yun?")],
        T("It's loud. Then quieter. Quieter. Lola's voice echoes in your head: \"When the tik-tik is soft, apo... it means she's CLOSE.\"", "Malakas. Tapos humihina. Humihina pa. Naalala mo sinabi ni Lola: \"Pag mahina ang tik-tik, apo... ibig sabihin, MALAPIT na siya.\""),
        T('Silence.', "Tahimik."),
        ['manananggal', T('FOUND YOUUUU.', 'NAHANAP KITAAA.'), { name: '???', scare: 'manananggal', sfx: 'shriek' }],
        T("RUN! Survive until the midnight bell. [F] whips her with the stingray tail when she swoops close. [Shift] runs — but watch your stamina.", "TAKBO! Mabuhay ka hanggang tumunog ang kampana pag-alas dose. [F] para hampasin siya ng buntot pagi pag lumapit. [Shift] para tumakbo — pero bantayan ang stamina."),
      ],
      next: 'kaligtasan',
    },
    // SURVIVAL: in 3D this is a real chase. In 2D, the lines below summarize it.
    kaligtasan: {
      music: 'hunt',
      bg: 'plaza',
      world: { time: 'night', place: {}, teleport: 'plaza_center' },
      quest: ['survive'],
      goal: T('SURVIVE until the midnight bell! Optional: find her lower body and salt it.', "MABUHAY hanggang tumunog ang kampana! Optional: hanapin ang kalahati ng katawan niya at budburan ng asin."),
      survive: { seconds: 150, win: { bell: 'kampana', salt: 'asin_panalo' } },
      lines: [T('You run, hide, and swing a stingray tail at the darkness for an hour. Somehow, you are still alive.', "Tumakbo ka, nagtago, at winasiwas ang buntot pagi sa dilim nang isang oras. Buhay ka pa rin, somehow.")],
      next: 'kampana',
    },
    kampana: {
      music: 'night',
      bg: 'plaza',
      world: { time: 'night' },
      set: { nakaligtas: true },
      lines: [
        { text: T('DONG... DONG... DONG... The midnight bell!', "DONG... DONG... DONG... Ang kampana ng alas-dose!"), sfx: 'bell' },
        T('The manananggal shrieks and flees toward the forest, desperate to find her lower half before dawn.', "Sumigaw ang manananggal at tumakas pabalik sa gubat, hinahanap ang kalahati niya bago mag-umaga."),
        ['you', T("I survived. I SURVIVED. I will never complain about Manila traffic again.", "Buhay ako. BUHAY AKO. Hinding-hindi na 'ko magrereklamo sa traffic sa EDSA.")],
        T("But the shrieking woke up the whole barrio. And now there's shouting coming from the plaza...", "Pero nagising ang buong barrio sa sigaw niya. Tsaka may naririnig kang nagsisigawan sa plaza..."),
      ],
      next: 'sulo',
    },
    asin_panalo: {
      music: 'night',
      bg: 'plaza',
      world: { time: 'night' },
      set: { nakaligtas: true, pinatay_manananggal: true },
      effects: { tapang: 1, tiwala: 1 },
      lines: [
        T('You pour the salt all over her lower body. It sizzles like lechon skin.', "Binuhos mo lahat ng asin sa kalahati ng katawan niya. Sumirit na parang balat ng lechon."),
        { text: T('Above you, a scream. The manananggal spirals down, down, down... and bursts into a cloud of feathers and very bad smells.', "Sa taas mo, may sumigaw. Umikot pababa ang manananggal... tapos sumabog sa ulap ng balahibo at sobrang bahong amoy."), sfx: 'shriek' },
        ['you', T("That's for scaring me with a blanket.", "Para yan sa pananakot mo gamit ang kumot.")],
        T('The whole barrio watched from their windows. By morning, everyone will know your name. But right now, the plaza is filling with shouting...', "Nakita ng buong barrio mula sa mga bintana nila. Bukas, sikat ka na. Pero ngayon, puno na ng sigawan ang plaza..."),
      ],
      next: 'sulo',
    },

    // ---------------- CHAPTER 4: THE TORCHES ----------------
    sulo: {
      music: 'tense',
      bg: 'plaza_sulo',
      world: { crowd: true, villagers: false, place: { beth: 'mob_beth', kapitan: 'mob_kapitan', tess: 'mob_tess', nena: 'mob_nena' } },
      at: 'loc:plaza',
      goal: T("There's trouble! Get back to the plaza, now.", "May gulo! Balik agad sa plaza."),
      lines: [
        T('When you get back to the plaza, something has changed. Torches. Bolos. Someone is holding... a slipper? Okay.', "Pagbalik mo sa plaza, iba na ang eksena. May mga sulo. May mga itak. May isang may hawak na... tsinelas? Okay."),
        ['beth', T("Enough waiting! We're going to Tonyo's hut!", "Tama na ang hintay! Pupuntahan natin ang kubo ni Tonyo!"), { chars: ['kapitan:left', 'beth:center'] }],
        ['kapitan', T("Beth, wait, there's a process—", "Beth, teka lang, may proseso tayo—")],
        ['crowd', T('BURN THE HUT! DRIVE OUT THE ASWANG!', 'SUNUGIN ANG KUBO! PALAYASIN ANG ASWANG!')],
        ['crowd', T('...Wait, where is the hut again?', "...Teka, saan nga ulit yung kubo?")],
        T("Kapitan looks at you. Like he's asking for help. Or for your vote.", "Napatingin sa'yo si Kap. Parang humihingi ng tulong. O ng boto."),
      ],
      choices: [
        { text: T('Step in front of the crowd and speak.', "Pumunta sa harap ng mga tao at magsalita."), effects: { tapang: 1 }, next: 'talumpati' },
        { text: T('Let them go. Head to the balete alone to reach Nonoy first.', "Hayaan sila. Pumunta nang mag-isa sa balete para maunahan si Nonoy."), effects: { tapang: 1 }, next: 'gubat' },
        { text: T('Join the crowd. Maybe Aling Beth is right.', 'Sumama sa mga tao. Baka tama nga si Aling Beth.'), next: 'wakas_takot' },
      ],
    },
    talumpati: {
      bg: 'plaza_sulo',
      chars: ['kapitan:left', 'beth:center'],
      lines: [
        ['you', T('Everyone, listen! Mang Tonyo did NOT take Nonoy!', 'Makinig po kayo! Hindi si Mang Tonyo ang kumuha kay Nonoy!')],
        ['you', T('Mang Tonyo is the one who cured Nonoy last year! For FREE! What kind of aswang heals people for free?!', "Si Mang Tonyo pa nga ang gumamot kay Nonoy noong isang taon! LIBRE pa! Sino'ng aswang ang nanggagamot nang libre?!"), { if: has('alamGinamot') }],
        ['you', T("I saw the tracks at the stump — HOOF prints! Mang Tonyo does not wear ankle boots! And here's Nonoy's slipper!", 'Nakita ko ang mga bakas sa tuod — bakas ng KUKO! Hindi po nag-a-ankle boots si Mang Tonyo! At ito ang tsinelas ni Nonoy!'), { if: has('patunay') }],
        ['you', T('We cut down the balete. We forgot the panata. THAT is why this is happening!', "Pinutol natin ang balete. Kinalimutan natin ang panata. Yun ang dahilan!")],
      ],
      next: (s) => (s.stats.tiwala + (s.flags.patunay ? 1 : 0) >= 2 && s.stats.loob >= 2 ? 'nakinig' : 'hindi_nakinig'),
    },
    nakinig: {
      bg: 'plaza_sulo',
      world: { place: { beth: 'mob_beth', kapitan: 'mob_kapitan', tess: 'mob_tess', lola: 'mob_lola' } },
      chars: ['kapitan:left', 'beth:center', 'tess:right'],
      lines: [
        T('The plaza goes quiet. One by one, the bolos are lowered. Someone goes "Hmm."', "Tumahimik ang plaza. Isa-isang binaba ang mga itak. May isang nag-\"Hmm.\""),
        ['tess', T("I know {name}. Can't tell a lie to save their life. When we were kids, they confessed to farting in church.", "Kilala ko si {name}. Hindi marunong magsinungaling yan. Nung bata kami, inamin niyang siya yung umutot sa simbahan.")],
        ['you', T('TESS.', 'TESS.')],
        ['lola', T("My apo is right. We're the ones who forgot. We're the ones who should ask forgiveness.", "Tama ang apo ko. Tayo ang nakalimot. Tayo ang dapat mag-sorry."), { chars: ['kapitan:left', 'lola:center', 'tess:right'] }],
        ['beth', T("...Fine. Okay. But I'm bringing the rice cakes. I'm the best cook here.", "...Okay. Sige na nga. Pero ako ang magdadala ng kakanin. Ako pinakamagaling magluto dito."), { chars: ['kapitan:left', 'beth:center', 'tess:right'] }],
        ['you', T("We'll renew the panata. Together.", "Ibabalik po natin ang panata. Sama-sama.")],
      ],
      next: 'panata',
    },
    hindi_nakinig: {
      bg: 'plaza_sulo',
      chars: ['kapitan:left', 'beth:center'],
      lines: [
        ['beth', T('And who are you? Fresh off the bus from Manila and suddenly an expert? Do you even have load?', "Sino ka ba? Kararating mo lang galing Maynila, marunong ka na? May load ka ba?")],
        ['crowd', T("That's right! To the hut!", 'Tama! Tara na sa kubo!')],
        T("The crowd walks right past you. Nobody listened. It's like the entire barrio left you on seen.", "Dinaanan ka lang ng mga tao. Walang nakinig sa'yo. Parang na-seen-zone ka ng buong barrio."),
        T("But there's still time. If you get there first... if you can find Nonoy...", 'Pero may oras ka pa. Kung mauunahan mo sila... kung mahahanap mo si Nonoy...'),
      ],
      next: 'gubat',
    },

    // ---------------- CHAPTER 5A: THE PANATA ----------------
    panata: {
      music: 'horror',
      bg: 'gubat',
      world: { time: 'night', crowd: false, place: { tonyo: 'b_tonyo', lola: 'b_lola', kapitan: 'b_kapitan', beth: 'b_beth', tess: 'b_tess', tikbalang: 'b_tik' }, teleport: 'balete_front' },
      lines: [
        T('Together you walk to the stump — carrying rice cakes, tobacco, candles, a balete sapling, and a speaker playing "Tatlong Bibe." Nobody knows why.', "Sabay-sabay kayong naglakad papunta sa tuod — may dalang kakanin, tabako, kandila, maliit na puno ng balete, tsaka speaker na nagpapatugtog ng \"Tatlong Bibe.\" Walang nakakaalam kung bakit."),
        ['tonyo', T('All together now: "Tabi-tabi po..."', 'Sabay-sabay nating sabihin: "Tabi-tabi po..."'), { chars: ['tonyo:left', 'lola:right'] }],
        ['crowd', T('Tabi-tabi po...', 'Tabi-tabi po...')],
        { text: T('The wind howls. Every candle goes out. So does the speaker.', "Biglang umihip ang hangin. Namatay lahat ng kandila. Pati yung speaker."), sfx: 'wind' },
        ['tikbalang', T('SO YOU STILL REMEMBER ME.', 'NAAALALA NIYO PA PALA AKO.'), { name: '???', scare: 'tikbalang', sfx: 'growl', chars: ['tonyo:left', 'tikbalang:center', 'lola:right'] }],
        ['crowd', T('AAAAAAHHHHHHH!!!', 'AAAAAAHHHHHHH!!!')],
        ['kapitan', T("F-forgive us! We cut down your home. We'll plant a new tree. We'll never forget the panata again. Promise. No politics.", "S-sorry po! Pinutol namin ang bahay mo. Magtatanim kami ng bagong puno. Hindi na namin kakalimutan ang panata. Promise. Walang pulitika."), { chars: ['kapitan:left', 'tikbalang:center', 'lola:right'] }],
        ['tikbalang', T('...', '...')],
        ['tikbalang', T('Three hundred years I have guarded these fields. And you cut down my home... to build a STAGE.', "Tatlong daang taon kong binantayan ang mga bukid na 'to. Tapos pinutol niyo ang bahay ko... para gawing STAGE."), { sfx: 'growl' }],
        ['tikbalang', T('The boy sleeps among the roots. Unharmed. This time.', "Tulog ang bata sa ugat ng puno. Walang galos. Sa ngayon.")],
        ['tikbalang', T('Keep your promise. Break it again... and I will take more than one child.', "Tuparin niyo ang pangako. Pag sinira niyo ulit... hindi lang isang bata ang kukunin ko.")],
      ],
      next: 'wakas_bayanihan',
    },

    // ---------------- CHAPTER 5B: ALONE IN THE FOREST ----------------
    gubat: {
      music: 'horror',
      bg: 'gubat_hamog',
      world: { time: 'fog', crowd: false, place: {} },
      at: 'loc:balete',
      goal: T('Go alone to the balete stump up north. Hurry!', "Pumunta nang mag-isa sa tuod ng balete sa taas. Bilis!"),
      walkScare: {
        type: 'tikbalang',
        at: 26,
        after: T("WHAT WAS THAT?! ...It's gone. Just my imagination. Hopefully. Please.", "ANO YUN?! ...Wala na. Guni-guni lang siguro. Sana. Please."),
      },
      lines: [
        T("You're alone in the fields. The fog is getting thicker. No signal. Your flashlight is at 12%.", "Mag-isa ka sa bukid. Kumakapal ang fog. Walang signal. 12% na lang ang flashlight mo."),
        T('You walk and walk... so why are you back at the stump?', "Lakad ka nang lakad... pero bakit nandito ka na naman sa tuod?"),
        T("Third time now. You're walking in circles. Something is leading you.", "Pangatlong beses na. Paikot-ikot ka lang. Parang may gumagabay sa'yo."),
        { text: T('Something laughs in the dark. Close. Very close.', "May tumawa sa dilim. Malapit. Sobrang lapit."), sfx: 'laugh' },
        ['you', T("Wait... walking in circles. That's what Lola warned me about!", "Teka... paikot-ikot sa iisang lugar. Ito yung sinabi ni Lola!"), { if: has('naniwala') }],
      ],
      choices: [
        { text: T('Turn your shirt inside out, like Lola said.', 'Baligtarin ang damit, gaya ng bilin ni Lola.'), if: has('naniwala'), next: 'baligtad' },
        { text: T('Shout into the dark: "Show yourself! Give Nonoy back!"', 'Sumigaw sa dilim: "Magpakita ka! Ibalik mo si Nonoy!"'), if: st('tapang', 2), next: 'harap' },
        { text: T("Keep walking. You'll find a way out eventually.", "Lakad lang nang lakad. Baka makalabas ka rin."), next: 'wakas_ligaw' },
      ],
    },
    baligtad: {
      music: 'horror',
      bg: 'gubat',
      world: { time: 'night' },
      lines: [
        T('You take off your shirt and flip it inside out. The tag shows. The seams show. You look ridiculous.', "Hinubad mo ang t-shirt mo at binaligtad. Kita ang tag. Kita ang tahi. Mukha kang ewan."),
        T('But the laughing stops. The fog lifts. The path clears.', "Pero biglang tumigil ang tawa. Nawala ang fog. Luminaw ang daan."),
        T('It worked. Lola was right. Again. Annoying.', 'Gumana. Tama na naman si Lola. Nakakainis.'),
        T('And in the middle of the path...', "Tapos sa gitna ng daan..."),
        { text: T('...HE IS STANDING THERE.', '...NAKATAYO SIYA.'), scare: 'tikbalang' },
      ],
      next: 'harap',
    },
    harap: {
      music: 'horror',
      bg: 'gubat',
      world: { place: { tikbalang: 'b_tik' } },
      chars: ['tikbalang:center'],
      lines: [
        T('A long horse face. Red eyes. Legs ending in hooves. Taller than the roof of a hut.', "Mahabang mukha ng kabayo. Pulang mata. Binting may kuko. Mas matangkad pa sa bubong ng kubo."),
        { text: T('Tikbalang.', 'Tikbalang.'), sfx: 'growl' },
        ['tikbalang', T('Bold... or foolish, city dweller. What business do you have at my home that is NO MORE?', "Matapang ka... o tanga, taga-Maynila. Anong ginagawa mo sa bahay kong WALA NA?")],
        ['you', T("Where's Nonoy?", 'Nasaan si Nonoy?')],
        ['tikbalang', T('Asleep. Safe. Until the barrio pays its debt.', "Tulog. Ligtas. Hanggang bayaran ng barrio ang utang nila.")],
        ['you', T('...How much? Do you take GCash?', '...Magkano po ba? GCash?')],
        ['tikbalang', T('...', '...'), { sfx: 'breath' }],
        ['tikbalang', T('It is not money I want.', 'Hindi pera ang gusto ko.')],
        T('Behind him, in the moonlight, three golden hairs glimmer.', "Sa likod niya, sa liwanag ng buwan, kumikinang ang tatlong gintong buhok."),
      ],
      choices: [
        { text: T('Make a promise: "I\'ll plant a new balete myself. I\'ll make the offering every year."', 'Mangako: "Ako mismo ang magtatanim ng bagong balete. Ako ang mag-aalay taon-taon."'), next: 'wakas_kasunduan' },
        { text: T('Leap and yank a golden hair from his back!', "Tumalon at bunutin ang gintong buhok sa likod niya!"), next: (s) => (s.stats.tapang >= 3 ? 'wakas_gintong_buhok' : 'hulog') },
      ],
    },
    hulog: {
      music: 'horror',
      bg: 'gubat_hamog',
      world: { time: 'fog' },
      chars: ['tikbalang:center'],
      lines: [
        T("You leap — but he's faster.", 'Tumalon ka — pero mas mabilis siya.'),
        T('One swipe, and you hit the ground. In the mud. Face first.', "Isang hampas lang, bagsak ka sa lupa. Sa putikan. Mukha una."),
        ['tikbalang', T('You are not brave enough, child.', "Kulang pa ang tapang mo, bata."), { sfx: 'growl', scare: 'tikbalang' }],
        T('The world spins. The fog thickens. And he vanishes.', "Umikot ang paligid. Kumapal ang fog. Tapos bigla siyang nawala."),
      ],
      next: 'wakas_ligaw',
    },

    // ---------------- ENDINGS ----------------
    wakas_bayanihan: {
      music: 'fiesta',
      bg: 'umaga',
      world: { time: 'day', crowd: false, villagers: true, sapling: true, place: { lola: 'f_lola', tonyo: 'f_tonyo', beth: 'f_beth', tess: 'f_tess', kapitan: 'f_kapitan', nena: 'f_nena', padre: 'f_padre', kardo: 'f_kardo' }, stalk: false, teleport: 'fiesta' },
      lines: [
        T('The next morning, Nonoy is found fast asleep among the roots of the stump — clutching a single golden hair.', "Kinaumagahan, nakita si Nonoy na tulog na tulog sa ugat ng tuod — may hawak na isang gintong buhok."),
        T('The whole barrio plants the new balete. Aling Beth even posts: "Proud to be part of this. #Bayanihan #BlessedAndHighlyFavored"', "Nagtanim ang buong barrio ng bagong balete. Nag-post pa si Aling Beth: \"Proud to be part of this. #Bayanihan #BlessedAndHighlyFavored\""),
        ['beth', T("Tonyo... I'm sorry. I was wrong. I'll like all your posts from now on.", "Tonyo... sorry na. Nagkamali ako. Ila-like ko na lahat ng posts mo."), { chars: ['beth:left', 'tonyo:right'] }],
        ['tonyo', T("Thank you, Beth. But I don't have Facebook.", 'Salamat, Beth. Pero wala akong Facebook.')],
        ['beth', T('...Huh?', '...Ha?')],
        ['lola', T("I'm proud of you, apo. You reminded us who we are. Now eat. There are two more pots of adobo.", "Proud ako sa'yo, apo. Pinaalala mo sa'min kung sino kami. O, kumain ka na. May dalawang kaldero pang adobo."), { chars: ['lola:center'] }],
        T('That night, under the banderitas, the fiesta is happier than ever.', "Nung gabing yun, sa ilalim ng banderitas, mas masaya ang pista kaysa dati."),
        T('And at the edge of the fields, a tall shadow watches the fiesta lights... then turns, and walks back into the dark.', "Tapos sa gilid ng bukid, may matangkad na anino na nakatingin sa mga ilaw ng pista... bago tumalikod at bumalik sa dilim."),
      ],
      ending: 'bayanihan',
    },
    wakas_kasunduan: {
      music: 'dawn',
      bg: 'gubat_umaga',
      world: { time: 'dawn', sapling: true, place: { tikbalang: 'b_tik' } },
      lines: [
        ['tikbalang', T('A promise that cannot be broken. If you ever break it... I will know.', "Pangakong hindi puwedeng sirain. Pag sinira mo... malalaman ko."), { chars: ['tikbalang:center'], sfx: 'growl' }],
        T('At sunrise, you find Nonoy among the roots of the stump — safe, and sound asleep.', "Pagsikat ng araw, nakita mo si Nonoy sa ugat ng tuod — ligtas at tulog na tulog."),
        T('You never went back to Manila. You resigned from your job. By text.', "Hindi ka na bumalik ng Maynila. Nag-resign ka sa trabaho. Through text."),
        T('The kids now call you "the keeper of the balete."', "Tawag na sa'yo ng mga bata ngayon: \"ang bantay ng balete.\""),
        T('Some nights, you hear hooves circling the house until dawn. You never open the door.', "May mga gabing naririnig mo ang yabag ng kuko na paikot-ikot sa bahay hanggang madaling-araw. Hindi mo binubuksan ang pinto. Kahit kailan."),
      ],
      ending: 'kasunduan',
    },
    wakas_gintong_buhok: {
      music: 'dawn',
      bg: 'gubat_umaga',
      world: { time: 'dawn', fire: true, place: { tikbalang: 'b_tik' } },
      lines: [
        T("You leap and grab his mane. He bucks and gallops across the fields like a rodeo — but you don't let go.", "Tumalon ka at kumapit sa buhok niya. Nagwala siya, tumakbo sa buong bukid na parang rodeo — pero hindi ka bumitaw."),
        T('When he finally stops, a golden hair is in your hand. The tikbalang bows.', 'Pagtigil niya, hawak mo na ang isang gintong buhok. Yumuko ang tikbalang.'),
        ['tikbalang', T('...You have won. For now. I will follow you. Everywhere.', "...Panalo ka. Sa ngayon. Susundan kita. Kahit saan."), { chars: ['tikbalang:center'], sfx: 'growl' }],
        T("He returns Nonoy. You're a hero in the eyes of the barrio.", "Binalik niya si Nonoy. Bayani ka na sa buong barrio."),
        T("But on the way home, you see thick smoke rising at the forest's edge. The crowd burned Mang Tonyo's hut while you were gone.", "Pero pauwi, may nakita kang makapal na usok sa gilid ng gubat. Sinunog pala ng mga tao ang kubo ni Mang Tonyo habang wala ka."),
        T('A tikbalang is bound to you now. It never speaks. It never sleeps. And every night, you hear it breathing just behind your shoulder.', "May tikbalang nang nakatali sa'yo. Hindi siya nagsasalita. Hindi natutulog. At gabi-gabi, naririnig mo siyang humihinga sa likod mo."),
      ],
      ending: 'gintong_buhok',
    },
    wakas_takot: {
      music: 'horror',
      bg: 'kubo_sunog',
      world: { time: 'night', crowd: false, fire: true, place: { beth: 'kubo_beth' }, teleport: 'kubo_front' },
      lines: [
        T('You join the crowd. The torch is hot. The gossip is hotter.', 'Sumama ka sa mga tao. Mainit ang sulo. Mas mainit ang tsismis.'),
        T('Mang Tonyo is already gone when you reach the hut. The crowd burns it anyway.', "Wala na si Mang Tonyo sa kubo pagdating niyo. Pero sinunog pa rin ng mga tao."),
        ['beth', T("There! The aswang will never come back! I'm posting this!", "Ayan! Hindi na babalik ang aswang! I-post ko 'to!"), { chars: ['beth:center'] }],
        T('But Nonoy never comes home. The next day, two more children disappear. So does the barangay WiFi.', "Pero hindi na nakauwi si Nonoy. Kinabukasan, dalawa pang bata ang nawala. Pati ang WiFi ng barangay."),
        T('The fog thickens over San Isidro. The fiesta is cancelled.', "Kumapal ang fog sa San Isidro. Hindi natuloy ang pista."),
        T('And every night, laughter echoes from the fields — louder... closer...', "Tapos gabi-gabi, may naririnig na tumatawa sa bukid — palakas nang palakas... palapit nang palapit..."),
        { text: T('...CLOSER.', '...MAS MALAPIT.'), scare: 'tikbalang' },
      ],
      ending: 'takot',
    },
    wakas_ligaw: {
      music: 'horror',
      bg: 'gubat_hamog',
      world: { time: 'fog', place: {} },
      lines: [
        T('You walk. And walk. And walk.', "Lakad ka nang lakad. Lakad. Lakad."),
        T('The same stump. The same fog. The same laughter. The same "My Way" from Mang Ambo\'s videoke, far away.', "Paulit-ulit ang tuod. Paulit-ulit ang fog. Paulit-ulit ang \"My Way\" ni Mang Ambo sa malayo."),
        T('The villagers find you the next morning, sitting in the middle of a rice field, having a conversation with a carabao.', "Nakita ka ng mga tao kinaumagahan, nakaupo sa gitna ng palayan, kinakausap ang kalabaw."),
        ['lola', T('Apo... my apo... what happened to you?', "Apo... apo ko... anong nangyari sa'yo?"), { chars: ['lola:center'] }],
        ['you', T('La... I saw something in the fields...', 'La... may nakita po ako sa bukid...')],
        ['lola', T('What, apo?', 'Ano, apo?')],
        T("You don't answer. You just stare... at something behind Lola.", 'Hindi ka sumagot. Nakatitig ka lang... sa likod ni Lola.'),
        { text: T('A woman is standing there. Smiling.', "May nakatayong babae dun. Nakangiti."), scare: 'whitelady' },
      ],
      ending: 'ligaw',
    },
  },
};
