import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "public", "icons");

await mkdir(outputDir, { recursive: true });

function iconSvg(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.22);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#fbfaf7"/>
    <circle cx="${size * 0.18}" cy="${size * 0.15}" r="${size * 0.24}" fill="#efe8df"/>
    <circle cx="${size * 0.86}" cy="${size * 0.78}" r="${size * 0.26}" fill="#f4dcc6"/>
    <rect x="${size * 0.25}" y="${size * 0.3}" width="${size * 0.5}" height="${size * 0.48}" rx="${size * 0.11}" fill="#8b6548"/>
    <path d="M ${size * 0.37} ${size * 0.37} C ${size * 0.37} ${size * 0.22}, ${size * 0.63} ${size * 0.22}, ${size * 0.63} ${size * 0.37}" fill="none" stroke="#fbfaf7" stroke-width="${size * 0.055}" stroke-linecap="round"/>
    <circle cx="${size * 0.38}" cy="${size * 0.49}" r="${size * 0.025}" fill="#fbfaf7"/>
    <circle cx="${size * 0.62}" cy="${size * 0.49}" r="${size * 0.025}" fill="#fbfaf7"/>
    <path d="M ${size * 0.36} ${size * 0.62} C ${size * 0.44} ${size * 0.69}, ${size * 0.56} ${size * 0.69}, ${size * 0.64} ${size * 0.62}" fill="none" stroke="#fbfaf7" stroke-width="${size * 0.035}" stroke-linecap="round"/>
  </svg>`;
}

for (const size of [192, 512]) {
  await sharp(Buffer.from(iconSvg(size))).png().toFile(path.join(outputDir, `icon-${size}.png`));
  await sharp(Buffer.from(iconSvg(size, true))).png().toFile(path.join(outputDir, `maskable-${size}.png`));
}
