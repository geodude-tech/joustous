import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('art/joustus_card_portraits.png'));
const { width, height, data } = png;
console.log(`size: ${width}x${height}`);

const isGreen = (x, y) => {
  const i = (y * width + x) * 4;
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  return a > 0 && g > 200 && r < 100 && b < 100;
};

// Columns/rows that are fully green (or transparent) = separators
const colGreen = [];
for (let x = 0; x < width; x++) {
  let green = 0, total = 0;
  for (let y = 0; y < Math.min(height, 200); y++) {
    total++;
    if (isGreen(x, y)) green++;
  }
  colGreen.push(green / total);
}
const rowGreen = [];
for (let y = 0; y < height; y++) {
  let green = 0, total = 0;
  for (let x = 0; x < Math.min(width, 200); x++) {
    total++;
    if (isGreen(x, y)) green++;
  }
  rowGreen.push(green / total);
}

const runs = (arr, thresh = 0.95) => {
  const out = [];
  let start = null;
  for (let i = 0; i <= arr.length; i++) {
    const sep = i < arr.length && arr[i] >= thresh;
    if (sep && start === null) start = i;
    if (!sep && start !== null) {
      out.push([start, i - 1]);
      start = null;
    }
  }
  return out;
};

console.log('separator col runs:', JSON.stringify(runs(colGreen)));
console.log('separator row runs:', JSON.stringify(runs(rowGreen)));
