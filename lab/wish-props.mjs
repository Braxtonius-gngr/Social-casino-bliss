// The Wish Room's generated props: the wishes that need a mesh made outside
// the code (Rodin, or any generator that writes a GLB), one file a wish at
// assets/intro3d/rare/wish/<file>.glb; a wish that can be one or many has a
// second file, <file>-one.glb, for the single. The contract a file must meet
// (metres, resting on y 0, front to +z, PBR with the colour in baseColor, the
// budgets) and each box are in docs/props-specifications.md - the boxes here
// are that sheet's. Plain data, shared by the room (lab/wish.mjs, where each
// row becomes a library entry whose build loads the file) and the linter
// (scripts/check-wish-glb.js, which holds every file in the folder to its
// row: npm run check:glb).
//
//   file     the file's name, and the first word that calls it
//   words    what a wish may say (readWish matches whole words, plural -s/-es)
//   emoji    the placeholder's face while the model is made
//   size     the box it fills, [w, h, d] in metres; the single's in `single`
//   glow     emissive allowed (a thing that gives light)
//   glass    alphaMode BLEND allowed (a thing seen through)
//   texture  a bigger map allowed than the 1024 default, in px
//   prompt   what to ask the generator for (promptOne for the single); the
//            box's proportions go with it, so say the arrangement, not the size
//   seed     the generator's seed, for a repeatable result (the single's is seed + 1)

export const WISH_GLB_DIR = 'assets/intro3d/rare/wish/';

export const GENERATED = [
  // food and drink
  {
    file: 'cookie', words: ['cookie', 'biscuit'], emoji: '🍪', size: [0.36, 0.08, 0.36], single: [0.18, 0.03, 0.18], seed: 808,
    prompt: 'A round white ceramic plate with a thin rim holding five chocolate chip cookies arranged in a loose ring, one slightly overlapping another, golden brown baked cookies with cracked tops and chocolate chips standing out in relief, lying flat on the plate, realistic bakery style, clean studio lighting',
    promptOne: 'A single chocolate chip cookie lying flat, golden brown baked dough with a cracked top surface, chocolate chips standing out in relief, slightly uneven round edge, realistic, clean studio lighting'
  },
  { file: 'taco', words: ['taco'], emoji: '🌮', size: [0.32, 0.18, 0.14] },
  { file: 'fries', words: ['fries', 'french fries'], emoji: '🍟', size: [0.24, 0.32, 0.16] },
  { file: 'hotdog', words: ['hotdog', 'hot dog'], emoji: '🌭', size: [0.38, 0.12, 0.14] },
  { file: 'sushi', words: ['sushi', 'nigiri'], emoji: '🍣', size: [0.4, 0.1, 0.26], single: [0.12, 0.07, 0.08] },
  { file: 'beer', words: ['beer', 'pint', 'lager', 'ale'], emoji: '🍺', size: [0.2, 0.34, 0.2], glass: true },
  { file: 'wine', words: ['wine'], emoji: '🍷', size: [0.14, 0.38, 0.14], glass: true },
  { file: 'cocktail', words: ['cocktail', 'martini'], emoji: '🍸', size: [0.18, 0.34, 0.18], glass: true },
  { file: 'banana', words: ['banana'], emoji: '🍌', size: [0.36, 0.1, 0.1] },
  { file: 'cherry', words: ['cherry', 'cherries'], emoji: '🍒', size: [0.2, 0.2, 0.12] },
  { file: 'popcorn', words: ['popcorn'], emoji: '🍿', size: [0.26, 0.36, 0.26] },
  { file: 'candy', words: ['candy', 'candies', 'sweets'], emoji: '🍬', size: [0.34, 0.1, 0.34], single: [0.14, 0.06, 0.08] },
  { file: 'chocolate', words: ['chocolate'], emoji: '🍫', size: [0.3, 0.04, 0.16] },
  // casino and treasure
  { file: 'money', words: ['money', 'moneybag', 'money bag'], emoji: '💰', size: [0.32, 0.36, 0.28] },
  { file: 'cash', words: ['cash', 'dollars', 'bills', 'notes'], emoji: '💵', size: [0.3, 0.12, 0.16] },
  { file: 'coin', words: ['coin'], emoji: '🪙', size: [0.34, 0.08, 0.34], single: [0.16, 0.02, 0.16] },
  { file: 'chips', words: ['chips', 'casino chips', 'poker chips'], emoji: '🪙', size: [0.34, 0.16, 0.3] },
  { file: 'diamond', words: ['diamond', 'gem', 'jewel'], emoji: '💎', size: [0.22, 0.2, 0.22], glass: true },
  { file: 'crown', words: ['crown'], emoji: '👑', size: [0.3, 0.24, 0.3] },
  { file: 'slot', words: ['slot', 'slot machine'], emoji: '🎰', size: [0.3, 0.45, 0.22], texture: 2048 },
  { file: 'cards', words: ['cards', 'card', 'deck', 'joker'], emoji: '🃏', size: [0.34, 0.06, 0.26] },
  { file: 'clover', words: ['clover', 'shamrock'], emoji: '🍀', size: [0.28, 0.04, 0.28] },
  // creatures
  { file: 'cat', words: ['cat', 'kitten', 'kitty'], emoji: '🐈', size: [0.26, 0.38, 0.36] },
  { file: 'dog', words: ['dog', 'puppy'], emoji: '🐕', size: [0.3, 0.42, 0.44] },
  { file: 'skull', words: ['skull'], emoji: '💀', size: [0.22, 0.26, 0.28] },
  { file: 'bone', words: ['bone'], emoji: '🦴', size: [0.4, 0.1, 0.12] },
  // symbols
  { file: 'star', words: ['star'], emoji: '⭐', size: [0.3, 0.3, 0.08] },
  { file: 'heart', words: ['heart'], emoji: '❤️', size: [0.28, 0.26, 0.14] },
  { file: 'fire', words: ['fire', 'flame'], emoji: '🔥', size: [0.26, 0.4, 0.26], glow: true },
  { file: 'moon', words: ['moon', 'crescent'], emoji: '🌙', size: [0.3, 0.32, 0.08] },
  { file: 'sun', words: ['sun', 'sunshine'], emoji: '☀️', size: [0.36, 0.36, 0.08], glow: true },
  { file: 'balloon', words: ['balloon'], emoji: '🎈', size: [0.24, 0.5, 0.24] },
  // vehicles and things
  { file: 'rocket', words: ['rocket', 'spaceship'], emoji: '🚀', size: [0.22, 0.5, 0.22] },
  { file: 'guitar', words: ['guitar'], emoji: '🎸', size: [0.5, 0.08, 0.2] },
  { file: 'car', words: ['car', 'sports car', 'racecar'], emoji: '🚗', size: [0.46, 0.18, 0.22] }
];
