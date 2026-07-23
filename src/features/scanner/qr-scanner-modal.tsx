"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, QrCode, X } from "lucide-react";
import { motion } from "motion/react";
import type { IScannerControls } from "@zxing/browser";
import type { ExperienceError } from "@/types/experience";
import type { Participation } from "@/types/experience";

type ScannerStatus = "starting" | "reading" | "error" | "success";

function scannerMessage(error: unknown) {
  const typed = error as Partial<ExperienceError>;
  if (typed.code) return typed.message ?? "NÃ£o foi possÃ­vel validar este QR Code.";
  if (error instanceof DOMException && error.name === "NotAllowedError") return "PermissÃ£o da cÃ¢mera negada. VocÃª pode escolher uma imagem do QR Code.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "Nenhuma cÃ¢mera foi encontrada neste aparelho.";
  return "NÃ£o foi possÃ­vel abrir a cÃ¢mera. Tente novamente ou escolha uma imagem.";
}

export function QrScannerModal({ onClose, onValidated }: { onClose: () => void; onValidated: (participation: Participation) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [message, setMessage] = useState("Preparando cÃ¢mera...");
  const busyRef = useRef(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const validate = useCallback(async (qrToken: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    stopScanner();
    setStatus("starting");
    setMessage("Validando participaÃ§Ã£o...");
    try {
      const response = await fetch("/api/mock/v1/qr/validate", {
        method: "POST",
        headers: { authorization: "Bearer mock", "content-type": "application/json" },
        body: JSON.stringify({ qrToken, idempotencyKey: crypto.randomUUID() }),
      });
      const body = await response.json();
      if (!response.ok) throw body;
      setStatus("success");
      setMessage("ParticipaÃ§Ã£o confirmada. Agora vocÃª pode registrar seu momento.");
      window.setTimeout(() => onValidated(body.participation), 900);
    } catch (error) {
      setStatus("error");
      setMessage(scannerMessage(error));
      busyRef.current = false;
    }
  }, [onValidated, stopScanner]);

  const startScanner = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setStatus("error");
      setMessage("Seu navegador nÃ£o oferece acesso Ã  cÃ¢mera. Escolha uma imagem do QR Code.");
      return;
    }
    setStatus("starting");
    setMessage("Abrindo cÃ¢mera...");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => { if (result) void validate(result.getText()); },
      );
      setStatus("reading");
      setMessage("Aponte a cÃ¢mera para o QR Code do evento.");
    } catch (error) {
      setStatus("error");
      setMessage(scannerMessage(error));
    }
  }, [validate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void startScanner(); }, 0);
    return () => { window.clearTimeout(timer); stopScanner(); };
  }, [startScanner, stopScanner]);

  async function decodeImage(file: File) {
    try {
      setStatus("starting");
      setMessage("Lendo QR Code da imagem...");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const url = URL.createObjectURL(file);
      try {
        const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
        await validate(result.getText());
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setStatus("error");
      setMessage(scannerMessage(error));
    }
  }

  return (
    <motion.section className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6" style={{ background: "var(--background)" }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }} aria-label="Escanear QR Code">
      <button type="button" onClick={() => { stopScanner(); onClose(); }} className="absolute right-6 flex h-10 w-10 items-center justify-center rounded-xl" style={{ top: "calc(48px + var(--safe-area-top))", background: "var(--muted)" }} aria-label="Fechar scanner"><X size={18} /></button>
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--primary-alpha-15)" }}><Camera size={26} style={{ color: "var(--primary)" }} /></span>
        <h3 className="mb-2 text-xl font-bold">Escanear QR Code</h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Participe de uma atividade do DNJ.</p>
      </div>
      <div className="relative mb-6 aspect-square w-full max-w-64 overflow-hidden rounded-3xl" style={{ background: "var(--muted)", border: "3px solid var(--primary)" }}>
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status !== "reading" && <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center" style={{ background: "color-mix(in srgb, var(--background) 82%, transparent)" }}>{status === "success" ? <QrCode size={36} style={{ color: "var(--primary)" }} /> : <Camera size={36} style={{ color: "var(--muted-foreground)" }} />}</span>}
      </div>
      <p className="mb-5 max-w-xs text-center text-sm leading-relaxed" style={{ color: status === "error" ? "var(--destructive)" : "var(--muted-foreground)" }}>{message}</p>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void decodeImage(file); event.currentTarget.value = ""; }} />
      {status === "error" && <button type="button" onClick={() => void startScanner()} className="mb-3 rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "var(--primary)", color: "white" }}>Tentar cÃ¢mera</button>}
      <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--primary)" }}><ImageUp size={18} /> Ler QR de uma imagem</button>
    </motion.section>
  );
}
