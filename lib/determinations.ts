// The rotated determination label pinned to each specimen sheet — a
// one-line curator's note. Keyed by imageNote since it's decorative
// flourish, not data the owner needs to edit through admin.
const DETERMINATIONS: Record<string, string> = {
  brownie: 'Cut thick, on purpose',
  snickerdoodle: 'Coated twice',
  'iced-lemon-loaf': 'Iced on the rack',
  'pumpkin-loaf': 'In its season',
  'der-smoking': "One week's notice",
  'occasion-cake': 'Made to the occasion',
  pothos: 'Cutting, this house',
  philodendron: 'Rooted in water first',
  'zz-plant': 'Stores its own water',
};

export function determinationFor(imageNote: string): string {
  return DETERMINATIONS[imageNote] || 'From this house';
}
