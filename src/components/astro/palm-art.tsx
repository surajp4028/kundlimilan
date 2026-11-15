"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const PALM = "M58 128 C56 114 64 106 76 108 L168 110 C181 112 186 124 184 140 C182 172 177 206 166 228 C156 246 136 252 112 252 C88 252 70 246 62 228 C54 208 56 170 58 128 Z";
const HAND = (
  <>
    <path d="M74 236 C74 260 77 274 79 282 L145 282 C147 274 150 260 150 236 Z" />
    <path d="M62 172 C46 162 28 152 20 134 C14 120 24 110 36 116 C50 123 64 142 76 154 Z" />
    <rect x="60" y="46" width="27" height="100" rx="13.5" />
    <rect x="91" y="26" width="28" height="114" rx="14" />
    <rect x="123" y="36" width="27" height="106" rx="13.5" />
    <rect x="154" y="70" width="23" height="84" rx="11.5" />
    <path d={PALM} />
  </>
);

/**
 * Original illustration of an open right palm with the four major lines — shows visitors
 * exactly what kind of photo to send. `scan` adds a moving scanner line, `labels` names the lines.
 */
export function PalmArt({ className, scan = false, labels = false, frame = false }: { className?: string; scan?: boolean; labels?: boolean; frame?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 220 280" className="h-full w-full drop-shadow-[0_18px_24px_rgba(90,15,34,.28)]" role="img" aria-label="An open palm showing the life, heart, head and fate lines">
        <defs>
          <linearGradient id="pa-skin" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="282">
            <stop offset="0" stopColor="#f6d3b3" />
            <stop offset="1" stopColor="#e3a983" />
          </linearGradient>
          <radialGradient id="pa-shade" cx=".5" cy=".55" r=".55">
            <stop offset=".55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#8a4a2c" stopOpacity=".22" />
          </radialGradient>
        </defs>
        {/* union outline trick: shapes with a thick stroke, then the same shapes again without stroke on top →
            only the outer silhouette keeps its outline, so palm and fingers read as one hand */}
        <g stroke="#c48563" strokeWidth="3" strokeLinejoin="round" fill="url(#pa-skin)">{HAND}</g>
        <g fill="url(#pa-skin)">{HAND}</g>
        <path d={PALM} fill="url(#pa-shade)" />
        {/* finger creases */}
        <g stroke="#c48563" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity=".7">
          <path d="M63 78 h18 M63 104 h18" />
          <path d="M95 60 h19 M95 90 h19" />
          <path d="M128 68 h18 M128 96 h18" />
          <path d="M159 94 h16 M159 116 h16" />
          <path d="M30 124 l12 6" />
        </g>
        {/* mounts (soft) */}
        <g fill="#fff" opacity=".18">
          <ellipse cx="88" cy="218" rx="22" ry="20" />
          <ellipse cx="160" cy="196" rx="14" ry="22" />
        </g>
        {/* major lines */}
        <g fill="none" strokeLinecap="round" strokeWidth="3">
          {/* heart: under the little finger → curving up between index & middle */}
          <path d="M182 146 C162 138 138 140 116 134 C104 131 96 126 92 120" stroke="#b3233f" />
          {/* head: from the thumb side, sloping across the palm */}
          <path d="M66 152 C94 158 126 166 160 190" stroke="#6b3412" />
          {/* life: same start, arcing round the thumb mount to the wrist */}
          <path d="M66 152 C56 184 62 222 98 248" stroke="#a0480f" />
          {/* fate: from the wrist up towards the middle finger */}
          <path d="M120 248 C117 214 113 180 110 142" stroke="#8a5a14" strokeWidth="2.3" />
        </g>
        {labels && (
          <g fontSize="9.5" fontFamily="system-ui, sans-serif" fontWeight="600">
            <text x="178" y="134" fill="#b3233f" textAnchor="end">Heart</text>
            <text x="150" y="200" fill="#6b3412" textAnchor="end">Head</text>
            <text x="74" y="214" fill="#a0480f">Life</text>
            <text x="123" y="226" fill="#8a5a14">Fate</text>
          </g>
        )}
      </svg>
      {frame && (
        <div className="pointer-events-none absolute inset-[-6%]">
          {["left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl", "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl", "left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl", "right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl"].map((c) => (
            <span key={c} className={cn("absolute h-8 w-8 border-[#f0c35a]", c)} />
          ))}
        </div>
      )}
      {scan && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
          <motion.div
            className="absolute inset-x-[-10%] h-12 bg-gradient-to-b from-transparent via-[#ffe9b3]/80 to-transparent"
            initial={{ top: "-15%" }}
            animate={{ top: ["-15%", "100%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}
