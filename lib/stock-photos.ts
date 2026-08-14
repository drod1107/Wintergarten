// Placeholder stock photography, standing in for the real product/plant
// photography the owner will supply. Sourced from Wikimedia Commons, whose
// Special:FilePath endpoint gives a stable, permanent redirect straight to
// the current file at a given width — no API key, no link rot.
//
// These are openly-licensed (CC BY / CC BY-SA) but exact photographer
// credit varies by file — see /photo-credits, which links to each source
// page. Verify licensing there before any real commercial use; swap these
// for the owner's own photography before launch either way.

export type StockPhoto = {
  url: string;
  sourcePage: string;
  description: string;
};

function commonsFilePath(filename: string, width = 800): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename).replace(/%20/g, '_')}?width=${width}`;
}

function commonsSourcePage(filename: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename).replace(/%20/g, '_')}`;
}

function photo(filename: string, description: string): StockPhoto {
  return {
    url: commonsFilePath(filename),
    sourcePage: commonsSourcePage(filename),
    description,
  };
}

export const STOCK_PHOTOS: Record<string, StockPhoto> = {
  brownie: photo('Chocolatebrownie.JPG', 'Squares of chocolate brownie'),
  snickerdoodle: photo('12-18-2017 Snickerdoodles (1 of 25).jpg', 'Cinnamon-sugar snickerdoodle cookies'),
  'angel-food-cupcake': photo('Home made meringues.jpg', 'Meringue, standing in for the torched angel food cupcake'),
  'occasion-box': photo('Gift box.jpg', 'Wrapped gift box, standing in for the boxed occasion item'),
  pothos: photo('Epipremnum aureum.jpg', 'Golden pothos, Epipremnum aureum'),
  monstera: photo('Monstera adansonii 6zz.jpg', 'Swiss cheese monstera, Monstera adansonii'),
  'zz-plant': photo('ZZ Plant (Zamioculcas zamiifolia) 1.jpg', 'ZZ plant, Zamioculcas zamiifolia'),
};

export function stockPhotoFor(imageNote: string): StockPhoto | null {
  return STOCK_PHOTOS[imageNote] ?? null;
}
