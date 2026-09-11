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
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publishingRef = useRef(false);
  const publishStatusTimerRef = useRef<number | null>(null);
  const lastPublishStatusAtRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [step, setStep] = useState<MomentStep>("capture");
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

  useEffect(() => {
    setUseNativeCamera(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      if (publishStatusTimerRef.current) {
        window.clearTimeout(publishStatusTimerRef.current);
      }
    },
    [],
  );
  const showPublishStatus = useCallback((message: string) => {
    const update = () => {
      publishStatusTimerRef.current = null;
      lastPublishStatusAtRef.current = Date.now();
      setStatus(message);
    };
    const remaining = Math.max(
      0,
      850 - (Date.now() - lastPublishStatusAtRef.current),
    );
    if (!remaining) {
      update();
      return;
    }
    if (publishStatusTimerRef.current) {
      window.clearTimeout(publishStatusTimerRef.current);
    }
    publishStatusTimerRef.current = window.setTimeout(update, remaining);
  }, []);
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
  useEffect(() => {
    if (useNativeCamera) return;
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera, useNativeCamera]);
  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [cameraOpen]);
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
  function openNativeCamera() {
    stopCamera();
    nativeCameraInputRef.current?.click();
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
    lastPublishStatusAtRef.current = Date.now();
    try {
      const publish =
        mode === "challenge" ? publishChallengeMoment : publishFreeMoment;
      const moment = await publish({
        file,
        publishConsent: true,
        onProgress: (value: PublishProgress) => {
          if (value !== "success" && value !== "error") {
            showPublishStatus(publishLabels[value]);
          }
        },
      });
      if (publishStatusTimerRef.current) {
        window.clearTimeout(publishStatusTimerRef.current);
        publishStatusTimerRef.current = null;
      }
      // Free moments never award points, so only a challenge publication
      // that came back with zero points deserves the "not eligible" notice.
      setStatus(
        mode === "challenge" &&
          moment.pointsAwarded !== undefined &&
          moment.pointsAwarded <= 0
          ? "published_without_points"
          : "Publicação concluída.",
      );
      window.setTimeout(() => onCreated(moment), 3_000);
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
      className="absolute inset-0 z-30 flex min-h-0 flex-col items-center overflow-hidden px-0"
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
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const next = event.currentTarget.files?.[0];
          if (!next) return;
          selectFile(next);
          setStep("review");
          event.currentTarget.value = "";
        }}
      />
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
            className="h-full w-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-contain"
              style={{ display: cameraOpen && !useNativeCamera ? "block" : "none" }}
            />
            {(!cameraOpen || useNativeCamera) && (
              <span className="flex h-full flex-col items-center justify-center px-6 text-center">
                <Camera className="mb-3" style={{ color: "var(--primary)" }} />
                <strong>
                  {useNativeCamera
                    ? "Use a câmera do seu celular"
                    : status === "Abrindo câmera..."
                    ? "Abrindo câmera..."
                    : "Câmera indisponível"}
                </strong>
                {status && status !== "Abrindo câmera..." && (
                  <span
                    className="mt-2 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {status}
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </div>
      {step === "capture" ? (
        <>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-2xl bg-black/65 px-3 py-2 backdrop-blur-sm">
            <button
              type="button"
              disabled={!cameraOpen && !useNativeCamera}
              onClick={useNativeCamera ? openNativeCamera : capturePhoto}
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white text-sm font-bold shadow-lg disabled:opacity-40"
              style={{ background: "var(--primary)", color: "white" }}
              aria-label="Capturar foto"
            >
              <Camera size={26} />
            </button>
            {!useNativeCamera && <button
              type="button"
              disabled={!cameraOpen}
              onClick={() =>
                setFacingMode((value) =>
                  value === "environment" ? "user" : "environment",
                )
              }
              className="ml-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 disabled:opacity-40"
              style={{ color: "var(--foreground)" }}
              aria-label="Trocar câmera"
            >
              <RefreshCw size={18} />
            </button>}
          </div>
        </>
      ) : (
        <div className="absolute bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2 rounded-2xl bg-black/65 p-3 text-white shadow-lg backdrop-blur-sm">
          <p
            className="p-0 text-xs leading-4"
            style={{
              color: "rgb(255 255 255 / 0.9)",
            }}
          >
            <strong className="block text-sm">Publicar participação</strong>
            <span className="mt-1 block" style={{ color: "rgb(255 255 255 / 0.72)" }}>
              Sua foto será compartilhada em Momentos para toda a juventude do
              DNJ.
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
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!file || isPublishing || status === "published_without_points"}
              onClick={() => void submit()}
              className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--primary)", color: "white" }}
            >
              <Check size={16} /> {isPublishing ? "Publicando…" : "Publicar"}
            </button>
            <button
              type="button"
              disabled={isPublishing}
              onClick={retakePhoto}
              className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-white/30 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <RotateCcw size={15} /> Refazer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
