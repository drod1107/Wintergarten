import type { CareGuide, KitchenRecordContent, OrderWindow, Product, StandStatus } from './types';

// Fallback content used when DATABASE_URL is not set, and the initial state
// loaded into Postgres by scripts/seed.ts otherwise.
//
// Product copy here is the owner's supplied catalog. Where the owner marked a
// price or an ingredient list as still to come, the field is left empty and
// flagged rather than filled with a guess — the site shows a visible
// "coming soon" in its place.
//
// Accession numbers are never reissued: WG·B·003 and WG·P·002 were retired
// with the Angel Food Cupcake and the Swiss Cheese Monstera, so the sequence
// skips them.

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'WG·B·001',
    type: 'bakery',
    name: 'Classic Fudge Brownie',
    subtitle: 'the everyday one',
    specs: [
      { label: 'Eats like', value: "The pan your grandmother didn't cut evenly." },
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Cut', value: '9×13, cut 3×4 — 16 per two-pan session' },
      { label: 'Keeps', value: '4 days, sealed' },
    ],
    priceCents: 400,
    priceNote: '· $22 half dozen',
    pricePending: false,
    ships: true,
    capacity: 40,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 1,
    imageNote: 'brownie',
    ingredients:
      'Gluten-free flour blend, sugar, semi-sweet chocolate chips, cocoa powder, plant-based butter, eggs, vanilla extract, baking powder, sea salt',
    allergens: 'Eggs. Plant-based butter may contain soy.',
  },
  {
    id: 'WG·B·002',
    type: 'bakery',
    name: 'Snickerdoodle',
    subtitle: 'cinnamon, twice',
    specs: [
      { label: 'Eats like', value: 'Soft in the middle two days running.' },
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Yield', value: '36 per batch' },
      { label: 'Keeps', value: '5 days, sealed' },
    ],
    priceCents: 300,
    priceNote: '· $30 dozen',
    pricePending: false,
    ships: true,
    capacity: 60,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 2,
    imageNote: 'snickerdoodle',
    ingredients:
      'Gluten-free flour blend, sugar, plant-based butter, eggs, vanilla extract, baking powder, cinnamon, sea salt',
    allergens: 'Eggs. Plant-based butter may contain soy.',
  },
  {
    id: 'WG·B·004',
    type: 'bakery',
    name: 'Iced Lemon Loaf',
    subtitle: 'per slice — iced, sliced thick',
    specs: [
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Format', value: '9×5 loaf' },
      { label: 'Sold as', value: 'By the slice, or a whole loaf' },
    ],
    priceCents: 400,
    priceNote: '/slice · $20 whole loaf',
    pricePending: false,
    ships: true,
    capacity: 24,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 3,
    imageNote: 'iced-lemon-loaf',
    ingredients:
      'Gluten-free flour blend, sugar, eggs, plant-based butter, fresh lemon juice, lemon zest, vanilla extract, baking powder, baking soda, sea salt; Glaze: powdered sugar, lemon juice',
    allergens:
      'Eggs. Plant-based butter may contain soy. Some batches use a gluten-free flour blend containing certified gluten-free wheat starch — safe for gluten sensitivity; customers with a wheat allergy should ask before ordering.',
  },
  {
    id: 'WG·B·005',
    type: 'bakery',
    name: 'Pumpkin Loaf',
    subtitle: 'per slice — warm spice, cool season',
    specs: [
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Format', value: '9×5 loaf' },
      { label: 'Sold as', value: 'By the slice, or a whole loaf' },
    ],
    priceCents: 400,
    priceNote: '/slice · $20 whole loaf',
    pricePending: false,
    ships: true,
    capacity: 24,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 4,
    imageNote: 'pumpkin-loaf',
    ingredients:
      'Gluten-free flour blend, pumpkin purée, sugar, eggs, plant-based butter, vanilla extract, cinnamon, nutmeg, ginger, cloves, baking soda, baking powder, sea salt',
    allergens:
      'Eggs. Plant-based butter may contain soy. Some batches use a gluten-free flour blend containing certified gluten-free wheat starch — safe for gluten sensitivity; customers with a wheat allergy should ask before ordering.',
  },
  {
    id: 'WG·B·006',
    type: 'bakery',
    name: 'Iced Lemon Loaf — Whole',
    subtitle: 'whole loaf',
    specs: [
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Format', value: '9×5 loaf' },
      { label: 'Sold as', value: 'Whole loaf only' },
    ],
    priceCents: 2000,
    priceNote: '',
    pricePending: false,
    ships: true,
    capacity: 12,
    orderedCount: 0,
    active: true,
    listOnHome: false, // own SKU, but no second card on the landing page
    sortOrder: 5,
    imageNote: 'iced-lemon-loaf',
    ingredients:
      'Gluten-free flour blend, sugar, eggs, plant-based butter, fresh lemon juice, lemon zest, vanilla extract, baking powder, baking soda, sea salt; Glaze: powdered sugar, lemon juice',
    allergens:
      'Eggs. Plant-based butter may contain soy. Some batches use a gluten-free flour blend containing certified gluten-free wheat starch — safe for gluten sensitivity; customers with a wheat allergy should ask before ordering.',
  },
  {
    id: 'WG·B·007',
    type: 'bakery',
    name: 'Pumpkin Loaf — Whole',
    subtitle: 'whole loaf',
    specs: [
      { label: 'Free of', value: 'Gluten · mammal · artificial color and flavor' },
      { label: 'Format', value: '9×5 loaf' },
      { label: 'Sold as', value: 'Whole loaf only' },
    ],
    priceCents: 2000,
    priceNote: '',
    pricePending: false,
    ships: true,
    capacity: 12,
    orderedCount: 0,
    active: true,
    listOnHome: false, // own SKU, but no second card on the landing page
    sortOrder: 6,
    imageNote: 'pumpkin-loaf',
    ingredients:
      'Gluten-free flour blend, pumpkin purée, sugar, eggs, plant-based butter, vanilla extract, cinnamon, nutmeg, ginger, cloves, baking soda, baking powder, sea salt',
    allergens:
      'Eggs. Plant-based butter may contain soy. Some batches use a gluten-free flour blend containing certified gluten-free wheat starch — safe for gluten sensitivity; customers with a wheat allergy should ask before ordering.',
  },
  {
    id: 'WG·O·001',
    type: 'reservat',
    name: 'Der Smoking',
    subtitle: 'black and white, boxed and tied',
    specs: [
      { label: 'Comes in', value: 'Rigid box, magnetic closure, hand tied' },
      { label: 'Notice', value: "One week" },
      { label: 'Sold as', value: 'By order only' },
    ],
    priceCents: 4600,
    priceNote: '· by order only',
    pricePending: false,
    ships: false,
    capacity: 8,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 7,
    imageNote: 'der-smoking',
    ingredients:
      'Curated assortment of bakery items; contents vary by order. Full ingredient details for each included item are available on request and at derwintergarten.com/kitchen-record.',
    allergens:
      'Eggs (present in all items). May contain tree nuts, soy, or sesame depending on contents. Full allergen details provided at time of order.',
  },
  {
    id: 'WG·O·002',
    type: 'reservat',
    name: 'Occasion Cakes',
    subtitle: 'custom, to order',
    specs: [
      { label: 'Comes in', value: 'Made to the occasion' },
      { label: 'Notice', value: 'One week minimum' },
      { label: 'Sold as', value: 'By order only' },
    ],
    priceCents: 4500,
    priceNote: 'to $150+, depending on size and flavor',
    pricePending: false,
    ships: false,
    capacity: 4,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 8,
    imageNote: 'occasion-cake',
    ingredients: 'Varies by order',
    allergens: 'Eggs. Allergens vary by order; full details discussed at time of booking.',
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
    ],
    priceCents: 1200,
    priceNote: '',
    pricePending: false,
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 9,
    imageNote: 'pothos',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·P·004',
    type: 'plant',
    name: 'Philodendron',
    subtitle: 'Philodendron hederaceum',
    specs: [
      { label: 'Light', value: 'Bright indirect; tolerates lower light than most aroids' },
      { label: 'Water', value: 'When the top inch goes dry' },
      { label: 'Pot size', value: '4 in' },
    ],
    priceCents: 0,
    priceNote: '',
    pricePending: true,
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 10,
    imageNote: 'philodendron',
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
    ],
    priceCents: 1600,
    priceNote: '',
    pricePending: false,
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 11,
    imageNote: 'zz-plant',
    ingredients: '',
    allergens: '',
  },
  {
    id: 'WG·P·005',
    type: 'plant',
    name: 'Spider Plant',
    subtitle: 'Chlorophytum comosum',
    specs: [
      { label: 'Light', value: 'Bright indirect; adapts to moderate light' },
      { label: 'Water', value: 'When the top inch goes dry' },
      { label: 'Pot size', value: '4 in' },
    ],
    priceCents: 1000,
    priceNote: '',
    pricePending: false,
    ships: true,
    capacity: 20,
    orderedCount: 0,
    active: true,
    listOnHome: true,
    sortOrder: 12,
    imageNote: 'spider-plant',
    ingredients: '',
    allergens: '',
  },
];

