"use client";
import Image from "next/image";
import { SIGNS } from "@/lib/astro";
import { cn } from "@/lib/utils";

const f = (n: number) => Math.round(n * 100) / 100;

/** Slowly rotating zodiac wheel with Lord Ganesha at the centre (hero visual). */
export function ZodiacWheel({ className, center = true, src = "/brand/ganesh-color-800.png", inset = "27%" }: { className?: string; center?: boolean; src?: string; inset?: string }) {
  return (
    <div className={cn("relative aspect-square", className)}>
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(232_182_90/.22),transparent_65%)] blur-2xl animate-glow" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden="true">
        <defs>
          <linearGradient id="zw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--gold-2)" />
            <stop offset=".55" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--gold-3)" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#zw)">
          <circle cx="200" cy="200" r="196" strokeWidth="1" opacity=".6" />
          <circle cx="200" cy="200" r="176" strokeWidth=".8" />
          <circle cx="200" cy="200" r="132" strokeWidth=".8" />
          <circle cx="200" cy="200" r="126" strokeWidth=".5" strokeDasharray="2 6" opacity=".8" />
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const r2 = i % 6 === 0 ? 186 : 181;
            return <line key={i} x1={f(200 + 176 * Math.sin(a))} y1={f(200 - 176 * Math.cos(a))} x2={f(200 + r2 * Math.sin(a))} y2={f(200 - r2 * Math.cos(a))} strokeWidth={i % 6 === 0 ? 1.2 : 0.6} />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={f(200 + 132 * Math.sin(a))} y1={f(200 - 132 * Math.cos(a))} x2={f(200 + 176 * Math.sin(a))} y2={f(200 - 176 * Math.cos(a))} strokeWidth=".8" opacity=".7" />;
          })}
        </g>
        {SIGNS.map((s, i) => {
          const a = ((i + 0.5) / 12) * Math.PI * 2;
          const x = 200 + 154 * Math.sin(a), y = 200 - 154 * Math.cos(a);
          return (
            <text key={s.key} x={f(x)} y={f(y)} textAnchor="middle" dominantBaseline="central" fontSize="22" fill="url(#zw)" transform={`rotate(${f((a * 180) / Math.PI)} ${f(x)} ${f(y)})`} style={{ fontFamily: "'Segoe UI Symbol','Apple Symbols','Noto Sans Symbols 2',serif" }}>
              {s.symbol + "︎"}
            </text>
          );
        })}
      </svg>
      <svg viewBox="0 0 400 400" className="absolute inset-[14%] h-[72%] w-[72%] animate-spin-rev opacity-70" aria-hidden="true">
        <g fill="none" stroke="var(--gold)" strokeWidth=".6">
          <polygon points="200,40 338,280 62,280" />
          <polygon points="200,360 62,120 338,120" />
          <circle cx="200" cy="200" r="160" strokeDasharray="1 5" />
        </g>
      </svg>
      {center && (
        <div className="absolute animate-float" style={{ inset }}>
          <Image src={src} alt="Lord Ganesha" fill sizes="(max-width: 640px) 60vw, 360px" className="object-contain drop-shadow-[0_10px_30px_rgba(226,112,42,.25)]" priority unoptimized={src.startsWith("/api/")} />
        </div>
      )}
    </div>
  );
}
