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
  sortOrder: number;
  imageNote: string;
  ingredients: string;
  allergens: string;
};

export type OrderWindowStatus = 'scheduled' | 'open' | 'closed';

export type OrderWindow = {
  status: OrderWindowStatus;
  opensAt: string | null;
  closesAt: string | null;
  pickupDays: string;
  notes: string;
};

export type StandStatus = {
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

export type OrderBranch = 'pickup' | 'shipping' | 'waitlist' | 'n/a';

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
  wholesaleBusiness: string;
  wholesaleQty: string;
  notes: string;
  stripeSessionId: string | null;
  stripeStatus: string;
};
