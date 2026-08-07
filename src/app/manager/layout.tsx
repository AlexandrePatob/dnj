import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Operação DNJ 2K26",
  manifest: "/manager/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#133d30" };

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
