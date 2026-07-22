import { createHash } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generatePwaIcons } from "./generate-pwa-icons.mjs";

const pngOutputs = [
  "public/icons/icon-192x192.png",
  "public/icons/icon-512x512.png",
  "public/icons/icon-maskable-512x512.png",
  "src/app/icon.png",
  "src/app/apple-icon.png",
] as const;
const allOutputs = [...pngOutputs, "src/app/favicon.ico"] as const;

let fixtureRoot: string;

beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(tmpdir(), "dnj-pwa-icons-"));
  const sourceDirectory = path.join(fixtureRoot, "src/assets/brand");
  await mkdir(sourceDirectory, { recursive: true });
  await cp(path.resolve("src/assets/brand/DNJ_geral.png"), path.join(sourceDirectory, "DNJ_geral.png"));
  await generatePwaIcons({ root: fixtureRoot });
});

afterAll(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

async function contentBounds(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const background = [data[0], data[1], data[2]];
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const differs = [0, 1, 2].some((channel) => Math.abs(data[offset + channel] - background[channel]) > 8);
      if (differs) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

describe("PWA installable icon pipeline", () => {
  it("writes every Android, iOS, app icon, and favicon artifact as the expected file type", async () => {
    for (const output of allOutputs) {
      const contents = await readFile(path.join(fixtureRoot, output));
      expect(contents.length, output).toBeGreaterThan(0);
      if (output.endsWith(".png")) {
        expect(contents.subarray(0, 8), output).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      }
    }
  });

  it("creates the exact platform dimensions", async () => {
    const expected = new Map<string, [number, number]>([
      ["public/icons/icon-192x192.png", [192, 192]],
      ["public/icons/icon-512x512.png", [512, 512]],
      ["public/icons/icon-maskable-512x512.png", [512, 512]],
      ["src/app/icon.png", [512, 512]],
      ["src/app/apple-icon.png", [180, 180]],
    ]);
    for (const [output, dimensions] of expected) {
      const metadata = await sharp(path.join(fixtureRoot, output)).metadata();
      expect([metadata.width, metadata.height], output).toEqual(dimensions);
    }
  });

  it("keeps every PNG fully opaque, including iOS corners", async () => {
    for (const output of pngOutputs) {
      const stats = await sharp(path.join(fixtureRoot, output)).ensureAlpha().stats();
      expect(stats.channels[3].min, output).toBe(255);
    }
  });

  it("preserves the official logo proportions instead of stretching it into a square", async () => {
    const trimmedSource = await sharp(path.resolve("src/assets/brand/DNJ_geral.png")).trim().png().toBuffer();
    const source = await sharp(trimmedSource).metadata();
    const rendered = await contentBounds(path.join(fixtureRoot, "public/icons/icon-512x512.png"));
    expect(rendered.width / rendered.height).toBeCloseTo((source.width ?? 1) / (source.height ?? 1), 1);
  });

  it("uses a distinct maskable composition contained by the central 40-percent safe radius", async () => {
    const regular = await readFile(path.join(fixtureRoot, "public/icons/icon-512x512.png"));
    const maskablePath = path.join(fixtureRoot, "public/icons/icon-maskable-512x512.png");
    const maskable = await readFile(maskablePath);
    const bounds = await contentBounds(maskablePath);
    const corners = [
      [bounds.left, bounds.top],
      [bounds.right, bounds.top],
      [bounds.left, bounds.bottom],
      [bounds.right, bounds.bottom],
    ];

    expect(maskable.equals(regular)).toBe(false);
    expect(Math.max(...corners.map(([x, y]) => Math.hypot(x - 255.5, y - 255.5)))).toBeLessThanOrEqual(512 * 0.4);
  });

  it("encodes a multiresolution favicon with 16px and 32px entries", async () => {
    const ico = await readFile(path.join(fixtureRoot, "src/app/favicon.ico"));
    expect(ico.readUInt16LE(4)).toBe(2);
    expect([ico[6] || 256, ico[22] || 256]).toEqual([16, 32]);
    expect([ico.readUInt32LE(14), ico.readUInt32LE(30)].every((size) => size > 0)).toBe(true);
    const colorCounts = [0, 1].map((entry) => {
      const directoryOffset = 6 + entry * 16;
      const width = ico[directoryOffset] || 256;
      const bitmapOffset = ico.readUInt32LE(directoryOffset + 12) + 40;
      const pixels = ico.subarray(bitmapOffset, bitmapOffset + width * width * 4);
      const colors = new Set<string>();
      for (let offset = 0; offset < pixels.length; offset += 4) {
        colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
      }
      return colors.size;
    });
    expect(colorCounts.every((count) => count > 1)).toBe(true);
  });

  it("is deterministic and rejects missing or unexpected source images", async () => {
    const hashOutputs = async () => createHash("sha256")
      .update(Buffer.concat(await Promise.all(allOutputs.map((output) => readFile(path.join(fixtureRoot, output))))))
      .digest("hex");
    const firstHash = await hashOutputs();
    await generatePwaIcons({ root: fixtureRoot });
    expect(await hashOutputs()).toBe(firstHash);

    await expect(generatePwaIcons({ root: fixtureRoot, sourcePath: "missing.png" })).rejects.toThrow(/source.*not found/i);
    const invalidSource = path.join(fixtureRoot, "invalid.png");
    await writeFile(invalidSource, "not a png");
    await expect(generatePwaIcons({ root: fixtureRoot, sourcePath: invalidSource })).rejects.toThrow(/source.*PNG/i);
  });
});
