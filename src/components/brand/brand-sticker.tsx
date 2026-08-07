"use client";

import { motion, useReducedMotion } from "motion/react";
import stickerLogo from "../../../Logo_DNJ_semsombra.png";

export function BrandSticker({ variant = "header", decorative = false, className = "" }: { variant?: "intro" | "header" | "watermark"; decorative?: boolean; className?: string }) {
  const reducedMotion = useReducedMotion();
  const isIntro = variant === "intro";
  const sizeClass = {
    intro: "block h-auto max-w-full",
    header: "block h-8 w-auto max-w-[4.25rem] object-contain",
    watermark: "block h-auto w-[5.5rem] max-w-[30%] object-contain opacity-90",
  }[variant];

  return <motion.img src={stickerLogo.src} alt={decorative ? "" : "DNJ 2K26"} aria-hidden={decorative || undefined} className={`${sizeClass} ${className}`}
    initial={isIntro && !reducedMotion ? { opacity: 0, rotate: -9, scale: .72, y: -22 } : false}
    animate={isIntro && !reducedMotion ? { opacity: 1, rotate: 0, scale: [1, 1.04, 1], y: 0 } : { opacity: 1 }}
    transition={{ duration: .72, times: [0, .68, 1], ease: [0.22, 1, .36, 1] }} />;
}
