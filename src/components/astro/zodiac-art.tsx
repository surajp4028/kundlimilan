import type { SignKey } from "@/lib/astro";
import { cn } from "@/lib/utils";

/** Real gold rashi artwork (from the ASTRO zodiac wheel; Scorpio & Pisces drawn to match). Transparent — place on a navy medallion. */
const SVG = new Set<SignKey>(["scorpio", "pisces"]);
export const zodiacArtSrc = (s: SignKey) => `/zodiac/${s}.${SVG.has(s) ? "svg" : "png"}`;

export function ZodiacArt({ sign, className }: { sign: SignKey; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={zodiacArtSrc(sign)} alt="" draggable={false} className={cn("h-12 w-12 select-none object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,.45)]", className)} />;
}

/** Navy wheel-style medallion with the gold sign. */
export function ZodiacMedallion({ sign, className, artClass }: { sign: SignKey; className?: string; artClass?: string }) {
  return (
    <span className={cn("relative grid h-24 w-24 place-items-center rounded-full border-[3px] border-[#d9a441] bg-[radial-gradient(circle,#2a3678_0%,#1a2252_60%,#10153a_100%)] shadow-[0_0_0_2px_#7a5212,0_10px_24px_-8px_rgba(0,0,0,.55)]", className)}>
      <span className="absolute inset-1.5 rounded-full border border-[#d9a441]/40" />
      <ZodiacArt sign={sign} className={cn("h-[68%] w-[68%]", artClass)} />
    </span>
  );
}
