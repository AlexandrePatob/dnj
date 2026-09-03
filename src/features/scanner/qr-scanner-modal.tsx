"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, QrCode, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "motion/react";
import type { IScannerControls } from "@zxing/browser";
import type { ExperienceError, Participation } from "@/types/experience";
import { gameApi, type QrActivityKind } from "@/lib/api/game";

type ScannerStatus = "starting" | "reading" | "error" | "success";
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
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [message, setMessage] = useState("Preparando câmera...");
  const [facingMode, setFacingMode] = useState<CameraFacing>("environment");
  const [zoomRange, setZoomRange] = useState<ZoomRange>(null);
  const [zoom, setZoom] = useState(1);

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
      if (busyRef.current) return;
      busyRef.current = true;
      stopScanner();
      setStatus("starting");
      setMessage("Validando participação...");
      try {
        const body = await gameApi.validateQr(qrToken);
        setStatus("success");
        const qrAction = body.action === "scored" ? "scored" : "joined";
        setMessage(scannerSuccessMessage(body.activityKind, qrAction));
        window.setTimeout(() => {
          void onValidated({ ...(body.participation as unknown as Participation), activityKind: body.activityKind, qrAction, qrPoints: body.pointsAwarded ?? 0 });
        }, 450);
      } catch (error) {
        setStatus("error");
        setMessage(scannerMessage(error));
        busyRef.current = false;
      }
    },
    [onValidated, stopScanner],
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
            if (result) void validate(result.getText());
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
      className="qr-modal absolute inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6"
      style={{ background: "var(--background)" }}
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
        className="absolute right-6 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          top: "calc(48px + var(--safe-area-top))",
          background: "var(--muted)",
        }}
        aria-label="Fechar scanner"
      >
        <X size={18} />
      </button>
      <div className="mb-7 text-center">
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
        className="qr-frame relative mb-4 aspect-square w-[min(80vw,34rem)] max-w-full overflow-hidden rounded-3xl"
        style={{ background: "var(--muted)" }}
      >
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
        {status !== "reading" && (
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
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-12 w-12 rounded-tl-3xl border-l-4 border-t-4"
          style={{ borderColor: "var(--primary)" }}
        />
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-12 w-12 rounded-tr-3xl border-r-4 border-t-4"
          style={{ borderColor: "var(--primary)" }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-3xl border-b-4 border-l-4"
          style={{ borderColor: "var(--primary)" }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-12 w-12 rounded-br-3xl border-b-4 border-r-4"
          style={{ borderColor: "var(--primary)" }}
        />
      </div>
      <div className="mb-5 flex items-center gap-2">
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
        className="mb-5 max-w-xs text-center text-sm leading-relaxed"
        style={{
          color:
            status === "error"
              ? "var(--destructive)"
              : "var(--muted-foreground)",
        }}
      >
        {message}
      </p>
      {status === "error" && (
        <button
          type="button"
          onClick={() => void startScanner()}
          className="rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: "var(--primary)", color: "white" }}
        >
          Tentar câmera
        </button>
      )}
    </motion.section>
  );
}
