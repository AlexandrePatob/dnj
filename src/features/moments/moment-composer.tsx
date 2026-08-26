"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, RotateCcw, X } from "lucide-react";
import type { Participation } from "@/types/experience";
import { publishMoment, type PublishProgress } from "@/lib/api/media";

type MomentStep = "capture" | "review";

export function MomentComposer({ participation, onClose, onCreated }: { participation: Participation | null; onClose: () => void; onCreated: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [step, setStep] = useState<MomentStep>("capture");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("Seu navegador não oferece acesso à câmera."); return; }
    stopCamera(); setStatus("Abrindo câmera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOpen(true); setStatus(null);
    } catch { setStatus("Não foi possível abrir a câmera. Autorize o acesso e tente novamente."); }
  }, [facingMode, stopCamera]);
  useEffect(() => { const timer = window.setTimeout(() => { void startCamera(); }, 0); return () => { window.clearTimeout(timer); stopCamera(); }; }, [startCamera, stopCamera]);
  useEffect(() => { if (cameraOpen && streamRef.current && videoRef.current) { videoRef.current.srcObject = streamRef.current; void videoRef.current.play(); } }, [cameraOpen]);
  function selectFile(next: File) { if (preview) URL.revokeObjectURL(preview); setFile(next); setPreview(URL.createObjectURL(next)); setStatus(null); }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) return; selectFile(new File([blob], `momento-${Date.now()}.jpg`, { type: "image/jpeg" })); stopCamera(); setStep("review"); }, "image/jpeg", 0.9);
  }
  function retakePhoto() { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setStep("capture"); void startCamera(); }
  async function submit() {
    if (!file) return;
    setStatus("hashing");
    try {
      await publishMoment({ file, participationId: participation?.id, publishConsent: true, onProgress: (value: PublishProgress) => setStatus(value) });
      setStatus("success");
      window.setTimeout(onCreated, 700);
    } catch (error) { setStatus((error as { message?: string }).message ?? "Falha segura: tente publicar novamente."); }
  }
  return <section className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto px-5" style={{ background: "var(--background)", paddingTop: "calc(76px + var(--safe-area-top))" }} aria-label="Compartilhar momento">
    <button type="button" onClick={() => { stopCamera(); onClose(); }} className="absolute right-6 flex h-10 w-10 items-center justify-center rounded-xl" style={{ top: "calc(48px + var(--safe-area-top))", background: "var(--muted)" }} aria-label="Fechar"><X size={18} /></button>
    <div className="text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--primary-alpha-15)" }}><Camera size={26} style={{ color: "var(--primary)" }} /></span><h2 className="text-xl font-bold">{step === "capture" ? "Compartilhar momento" : "Publicar momento"}</h2><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{step === "capture" ? participation ? `Registre seu momento em ${participation.place.name}.` : "Registre um momento especial do DNJ." : "Confira sua foto. A publicação passa por upload seguro."}</p></div>
    <div className="relative mt-7 aspect-square w-full max-w-[34rem] overflow-hidden rounded-3xl" style={{ background: "var(--muted)" }}>
      {preview ? <img src={preview} alt="Prévia do momento capturado" className="h-full w-full object-cover" /> : <><video ref={videoRef} muted playsInline className="h-full w-full object-cover" style={{ display: cameraOpen ? "block" : "none" }} />{!cameraOpen && <span className="flex h-full flex-col items-center justify-center px-6 text-center"><Camera className="mb-3" style={{ color: "var(--primary)" }} /><strong>{status === "Abrindo câmera..." ? "Abrindo câmera..." : "Câmera indisponível"}</strong></span>}</>}
      {!preview && <><span aria-hidden="true" className="absolute left-0 top-0 h-12 w-12 rounded-tl-3xl border-l-4 border-t-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute right-0 top-0 h-12 w-12 rounded-tr-3xl border-r-4 border-t-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-3xl border-b-4 border-l-4" style={{ borderColor: "var(--primary)" }} /><span aria-hidden="true" className="absolute bottom-0 right-0 h-12 w-12 rounded-br-3xl border-b-4 border-r-4" style={{ borderColor: "var(--primary)" }} /></>}
    </div>
    {step === "capture" ? <><p className="mt-6 text-center text-sm" style={{ color: status && !cameraOpen ? "var(--destructive)" : "var(--muted-foreground)" }}>{cameraOpen ? "Capture uma foto agora para compartilhar." : status}</p><div className="mt-4 flex w-full max-w-[34rem] gap-3"><button type="button" disabled={!cameraOpen} onClick={capturePhoto} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}><Camera size={18} /> Capturar foto</button><button type="button" disabled={!cameraOpen} onClick={() => setFacingMode((value) => value === "environment" ? "user" : "environment")} className="rounded-xl px-4 disabled:opacity-40" style={{ background: "var(--muted)", color: "var(--foreground)" }} aria-label="Trocar câmera"><RefreshCw size={18} /></button></div>{!cameraOpen && <button type="button" onClick={() => void startCamera()} className="mt-3 text-sm font-semibold" style={{ color: "var(--primary)" }}>Tentar abrir câmera</button>}</> : <div className="mt-6 w-full max-w-[34rem]"><p className="rounded-2xl p-4 text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><strong>Publicação imediata</strong><br /><span style={{ color: "var(--muted-foreground)" }}>Sua foto entra em Momentos e a pontuação é registrada agora. A equipe pode revisar depois.</span></p>{status && <p className="mt-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>{status}</p>}<button type="button" disabled={!file || status === "Enviando momento..."} onClick={() => void submit()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}><Check size={18} /> Publicar e ganhar pontos</button><button type="button" onClick={retakePhoto} className="mt-3 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold" style={{ color: "var(--primary)" }}><RotateCcw size={16} /> Refazer foto</button></div>}
  </section>;
}
