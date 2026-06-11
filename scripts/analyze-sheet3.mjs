import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('art/joustus_card_portraits.png'));
const { width, height, data } = png;
const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};
const isGreen = (x, y) => {
  const [r, g, b] = px(x, y);
  return r === 0 && g === 255 && b === 0;
};

// bounding box of green
let minX = width, maxX = 0, minY = height, maxY = 0;
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++)
    if (isGreen(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
console.log(`green bbox: x ${minX}-${maxX}, y ${minY}-${maxY}`);

// within bbox, find fully-green columns and rows (separators)
const sepCols = [];
for (let x = minX; x <= maxX; x++) {
  let all = true;
  for (let y = minY; y <= Math.min(minY + 100, maxY); y++)
    if (!isGreen(x, y)) { all = false; break; }
  if (all) sepCols.push(x);
}
const sepRows = [];
for (let y = minY; y <= maxY; y++) {
  let all = true;
  for (let x = minX; x <= Math.min(minX + 100, maxX); x++)
    if (!isGreen(x, y)) { all = false; break; }
  if (all) sepRows.push(y);
}
const collapse = (arr) => {
  const runs = [];
  for (const v of arr) {
    const last = runs[runs.length - 1];
    if (last && v === last[1] + 1) last[1] = v;
    else runs.push([v, v]);
  }
  return runs;
};
console.log('sep col runs:', JSON.stringify(collapse(sepCols)));
console.log('sep row runs:', JSON.stringify(collapse(sepRows)));
