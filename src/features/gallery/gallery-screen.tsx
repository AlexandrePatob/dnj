"use client";

import NextImage from "next/image";
import { useEffect, useState } from "react";
import { Heart, Plus, Send, X } from "lucide-react";
import { BrandSticker } from "@/components/brand/brand-sticker";
import stickerLogo from "../../../Logo_DNJ_semsombra.png";
import { OperationFeedback } from "@/components/ui/operation-feedback";
import { MomentComposer } from "@/features/moments/moment-composer";
import type { AnimDir } from "@/features/app/types";
import type { GalleryPage, Moment, Participation } from "@/types/experience";
import { momentsApi, type MomentScope } from "@/lib/api/moments";
import { apiMutation, apiRequest } from "@/lib/api/client";

const motion = (dir: AnimDir) => ({ animation: dir === "left" ? "slideInLeft 280ms cubic-bezier(.22,1,.36,1) both" : "fadeUp 220ms cubic-bezier(.22,1,.36,1) both" });

function MomentImage({ moment, compact = false }: { moment: Moment; compact?: boolean }) {
  const source = (compact ? moment.thumbnailUrl : moment.imageUrl) || moment.imageUrl;
  const classes = compact ? "aspect-[3/4] w-full rounded-[7px] object-cover" : "aspect-[4/5] w-full rounded-[22px] object-cover";
  const alt = `Momento em ${moment.placeName}`;
  return source.startsWith("data:") ? <img src={source} alt={alt} className={classes} /> : <NextImage src={source} alt={alt} width={1024} height={1280} className={classes} />;
}

function loadShareImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function createWatermarkedShareFile(moment: Moment) {
  const source = moment.shareImageUrl || moment.imageUrl;
  const response = await fetch(source);
  if (!response.ok) throw new Error("Não foi possível preparar a imagem.");
  const photoBlob = await response.blob();
  const photoUrl = URL.createObjectURL(photoBlob);
  try {
    const [photo, sticker] = await Promise.all([loadShareImage(photoUrl), loadShareImage(stickerLogo.src)]);
    const canvas = document.createElement("canvas");
    canvas.width = photo.naturalWidth || photo.width;
    canvas.height = photo.naturalHeight || photo.height;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height) throw new Error("Imagem indisponível.");
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const width = Math.min(canvas.width * .28, 340);
    const height = width * ((sticker.naturalHeight || sticker.height) / (sticker.naturalWidth || sticker.width));
    context.drawImage(sticker, canvas.width - width - canvas.width * .045, canvas.height - height - canvas.height * .045, width, height);
    const composed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!composed) throw new Error("Não foi possível criar a imagem.");
    return new File([composed], "momento-dnj-2k26.png", { type: "image/png" });
  } finally { URL.revokeObjectURL(photoUrl); }
}

