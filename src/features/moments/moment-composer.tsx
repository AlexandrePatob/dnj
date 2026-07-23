"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import type { Participation } from "@/types/experience";

export function MomentComposer({ participation, onClose, onCreated }: { participation: Participation; onClose: () => void; onCreated: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function selectFile(next: File) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus(null);
  }
  async function submit() {
    if (!file || !consent) return;
    setStatus("Enviando momento...");
    const body = new FormData();
    body.set("participationId", participation.id);
    body.set("image", file);
    body.set("publishConsent", "true");
    body.set("idempotencyKey", crypto.randomUUID());
    try {
      const response = await fetch("/api/mock/v1/moments", { method: "POST", headers: { authorization: "Bearer mock" }, body });
      if (!response.ok) throw await response.json();
      setStatus("Momento enviado para moderação.");
      window.setTimeout(onCreated, 700);
    } catch (error) {
      setStatus((error as { message?: string }).message ?? "Não foi possível enviar agora.");
    }
  }
  return <section className="absolute inset-0 z-50 overflow-y-auto px-5" style={{ background: "var(--background)", paddingTop: "calc(58px + var(--safe-area-top))" }} aria-label="Compartilhar momento">
    <button type="button" onClick={onClose} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--muted)" }} aria-label="Fechar"><X size={18} /></button>
    <h2 className="text-2xl font-black">Compartilhar momento</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{participation.place.name} · seus registros aparecem primeiro em Meus registros.</p>
    <input ref={inputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { const next = event.target.files?.[0]; if (next) selectFile(next); event.currentTarget.value = ""; }} />
    <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl" style={{ background: preview ? "transparent" : "var(--muted)", border: "1px dashed var(--primary)" }}>{preview ? <img src={preview} alt="Prévia do momento" className="h-full w-full object-cover" /> : <span className="text-center"><Camera className="mx-auto mb-3" style={{ color: "var(--primary)" }} /><strong>Capturar ou escolher foto</strong></span>}</button>
    <label className="mt-5 flex gap-3 rounded-2xl p-4 text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span><strong>Autorizar publicação na Galeria DNJ</strong><br /><small style={{ color: "var(--muted-foreground)" }}>Seu registro passa por moderação antes de aparecer publicamente.</small></span></label>
    {status && <p className="mt-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{status}</p>}
    <button type="button" disabled={!file || !consent || status === "Enviando momento..."} onClick={() => void submit()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}><Check size={18} /> Enviar momento</button>
  </section>;
}
