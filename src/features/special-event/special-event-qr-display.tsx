"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { env } from "@/lib/env";

const POLL_MS = 15_000;

type SpecialEvent = {
  title: string;
  status: "teaser" | "active";
  qrImageUrl?: string | null;
  qrToken?: string | null;
};

export function SpecialEventQrDisplay() {
  const [event, setEvent] = useState<SpecialEvent | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${env.apiUrl}/live-display?target=screen`, { cache: "no-store" });
        if (!response.ok) throw new Error("special event unavailable");
        const data = await response.json() as SpecialEvent | null;
        const qrImageUrl = data?.qrImageUrl ?? (data?.qrToken ? await toDataURL(data.qrToken, { width: 960, margin: 1 }) : null);
        if (active) setEvent(data ? { ...data, qrImageUrl } : null);
      } catch {
        if (active) setEvent(null);
      }
    };

    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    return () => { active = false; window.clearInterval(poll); };
  }, []);

  const title = event?.title ?? "Desafio Especial";
  const qrImageUrl = event?.qrImageUrl ?? null;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#031c16] px-5 py-8 text-center text-white sm:px-10 sm:py-12">
      <span aria-hidden className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-[#d7ef74]/15 blur-3xl" />
      <span aria-hidden className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#f37822]/20 blur-3xl" />
      <header className="relative z-10 shrink-0">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d7ef74] sm:text-sm">DNJ Game</p>
        <h1 className="mt-3 max-w-4xl text-balance text-4xl font-bold leading-none tracking-[-0.06em] sm:text-6xl lg:text-7xl">{title}</h1>
      </header>
      <section className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-8" aria-live="polite">
        {qrImageUrl ? (
          <img src={qrImageUrl} alt={`QR Code para ${title}`} className="aspect-square w-[min(84vw,62dvh)] max-w-3xl rounded-[2rem] bg-white p-3 shadow-2xl sm:p-5" />
        ) : (
          <p className="text-lg text-white/70 sm:text-2xl">Aguardando a liberação do QR Code.</p>
        )}
      </section>
    </main>
  );
}
