"use client";

import NextImage from "next/image";
import { useEffect, useState } from "react";
import { Heart, Plus, Send, Trophy, X } from "lucide-react";
import { BrandSticker } from "@/components/brand/brand-sticker";
import stickerLogo from "../../../Logo_DNJ_semsombra.png";
import { OperationFeedback } from "@/components/ui/operation-feedback";
import { MomentComposer } from "@/features/moments/moment-composer";
import type { AnimDir } from "@/features/app/types";
import type { GalleryPage, Moment, Participation } from "@/types/experience";
import { momentsApi, type MomentScope } from "@/lib/api/moments";

const motion = (dir: AnimDir) => ({
  animation:
    dir === "left"
      ? "slideInLeft 280ms cubic-bezier(.22,1,.36,1) both"
      : "fadeUp 220ms cubic-bezier(.22,1,.36,1) both",
});

function MomentImage({
  moment,
  compact = false,
}: {
  moment: Moment;
  compact?: boolean;
}) {
  const source =
    (compact ? moment.thumbnailUrl : moment.imageUrl) || moment.imageUrl;
  const classes = compact
    ? "aspect-[3/4] w-full rounded-[7px] object-cover"
    : "aspect-[4/5] w-full rounded-[22px] object-cover";
  const alt = `Momento em ${moment.placeName}`;
  let hasValidImage = false;
  let localStorageUrl = false;
  if (source) {
    try {
      const url = new URL(source, window.location.origin);
      hasValidImage = true;
      localStorageUrl = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
      // Invalid URL
      hasValidImage = false;
    }
  }
  if (!hasValidImage) {
    return (
      <div
        className={classes}
        style={{
          background: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted-foreground)",
        }}
        aria-label={alt}
      >
        <span className="text-center px-2">
          <span className="block text-xs font-semibold">Foto indisponível</span>
          {moment.moderationMessage && (
            <span className="block text-[0.6rem] mt-1" style={{ color: "var(--destructive)" }}>
              {moment.moderationMessage}
            </span>
          )}
        </span>
      </div>
    );
  }
  return localStorageUrl ? (
    <img src={source} alt={alt} className={classes} />
  ) : (
    <NextImage
      src={source}
      alt={alt}
      width={1024}
      height={1280}
      unoptimized
      className={classes}
    />
  );
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
    const [photo, sticker] = await Promise.all([
      loadShareImage(photoUrl),
      loadShareImage(stickerLogo.src),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = photo.naturalWidth || photo.width;
    canvas.height = photo.naturalHeight || photo.height;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height)
      throw new Error("Imagem indisponível.");
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const width = Math.min(canvas.width * 0.28, 340);
    const height =
      width *
      ((sticker.naturalHeight || sticker.height) /
        (sticker.naturalWidth || sticker.width));
    context.drawImage(
      sticker,
      canvas.width - width - canvas.width * 0.045,
      canvas.height - height - canvas.height * 0.045,
      width,
      height,
    );
    const composed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!composed) throw new Error("Não foi possível criar a imagem.");
    return new File([composed], "momento-dnj-2k26.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(photoUrl);
  }
}

function ShareButton({ moment }: { moment: Moment }) {
  const [message, setMessage] = useState("");
  async function share() {
    const context = moment.placeName || moment.groupName;
    const text = context
      ? `Um momento especial do DNJ em ${context}. #DNJ2026`
      : "Um momento especial do DNJ. #DNJ2026";
    try {
      if (navigator.share) {
        let data: ShareData = { title: "DNJ 2K26", text };
        try {
          data = { ...data, files: [await createWatermarkedShareFile(moment)] };
        } catch {
          /* Native share still receives its descriptive fallback. */
        }
        await navigator.share(
          (navigator.canShare?.(data) ?? true)
            ? data
            : { title: "DNJ 2K26", text },
        );
        setMessage("Compartilhado.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage("Texto copiado para compartilhar.");
      } else setMessage("Compartilhamento indisponível neste navegador.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError")
        setMessage("Não foi possível abrir o compartilhamento.");
    }
  }
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Compartilhar momento"
        style={{ color: "var(--primary)" }}
      >
        <Send size={20} />
      </button>
      {message && (
        <small aria-live="polite" style={{ color: "var(--muted-foreground)" }}>
          {message}
        </small>
      )}
    </span>
  );
}