export const SEED_ORDER_WINDOW: OrderWindow = {
  status: 'closed',
  opensAt: null,
  closesAt: null,
  pickupDays: 'Saturdays',
  notes: 'Baked Friday, collected Saturday.',
  // Default recurring schedule: open Sunday 8AM CST through Thursday 8PM CST.
  // The span logic in getEffectiveWindowState treats this as a single
  // continuous window from the earliest to latest checked day.
  // day 0 = Sunday, day 4 = Thursday (JS Date.getDay() convention).
  schedule: [
    { day: 0, open: '08:00', close: '23:59' },
    { day: 4, open: '00:00', close: '20:00' },
  ],
};

export const SEED_STAND_STATUS: StandStatus = {
  // Farm stand does not exist yet. Master toggle off, coming-soon on.
  enabled: false,
  comingSoon: true,
  isOpen: false,
  hours: 'Saturdays, eight until one, or until the table is empty.',
  address: '5312 Highway H, Sullivan, MO 63080',
  todayText: '',
  updatedAt: new Date().toISOString(),
  hoursDayOfWeek: 'Saturday',
  hoursOpensTime: '08:00',
  hoursClosesTime: '13:00',
  schedule: [],
};

export const SEED_KITCHEN_RECORD: KitchenRecordContent = {
  neverInBuilding: [
    { label: 'Gluten', detail: 'All contamination risks are certified gluten-free.', placeholder: false },
    {
      label: 'Mammal',
      detail: 'No dairy, gelatin, tallow, or rendered fat of any kind, ever.',
      placeholder: false,
    },
    { label: 'Artificial color', detail: 'Never used.', placeholder: false },
    { label: 'Artificial flavor', detail: 'Never used.', placeholder: false },
  ],
  eggsStatement: {
    text:
      'Real eggs are used deliberately and heavily — they are the technical foundation of this bakery. Whipped-egg structures like angel food, chiffon and meringue depend on real egg whites to hold their shape; there is no vegan substitute that does the same job, and gluten normally helps a batter hold together, so gluten-free baking without it takes real technique to get right. This is not a vegan bakery.',
    placeholder: false,
  },
  presentAllergens: {
    text:
      'Eggs are used in all baked goods and are a deliberate, central ingredient — this is not an egg-free bakery. Plant-based butter, used in place of dairy, may contain soy. Tree nuts appear in some items — check each product listing or ask before ordering. Soy and sesame appear in some products. Some loaves and bready items are made with a gluten-free flour blend that contains certified gluten-free wheat starch. These products are appropriate for people avoiding gluten, but customers with a wheat allergy — distinct from a gluten sensitivity or celiac disease — should ask about the specific item before ordering.',
    placeholder: false,
  },
  // Supplied by the owner in kitchen-record.md. This is the complete
  // statement — nothing is to be added to it.
  crossContact: {
    text:
      'All products are gluten-free. The kitchen is completely mammal-free — no dairy, gelatin, tallow, or rendered fat of any kind, ever.',
    placeholder: false,
  },
  legalBasis: {
    text: 'This bakery operates under Missouri cottage food law, RSMo 196.298.',
    placeholder: false,
  },
  ingredientsIntro: {
    text:
      'Full ingredient lists for each product are shown below and on the order page. Where a product uses a gluten-free flour blend, all blends used are certified gluten-free. All baked goods are free of gluten, dairy, and other mammal-derived ingredients.',
    placeholder: false,
  },
};

