import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const outputDirectory = resolve("public/gallery");
const images = [
  {
    id: "woven-style",
    local: resolve("assets/gallery-sources/woven-style.jpg"),
    widths: [480, 765],
  },
  {
    id: "consultation",
    url: "https://images.pexels.com/photos/7622719/pexels-photo-7622719.jpeg?auto=compress&cs=tinysrgb&w=1800",
    widths: [480, 960, 1440],
  },
  {
    id: "natural-hair",
    url: "https://images.pexels.com/photos/34589615/pexels-photo-34589615/free-photo-of-portrait-of-woman-with-natural-hair-in-nigeria.jpeg?auto=compress&cs=tinysrgb&w=1800",
    widths: [480, 960, 1440],
  },
  {
    id: "clinic",
    url: "https://images.pexels.com/photos/30270932/pexels-photo-30270932/free-photo-of-professional-hair-stylist-in-new-orleans-studio.jpeg?auto=compress&cs=tinysrgb&w=1800",
    widths: [480, 960, 1440],
  },
  {
    id: "confidence",
    url: "https://images.pexels.com/photos/14152610/pexels-photo-14152610.jpeg?auto=compress&cs=tinysrgb&w=1800",
    widths: [480, 960, 1200],
    quality: 78,
  },
];

async function sourceBuffer(image) {
  if (image.local) return readFile(image.local);
  const response = await fetch(image.url, {
    headers: { "User-Agent": "Tamlois static gallery optimizer" },
  });
  if (!response.ok)
    throw new Error(`Could not download ${image.id}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(outputDirectory, { recursive: true });
for (const image of images) {
  const input = await sourceBuffer(image);
  for (const width of image.widths) {
    const output = resolve(outputDirectory, `${image.id}-${width}.webp`);
    const result = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: image.quality ?? 82, effort: 6, smartSubsample: true })
      .toFile(output);
    process.stdout.write(
      `${image.id}-${width}.webp ${result.width}x${result.height} ${Math.round(result.size / 1024)}KB\n`,
    );
  }
}
