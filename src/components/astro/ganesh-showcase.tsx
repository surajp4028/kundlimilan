"use client";
import Image from "next/image";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const SPARKS = [
  [6, 18, 0], [92, 12, 0.8], [2, 58, 1.6], [97, 52, 0.4], [14, 88, 1.2], [88, 86, 2], [50, 2, 1], [30, 8, 2.4], [72, 6, 0.2], [99, 30, 1.8],
] as const;

/**
 * Full-body Ganesh ji with the zodiac wheel (transparent PNG cut-out) — floating, with a breathing saffron aura,
 * counter-rotating gold rings and twinkling sparkles. `src` lets the admin's uploaded image replace it.
 */
export function GaneshShowcase({ className, src = "/brand/ganesh-hd.webp", plaque }: { className?: string; src?: string; plaque?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-[1028/1190] w-full", className)}>
      {/* aura */}
      <div className="absolute left-1/2 top-[44%] aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2 animate-glow rounded-full bg-[radial-gradient(circle,rgba(255,200,100,.75)_0%,rgba(255,150,50,.35)_38%,rgba(200,52,31,.10)_58%,transparent_70%)] blur-xl" />
      {/* rotating rings around the wheel */}
      <svg viewBox="0 0 200 200" className="absolute left-1/2 top-[43.5%] aspect-square w-[112%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow" aria-hidden>
        <circle cx="100" cy="100" r="96" fill="none" stroke="#d99a1e" strokeWidth=".6" strokeDasharray="1 3" />
        <circle cx="100" cy="100" r="99" fill="none" stroke="#e0a12a" strokeWidth=".35" opacity=".7" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <circle key={i} cx={Math.round((100 + 96 * Math.sin(a)) * 100) / 100} cy={Math.round((100 - 96 * Math.cos(a)) * 100) / 100} r={i % 2 ? 0.9 : 1.6} fill="#e0a12a" />;
        })}
      </svg>
      <svg viewBox="0 0 200 200" className="absolute left-1/2 top-[43.5%] aspect-square w-[124%] -translate-x-1/2 -translate-y-1/2 animate-spin-rev opacity-60" aria-hidden>
        <circle cx="100" cy="100" r="98" fill="none" stroke="#c8341f" strokeWidth=".3" strokeDasharray="6 4 1 4" />
      </svg>
      {/* sparkles */}
      {SPARKS.map(([x, y, d], i) => (
        <span key={i} className="absolute h-2 w-2 animate-twinkle" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}>
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden>
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#f2b33d" />
          </svg>
        </span>
      ))}
      {/* Ganesh ji */}
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
        <div className="h-full w-full animate-float">
          <Image src={src} alt="Ganesh ji" fill sizes="(max-width: 640px) 85vw, 480px" className="object-contain drop-shadow-[0_24px_30px_rgba(90,15,34,.35)]" priority quality={90} unoptimized={src.startsWith("/api/")} />
        </div>
      </motion.div>
      {plaque && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#9a6512] bg-gradient-to-b from-[#ffe7a8] to-[#e7b13a] px-5 py-1.5 font-deva text-sm font-semibold text-[#5a0f22] shadow-gold">
          {plaque}
        </motion.div>
      )}
    </div>
  );
}