// The owner's own words, supplied in story.md and used verbatim. Lines
// beginning with '## ' render as section headings; everything else is a
// paragraph. Editable through /admin without losing that structure.
export const SEED_STORY = `## The name

Wintergarten is German for conservatory — a winter garden, a room where living things are kept warm when the world outside goes cold. The word is personal. My family is German. My ancestors were shopkeepers in rural Missouri in the 1850s, part of a wave of German immigrants who built small businesses up and down this corridor. The name connects this place to that history, and to the communities they were part of.

## Why plants

Houseplants saved my life — or at least the version of it I wanted to live. I spent years struggling with my mental health, and somewhere in that time I found that caring for plants pulled me out of my own head. It made me present. It gave me something outside myself to pay attention to, something that needed me and responded when I showed up. It taught me gratitude in a way nothing else had. I want that for other people. Every plant that leaves here has already been rooted and cared for. It is ready to grow.

## Why baking

Necessity, then obsession. I have always loved extraordinary bakeries — in every city I visit, I find the most highly rated pâtissier and go. A macaron, a tart, whatever they are known for. That is who I am.

Then my family's allergies changed what we could eat. Dairy and gluten were out, which meant the only option in most public spaces was vegan baked goods. I hate vegan baked goods. Every one I have ever had was gummy or dry or crumbly or wrong in some fundamental way — missing the thing that makes a baked good worth eating. I say that carefully, because I have no quarrel with veganism. But a vegan brownie has never once done what a brownie is supposed to do.

The thing that was destroying the texture, I eventually understood, was the absence of eggs. Neither my family nor I are allergic to eggs. That single fact changed everything.

I got serious about baking during the pandemic — the Great British Bake Off was the spark — and I fell in love with it almost immediately, because I discovered that eggs rescue gluten-free baking in ways nothing else can. They restore structure. They restore texture. They make things rise and hold and chew the way they are supposed to. The baked goods that came out of my kitchen started reaching a point where people with no allergies at all either couldn't tell or couldn't believe what they were eating. Grown adults, licking their fingers and dabbing up crumbs.

That reaction — the moment someone takes a bite of something they thought they could never have again and just lights up — is why I do this.

## What this is

Food is time travel. A good bite can take you to a moment in childhood, to the day you fell in love, to a city you've never visited. It is one of the few things that is genuinely universal. I have always been passionate about it, but I never found the part of it I wanted to do for a living — until this.

Wintergarten is a bakery and a plant shop, kept under one roof on Highway H outside Sullivan. Everything baked here is gluten-free and mammal-free, made with real eggs, and held to the standard of the best bakeries I have ever visited. Every plant here has been propagated and rooted in this house, and sent out ready to grow.

It is for the people who have been told their options are limited. They are not.`;