function LikeButton({
  moment,
  onChanged,
}: {
  moment: Moment;
  onChanged: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [burst, setBurst] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(moment.likedByCurrentUser);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(moment.likesCount);
  async function toggleLike() {
    if (sending) return;
    setSending(true);
    const newLiked = !optimisticLiked;
    const newLikesCount = newLiked ? optimisticLikesCount + 1 : optimisticLikesCount - 1;
    setOptimisticLiked(newLiked);
    setOptimisticLikesCount(newLikesCount);
    try {
      const result = await momentsApi.like(moment.id);
      if (result.liked) {
        setBurst(true);
        window.setTimeout(() => setBurst(false), 650);
      }
      onChanged();
    } catch {
      // Revert on error
      setOptimisticLiked(optimisticLiked);
      setOptimisticLikesCount(optimisticLikesCount);
    } finally {
      setSending(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void toggleLike()}
      disabled={sending}
      aria-label="Curtir momento"
      aria-pressed={optimisticLiked}
      className="flex items-center gap-2 text-sm font-bold disabled:opacity-50"
      style={{
        color: optimisticLiked
          ? "var(--secondary)"
          : "var(--foreground)",
      }}
    >
      <span className="relative inline-flex">
        <Heart
          size={20}
          fill={optimisticLiked ? "currentColor" : "none"}
        />
        {burst ? <span className="moment-like-burst" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span> : null}
      </span>
      {optimisticLikesCount}
    </button>
  );
}

function AuthorAvatar({ moment }: { moment: Moment }) {
  const [failed, setFailed] = useState(false);
  if (!moment.authorAvatarUrl || failed) {
    return (
      <span
        className="grid h-9 w-9 place-items-center rounded-full text-xs font-black"
        style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}
      >
        DNJ
      </span>
    );
  }
  return (
    <img
      src={moment.authorAvatarUrl}
      alt={`Foto de perfil de ${moment.authorName}`}
      className="h-9 w-9 rounded-full object-cover"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function FeedCard({
  moment,
  canShare,
  onOpen,
  onChanged,
}: {
  moment: Moment;
  canShare: boolean;
  onOpen: (value: Moment) => void;
  onChanged: () => void;
}) {
  return (
    <article
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <AuthorAvatar moment={moment} />
        <span className="flex-1">
          <strong className="block text-sm">{moment.authorName}</strong>
          <small style={{ color: "var(--muted-foreground)" }}>
            {moment.groupName || "Juventude DNJ"}
          </small>
        </span>
      </header>
      <button
        type="button"
        onClick={() => onOpen(moment)}
        aria-label={`Abrir momento em ${moment.placeName}`}
        className="relative block w-full px-3 text-left"
      >
        <MomentImage moment={moment} />
        <BrandSticker
          variant="watermark"
          decorative
          className="absolute bottom-3 right-5 drop-shadow-md"
        />
        {moment.origin === "challenge" && moment.pointsAwarded > 0 && (
          <span
            className="absolute left-5 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black text-white"
            style={{ background: "var(--game)", boxShadow: "0 4px 10px rgba(11, 35, 37, .22)" }}
          >
            <Trophy size={13} aria-hidden="true" />
            Desafio pontuado
          </span>
        )}
      </button>
      <div className="p-4">
        <div className="flex items-center gap-5">
          <LikeButton moment={moment} onChanged={onChanged} />
          {canShare && <ShareButton moment={moment} />}
        </div>
      </div>
    </article>
  );
}

function PassportGrid({
  moments,
  groupView = false,
  socialView = false,
  onOpen,
  onChanged,
}: {
  moments: Moment[];
  groupView?: boolean;
  socialView?: boolean;
  onOpen: (value: Moment) => void;
  onChanged?: () => void;
}) {
  return (
    <div
      className={`passport-grid grid ${socialView ? "grid-cols-2 gap-3" : "grid-cols-3 gap-2.5"} rounded-[20px] p-2.5`}
      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
    >
      {moments.map((moment) => (
        <div
          key={moment.id}
          className="min-w-0 rounded-[10px] p-1.5 pb-2"
          style={{
            background: "var(--card)",
            boxShadow: "0 5px 10px rgba(11, 35, 37, .10)",
          }}
        >
          {groupView && (
            <div className="mb-2 flex min-w-0 items-center gap-1.5 px-0.5">
              <AuthorAvatar moment={moment} />
              <span className="truncate text-[.68rem] font-bold" title={moment.authorName}>{moment.authorName}</span>
            </div>
          )}
          <button type="button" onClick={() => onOpen(moment)} aria-label={`Abrir momento em ${moment.placeName}`} className="block w-full text-left transition-transform active:scale-[.97]">
            <span className="relative block">
              <MomentImage moment={moment} compact />
              <BrandSticker variant="watermark" decorative className="absolute bottom-1 right-1 scale-[.42] origin-bottom-right drop-shadow-sm" />
            </span>
            <span className="mt-1.5 block truncate px-0.5 text-[.58rem] font-bold uppercase tracking-[.04em]" style={{ color: "var(--muted-foreground)" }}>
              {moment.placeName}
            </span>
          </button>
          {socialView && onChanged && !moment.moderationMessage && (
            <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <LikeButton moment={moment} onChanged={onChanged} />
              <ShareButton moment={moment} />
            </div>
          )}
          {moment.moderationMessage && (
            <span
              className="mt-1 block px-0.5 text-[.6rem] font-semibold leading-tight"
              style={{ color: "var(--destructive)" }}
            >
              {moment.moderationMessage}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function canShareFeedMoment(
  moment: Moment,
  currentUserName: string,
  currentGroupId: string,
) {
  return Boolean(
    (currentUserName && moment.authorName === currentUserName) ||
      (currentGroupId && moment.groupId === currentGroupId),
  );
}

export function GalleryScreen({
  animDir,
  group = "",
  currentUserName = "",
  currentGroupId = "",
}: {
  animDir: AnimDir;
  group?: string;
  currentUserName?: string;
  currentGroupId?: string;
}) {
  const [tab, setTab] = useState<"public" | "mine" | "group">("public");
  const [page, setPage] = useState<GalleryPage>({
    items: [],
    nextCursor: null,
  });
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<Moment | null>(null);
  const [composerParticipation, setComposerParticipation] = useState<
    Participation | null | undefined
  >(undefined);
  const [composerMessage, setComposerMessage] = useState("");
  const hasGroup = Boolean(group.trim());
  useEffect(() => {
    let active = true;
    const scope = tab === "public" ? "feed" : tab;
    momentsApi
      .list(scope as MomentScope)
      .then((value) => {
        if (active) {
          setPage({ items: value.items, nextCursor: value.nextCursor ?? null });
          setLoadState("ready");
        }
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, [attempt, tab]);
  function changeTab(next: "public" | "mine" | "group") {
    if (next !== tab) {
      setLoadState("loading");
      setTab(next);
    }
  }
  function openComposer() {
    setComposerMessage("");
    setComposerParticipation(null);
  }
  const tabs = [
    { id: "public" as const, label: "Momentos DNJ" },
    { id: "mine" as const, label: "Meus Momentos" },
    ...(hasGroup ? [{ id: "group" as const, label: "Grupo" }] : []),
  ];
  const empty =
    tab === "public"
      ? {
          title: "Ainda não há momentos",
          action: "Ver meus momentos",
          go: () => changeTab("mine"),
        }
      : {
          title:
            tab === "group"
              ? "Seu grupo ainda não publicou momentos"
              : "Você ainda não registrou momentos",
          action: "Ver Momentos DNJ",
          go: () => changeTab("public"),
        };
  return (
    <>
      <div
        className="absolute inset-0 overflow-y-auto pb-[calc(var(--bottom-nav-total-height)+1rem)]"
        style={{
          background: "var(--background)",
          paddingTop: "calc(var(--participant-header-height) + var(--safe-area-top))",
        }}
      >
        <div style={motion(animDir)}>
          <header className="px-5 pb-4">
            <h1 className="text-2xl font-black">Momentos</h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Memórias que a juventude está criando.
            </p>
            <div
              className="mt-4 flex rounded-xl p-1"
              style={{ background: "var(--muted)" }}
            >
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => changeTab(item.id)}
                  className="flex-1 rounded-lg py-2 text-xs font-bold"
                  style={{
                    background:
                      tab === item.id ? "var(--primary)" : "transparent",
                    color:
                      tab === item.id ? "white" : "var(--muted-foreground)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>
          <main className="px-4 pb-4 pt-1">
            {loadState === "loading" ? (
              <p className="py-10 text-center text-sm">
                Carregando momentos...
              </p>
            ) : loadState === "error" ? (
              <OperationFeedback
                variant="error"
                title="Não foi possível carregar Momentos"
                description="Confira sua conexão e tente novamente."
                onRetry={() => {
                  setLoadState("loading");
                  setAttempt((value) => value + 1);
                }}
              />
            ) : page.items.length === 0 ? (
              <OperationFeedback
                variant="empty"
                title={empty.title}
                description="Participe de uma atividade para registrar uma memória do encontro."
                onRetry={empty.go}
                retryLabel={empty.action}
              />
            ) : tab === "public" ? (
              <div className="mx-auto flex max-w-sm flex-col gap-4">
                {page.items.map((item) => (
                  <FeedCard
                    key={item.id}
                    moment={item}
                    canShare={canShareFeedMoment(
                      item,
                      currentUserName,
                      currentGroupId,
                    )}
                    onOpen={setSelected}
                    onChanged={() => setAttempt((value) => value + 1)}
                  />
                ))}
              </div>
            ) : (
              <PassportGrid
                moments={page.items}
                groupView={tab === "group"}
                socialView={tab !== "public"}
                onOpen={setSelected}
                onChanged={() => setAttempt((value) => value + 1)}
              />
            )}
          </main>
        </div>
      </div>
      <button
        type="button"
        aria-label="Adicionar momento"
        onClick={() => void openComposer()}
        className="fixed bottom-24 right-5 grid h-14 w-14 place-items-center rounded-full text-white"
        style={{
          background: "var(--primary)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <Plus />
      </button>
      {composerMessage && (
        <p
          role="alert"
          className="fixed bottom-40 left-5 right-5 z-40 rounded-xl px-4 py-3 text-center text-sm"
          style={{
            background: "var(--card)",
            boxShadow: "var(--shadow-card)",
            color: "var(--destructive)",
          }}
        >
          {composerMessage}
        </p>
      )}
      {selected && (
        <section
          role="dialog"
          aria-label="Detalhe do momento"
          className="absolute inset-0 z-50 flex items-center bg-black/60 p-5"
        >
          <div
            className="relative w-full rounded-3xl p-3"
            style={{ background: "var(--card)" }}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white"
              aria-label="Fechar detalhe"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
            <div className="relative">
              <MomentImage moment={selected} />
              <BrandSticker
                variant="watermark"
                decorative
                className="absolute bottom-3 right-3 drop-shadow-md"
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-2 pt-3">
              <div>
                <strong className="block">{selected.placeName}</strong>
                {selected.groupName && (
                  <small style={{ color: "var(--muted-foreground)" }}>
                    {selected.groupName}
                  </small>
                )}
              </div>
              <div className="flex items-center gap-5">
                {(tab !== "public" ||
                  canShareFeedMoment(
                    selected,
                    currentUserName,
                    currentGroupId,
                  )) && (
                  <ShareButton moment={selected} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {composerParticipation !== undefined && (
        <MomentComposer
          mode="free"
          onClose={() => setComposerParticipation(undefined)}
          onCreated={() => {
            setComposerParticipation(undefined);
            setAttempt((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
