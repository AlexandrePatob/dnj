import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Operação DNJ 2K26",
    short_name: "DNJ Operação",
    description: "Painel operacional dos gestores do DNJ 2K26.",
    start_url: "/manager",
    scope: "/manager",
    display: "standalone",
    background_color: "#f4f8f2",
    theme_color: "#133d30",
    icons: [
      {
        src: "/icons/manager-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
