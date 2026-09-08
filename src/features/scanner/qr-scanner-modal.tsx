"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, QrCode, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "motion/react";
import type { IScannerControls } from "@zxing/browser";
import type { ExperienceError, Participation } from "@/types/experience";
import { gameApi, type QrActivityKind } from "@/lib/api/game";
import { QrSuccessCelebration } from "@/features/scanner/qr-success-celebration";

type ScannerStatus = "starting" | "reading" | "error" | "warning" | "success";
type CameraFacing = "environment" | "user";
type ZoomRange = { min: number; max: number; step: number } | null;
export type QrValidation = Participation & { activityKind: QrActivityKind; qrAction: "joined" | "scored"; qrPoints: number };
const cameraStartTimeout = "CAMERA_START_TIMEOUT";
type ZoomCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => {
    zoom?: { min?: number; max?: number; step?: number };
  };
};

function scannerMessage(error: unknown) {
  const typed = error as Partial<ExperienceError>;
  if (error instanceof Error && error.message === cameraStartTimeout)
    return "A câmera demorou para responder. Tente novamente.";
  if (typed.code)
    return typed.message ?? "Não foi possível validar este QR Code.";
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return "Permissão da câmera negada. Autorize o acesso e tente novamente.";
  if (error instanceof DOMException && error.name === "NotFoundError")
    return "Nenhuma câmera foi encontrada neste aparelho.";
  return "Não foi possível abrir a câmera. Tente novamente.";
}

function scannerSuccessMessage(kind: QrActivityKind, action: "joined" | "scored") {
  if (kind === "competitive") return "Entrada na partida confirmada.";
  if (kind === "challenge") return "Entrada no desafio confirmada. Preparando a câmera.";
  if (action === "joined") return "Você já pontuou nessa atividade! Preparando sua confirmação.";
  return action === "scored" ? "Pontos creditados. Preparando a celebração." : "Participação confirmada.";
}

