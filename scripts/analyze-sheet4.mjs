import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('art/joustus_card_portraits.png'));
const { width, data } = png;
const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};
const ch = (x, y) => {
  const [r, g, b] = px(x, y);
  if (r === 0 && g === 255 && b === 0) return 'G';
  if (r === 0 && g === 128 && b === 128) return 'T';
  return '.';
};
for (let y = 0; y < 75; y++) {
  let line = '';
  for (let x = 0; x < 75; x++) line += ch(x, y);
  console.log(String(y).padStart(3) + ' ' + line);
}
