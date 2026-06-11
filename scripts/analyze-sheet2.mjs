import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('art/joustus_card_portraits.png'));
const { width, height, data } = png;

const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// color histogram over whole image
const counts = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const k = px(x, y).join(',');
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('top colors (r,g,b,a -> count):', top);

// print first row of pixels rgb at y=0 for x=0..40
console.log('row0:', Array.from({ length: 40 }, (_, x) => px(x, 0).join(',')).join(' | '));
console.log('col0:', Array.from({ length: 40 }, (_, y) => px(0, y).join(',')).join(' | '));
