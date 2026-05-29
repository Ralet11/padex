const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const INPUT = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');
const OUTPUT = INPUT;

const src = PNG.sync.read(fs.readFileSync(INPUT));
const { width, height, data } = src;

let minX = width, minY = height, maxX = -1, maxY = -1;
const ALPHA_THRESHOLD = 16;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = data[(y * width + x) * 4 + 3];
    if (a > ALPHA_THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const bboxW = maxX - minX + 1;
const bboxH = maxY - minY + 1;
const bboxCenterX = (minX + maxX) / 2;
const bboxCenterY = (minY + maxY) / 2;
const canvasCenterX = width / 2;
const canvasCenterY = height / 2;
const shiftX = Math.round(canvasCenterX - bboxCenterX);
const shiftY = Math.round(canvasCenterY - bboxCenterY);

console.log(`Canvas: ${width}x${height}`);
console.log(`Ball bbox: ${bboxW}x${bboxH} at (${minX},${minY})-(${maxX},${maxY})`);
console.log(`Ball center: (${bboxCenterX.toFixed(1)}, ${bboxCenterY.toFixed(1)})`);
console.log(`Canvas center: (${canvasCenterX}, ${canvasCenterY})`);
console.log(`Shift needed: (${shiftX}, ${shiftY})`);

const dst = new PNG({ width, height });
dst.data.fill(0);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcX = x - shiftX;
    const srcY = y - shiftY;
    if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) continue;
    const srcIdx = (srcY * width + srcX) * 4;
    const dstIdx = (y * width + x) * 4;
    dst.data[dstIdx] = data[srcIdx];
    dst.data[dstIdx + 1] = data[srcIdx + 1];
    dst.data[dstIdx + 2] = data[srcIdx + 2];
    dst.data[dstIdx + 3] = data[srcIdx + 3];
  }
}

fs.writeFileSync(OUTPUT, PNG.sync.write(dst));
console.log(`Wrote centered icon to ${OUTPUT}`);
