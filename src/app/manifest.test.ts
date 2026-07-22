import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { metadata, viewport } from "./layout";
import manifest from "./manifest";

describe("PWA manifest and platform metadata", () => {
  const appManifest = manifest();

  it("exposes the DNJ install identity", () => {
    expect(appManifest).toMatchObject({
      name: "DNJ Game 2K26",
      short_name: "DNJ Game",
      description: "Sua jornada no Dia Nacional da Juventude 2026.",
      lang: "pt-BR",
    });
  });

  it("opens the initial route as a portrait standalone app", () => {
    expect(appManifest).toMatchObject({
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f7f8f6",
      theme_color: "#e87425",
    });
  });

  it("declares the 192 and 512 Android icons for any mask", () => {
    expect(appManifest.icons).toEqual(
      expect.arrayContaining([
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ]),
    );
  });

  it("uses only the prepared maskable asset for maskable purpose", () => {
    const maskableIcons = appManifest.icons?.filter((icon) => icon.purpose === "maskable");

    expect(maskableIcons).toEqual([
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });

  it("keeps Apple standalone metadata and the existing app metadata", () => {
    expect(metadata).toMatchObject({
      title: "DNJ Game 2K26",
      description: "Sua jornada no Dia Nacional da Juventude 2026.",
      applicationName: "DNJ Game",
      appleWebApp: {
        capable: true,
        title: "DNJ Game",
        statusBarStyle: "black-translucent",
      },
    });
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#f7f8f6" },
      { media: "(prefers-color-scheme: dark)", color: "#0d1a1a" },
    ]);
  });

  it("references only install icon files that exist", async () => {
    const publicRoot = path.join(process.cwd(), "public");
    const referencedIcons = appManifest.icons?.map((icon) => path.join(publicRoot, icon.src)) ?? [];

    await expect(Promise.all(referencedIcons.map((iconPath) => access(iconPath)))).resolves.toHaveLength(3);
    await expect(access(path.join(process.cwd(), "src/app/apple-icon.png"))).resolves.toBeUndefined();
  });
});