// Care guides: general horticultural information, drafted ahead of the
// owner's review and flagged as such in each body. sortOrder drives the
// numbering shown on the index.
export const SEED_CARE_GUIDES: Omit<CareGuide, 'createdAt' | 'updatedAt'>[] = [
  {
    slug: 'pothos-in-water-pothos-in-soil',
    title: 'Pothos in Water, Pothos in Soil',
    plantAccession: 'WG·P·001',
    dek: 'The same cutting behaves differently depending on where its roots end up.',
    published: true,
    sortOrder: 1,
    body: `Golden pothos (Epipremnum aureum) is one of the few houseplants that genuinely thrives either way, but water and soil aren't interchangeable mid-life — the plant grows a different kind of root for each.

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
    sortOrder: 2,
    body: `Zamioculcas zamiifolia stores water in thick, potato-like rhizomes just under the soil line. That single fact explains almost everything about how to keep one alive.

Because the plant is carrying its own reserve, watering on a fixed weekly schedule is the most common way to kill it. A ZZ in a normal-sized pot, in an average indoor room, often only needs water once every three to five weeks — less in winter, when growth all but stops. The right test isn't the calendar, it's the soil: let it go fully dry, then water thoroughly and don't touch it again until it's dry all the way through.

Yellowing stems are almost always a symptom of overwatering, not underwatering — the instinct to water a droopy or yellowing ZZ is exactly backwards. If a stem at the base goes soft or mushy, that's rhizome rot, and it usually means the pot has been sitting wet.

Light is flexible. ZZ plants tolerate low light better than almost any common houseplant, which is why they show up in windowless offices, but they'll grow noticeably faster in bright indirect light without needing it.

One more thing worth knowing: every part of the plant is mildly toxic if chewed or ingested, which matters if pets or small children are around it.`,
  },
  {
    slug: 'why-your-monstera-hasnt-split-yet',
    title: "Why Your Monstera Hasn't Split Yet",
    plantAccession: '',
    dek: 'Fenestration is a light problem before it is an age problem.',
    published: true,
    sortOrder: 3,
    body: `A young Monstera adansonii or Monstera deliciosa almost always starts with solid, unsplit leaves. That's normal, not a sign of a sick plant.

Split leaves — fenestration — are a response to two things: maturity and light. A cutting has to grow past its juvenile phase before it can produce fenestrated growth at all, and no amount of fertilizer speeds that up. Most indoor monsteras need several new leaves, sometimes a year or more of growth, before splitting begins.

Light is the lever you actually control. In the wild, monsteras climb toward brighter gaps in the canopy, and splitting is thought to help light reach lower leaves and let wind pass through without tearing the plant apart. Indoors, a monstera kept in low or medium light will often keep producing solid leaves indefinitely, no matter how old it is. Move it somewhere with bright, indirect light — close to an east or west window, or a few feet back from a south-facing one — and new growth usually starts showing splits within a few leaves.

A support pole helps too. Monsteras are vining araceae; a plant allowed to climb tends to mature and fenestrate faster than one left to sprawl.

What won't help: more water, more fertilizer, or repotting. Overwatering in particular just risks root rot while you wait.

If a plant is getting strong indirect light, has something to climb, and is still putting out entirely solid leaves after a year, patience is still the right answer before intervention.`,
  },
  {
    slug: 'taking-a-cutting-that-actually-roots',
    title: 'Taking a Cutting That Actually Roots',
    plantAccession: '',
    dek: 'Where you cut matters more than what you cut with.',
    published: true,
    sortOrder: 4,
    body: `Most rooting failures come down to one mistake: cutting in the wrong place. For vining plants like pothos and philodendron, roots only form at nodes — the small bump or aerial-root nub where a leaf attaches to the stem. A cutting with no node on it, no matter how healthy the leaf looks, will not root.

The basic method: using clean, sharp scissors or snips, cut just below a node, keeping at least one leaf attached above it. Remove any leaves that would sit underwater or below the soil line — leaves left to rot in water foul it quickly and can kill the cutting before roots even form.

In water, change it every few days, more often if it starts to look cloudy, and keep the cutting somewhere with bright indirect light, not direct sun, which can cook a leaf with no root system yet to support it. Roots typically show within one to three weeks for easy rooters like pothos; more temperamental plants can take longer.

In soil, the same node-below-the-surface rule applies. A rooting hormone isn't necessary for easy plants, but it can improve success rates and speed for slower ones. Keeping the soil consistently barely moist — not wet — and the humidity a little higher than normal (a loose plastic bag over the pot works) helps more than any product.

The single biggest variable is patience: check for resistance by giving the cutting a very gentle tug after a couple of weeks rather than pulling it up to look.`,
  },
  {
    slug: 'philodendron-care-guide',
    title: "The Philodendron Wants to Climb, But Won't Complain If It Can't",
    plantAccession: 'WG·P·004',
    dek: 'Forgiving without being boring, and it tells you clearly when something is wrong.',
    published: true,
    sortOrder: 5,
    body: `Philodendrons are the plant that makes new growers feel competent and experienced growers feel understood. They are forgiving without being boring. They grow visibly, respond to good light, and tell you clearly when something is wrong — which is more than most houseplants will do.

The one leaving here is a heartleaf philodendron (Philodendron hederaceum), propagated from a cutting taken in this house, rooted in water, and potted into soil once the root system was ready to support it. It is already growing. Your job is not to fix it; it is to keep it going.

## Light

Bright indirect light is the sweet spot. An east-facing window, or a few feet back from a south or west exposure. Philodendrons tolerate lower light better than most aroids — they will survive a dim corner, but they will grow slowly and the leaves will get smaller over time. Give it decent light and it rewards you with large, rich leaves and quick new growth.

## Water

Water when the top inch of soil goes dry. In a 4-inch pot in a bright spot, that is probably every five to seven days in summer, less in winter. The philodendron will begin to droop slightly when it is thirsty — that droop is a request, not an emergency. Water thoroughly, let it drain completely, and empty the saucer so it is not sitting in standing water.

Overwatering is the most common way to kill a philodendron. When in doubt, wait another day.

## Humidity and temperature

It prefers humidity but handles normal household air without complaint. It does not want to be near a heating or air conditioning vent, or against a cold window in winter. Room temperature — anywhere between 60 and 85°F — is fine.

## Feeding

A balanced liquid fertilizer once a month during the growing season (spring through early fall) is enough. Skip it in winter. This plant does not need to be pushed.

## The climbing thing

In the wild, philodendrons climb. Given a moss pole or a piece of bark to hold onto, the heartleaf will produce larger leaves and grow faster. It does not require one — it will trail happily from a shelf or a hanging basket — but if you want to see what it can really do, give it something to climb.

## What to watch for

Yellow leaves usually mean overwatering. Small or pale new leaves usually mean low light or no fertilizer during growing season. Brown tips can mean low humidity or inconsistent watering. All of these are recoverable; none of them are emergencies.`,
  },
  {
    slug: 'the-zz-does-not-want-repotting-either',
    title: 'Repotting Without Killing Anything',
    plantAccession: '',
    dek: 'Most houseplants want to be repotted less often than people think.',
    published: true,
    sortOrder: 6,
    body: `The most common repotting mistake isn't technique, it's timing — moving a plant into a new pot far more often than it needs.

A plant is generally ready for a larger pot when roots are visibly circling the inside of the nursery pot, growing out of the drainage hole, or when the plant needs watering unusually often because there's more root than soil left to hold moisture. Absent those signs, an annual repot isn't necessary and can do more harm than good, especially to slow growers like ZZ plants, which actually prefer being slightly snug.

When it is time, go up only one pot size — roughly two inches in diameter larger than the current pot. A pot that's dramatically bigger holds far more soil than the roots can use, and that excess soil stays wet long after the plant needs water, which is a common cause of root rot after a well-intentioned repot.

Gently loosen circling roots at the bottom and sides before setting the plant in new mix, water it in well, and expect a short adjustment stall — a week or two of little visible growth is normal and not a sign of failure.

The best time to repot most houseplants is during active growth, spring into summer, rather than winter, when roots recover more slowly from any disturbance.`,
  },
  {
    slug: 'spider-plant-babies',
    title: 'What To Do With All the Spider Plant Babies',
    plantAccession: 'WG·P·005',
    dek: 'Spiderettes are the plant doing your propagation for you.',
    published: true,
    sortOrder: 7,
    body: `Chlorophytum comosum is one of the few houseplants that hands you fully formed baby plants without being asked. Once a spider plant matures — usually after it's slightly rootbound — it sends out long stems tipped with small plantlets, sometimes called spiderettes or pups, each one a genetic clone of the parent.

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
    sortOrder: 8,
    body: `Aloe vera is a succulent, and nearly every indoor aloe problem traces back to treating it like a leafy houseplant instead of a desert plant.

The single most important factor is drainage. Aloe roots rot quickly in soil that stays wet, so it needs a fast-draining cactus or succulent mix, not standard potting soil, and a pot with a real drainage hole — no exceptions, regardless of how attractive a sealed decorative pot looks. If the only good pot is sealed, use it as a cachepot and keep the plant in a plastic nursery pot with drainage inside it.

Water deeply but infrequently: soak until water runs from the drainage hole, then let the soil dry out completely before watering again. That's often every two to three weeks indoors, and even less in winter when the plant is semi-dormant.

Light matters more than most people expect. Aloe kept in low light stretches — the leaves splay flat and reach toward the nearest window instead of standing upright — and rarely looks good long-term. A bright, sunny windowsill, ideally with a few hours of direct light, keeps the rosette compact.

The gel inside a leaf is genuinely useful for minor kitchen burns, but it's worth knowing the yellow latex just under the skin of the leaf is a skin irritant for some people — rinse a cut leaf before using the gel.`,
  },
];