function ShareButton({ moment }: { moment: Moment }) {
  const [message, setMessage] = useState("");
  async function share() {
    const text = `Um momento especial do DNJ em ${moment.placeName}. #DNJ2026`;
    try {
      if (navigator.share) {
        let data: ShareData = { title: "DNJ 2K26", text };
        try { data = { ...data, files: [await createWatermarkedShareFile(moment)] }; } catch { /* Native share still receives its descriptive fallback. */ }
        await navigator.share((navigator.canShare?.(data) ?? true) ? data : { title: "DNJ 2K26", text });
        setMessage("Compartilhado.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage("Texto copiado para compartilhar.");
      } else setMessage("Compartilhamento indisponível neste navegador.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setMessage("Não foi possível abrir o compartilhamento.");
    }
  }
  return <span className="flex items-center gap-2"><button type="button" onClick={() => void share()} aria-label="Compartilhar momento" style={{ color: "var(--primary)" }}><Send size={20} /></button>{message && <small aria-live="polite" style={{ color: "var(--muted-foreground)" }}>{message}</small>}</span>;
}

function FeedCard({ moment, index, onOpen, onChanged }: { moment: Moment; index: number; onOpen: (value: Moment) => void; onChanged: () => void }) {
  const [sending, setSending] = useState(false);
  async function toggleLike() {
    setSending(true);
    try { await momentsApi.like(moment.id); onChanged(); } finally { setSending(false); }
  }
  return <article style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}>
    <header className="flex items-center gap-3 px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full text-xs font-black" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}>DNJ</span><span className="flex-1"><strong className="block text-sm">{moment.authorName}</strong><small style={{ color: "var(--muted-foreground)" }}>Juventude DNJ</small></span></header>
    <button type="button" onClick={() => onOpen(moment)} aria-label={`Abrir momento em ${moment.placeName}`} className="relative block w-full px-3 text-left"><MomentImage moment={moment} /><BrandSticker variant="watermark" decorative className="absolute bottom-3 right-5 drop-shadow-md" /></button>
    <div className="p-4"><div className="flex items-center gap-5"><button type="button" onClick={() => void toggleLike()} disabled={sending} aria-pressed={moment.likedByCurrentUser} className="flex items-center gap-2 text-sm font-bold disabled:opacity-50" style={{ color: moment.likedByCurrentUser ? "var(--secondary)" : "var(--foreground)" }}><Heart size={20} fill={moment.likedByCurrentUser ? "currentColor" : "none"} />{moment.likesCount ?? 0}</button><ShareButton moment={moment} /></div><p className="mt-3 text-sm"><strong>{moment.authorName}</strong> registrou este momento em {moment.placeName}.</p></div>
  </article>;
}

function PassportGrid({ moments, onOpen }: { moments: Moment[]; onOpen: (value: Moment) => void }) {
  return <div className="passport-grid grid grid-cols-3 gap-2.5 rounded-[20px] p-2.5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
    {moments.map((moment) => <button key={moment.id} type="button" onClick={() => onOpen(moment)} aria-label={`Abrir momento em ${moment.placeName}`} className="min-w-0 rounded-[10px] p-1.5 pb-2 text-left transition-transform active:scale-[.97]" style={{ background: "var(--card)", boxShadow: "0 5px 10px rgba(11, 35, 37, .10)" }}>
      <MomentImage moment={moment} compact />
      <span className="mt-1.5 block truncate px-0.5 text-[.58rem] font-bold uppercase tracking-[.04em]" style={{ color: "var(--muted-foreground)" }}>{moment.placeName}</span>
      {moment.moderationMessage && <span className="mt-1 block px-0.5 text-[.6rem] font-semibold leading-tight" style={{ color: "var(--destructive)" }}>{moment.moderationMessage}</span>}
    </button>)}
  </div>;
}

