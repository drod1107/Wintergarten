// Hand-drawn-style line illustrations, matching the approved mockup's
// vocabulary. Drawn in code so there's no image weight until real
// photography replaces them (see .frame img slot in SpecimenCard).

function Icon({ children, stroke }: { children: React.ReactNode; stroke: string }) {
  return (
    <svg viewBox="0 0 100 80" fill="none" stroke={stroke} strokeWidth="1.2" aria-hidden="true">
      {children}
    </svg>
  );
}

export function BrownieIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <rect x="15" y="21" width="70" height="43" rx="1" />
      <path d="M15 35h70M15 49h70M38 21v43M62 21v43" />
      <path d="M26 29c3 1 5 0 7-1M49 43c3 1 5 0 7-1M72 56c3 1 5 0 7-1" strokeLinecap="round" />
    </Icon>
  );
}

export function SnickerdoodleIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <circle cx="50" cy="41" r="25" />
      <circle cx="50" cy="41" r="18" strokeDasharray="2 4" />
      <path d="M38 32c4 3 8 3 12 0s8-3 12 0M38 50c4 3 8 3 12 0s8-3 12 0" strokeLinecap="round" />
    </Icon>
  );
}

export function AngelFoodIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M32 45h36l-4 23H36z" />
      <path d="M32 45c0-11 8-17 18-17s18 6 18 17" />
      <path d="M34 41c4-4 8 2 12-2s8 2 12-2 6 3 8 2" strokeLinecap="round" />
      <path d="M50 28V15M50 15l5 5M50 15l-5 5" strokeLinecap="round" />
    </Icon>
  );
}

export function OccasionBoxIcon() {
  return (
    <Icon stroke="#B8AD8F">
      <rect x="21" y="19" width="58" height="46" rx="1" />
      <path d="M50 19v46" />
      <path d="M21 32h29M50 51h29" strokeDasharray="3 5" />
      <circle cx="35" cy="53" r="3" />
      <circle cx="65" cy="30" r="3" />
    </Icon>
  );
}

export function PothosIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M50 71V25" />
      <path d="M50 34c-9-9-18-7-22-15 9-3 18 1 22 8zM50 47c9-9 18-7 22-15-9-3-18 1-22 8zM50 60c-9-9-18-7-22-15 9-3 18 1 22 8z" />
    </Icon>
  );
}

export function MonsteraIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M50 73V51" />
      <path d="M50 51c-18 0-28-13-28-24 0-8 6-15 14-15h28c8 0 14 7 14 15 0 11-10 24-28 24z" />
      <path d="M36 22h9M36 32h7M64 22h-9M64 34h-7" strokeLinecap="round" />
    </Icon>
  );
}

export function ZzPlantIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M40 72c0-26 4-41 6-49M60 72c0-26-4-41-6-49" />
      <path d="M46 30c-5-2-8-6-8-11 5 0 9 3 10 8zM54 30c5-2 8-6 8-11-5 0-9 3-10 8zM44 45c-6-2-10-7-10-13 7 0 11 5 12 10zM56 45c6-2 10-7 10-13-7 0-11 5-12 10z" />
    </Icon>
  );
}

export function AloeIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M50 74V44" />
      <path d="M50 44c-4-16-14-20-22-26 2 12 8 20 22 26zM50 44c4-16 14-20 22-26-2 12-8 20-22 26zM50 50c-3-13-11-16-17-21 2 10 6 16 17 21zM50 50c3-13 11-16 17-21-2 10-6 16-17 21z" />
    </Icon>
  );
}

export function SpiderPlantIcon({ dark }: { dark?: boolean }) {
  return (
    <Icon stroke={dark ? '#B8AD8F' : '#20261C'}>
      <path d="M50 70c0-20 0-32 0-40" />
      <path d="M50 40c-2-14-10-18-20-22 4 11 8 18 20 22zM50 40c2-14 10-18 20-22-4 11-8 18-20 22z" />
      <path d="M50 40c-14 6-20 16-24 26 12-4 20-14 24-26zM50 40c14 6 20 16 24 26-12-4-20-14-24-26z" strokeDasharray="2 3" />
    </Icon>
  );
}

const ICONS: Record<string, (props: { dark?: boolean }) => React.ReactElement> = {
  brownie: BrownieIcon,
  snickerdoodle: SnickerdoodleIcon,
  'angel-food-cupcake': AngelFoodIcon,
  'occasion-box': OccasionBoxIcon,
  pothos: PothosIcon,
  monstera: MonsteraIcon,
  'zz-plant': ZzPlantIcon,
  aloe: AloeIcon,
  'spider-plant': SpiderPlantIcon,
};

export function specimenIcon(imageNote: string, dark: boolean) {
  const Cmp = ICONS[imageNote];
  if (!Cmp) return <PothosIcon dark={dark} />;
  return <Cmp dark={dark} />;
}
