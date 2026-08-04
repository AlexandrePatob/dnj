"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import dnjGameLogo from "@/assets/brand/DNJGAME_01.png";
import { OperationFeedback } from "@/components/ui/operation-feedback";
import type { AnimDir } from "@/features/app/types";
import type { GalleryPage, Moment } from "@/types/experience";

const motion = (dir: AnimDir) => ({ animation: dir === "left" ? "slideInLeft 280ms cubic-bezier(.22,1,.36,1) both" : "fadeUp 220ms cubic-bezier(.22,1,.36,1) both" });
const status = (moment: Moment) => moment.publicationStatus === "private" ? "Privado" : moment.moderationStatus === "pending" ? "Em moderação" : "Publicado";

function MomentImage({ moment, mine = false }: { moment: Moment; mine?: boolean }) {
  const source = (mine ? moment.thumbnailUrl : moment.imageUrl) ?? "/mock/moments/dnj-feed-01.png";
  const className = mine ? "aspect-square w-full object-cover" : "aspect-[4/5] w-full object-cover";
  const alt = `${mine ? "Seu" : "Momento"} momento em ${moment.placeName}`;
  return source.startsWith("data:") ? <img src={source} alt={alt} className={className} /> : <Image src={source} alt={alt} width={1024} height={1280} className={className} />;
}

function Card({ moment, index, onChanged }: { moment: Moment; index: number; onChanged: () => void }) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const comments = moment.comments ?? [];
  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/mock/v1/gallery/${moment.id}/${path}`, { ...init, headers: { authorization: "Bearer mock", ...init?.headers } });
    if (!response.ok) throw new Error();
  };
  const toggleLike = async () => { setSending(true); setError(null); try { await request("likes", { method: "POST" }); onChanged(); } catch { setError("Não foi possível atualizar a curtida."); } finally { setSending(false); } };
  const submitComment = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!comment.trim()) return; setSending(true); setError(null); try { await request("comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) }); setComment(""); onChanged(); } catch { setError("Não foi possível enviar o comentário."); } finally { setSending(false); } };
  const shareMoment = async () => {
    const text = `Um momento especial do DNJ em ${moment.placeName}. #DNJ2026`;
    setShareFeedback(null);
    try {
      if (navigator.share) {
        const blob = await fetch(moment.shareImageUrl).then((response) => response.ok ? response.blob() : null).catch(() => null);
        const file = blob ? new File([blob], "momento-dnj.jpg", { type: blob.type || "image/jpeg" }) : null;
        const data = file && (!navigator.canShare || navigator.canShare({ files: [file] })) ? { title: "DNJ Game 2K26", text, files: [file] } : { title: "DNJ Game 2K26", text };
        await navigator.share(data);
        setShareFeedback("Compartilhado.");
        return;
      }
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); setShareFeedback("Texto copiado para compartilhar."); return; }
      setError("Seu navegador não oferece compartilhamento.");
    } catch (reason) { if ((reason as DOMException).name !== "AbortError") setError("Não foi possível abrir o compartilhamento."); }
  };
  return <article className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}>
    <header className="flex items-center gap-3 px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full text-xs font-black" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}>DNJ</span><span className="flex-1"><strong className="block text-sm">{index ? "Rafael e amigos" : "Ana Clara"}</strong><small style={{ color: "var(--muted-foreground)" }}>Juventude DNJ</small></span></header>
    <div className="relative"><MomentImage moment={moment} /><Image src={dnjGameLogo} alt="Marca d'água DNJ" width={136} height={40} className="absolute bottom-3 right-3 h-8 w-auto drop-shadow-md" /></div>
    <div className="p-4"><div className="flex items-center gap-5"><button onClick={() => void toggleLike()} disabled={sending} aria-pressed={moment.likedByCurrentUser} className="flex items-center gap-2 text-sm font-bold disabled:opacity-50" style={{ color: moment.likedByCurrentUser ? "var(--secondary)" : "var(--foreground)" }}><Heart size={20} fill={moment.likedByCurrentUser ? "currentColor" : "none"} />{moment.likesCount ?? 0}</button><button type="button" onClick={() => void shareMoment()} className="flex items-center" aria-label="Compartilhar momento" style={{ color: "var(--primary)" }}><Send size={20} /></button></div><p className="mt-3 text-sm"><strong>{index ? "Rafael" : "Ana Clara"}</strong> registrou este momento em {moment.placeName}.</p>{comments.length > 0 && <div className="mt-3 space-y-1 text-sm">{comments.map((item) => <p key={item.id} className="break-words"><strong>{item.authorName}</strong> {item.body}</p>)}</div>}<form className="mt-3 flex items-center gap-2" onSubmit={submitComment}><MessageCircle size={17} style={{ color: "var(--muted-foreground)" }} /><input value={comment} maxLength={280} onChange={(event) => setComment(event.target.value)} placeholder="Adicionar comentário..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button disabled={sending || !comment.trim()} aria-label="Enviar comentário" className="text-sm font-bold disabled:opacity-50" style={{ color: "var(--primary)" }}>Enviar</button></form>{shareFeedback && <p aria-live="polite" className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{shareFeedback}</p>}{error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--destructive)" }}>{error}</p>}</div>
  </article>;
}

