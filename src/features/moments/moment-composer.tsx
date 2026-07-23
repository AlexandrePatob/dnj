"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import type { Participation } from "@/types/experience";

type MomentStep = "capture" | "consent";

export function MomentComposer({ participation, onClose, onCreated }: { participation: Participation; onClose: () => void; onCreated: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [step, setStep] = useState<MomentStep>("capture");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
      setStatus(null);
    } catch {
      setStatus("Não foi possível abrir a câmera. Autorize o acesso e tente novamente.");
    }
  }, [stopCamera]);
  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);
  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
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
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      selectFile(new File([blob], `momento-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
      setStep("consent");
    }, "image/jpeg", 0.9);
  }
  function retakePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setStep("capture");
    void startCamera();
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
  return <section className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto px-5" style={{ background: "var(--background)", paddingTop: "calc(76px + var(--safe-area-top))" }} aria-label="Compartilhar momento">
    <button type="button" onClick={() => { stopCamera(); onClose(); }} className="absolute right-6 flex h-10 w-10 items-center justify-center rounded-xl" style={{ top: "calc(48px + var(--safe-area-top))", background: "var(--muted)" }} aria-label="Fechar"><X size={18} /></button>
    <div className="text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--primary-alpha-15)" }}><Camera size={26} style={{ color: "var(--primary)" }} /></span>
      <h2 className="text-xl font-bold">{step === "capture" ? "Compartilhar momento" : "Publicar momento"}</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{step === "capture" ? `Registre seu momento em ${participation.place.name}.` : "Confira sua foto e autorize a publicação."}</p>
    </div>
    <div className="relative mt-7 aspect-square w-full max-w-[34rem] overflow-hidden rounded-3xl" style={{ background: "var(--muted)" }}>
      {preview ? <img src={preview} alt="Prévia do momento capturado" className="h-full w-full object-cover" /> : <><video ref={videoRef} muted playsInline className="h-full w-full object-cover" style={{ display: cameraOpen ? "block" : "none" }} />{!cameraOpen && <span className="flex h-full flex-col items-center justify-center px-6 text-center"><Camera className="mb-3" style={{ color: "var(--primary)" }} /><strong>{status === "Abrindo câmera..." ? "Abrindo câmera..." : "Câmera indisponível"}</strong></span>}</>}
      {!preview && <><span aria-hidden="true" className="absolute left-0 top-0 h-12 w-12 rounded-tl-3xl border-l-4 border-t-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute right-0 top-0 h-12 w-12 rounded-tr-3xl border-r-4 border-t-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-3xl border-b-4 border-l-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute bottom-0 right-0 h-12 w-12 rounded-br-3xl border-b-4 border-r-4" style={{ borderColor: "var(--primary)" }} /></>}
    </div>
    {step === "capture" ? <><p className="mt-6 text-center text-sm" style={{ color: status && !cameraOpen ? "var(--destructive)" : "var(--muted-foreground)" }}>{cameraOpen ? "Capture uma foto agora para compartilhar." : status}</p><button type="button" disabled={!cameraOpen} onClick={capturePhoto} className="mt-4 flex w-full max-w-[34rem] items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}><Camera size={18} /> Capturar foto</button>{!cameraOpen && <button type="button" onClick={() => void startCamera()} className="mt-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>Tentar abrir câmera</button>}</> : <div className="mt-6 w-full max-w-[34rem]"><label className="flex gap-3 rounded-2xl p-4 text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span><strong>Autorizar publicação na Galeria DNJ</strong><br /><small style={{ color: "var(--muted-foreground)" }}>Seu registro passa por moderação antes de aparecer publicamente.</small></span></label>{status && <p className="mt-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{status}</p>}<button type="button" disabled={!file || !consent || status === "Enviando momento..."} onClick={() => void submit()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}><Check size={18} /> Enviar momento</button><button type="button" onClick={retakePhoto} className="mt-3 w-full py-2 text-sm font-semibold" style={{ color: "var(--primary)" }}>Refazer foto</button></div>}
  </section>;
}
