import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const DEFAULT_SOURCE = "src/assets/brand/DNJ_geral.png";
const BRAND_BACKGROUND = "#e87425";

const pngTargets = [
  { output: "public/icons/icon-192x192.png", size: 192, logoWidth: 154 },
  { output: "public/icons/icon-512x512.png", size: 512, logoWidth: 410 },
  { output: "public/icons/icon-maskable-512x512.png", size: 512, logoWidth: 320 },
  { output: "src/app/icon.png", size: 512, logoWidth: 410 },
  { output: "src/app/apple-icon.png", size: 180, logoWidth: 144 },
];

async function loadOfficialLogo(source) {
  try {
    await access(source);
  } catch {
    throw new Error(`PWA icon source not found: ${source}`);
  }

  let metadata;
  try {
    metadata = await sharp(source).metadata();
  } catch (error) {
    throw new Error(`PWA icon source must be a readable PNG: ${source}`, { cause: error });
  }
  if (metadata.format !== "png" || !metadata.width || !metadata.height) {
    throw new Error(`PWA icon source must be a PNG with valid dimensions: ${source}`);
  }

  return sharp(await readFile(source)).trim().png().toBuffer();
}

async function renderSquare(logo, size, logoWidth) {
  const renderedLogo = await sharp(logo)
    .resize({ width: logoWidth, height: logoWidth, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BACKGROUND,
    },
  })
    .composite([{ input: renderedLogo, gravity: "centre" }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
}

export async function generatePwaIcons({ root = process.cwd(), sourcePath = DEFAULT_SOURCE } = {}) {
  const source = path.isAbsolute(sourcePath) ? sourcePath : path.join(root, sourcePath);
  const logo = await loadOfficialLogo(source);
  const rendered = new Map();

  for (const target of pngTargets) {
    const output = path.join(root, target.output);
    const contents = await renderSquare(logo, target.size, target.logoWidth);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, contents);
    rendered.set(target.output, contents);
  }

  const favicon16 = await renderSquare(logo, 16, 14);
  const favicon32 = await renderSquare(logo, 32, 28);
  const favicon = await pngToIco([favicon16, favicon32]);
  const faviconPath = path.join(root, "src/app/favicon.ico");
  await mkdir(path.dirname(faviconPath), { recursive: true });
  await writeFile(faviconPath, favicon);

  return [...rendered.keys(), "src/app/favicon.ico"];
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  await generatePwaIcons();
}
