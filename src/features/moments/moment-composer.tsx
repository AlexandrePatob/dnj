"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, RotateCcw, X } from "lucide-react";
import type { Moment } from "@/types/experience";
import {
  publishChallengeMoment,
  publishFreeMoment,
  type PublishProgress,
} from "@/lib/api/media";

type MomentStep = "capture" | "review";
type CameraZoom = 0.5 | 1 | 2;
const CAMERA_START_TIMEOUT_MS = 8_000;
const publishLabels: Record<Exclude<PublishProgress, "success" | "error">, string> = {
  hashing: "Preparando sua foto…",
  requesting_intent: "Preparando o envio…",
  uploading: "Enviando sua foto…",
  completing: "Confirmando o upload…",
  publishing: "Publicando seu momento…",
};

export function MomentComposer({
  mode = "free",
  onClose,
  onCreated,
}: {
  mode?: "free" | "challenge";
  onClose: () => void;
  onCreated: (moment: Moment) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publishingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [step, setStep] = useState<MomentStep>("capture");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [cameraZoom, setCameraZoom] = useState<CameraZoom>(1);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Seu navegador não oferece acesso à câmera.");
      return;
    }
    stopCamera();
    setStatus("Abrindo câmera...");
    try {
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        }),
        new Promise<MediaStream>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("CAMERA_START_TIMEOUT")),
            CAMERA_START_TIMEOUT_MS,
          ),
        ),
      ]);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
      setStatus(null);
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "CAMERA_START_TIMEOUT"
          ? "A câmera demorou para responder. Tente novamente."
          : "Não foi possível abrir a câmera. Autorize o acesso e tente novamente.",
      );
    }
  }, [facingMode, stopCamera]);
  const selectCameraZoom = useCallback(async (zoom: CameraZoom) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min?: number; max?: number };
    };
    if (!capabilities.zoom) return;
    const min = capabilities.zoom.min ?? zoom;
    const max = capabilities.zoom.max ?? zoom;
    const nativeZoom = Math.min(max, Math.max(min, zoom));
    try {
      await track.applyConstraints({
        advanced: [{ zoom: nativeZoom } as MediaTrackConstraintSet],
      });
      setCameraZoom(zoom);
    } catch {
      setStatus("Este dispositivo não oferece esse zoom nativo.");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);
  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [cameraOpen]);
  useEffect(() => {
    if (cameraOpen) void selectCameraZoom(cameraZoom);
  }, [cameraOpen, cameraZoom, selectCameraZoom]);
  function selectFile(next: File) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setStatus(null);
  }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        selectFile(
          new File([blob], `momento-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
        stopCamera();
        setStep("review");
      },
      "image/jpeg",
      0.9,
    );
  }
  function retakePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setStep("capture");
    void startCamera();
  }
  async function submit() {
    if (!file || publishingRef.current) return;
    publishingRef.current = true;
    setIsPublishing(true);
    setStatus(publishLabels.hashing);
    try {
      const publish =
        mode === "challenge" ? publishChallengeMoment : publishFreeMoment;
      const moment = await publish({
        file,
        publishConsent: true,
        onProgress: (value: PublishProgress) => {
          if (value !== "success" && value !== "error") setStatus(publishLabels[value]);
        },
      });
      setStatus(
        moment.pointsAwarded === undefined || moment.pointsAwarded > 0
          ? "Publicação concluída."
          : "published_without_points",
      );
      window.setTimeout(() => onCreated(moment), 700);
    } catch (error) {
      publishingRef.current = false;
      setIsPublishing(false);
      setStatus(
        (error as { message?: string }).message ??
          "Falha segura: tente publicar novamente.",
      );
    }
  }
  return (
    <section
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-30 flex min-h-0 flex-col items-center overflow-y-auto px-0 pb-[var(--bottom-nav-total-height)]"
      style={{
        background: "var(--background)",
        paddingTop: "calc(var(--participant-header-height) + var(--safe-area-top))",
      }}
      aria-label="Compartilhar momento"
    >
      <button
        type="button"
        disabled={isPublishing}
        onClick={() => {
          stopCamera();
          onClose();
        }}
        className="absolute right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2"
        style={{
          top: "calc(var(--participant-header-height) + 8px + var(--safe-area-top))",
          background: "var(--muted)",
          borderColor: "var(--primary)",
        }}
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
      <div className="hidden">
        <h2 className="text-xl font-bold">
          {step === "capture" && mode === "challenge"
            ? "Foto do desafio"
            : step === "capture"
              ? "Compartilhar momento"
              : "Publicar momento"}
        </h2>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {step === "capture"
            ? mode === "challenge"
              ? "Tire sua foto para concluir o Desafio Momento."
              : "Registre um momento especial do DNJ."
            : "Confira sua foto. A publicação passa por upload seguro."}
        </p>
      </div>
      <div
        className="relative mt-0 h-[calc(100dvh-var(--participant-header-height)-var(--safe-area-top))] min-h-0 w-full shrink-0 overflow-hidden rounded-[2rem] border-2"
        style={{ background: "#101010", borderColor: "var(--primary)" }}
      >
        <h2
          className="absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-5 py-2 text-sm font-bold leading-5 shadow-lg"
          style={{
            background: "rgb(239 115 24 / 0.82)",
            borderColor: "rgb(255 255 255 / 0.8)",
            color: "white",
          }}
        >
          Compartilhar Momento DNJ
        </h2>
        {preview ? (
          <img
            src={preview}
            alt="Prévia do momento capturado"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-contain"
              style={{ display: cameraOpen ? "block" : "none" }}
            />
            {!cameraOpen && (
              <span className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Camera className="mb-3" style={{ color: "var(--primary)" }} />
                <strong>
                  {status === "Abrindo câmera..."
                    ? "Abrindo câmera..."
                    : "Câmera indisponível"}
                </strong>
              </span>
            )}
          </>
        )}
      </div>
      {step === "capture" ? (
        <>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-black/65 px-3 py-2 backdrop-blur-sm">
            <div className="relative" aria-label="Zoom nativo da câmera">
              <button
                type="button"
                disabled={!cameraOpen}
                onClick={() => setZoomMenuOpen((open) => !open)}
                className="rounded-full bg-white/20 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                aria-expanded={zoomMenuOpen}
                aria-haspopup="listbox"
              >
                {cameraZoom}x
              </button>
              {zoomMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 rounded-2xl bg-black/75 p-1 backdrop-blur-sm" role="listbox" aria-label="Opções de zoom">
                  {([0.5, 1, 2] as const)
                    .filter((zoom) => zoom !== cameraZoom)
                    .map((zoom) => (
                <button
                  key={zoom}
                  type="button"
                  disabled={!cameraOpen}
                  onClick={() => {
                    setZoomMenuOpen(false);
                    void selectCameraZoom(zoom);
                  }}
                  className="rounded-full px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                  aria-label={`Zoom ${zoom}x`}
                  role="option"
                >
                  {zoom}x
                </button>
                    ))}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!cameraOpen}
              onClick={capturePhoto}
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white text-sm font-bold shadow-lg disabled:opacity-40"
              style={{ background: "var(--primary)", color: "white" }}
              aria-label="Capturar foto"
            >
              <Camera size={26} />
            </button>
            <button
              type="button"
              disabled={!cameraOpen}
              onClick={() =>
                setFacingMode((value) =>
                  value === "environment" ? "user" : "environment",
                )
              }
              className="grid h-9 w-9 place-items-center rounded-full bg-white/90 disabled:opacity-40"
              style={{ color: "var(--foreground)" }}
              aria-label="Trocar câmera"
            >
              <RefreshCw size={18} />
            </button>
          {!cameraOpen && (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="mt-3 text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              Tentar abrir câmera
            </button>
          )}
          </div>
        </>
      ) : (
        <div className="mt-6 w-full max-w-[34rem]">
          <p
            className="rounded-2xl p-4 text-sm"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <strong>Publicação imediata</strong>
            <br />
            <span style={{ color: "var(--muted-foreground)" }}>
              Sua foto entra em Momentos e a pontuação é registrada agora. A
              equipe pode revisar depois.
            </span>
          </p>
          {status === "published_without_points" && (
            <p
              className="mt-4 rounded-xl p-3 text-center text-sm"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              Foto publicada, mas esta participação não está elegível para
              pontuação.
            </p>
          )}
          {status && status !== "published_without_points" && (
            <p
              className="mt-4 text-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {status}
            </p>
          )}
          <button
            type="button"
            disabled={!file || isPublishing || status === "published_without_points"}
            onClick={() => void submit()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold disabled:opacity-40"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <Check size={18} />{" "}
            {isPublishing
              ? "Publicando…"
              : mode === "challenge"
              ? "Publicar e ganhar pontos"
              : "Publicar momento"}
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={retakePhoto}
            className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            <RotateCcw size={16} /> Refazer foto
          </button>
        </div>
      )}
    </section>
  );
}
