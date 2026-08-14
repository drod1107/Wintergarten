import type { CareGuide, KitchenRecordContent, OrderWindow, Product, StandStatus } from './types';

// Fallback content used when DATABASE_URL is not set, and the initial
// state loaded into Postgres by scripts/seed.ts otherwise. Bakery/plant
// copy follows the tone the approved mockup demonstrated; prices, yields
// and final descriptions are the owner's to correct via /admin.

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'WG·B·001',
    type: 'bakery',
    name: 'Classic Fudge Brownie',
    subtitle: 'the everyday one',
    specs: [
      { label: 'Eats like', value: "The pan your grandmother didn't cut evenly." },
      { label: 'Free of', value: 'Gluten · mammal · artificial colour and flavour' },
      { label: 'Cut', value: '9×13, cut 3×4' },
      { label: 'Keeps', value: '4 days, sealed' },
    ],
    priceCents: 400,
    priceNote: '· $22 half dozen',
    ships: true,
    capacity: 40,
    orderedCount: 0,
    active: true,
    sortOrder: 1,
    imageNote: 'brownie',
    ingredients: '',
    allergens: 'tree nuts (walnuts, optional add-in)',
  },
  {
    id: 'WG·B·002',
    type: 'bakery',
    name: 'Snickerdoodle',
    subtitle: 'cinnamon, twice',
    specs: [
      { label: 'Eats like', value: 'Soft in the middle two days running.' },
      { label: 'Free of', value: 'Gluten · mammal · artificial colour and flavour' },
      { label: 'Yield', value: '36 per batch' },
      { label: 'Keeps', value: '5 days, sealed' },
    ],
    priceCents: 200,
    priceNote: '· $20 dozen',
    ships: true,
    capacity: 60,
    orderedCount: 0,
    active: true,
    sortOrder: 2,
    imageNote: 'snickerdoodle',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·B·003',
    type: 'bakery',
    name: 'Angel Food Cupcake',
    subtitle: 'lemon curd, torched meringue',
    specs: [
      { label: 'Eats like', value: 'Lemon meringue pie that learned to stand up.' },
      { label: 'Free of', value: 'Gluten · mammal · artificial colour and flavour' },
      { label: 'Yield', value: '6 whites · 6 yolks per batch' },
      { label: 'Keeps', value: 'Best within 2 days — meringue is torched to order' },
    ],
    priceCents: 500,
    priceNote: '· $54 dozen',
    ships: false,
    capacity: 24,
    orderedCount: 0,
    active: true,
    sortOrder: 3,
    imageNote: 'angel-food-cupcake',
    ingredients: '',
    allergens: 'coconut (in curd garnish)',
  },
  {
    id: 'WG·O·001',
    type: 'occasion',
    name: 'Der Smoking',
    subtitle: 'black and white, boxed and tied',
    specs: [
      { label: 'Eats like', value: 'The reason the rest of the table goes quiet.' },
      { label: 'Comes in', value: 'Rigid box, magnetic closure, hand tied' },
      { label: 'Notice', value: 'One week' },
    ],
    priceCents: 4600,
    priceNote: '· by order',
    ships: false,
    capacity: 8,
    orderedCount: 0,
    active: true,
    sortOrder: 4,
    imageNote: 'occasion-box',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·P·001',
    type: 'plant',
    name: 'Golden Pothos',
    subtitle: 'Epipremnum aureum',
    specs: [
      { label: 'Light', value: 'Bright indirect; forgives a dim corner' },
      { label: 'Water', value: 'When the top two inches go dry' },
      { label: 'Pot size', value: '4 in' },
      { label: 'Habit', value: 'Trailing or climbing on a pole' },
    ],
    priceCents: 1200,
    priceNote: '',
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    sortOrder: 5,
    imageNote: 'pothos',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·P·002',
    type: 'plant',
    name: 'Swiss Cheese Monstera',
    subtitle: 'Monstera adansonii',
    specs: [
      { label: 'Light', value: 'Bright indirect; holes come with age and light' },
      { label: 'Water', value: 'Weekly, less in winter' },
      { label: 'Pot size', value: '6 in' },
      { label: 'Habit', value: 'Wants a pole' },
    ],
    priceCents: 1800,
    priceNote: '',
    ships: true,
    capacity: 15,
    orderedCount: 0,
    active: true,
    sortOrder: 6,
    imageNote: 'monstera',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·P·003',
    type: 'plant',
    name: 'ZZ Plant',
    subtitle: 'Zamioculcas zamiifolia',
    specs: [
      { label: 'Light', value: 'Anything short of a closet' },
      { label: 'Water', value: 'Monthly. Truly.' },
      { label: 'Pot size', value: '4 in' },
      { label: 'Habit', value: 'Upright, glossy, slow' },
    ],
    priceCents: 1600,
    priceNote: '',
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    sortOrder: 7,
    imageNote: 'zz-plant',
    ingredients: '',
    allergens: '',
  },
];