export function GalleryScreen({ animDir }: { animDir: AnimDir }) {
  const [tab, setTab] = useState<"public" | "mine">("public"); const [page, setPage] = useState<GalleryPage>({ items: [], nextCursor: null }); const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading"); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; fetch(tab === "public" ? "/api/mock/v1/gallery?eventId=event_dnj_curitiba_2026" : "/api/mock/v1/gallery/mine", { headers: tab === "mine" ? { authorization: "Bearer mock" } : undefined }).then((response) => response.ok ? response.json() : Promise.reject()).then((value: GalleryPage) => { if (live) { setPage(value); setLoadState("ready"); } }).catch(() => live && setLoadState("error")); return () => { live = false; }; }, [attempt, tab]);
  useEffect(() => { const interval = window.setInterval(() => setAttempt((value) => value + 1), 2_000); return () => window.clearInterval(interval); }, []);
  const changeTab = (next: "public" | "mine") => { if (next !== tab) { setLoadState("loading"); setTab(next); } };
  const emptyCopy = tab === "public" ? { title: "A galeria ainda não tem momentos", description: "Veja seus registros enquanto novos momentos são publicados.", action: "Ver meus momentos", onAction: () => changeTab("mine") } : { title: "Você ainda não registrou momentos", description: "Participe de uma atividade para compartilhar uma memória do encontro.", action: "Ver galeria DNJ", onAction: () => changeTab("public") };
  return <div className="absolute inset-0 overflow-y-auto pb-28" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))", ...motion(animDir) }}><header className="px-5 pb-4"><h1 className="text-2xl font-black">Galeria DNJ</h1><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Memórias que juventude está criando.</p><div className="mt-4 flex rounded-xl p-1" style={{ background: "var(--muted)" }}>{[{ id: "public" as const, label: "Galeria DNJ" }, { id: "mine" as const, label: "Meus Momentos" }].map((item) => <button key={item.id} onClick={() => changeTab(item.id)} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: tab === item.id ? "var(--primary)" : "transparent", color: tab === item.id ? "white" : "var(--muted-foreground)" }}>{item.label}</button>)}</div></header><main className="px-4 py-4">{loadState === "loading" ? <p className="py-10 text-center text-sm" aria-live="polite">Carregando momentos...</p> : loadState === "error" ? <OperationFeedback variant="error" title="Não foi possível carregar a galeria" description="Confira sua conexão e tente novamente." onRetry={() => { setLoadState("loading"); setAttempt((value) => value + 1); }} /> : page.items.length === 0 ? <OperationFeedback variant="empty" title={emptyCopy.title} description={emptyCopy.description} onRetry={emptyCopy.onAction} retryLabel={emptyCopy.action} /> : tab === "public" ? <div className="mx-auto flex max-w-sm flex-col gap-4">{page.items.map((item, index) => <Card key={item.id} moment={item} index={index} onChanged={() => setAttempt((value) => value + 1)} />)}</div> : <div className="grid grid-cols-2 gap-3">{page.items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}><MomentImage moment={item} mine /><div className="p-3"><strong className="block truncate text-sm">{item.placeName}</strong><small style={{ color: "var(--muted-foreground)" }}>{status(item)}</small></div></article>)}</div>}</main></div>;
}
