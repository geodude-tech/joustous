// Build PWA icons by upscaling a card portrait (nearest-neighbor) onto the game background.
import fs from 'node:fs';
import { PNG } from 'pngjs';

const SHEET = 'public/cards/portraits.png';
const SPRITE = 36;
const STRIDE = 38;
const OFFSET = 2;
const COLS = 12;
const PORTRAIT_INDEX = 0;

const BG = [0x14, 0x10, 0x0c];

const sheet = PNG.sync.read(fs.readFileSync(SHEET));
const sc = PORTRAIT_INDEX % COLS;
const sr = Math.floor(PORTRAIT_INDEX / COLS);
const sx = OFFSET + sc * STRIDE;
const sy = OFFSET + sr * STRIDE;

function makeIcon(size, out) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    png.data[i * 4] = BG[0];
    png.data[i * 4 + 1] = BG[1];
    png.data[i * 4 + 2] = BG[2];
    png.data[i * 4 + 3] = 255;
  }
  // Integer scale that leaves ~12% padding per side (maskable-safe).
  const scale = Math.floor((size * 0.76) / SPRITE);
  const drawn = SPRITE * scale;
  const pad = Math.floor((size - drawn) / 2);
  for (let y = 0; y < drawn; y++) {
    for (let x = 0; x < drawn; x++) {
      const px = sx + Math.floor(x / scale);
      const py = sy + Math.floor(y / scale);
      const si = (py * sheet.width + px) * 4;
      if (sheet.data[si + 3] === 0) continue;
      const di = ((pad + y) * size + (pad + x)) * 4;
      png.data[di] = sheet.data[si];
      png.data[di + 1] = sheet.data[si + 1];
      png.data[di + 2] = sheet.data[si + 2];
      png.data[di + 3] = 255;
    }
  }
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`wrote ${out}`);
}

makeIcon(192, 'public/icon-192.png');
makeIcon(512, 'public/icon-512.png');