export function QrScannerModal({
  onClose,
  onValidated,
}: {
  onClose: () => void;
  onValidated: (validation: QrValidation) => void | Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const cooldownRef = useRef(false);
  const onValidatedRef = useRef(onValidated);
  const onCloseRef = useRef(onClose);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [message, setMessage] = useState("Preparando câmera...");
  const [facingMode, setFacingMode] = useState<CameraFacing>("environment");
  const [zoomRange, setZoomRange] = useState<ZoomRange>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    onValidatedRef.current = onValidated;
    onCloseRef.current = onClose;
  }, [onClose, onValidated]);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream)
      stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const readZoomCapabilities = useCallback(() => {
    const stream = videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const capabilities = (
      stream.getVideoTracks()[0] as ZoomCapableTrack | undefined
    )?.getCapabilities?.() as
      { zoom?: { min?: number; max?: number; step?: number } } | undefined;
    const capability = capabilities?.zoom;
    if (
      typeof capability?.min !== "number" ||
      typeof capability.max !== "number"
    )
      return;
    const range = {
      min: capability.min,
      max: capability.max,
      step: capability.step ?? 0.1,
    };
    setZoomRange(range);
    setZoom(range.min);
  }, []);

  const validate = useCallback(
    async (qrToken: string) => {
      if (busyRef.current || cooldownRef.current) return;
      busyRef.current = true;
      setStatus("starting");
      setMessage("Validando participação...");
      try {
        const body = await gameApi.validateQr(qrToken);
        stopScanner();
        setStatus("success");
        const qrAction = body.action === "scored" ? "scored" : "joined";
        setMessage(scannerSuccessMessage(body.activityKind, qrAction));
        window.setTimeout(() => {
          void onValidatedRef.current({ ...(body.participation as unknown as Participation), activityKind: body.activityKind, qrAction, qrPoints: body.pointsAwarded ?? 0 });
        }, 450);
      } catch (error) {
        const typed = error as Partial<ExperienceError>;
        const cooldownMessage = typed.message ?? "";
        if (typed.code?.toLowerCase() === "cooldown_active" || /10 minutos|outro qr/i.test(cooldownMessage)) {
          cooldownRef.current = true;
          stopScanner();
          setStatus("warning");
          setMessage("Aguarde 10 minutos para poder escanear outro QR Code!");
        } else {
          setStatus("error");
          setMessage(scannerMessage(error));
        }
        busyRef.current = false;
      }
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setStatus("error");
      setMessage("Seu navegador não oferece acesso à câmera.");
      return;
    }
    stopScanner();
    setZoomRange(null);
    setStatus("starting");
    setMessage("Abrindo câmera...");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await Promise.race([
        reader.decodeFromConstraints(
          { video: { facingMode: { ideal: facingMode } }, audio: false },
          videoRef.current,
          (result) => {
            if (result && !cooldownRef.current) void validate(result.getText());
          },
        ),
        new Promise<IScannerControls>((_, reject) =>
          window.setTimeout(() => reject(new Error(cameraStartTimeout)), 8_000),
        ),
      ]);
      setStatus("reading");
      setMessage("Aponte a câmera para o QR Code do evento.");
      window.setTimeout(readZoomCapabilities, 180);
    } catch (error) {
      setStatus("error");
      setMessage(scannerMessage(error));
    }
  }, [facingMode, readZoomCapabilities, stopScanner, validate]);

  const changeZoom = useCallback(
    async (direction: -1 | 1) => {
      if (!zoomRange) return;
      const next = Math.min(
        zoomRange.max,
        Math.max(
          zoomRange.min,
          Number((zoom + zoomRange.step * direction).toFixed(2)),
        ),
      );
      const stream = videoRef.current?.srcObject;
      const track =
        stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
      try {
        await track?.applyConstraints({
          advanced: [{ zoom: next } as MediaTrackConstraintSet],
        });
        setZoom(next);
      } catch {
        setMessage("Não foi possível ajustar o zoom desta câmera.");
      }
    },
    [zoom, zoomRange],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startScanner();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <motion.section
      className="qr-modal absolute inset-0 z-30 flex min-h-0 flex-col items-center overflow-hidden px-0"
      style={{ background: "var(--background)", paddingTop: "calc(var(--participant-header-height) + var(--safe-area-top))" }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      aria-label="Escanear QR Code"
    >
      <button
        type="button"
        onClick={() => {
          stopScanner();
          onClose();
        }}
        className="absolute right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2"
        style={{
          top: "calc(var(--participant-header-height) + 8px + var(--safe-area-top))",
          background: "var(--muted)",
          borderColor: "var(--primary)",
        }}
        aria-label="Fechar scanner"
      >
        <X size={18} />
      </button>
      <div className="hidden text-center">
        <span
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--primary-alpha-15)" }}
        >
          <Camera size={26} style={{ color: "var(--primary)" }} />
        </span>
        <h3 className="mb-2 text-xl font-bold">Escanear QR Code</h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Participe de uma atividade do DNJ.
        </p>
      </div>
      <div
        className="qr-frame relative mt-0 h-[calc((100dvh-var(--participant-header-height)-var(--safe-area-top))*0.88)] min-h-0 w-full shrink-0 overflow-hidden rounded-[2rem] border-2"
        style={{ background: "#101010", borderColor: "var(--primary)" }}
      >
        <h2
          className="absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-5 py-2 text-sm font-bold leading-5 shadow-lg"
          style={{ background: "rgb(239 115 24 / 0.82)", borderColor: "rgb(255 255 255 / 0.8)", color: "white" }}
        >
          Escanear QR Code DNJ
        </h2>
        <p className="absolute left-1/2 top-16 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
          Participe de uma atividade do DNJ.
        </p>
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {status === "reading" && (
          <span
            aria-hidden="true"
            className="absolute left-5 right-5 h-0.5"
            style={{
              background: "var(--game)",
              boxShadow: "0 0 12px var(--game)",
              animation: "scanLine 1.8s ease-in-out infinite",
            }}
          />
        )}
        {(status === "starting" || status === "success") && (
          <span
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center"
            style={{
              background:
                "color-mix(in srgb, var(--background) 82%, transparent)",
            }}
          >
            {status === "success" ? (
              <QrCode size={36} style={{ color: "var(--primary)" }} />
            ) : (
              <Camera size={36} style={{ color: "var(--muted-foreground)" }} />
            )}
          </span>
        )}
      </div>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-black/65 px-3 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={() =>
            setFacingMode((current) =>
              current === "environment" ? "user" : "environment",
            )
          }
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
          style={{ background: "var(--muted)" }}
        >
          <RefreshCw size={15} /> Trocar câmera
        </button>
        {zoomRange && (
          <>
            <button
              type="button"
              onClick={() => void changeZoom(-1)}
              disabled={zoom <= zoomRange.min}
              aria-label="Diminuir zoom"
              className="rounded-xl p-2 disabled:opacity-40"
              style={{ background: "var(--muted)" }}
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold">{zoom.toFixed(1)}×</span>
            <button
              type="button"
              onClick={() => void changeZoom(1)}
              disabled={zoom >= zoomRange.max}
              aria-label="Aumentar zoom"
              className="rounded-xl p-2 disabled:opacity-40"
              style={{ background: "var(--muted)" }}
            >
              <ZoomIn size={16} />
            </button>
          </>
        )}
      </div>
      <p
        className="absolute bottom-28 left-1/2 z-10 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl bg-black/65 px-4 py-2 text-center text-sm leading-relaxed text-white backdrop-blur-sm"
        style={{
          color:
            status === "error"
              ? "var(--destructive)"
              : status === "warning"
                ? "var(--primary)"
                : "rgb(255 255 255 / 0.85)",
          background: status === "warning" ? "var(--primary-alpha-15)" : undefined,
          border: status === "warning" ? "1px solid var(--primary)" : undefined,
        }}
      >
        {message}
      </p>
      {status === "error" && (
        <button
          type="button"
          onClick={() => void startScanner()}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: "var(--primary)", color: "white" }}
        >
          Tentar câmera
        </button>
      )}
      {status === "warning" && (
        <QrSuccessCelebration
          points={0}
          label="Você poderá escanear outro QR Code quando o período de espera terminar."
          warning
          durationMs={3_000}
          onDone={() => onCloseRef.current()}
        />
      )}
    </motion.section>
  );
}