export const SEED_ORDER_WINDOW: OrderWindow = {
  status: 'open',
  opensAt: null,
  closesAt: null,
  pickupDays: 'Saturdays',
  notes: 'Baked Friday, collected Saturday.',
};

export const SEED_STAND_STATUS: StandStatus = {
  isOpen: false,
  hours: 'Saturdays, eight until one, or until the table is empty.',
  address: '5312 Highway H, Sullivan, MO 63080',
  todayText: 'brownies · snickerdoodles · pothos · a few monstera',
  updatedAt: new Date().toISOString(),
  hoursDayOfWeek: 'Saturday',
  hoursOpensTime: '08:00',
  hoursClosesTime: '13:00',
};

export const SEED_KITCHEN_RECORD: KitchenRecordContent = {
  neverInBuilding: [
    { label: 'Gluten', detail: 'Never on the premises.', placeholder: false },
    {
      label: 'Mammal',
      detail: 'No dairy, butter, gelatin, tallow, lard, rendered animal fat, carmine, whey or casein.',
      placeholder: false,
    },
    { label: 'Artificial colour', detail: 'Never used.', placeholder: false },
    { label: 'Artificial flavour', detail: 'Never used.', placeholder: false },
  ],
  eggsStatement: {
    text:
      'Real eggs are used deliberately and heavily — they are the technical foundation of this bakery. Whipped-egg structures like angel food, chiffon and meringue cannot be made vegan, and most gluten-free bakeries make them badly. This is not a vegan bakery.',
    placeholder: false,
  },
  presentAllergens: {
    text: '[Owner to supply: which items contain tree nuts, coconut or soy, and how each is labelled.]',
    placeholder: true,
  },
  crossContact: {
    text: '[Owner to supply: the kitchen’s specific cross-contact protocol — equipment, surfaces, storage, and staff practice.]',
    placeholder: true,
  },
  legalBasis: {
    text: 'This bakery operates under Missouri cottage food law, RSMo 196.298.',
    placeholder: false,
  },
  ingredientsIntro: {
    text: '[Owner to supply: the full ingredient list for every product, ingredient by ingredient.]',
    placeholder: true,
  },
};

export const SEED_STORY = `[Owner to supply: the story of why Wintergarten exists — a household with alpha-gal syndrome, and a bakery built so the food is safe at home first. This page intentionally ships empty rather than with invented biography.]`;

