// The rotated determination label pinned to each specimen sheet — a
// one-line curator's note. Keyed by imageNote since it's decorative
// flourish, not data the owner needs to edit through admin.
const DETERMINATIONS: Record<string, string> = {
  brownie: 'Cut thick, on purpose',
  snickerdoodle: 'Coated twice',
  'angel-food-cupcake': 'Torched to order',
  'occasion-box': "One week's notice",
  pothos: 'Cutting, this house',
  monstera: 'Wants a pole',
  'zz-plant': 'Stores its own water',
  aloe: 'Sunny sill, dry roots',
  'spider-plant': 'Sends its own cuttings',
};

export function determinationFor(imageNote: string): string {
  return DETERMINATIONS[imageNote] || 'From this house';
}
