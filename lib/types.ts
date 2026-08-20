// 'bakery' is the Everyday tier, 'reservat' the by-order tier. The two tier
// names the owner uses are Everyday and Reservat; TIER_LABEL is the single
// place they are spelled for display.
export type ProductType = 'bakery' | 'plant' | 'reservat';

export const TIER_LABEL: Record<ProductType, string> = {
  bakery: 'Everyday',
  reservat: 'Reservat',
  plant: '',
};

export type Spec = { label: string; value: string };

export type Product = {
  id: string; // accession number, e.g. 'WG·B·001'
  type: ProductType;
  name: string;
  subtitle: string;
  specs: Spec[];
  priceCents: number;
  priceNote: string;
  // True when the owner has not set a price yet. Such an item is listed but
  // is never orderable — we will not guess a number to charge someone.
  pricePending: boolean;
  ships: boolean;
  capacity: number | null;
  orderedCount: number;
  active: boolean;
  // Alternate formats (a whole loaf alongside the slice) are their own SKU —
  // different price and weight — but do not get their own card on the landing
  // page. One card per product; both formats remain orderable.
  listOnHome: boolean;
  sortOrder: number;
  imageNote: string;
  ingredients: string;
  allergens: string;
};

export type OrderWindowStatus = 'scheduled' | 'open' | 'closed';

// One entry in a recurring weekly schedule.
// day: 0=Sunday … 6=Saturday (JS Date.getDay() convention)
// open/close: "HH:MM" in CST (America/Chicago)
export type ScheduleEntry = { day: number; open: string; close: string };

export type OrderWindow = {
  status: OrderWindowStatus;
  opensAt: string | null;
  closesAt: string | null;
  pickupDays: string;
  notes: string;
  // When non-empty, the recurring schedule supersedes opensAt/closesAt.
  // The system scans forward from now to find the active or next window.
  schedule: ScheduleEntry[];
};

export type StandStatus = {
  // Master on/off. When false, public always shows coming-soon.
  enabled: boolean;
  // When true, public shows coming-soon even if enabled=true.
  comingSoon: boolean;
  isOpen: boolean;
  hours: string;
  address: string;
  todayText: string;
  updatedAt: string;
  // Structured for schema.org openingHoursSpecification; hours (above) is
  // the free-text display copy shown to visitors.
  hoursDayOfWeek: string;
  hoursOpensTime: string; // "08:00"
  hoursClosesTime: string; // "13:00"
  // When non-empty, the recurring schedule drives public stand hours.
  schedule: ScheduleEntry[];
};

export type KitchenRecordContent = {
  neverInBuilding: { label: string; detail: string; placeholder: boolean }[];
  eggsStatement: { text: string; placeholder: boolean };
  presentAllergens: { text: string; placeholder: boolean };
  crossContact: { text: string; placeholder: boolean };
  legalBasis: { text: string; placeholder: boolean };
  ingredientsIntro: { text: string; placeholder: boolean };
};

export type CareGuide = {
  slug: string;
  title: string;
  plantAccession: string;
  dek: string;
  body: string;
  published: boolean;
  // The guides are numbered on the index (01, 02, …), so their order has to
  // be explicit rather than falling out of insertion timestamps.
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = { id: string; name: string; qty: number; priceCents: number };

// 'waitlist' is retained only so historical rows still type-check. Nothing
// new is written with it -- out-of-area now files as 'enquiry'.
export type OrderBranch = 'pickup' | 'shipping' | 'enquiry' | 'waitlist' | 'n/a';

export type OrderRecord = {
  id: number;
  createdAt: string;
  kind: 'order' | 'wholesale';
  branch: OrderBranch;
  name: string;
  email: string;
  phone: string;
  address: string;
  distanceMiles: number | null;
  referencePoint: string | null;
  pickupDay: string;
  items: OrderItem[];
  subtotalCents: number;
  chargeCents: number;
  taxCents: number;
  wholesaleBusiness: string;
  wholesaleQty: string;
  notes: string;
  stripeSessionId: string | null;
  stripeStatus: string;
};