// Care guides: genuine, general horticultural information — not
// business-specific claims, so it's safe to draft ahead of the owner's
// review. Each is flagged as a draft in its own metadata so nobody
// mistakes it for the owner's voice.
export const SEED_CARE_GUIDES: Omit<CareGuide, 'createdAt' | 'updatedAt'>[] = [
  {
    slug: 'why-your-monstera-hasnt-split-yet',
    title: "Why Your Monstera Hasn't Split Yet",
    plantAccession: 'WG·P·002',
    dek: 'Fenestration is a light problem before it is an age problem.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

A young Monstera adansonii or Monstera deliciosa almost always starts with solid, unsplit leaves. That's normal, not a sign of a sick plant.

Split leaves — fenestration — are a response to two things: maturity and light. A cutting has to grow past its juvenile phase before it can produce fenestrated growth at all, and no amount of fertilizer speeds that up. Most indoor monsteras need several new leaves, sometimes a year or more of growth, before splitting begins.

Light is the lever you actually control. In the wild, monsteras climb toward brighter gaps in the canopy, and splitting is thought to help light reach lower leaves and let wind pass through without tearing the plant apart. Indoors, a monstera kept in low or medium light will often keep producing solid leaves indefinitely, no matter how old it is. Move it somewhere with bright, indirect light — close to an east or west window, or a few feet back from a south-facing one — and new growth usually starts showing splits within a few leaves.

A support pole helps too. Monsteras are vining araceae; a plant allowed to climb tends to mature and fenestrate faster than one left to sprawl.

What won't help: more water, more fertilizer, or repotting. Overwatering in particular just risks root rot while you wait.

If a plant is getting strong indirect light, has something to climb, and is still putting out entirely solid leaves after a year, patience is still the right answer before intervention.`,
  },
  {
    slug: 'pothos-in-water-pothos-in-soil',
    title: 'Pothos in Water, Pothos in Soil',
    plantAccession: 'WG·P·001',
    dek: 'The same cutting behaves differently depending on where its roots end up.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

Golden pothos (Epipremnum aureum) is one of the few houseplants that genuinely thrives either way, but water and soil aren't interchangeable mid-life — the plant grows a different kind of root for each.

Roots grown in water are adapted to move oxygen differently than roots grown in soil. A cutting rooted in a jar on a windowsill can live in water indefinitely — pothos will do this for years, needing only a fresh top-off and an occasional rinse of the jar. It just grows slower than a soil-grown plant, since water alone doesn't carry much in the way of nutrients.

The trouble comes when moving a plant from one medium to the other. A water-rooted cutting moved into soil can struggle for a couple of weeks while it grows soil-adapted roots, and some of the original water roots die back in the process. It usually survives the transition fine — pothos is forgiving — but expect a stall, not instant growth.

If the goal is more plants, water propagation is the easier way to watch roots develop: cut just below a node, submerge the node, and change the water every several days. Once roots are an inch or two long, it can go straight into soil, or just stay in water permanently.

If the goal is a bigger, faster-growing plant, soil wins — pothos roots access nutrients and oxygen more efficiently in a well-draining potting mix, and growth shows it.`,
  },
  {
    slug: 'zz-plant-does-not-want-your-attention',
    title: 'The ZZ Does Not Want Your Attention',
    plantAccession: 'WG·P·003',
    dek: 'Most ZZ plant deaths are drownings, not neglect.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

Zamioculcas zamiifolia stores water in thick, potato-like rhizomes just under the soil line. That single fact explains almost everything about how to keep one alive.

Because the plant is carrying its own reserve, watering on a fixed weekly schedule is the most common way to kill it. A ZZ in a normal-sized pot, in an average indoor room, often only needs water once every three to five weeks — less in winter, when growth all but stops. The right test isn't the calendar, it's the soil: let it go fully dry, then water thoroughly and don't touch it again until it's dry all the way through.

Yellowing stems are almost always a symptom of overwatering, not underwatering — the instinct to water a droopy or yellowing ZZ is exactly backwards. If a stem at the base goes soft or mushy, that's rhizome rot, and it usually means the pot has been sitting wet.

Light is flexible. ZZ plants tolerate low light better than almost any common houseplant, which is why they show up in windowless offices, but they'll grow noticeably faster in bright indirect light without needing it.

One more thing worth knowing: every part of the plant is mildly toxic if chewed or ingested, which matters if pets or small children are around it.`,
  },
  {
    slug: 'taking-a-cutting-that-actually-roots',
    title: 'Taking a Cutting That Actually Roots',
    plantAccession: '',
    dek: 'Where you cut matters more than what you cut with.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

Most rooting failures come down to one mistake: cutting in the wrong place. For vining plants like pothos and philodendron, roots only form at nodes — the small bump or aerial-root nub where a leaf attaches to the stem. A cutting with no node on it, no matter how healthy the leaf looks, will not root.

The basic method: using clean, sharp scissors or snips, cut just below a node, keeping at least one leaf attached above it. Remove any leaves that would sit underwater or below the soil line — leaves left to rot in water foul it quickly and can kill the cutting before roots even form.

In water, change it every few days, more often if it starts to look cloudy, and keep the cutting somewhere with bright indirect light, not direct sun, which can cook a leaf with no root system yet to support it. Roots typically show within one to three weeks for easy rooters like pothos; more temperamental plants can take longer.

In soil, the same node-below-the-surface rule applies. A rooting hormone isn't necessary for easy plants, but it can improve success rates and speed for slower ones. Keeping the soil consistently barely moist — not wet — and the humidity a little higher than normal (a loose plastic bag over the pot works) helps more than any product.

The single biggest variable is patience: check for resistance by giving the cutting a very gentle tug after a couple of weeks rather than pulling it up to look.`,
  },
  {
    slug: 'spider-plant-babies',
    title: 'What To Do With All the Spider Plant Babies',
    plantAccession: '',
    dek: 'Spiderettes are the plant doing your propagation for you.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

Chlorophytum comosum is one of the few houseplants that hands you fully formed baby plants without being asked. Once a spider plant matures — usually after it's slightly rootbound — it sends out long stems tipped with small plantlets, sometimes called spiderettes or pups, each one a genetic clone of the parent.

Each plantlet already has tiny root nubs at its base before it ever touches soil or water. That makes propagation close to foolproof: snip a plantlet off the stem (or leave it attached while it roots, if the stem reaches), and either set it in water until roots lengthen, or press it directly into moist potting mix. Both work; water lets you watch the process, soil skips a transplant step later.

The parent plant isn't harmed by producing pups and doesn't need to be cut back to force it — flowering and plantlet production tend to happen on their own once the plant is mature and mildly stressed by tight roots, which is part of why spider plants are often left slightly underpotted on purpose.

Light and water needs for a new pup are the same as for the adult plant: bright indirect light, and water when the top inch of soil is dry. There's no special juvenile care required.`,
  },
  {
    slug: 'aloe-that-actually-thrives-indoors',
    title: 'Aloe That Actually Thrives Indoors',
    plantAccession: '',
    dek: 'The failure mode is almost always the pot, not the plant.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

Aloe vera is a succulent, and nearly every indoor aloe problem traces back to treating it like a leafy houseplant instead of a desert plant.

The single most important factor is drainage. Aloe roots rot quickly in soil that stays wet, so it needs a fast-draining cactus or succulent mix, not standard potting soil, and a pot with a real drainage hole — no exceptions, regardless of how attractive a sealed decorative pot looks. If the only good pot is sealed, use it as a cachepot and keep the plant in a plastic nursery pot with drainage inside it.

Water deeply but infrequently: soak until water runs from the drainage hole, then let the soil dry out completely before watering again. That's often every two to three weeks indoors, and even less in winter when the plant is semi-dormant.

Light matters more than most people expect. Aloe kept in low light stretches — the leaves splay flat and reach toward the nearest window instead of standing upright — and rarely looks good long-term. A bright, sunny windowsill, ideally with a few hours of direct light, keeps the rosette compact.

The gel inside a leaf is genuinely useful for minor kitchen burns, but it's worth knowing the yellow latex just under the skin of the leaf is a skin irritant for some people — rinse a cut leaf before using the gel.`,
  },
  {
    slug: 'the-zz-does-not-want-repotting-either',
    title: 'Repotting Without Killing Anything',
    plantAccession: '',
    dek: 'Most houseplants want to be repotted less often than people think.',
    published: true,
    body: `DRAFT — voice not yet reviewed by the owner.

The most common repotting mistake isn't technique, it's timing — moving a plant into a new pot far more often than it needs.

A plant is generally ready for a larger pot when roots are visibly circling the inside of the nursery pot, growing out of the drainage hole, or when the plant needs watering unusually often because there's more root than soil left to hold moisture. Absent those signs, an annual repot isn't necessary and can do more harm than good, especially to slow growers like ZZ plants, which actually prefer being slightly snug.

When it is time, go up only one pot size — roughly two inches in diameter larger than the current pot. A pot that's dramatically bigger holds far more soil than the roots can use, and that excess soil stays wet long after the plant needs water, which is a common cause of root rot after a well-intentioned repot.

Gently loosen circling roots at the bottom and sides before setting the plant in new mix, water it in well, and expect a short adjustment stall — a week or two of little visible growth is normal and not a sign of failure.

The best time to repot most houseplants is during active growth, spring into summer, rather than winter, when roots recover more slowly from any disturbance.`,
  },
];
