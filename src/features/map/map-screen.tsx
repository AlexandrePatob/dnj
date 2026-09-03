"use client";

import Image from "next/image";
import { ArrowLeft, Minus, Plus, X, ZoomIn } from "lucide-react";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { AnimDir } from "@/features/app/types";

type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distanceBetween = (first: Point, second: Point) => Math.hypot(second.x - first.x, second.y - first.y);

const centerBetween = (first: Point, second: Point): Point => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

export function EventMapScreen({ onBack }: { animDir: AnimDir; onBack: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const lastPanPointRef = useRef<Point | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);
  const lastPinchCenterRef = useRef<Point | null>(null);
  const zoomRef = useRef(MIN_ZOOM);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const officialMap = "https://www.google.com/maps/d/u/3/viewer?mid=1aKENTfTvZsi_kiVcJ3UL8M8SLPbue8s&ll=-25.433037396381696%2C-49.35545419287244&z=18";

  const setViewerTransform = useCallback((nextZoom: number, nextOffset: Point) => {
    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;
    setZoom(nextZoom);
    setOffset(nextOffset);
  }, []);

  const clampOffset = useCallback((nextOffset: Point, nextZoom: number): Point => {
    const viewer = viewerRef.current;
    const image = imageRef.current;
    if (!viewer || !image) return nextOffset;

    const maxX = Math.max(0, (image.offsetWidth * nextZoom - viewer.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * nextZoom - viewer.clientHeight) / 2);
    return { x: clamp(nextOffset.x, -maxX, maxX), y: clamp(nextOffset.y, -maxY, maxY) };
  }, []);

  const zoomAt = useCallback((requestedZoom: number, focalPoint?: Point) => {
    const currentZoom = zoomRef.current;
    const nextZoom = clamp(requestedZoom, MIN_ZOOM, MAX_ZOOM);
    let nextOffset = offsetRef.current;

    if (focalPoint && currentZoom > 0) {
      const viewer = viewerRef.current;
      if (viewer) {
        const bounds = viewer.getBoundingClientRect();
        const focalX = focalPoint.x - (bounds.left + bounds.width / 2);
        const focalY = focalPoint.y - (bounds.top + bounds.height / 2);
        const scaleRatio = nextZoom / currentZoom;
        nextOffset = {
          x: focalX - (focalX - offsetRef.current.x) * scaleRatio,
          y: focalY - (focalY - offsetRef.current.y) * scaleRatio,
        };
      }
    }

    setViewerTransform(nextZoom, clampOffset(nextOffset, nextZoom));
  }, [clampOffset, setViewerTransform]);

  const panBy = useCallback((delta: Point) => {
    setViewerTransform(
      zoomRef.current,
      clampOffset({ x: offsetRef.current.x + delta.x, y: offsetRef.current.y + delta.y }, zoomRef.current),
    );
  }, [clampOffset, setViewerTransform]);

  const resetViewer = useCallback(() => {
    pointersRef.current.clear();
    lastPanPointRef.current = null;
    lastPinchDistanceRef.current = null;
    lastPinchCenterRef.current = null;
    setViewerTransform(MIN_ZOOM, { x: 0, y: 0 });
  }, [setViewerTransform]);

  const openExpanded = () => {
    resetViewer();
    setExpanded(true);
  };

  const closeExpanded = () => {
    resetViewer();
    setExpanded(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (pointersRef.current.size === 1) {
      lastPanPointRef.current = point;
    } else if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      lastPinchDistanceRef.current = distanceBetween(first, second);
      lastPinchCenterRef.current = centerBetween(first, second);
      lastPanPointRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());

    if (points.length >= 2) {
      const [first, second] = points;
      const nextDistance = distanceBetween(first, second);
      const nextCenter = centerBetween(first, second);
      if (lastPinchDistanceRef.current) zoomAt(zoomRef.current * (nextDistance / lastPinchDistanceRef.current), nextCenter);
      if (lastPinchCenterRef.current) panBy({ x: nextCenter.x - lastPinchCenterRef.current.x, y: nextCenter.y - lastPinchCenterRef.current.y });
      lastPinchDistanceRef.current = nextDistance;
      lastPinchCenterRef.current = nextCenter;
      return;
    }

    if (points.length === 1 && lastPanPointRef.current) {
      const point = points[0];
      panBy({ x: point.x - lastPanPointRef.current.x, y: point.y - lastPanPointRef.current.y });
      lastPanPointRef.current = point;
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      lastPinchDistanceRef.current = distanceBetween(first, second);
      lastPinchCenterRef.current = centerBetween(first, second);
    } else if (pointersRef.current.size === 1) {
      lastPanPointRef.current = Array.from(pointersRef.current.values())[0];
      lastPinchDistanceRef.current = null;
      lastPinchCenterRef.current = null;
    } else {
      lastPanPointRef.current = null;
      lastPinchDistanceRef.current = null;
      lastPinchCenterRef.current = null;
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAt(zoomRef.current * (event.deltaY < 0 ? 1.2 : 1 / 1.2), { x: event.clientX, y: event.clientY });
  };

  const zoomFromCenter = (delta: number) => {
    const viewer = viewerRef.current;
    const bounds = viewer?.getBoundingClientRect();
    zoomAt(zoomRef.current + delta, bounds ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : undefined);
  };

  return <main className="absolute inset-0 overflow-y-auto px-5 pb-28" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))" }}>
    <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
    <h1 className="mt-4 text-2xl font-black">Mapa do evento</h1>
    <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Mapa oficial do DNJ 2K26.</p>
    <a href={officialMap} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--primary)" }}>Abrir no Google Maps</a>
    <section className="mt-5 overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <button type="button" onClick={openExpanded} className="relative block w-full text-left" aria-label="Ampliar mapa oficial">
        <Image src="/images/mapa-isometrico-dnj.png" alt="Mapa isométrico oficial do evento DNJ 2026" width={4072} height={2168} sizes="(max-width: 640px) 100vw, 768px" className="aspect-[16/9] w-full object-contain" priority />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: "rgb(0 0 0 / .72)" }}><ZoomIn size={14} /> Ampliar</span>
      </button>
      <div className="p-4"><h2 className="font-black">Mapa Oficial</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Toque para ampliar e use dois dedos para explorar.</p></div>
    </section>
    {expanded ? <div role="dialog" aria-modal="true" aria-label="Mapa oficial ampliado" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={closeExpanded}><section className="relative h-full w-full max-w-6xl" onClick={(event) => event.stopPropagation()}><div ref={viewerRef} role="region" aria-label="Área interativa do mapa oficial" tabIndex={0} className="relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden" style={{ touchAction: "none" }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onWheel={handleWheel} onKeyDown={(event) => { if (event.key === "+" || event.key === "=") zoomFromCenter(0.25); if (event.key === "-") zoomFromCenter(-0.25); if (event.key === "0") resetViewer(); }}><Image ref={imageRef} src="/images/mapa-isometrico-dnj.png" alt="Mapa isométrico oficial do evento DNJ 2026 ampliado" width={4072} height={2168} sizes="100vw" draggable={false} className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`, transformOrigin: "center center" }} /><div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-end justify-between gap-3 px-2"><p className="max-w-[52%] rounded-lg px-2.5 py-1.5 text-[0.65rem] font-semibold leading-tight text-white" style={{ background: "rgb(0 0 0 / .72)" }}>Pinça para ampliar · arraste para explorar</p><div className="pointer-events-auto flex items-center gap-1 rounded-xl p-1" style={{ background: "rgb(0 0 0 / .72)" }} onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => zoomFromCenter(-0.25)} disabled={zoom <= MIN_ZOOM} className="grid h-11 w-11 place-items-center rounded-lg text-white disabled:opacity-40" aria-label="Diminuir zoom"><Minus size={18} /></button><span className="min-w-12 text-center text-xs font-bold text-white" aria-live="polite">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => zoomFromCenter(0.25)} disabled={zoom >= MAX_ZOOM} className="grid h-11 w-11 place-items-center rounded-lg text-white disabled:opacity-40" aria-label="Aumentar zoom"><Plus size={18} /></button></div></div></div><button type="button" onClick={closeExpanded} className="absolute right-2 top-2 z-20 grid h-11 w-11 place-items-center rounded-full text-white" style={{ background: "rgb(0 0 0 / .72)" }} aria-label="Fechar mapa ampliado"><X size={20} /></button></section></div> : null}
  </main>;
}
