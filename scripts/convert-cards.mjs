// rebuilds public/cards/*.webp from the full size originals in assets/cards
// run from the project root after adding or changing card art: node scripts/convert-cards.mjs
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";

const SOURCE = "assets/cards";
const OUTPUT = "public/cards";
const WIDTH = 640;

await mkdir(OUTPUT, { recursive: true });
const files = (await readdir(SOURCE)).filter((f) => f.endsWith(".png"));
for (const file of files) {
  await sharp(`${SOURCE}/${file}`)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(`${OUTPUT}/${file.replace(/\.png$/, ".webp")}`);
}
console.log(`converted ${files.length} cards into ${OUTPUT}`);
