"use client";
import { useId } from "react";
import { useSite } from "@/lib/client/providers";
import { cn } from "@/lib/utils";
import { isMark, markInner, type MarkKind } from "@/lib/brand-marks";

/**
 * ASTRO emblem (Simha / Kumbh / Ganesh / monogram) — chosen in Admin → Branding.
 * Gold follows the brand accent colour. The markup comes from our own constants (brand-marks.ts).
 */
export function LogoMark({ className, kind }: { className?: string; kind?: MarkKind }) {
  const s = useSite();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const k: MarkKind = kind ?? (isMark(s.logo_mode) ? s.logo_mode : "photo");
  return <svg viewBox="0 0 200 200" className={cn("h-9 w-9", className)} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markInner(k, id) }} />;
}

export function Logo({ className, size = "md", showTagline = false }: { className?: string; size?: "sm" | "md" | "lg"; showTagline?: boolean }) {
  const s = useSite();
  const uploaded = s.logo_mode === "upload";
  const mark = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-[1.35rem]";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {uploaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/public/logo?v=${s.logo_version}`} alt="" className={cn(mark, "object-contain")} />
      ) : (
        <LogoMark className={mark} />
      )}
      <span className="flex flex-col leading-none">
        <span className={cn("font-caps font-semibold tracking-[.2em] gold-text", text)}>{s.site_name}</span>
        {(showTagline || size !== "sm") && <span className="mt-1 text-[8.5px] tracking-[.32em] text-mist uppercase">Vedic Astrology</span>}
      </span>
    </span>
  );
}
