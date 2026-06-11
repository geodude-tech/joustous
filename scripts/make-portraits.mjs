import fs from 'node:fs';
import { PNG } from 'pngjs';

// Chroma-key the bright green (0,255,0) background to transparent.
const png = PNG.sync.read(fs.readFileSync('art/joustus_card_portraits.png'));
const { width, height, data } = png;
for (let i = 0; i < width * height * 4; i += 4) {
  if (data[i] === 0 && data[i + 1] === 255 && data[i + 2] === 0) {
    data[i + 3] = 0;
  }
}
fs.writeFileSync('public/cards/portraits.png', PNG.sync.write(png));
console.log('wrote public/cards/portraits.png');