export function GalleryScreen({ animDir, group = "" }: { animDir: AnimDir; group?: string }) {
  const [tab, setTab] = useState<"public" | "mine" | "group">("public");
  const [page, setPage] = useState<GalleryPage>({ items: [], nextCursor: null });
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<Moment | null>(null);
  const [composerParticipation, setComposerParticipation] =
    useState<Participation | null | undefined>(undefined);
  const [composerMessage, setComposerMessage] = useState("");
  const [openingComposer, setOpeningComposer] = useState(false);
  const hasGroup = Boolean(group.trim());
  useEffect(() => {
    let active = true;
    const scope = tab === "public" ? "feed" : tab;
    momentsApi.list(scope as MomentScope).then((value) => { if (active) { setPage({ items: value.items, nextCursor: value.nextCursor ?? null }); setLoadState("ready"); } }).catch(() => active && setLoadState("error"));
    return () => { active = false; };
  }, [attempt, tab]);
  function changeTab(next: "public" | "mine" | "group") { if (next !== tab) { setLoadState("loading"); setTab(next); } }
  async function openComposer() {
    setOpeningComposer(true);
    setComposerMessage("");
    const headers: HeadersInit = {};
    try {
      const current = await apiRequest<{ participation?: Participation } | null>("/participations/current", { headers });
      if (current?.participation) {
        const value = current;
        if (value.participation?.canShareMoment) {
          setComposerParticipation(value.participation);
          return;
        }
      }
      const live = await apiRequest<{ momentChallenge?: { id: string } | null }>("/special-events/active", { headers });
      const challenge = live?.momentChallenge ?? null;
      if (!challenge) return setComposerParticipation(null);
      const value = await apiMutation<{ participation?: Participation; alreadySubmitted?: boolean; message?: string }>(`/moment-challenges/${challenge.id}/participations`, { method: "POST", headers });
    if (value.alreadySubmitted) return;
      if (value.participation) setComposerParticipation(value.participation);
    } catch (error) {
      setComposerMessage(error instanceof Error ? error.message : "Não foi possível abrir a câmera.");
    } finally {
      setOpeningComposer(false);
    }
  }
  const tabs = [{ id: "public" as const, label: "Momentos DNJ" }, { id: "mine" as const, label: "Meus" }, ...(hasGroup ? [{ id: "group" as const, label: "Grupo" }] : [])];
  const empty = tab === "public" ? { title: "Ainda não há momentos", action: "Ver meus momentos", go: () => changeTab("mine") } : { title: tab === "group" ? "Seu grupo ainda não publicou momentos" : "Você ainda não registrou momentos", action: "Ver Momentos DNJ", go: () => changeTab("public") };
  return <div className="absolute inset-0 overflow-y-auto pb-28" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))", ...motion(animDir) }}>
    <header className="px-5 pb-4"><h1 className="text-2xl font-black">Momentos</h1><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Memórias que a juventude está criando.</p><div className="mt-4 flex rounded-xl p-1" style={{ background: "var(--muted)" }}>{tabs.map((item) => <button key={item.id} onClick={() => changeTab(item.id)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: tab === item.id ? "var(--primary)" : "transparent", color: tab === item.id ? "white" : "var(--muted-foreground)" }}>{item.label}</button>)}</div></header>
    <main className="px-4 py-4">{loadState === "loading" ? <p className="py-10 text-center text-sm">Carregando momentos...</p> : loadState === "error" ? <OperationFeedback variant="error" title="Não foi possível carregar Momentos" description="Confira sua conexão e tente novamente." onRetry={() => { setLoadState("loading"); setAttempt((value) => value + 1); }} /> : page.items.length === 0 ? <OperationFeedback variant="empty" title={empty.title} description="Participe de uma atividade para registrar uma memória do encontro." onRetry={empty.go} retryLabel={empty.action} /> : tab === "public" ? <div className="mx-auto flex max-w-sm flex-col gap-4">{page.items.map((item, index) => <FeedCard key={item.id} moment={item} index={index} onOpen={setSelected} onChanged={() => setAttempt((value) => value + 1)} />)}</div> : <PassportGrid moments={page.items} onOpen={setSelected} />}</main>
    <button type="button" aria-label="Adicionar momento" disabled={openingComposer} onClick={() => void openComposer()} className="fixed bottom-24 right-5 grid h-14 w-14 place-items-center rounded-full text-white disabled:opacity-60" style={{ background: "var(--primary)", boxShadow: "var(--shadow-card)" }}><Plus /></button>
    {composerMessage && <p role="alert" className="fixed bottom-40 left-5 right-5 z-40 rounded-xl px-4 py-3 text-center text-sm" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", color: "var(--destructive)" }}>{composerMessage}</p>}
    {selected && <section role="dialog" aria-label="Detalhe do momento" className="absolute inset-0 z-50 flex items-center bg-black/60 p-5"><div className="relative w-full rounded-3xl p-3" style={{ background: "var(--card)" }}><button type="button" className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white" aria-label="Fechar detalhe" onClick={() => setSelected(null)}><X size={18} /></button><MomentImage moment={selected} /><div className="flex items-center justify-between px-2 pt-3"><strong>{selected.placeName}</strong><ShareButton moment={selected} /></div></div></section>}
    {composerParticipation !== undefined && <MomentComposer participation={composerParticipation} onClose={() => setComposerParticipation(undefined)} onCreated={() => { setComposerParticipation(undefined); setAttempt((value) => value + 1); }} />}
  </div>;
}
