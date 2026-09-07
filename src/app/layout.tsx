import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PwaRegistrar } from "../components/pwa/pwa-registrar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DNJ Game 2K26",
  description: "Sua jornada no Dia Nacional da Juventude 2026.",
  applicationName: "DNJ Game",
  appleWebApp: {
    capable: true,
    title: "DNJ Game",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#243b17",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className={spaceGrotesk.className}>
        <PwaRegistrar>{children}</PwaRegistrar>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
