import type { SignKey } from "@/lib/astro";
import { cn } from "@/lib/utils";

/** Pictorial zodiac icons (ram, bull, twins, crab, lion…) — original line art, 64×64, gold via currentColor. */
const PATHS: Record<SignKey, React.ReactNode> = {
  aries: (
    <>
      <path d="M26 27 C20 13, 5 17, 9 30 C12 39, 22 35, 19 28" />
      <path d="M38 27 C44 13, 59 17, 55 30 C52 39, 42 35, 45 28" />
      <path d="M25 26 Q32 19 39 26" />
      <path d="M25 27 C24 38, 27 48, 32 54 C37 48, 40 38, 39 27" />
      <path d="M29 48 q3 3 6 0" />
      <circle cx="28.5" cy="36" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="35.5" cy="36" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  taurus: (
    <>
      <path d="M12 12 C11 24, 19 29, 25 27" />
      <path d="M52 12 C53 24, 45 29, 39 27" />
      <path d="M24 26 C21 40, 25 52, 32 55 C39 52, 43 40, 40 26 C37 23, 27 23, 24 26 Z" />
      <path d="M23 30 l-9 -1 l6 6 M41 30 l9 -1 l-6 6" />
      <circle cx="32" cy="48" r="4.5" />
      <circle cx="27.5" cy="36" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="36.5" cy="36" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  gemini: (
    <>
      <circle cx="22" cy="14" r="5" />
      <circle cx="42" cy="14" r="5" />
      <path d="M22 19 V38 M42 19 V38" />
      <path d="M13 31 L22 25 L42 25 L51 31" />
      <path d="M22 38 l-6 16 M22 38 l6 16 M42 38 l-6 16 M42 38 l6 16" />
    </>
  ),
  cancer: (
    <>
      <ellipse cx="32" cy="38" rx="14" ry="9" />
      <path d="M21 33 C15 28, 13 22, 16 17" />
      <path d="M16 17 C9 15, 9 24, 14 24 M16 17 C21 12, 24 19, 19 21" />
      <path d="M43 33 C49 28, 51 22, 48 17" />
      <path d="M48 17 C55 15, 55 24, 50 24 M48 17 C43 12, 40 19, 45 21" />
      <path d="M19 40 l-8 3 M20 44 l-7 6 M24 46 l-4 8 M45 40 l8 3 M44 44 l7 6 M40 46 l4 8" />
      <path d="M28 30 v-5 M36 30 v-5" />
      <circle cx="28" cy="24" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="36" cy="24" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  leo: (
    <>
      <path d="M32 9 L36 15 L43 12 L44 19 L51 20 L48 27 L54 32 L48 37 L51 44 L44 45 L43 52 L36 49 L32 55 L28 49 L21 52 L20 45 L13 44 L16 37 L10 32 L16 27 L13 20 L20 19 L21 12 L28 15 Z" />
      <circle cx="32" cy="33" r="11" />
      <circle cx="28" cy="30" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="36" cy="30" r="1.3" fill="currentColor" stroke="none" />
      <path d="M29 35 L35 35 L32 38 Z" fill="currentColor" />
      <path d="M32 38 v2 M28 41 q4 3 8 0" />
    </>
  ),
  virgo: (
    <>
      <circle cx="30" cy="13" r="6" />
      <path d="M24 13 C22 24, 20 29, 17 33" />
      <path d="M28 20 L21 54 H41 L33 20" />
      <path d="M31 30 L42 27" />
      <path d="M42 34 L50 10" />
      <path d="M46 22 l-4 -2 M47 18 l-4 -2 M48 14 l-4 -2 M46 22 l4 -1 M47 18 l4 -1 M48 14 l4 -1" />
    </>
  ),
  libra: (
    <>
      <circle cx="32" cy="10" r="2.5" />
      <path d="M32 13 V54 M22 54 H42" />
      <path d="M12 18 H52" />
      <path d="M12 18 L6 34 M12 18 L18 34 M52 18 L46 34 M52 18 L58 34" />
      <path d="M5 34 Q12 42 19 34 Z M45 34 Q52 42 59 34 Z" />
    </>
  ),
  scorpio: (
    <>
      <path d="M20 42 C28 39, 36 39, 42 40 C51 41, 56 33, 54 24 C52 17, 45 17, 45 23" />
      <path d="M45 23 l5 -3 M45 23 l2 5" />
      <path d="M20 42 C14 40, 11 36, 13 31 M13 31 C8 29, 8 36, 12 36 M13 31 C17 27, 19 33, 16 35" />
      <path d="M20 42 C14 44, 11 48, 13 52 M13 52 C8 52, 9 46, 12 47 M13 52 C17 55, 19 50, 16 49" />
      <path d="M26 41 l-2 8 M31 40 l-1 9 M36 40 l1 9 M41 40 l2 8" />
      <path d="M27 40 q2 -3 4 0 q2 -3 4 0 q2 -3 4 0" />
    </>
  ),
  sagittarius: (
    <>
      <path d="M12 52 L50 14" />
      <path d="M50 14 l-11 2 M50 14 l-2 11" />
      <path d="M12 52 l-1 -7 M12 52 l7 1 M16 48 l-1 -6 M16 48 l6 1" />
      <path d="M18 20 Q50 14 44 46" />
      <path d="M18 20 L44 46" />
    </>
  ),
  capricorn: (
    <>
      <path d="M16 30 C14 24, 18 18, 25 19 L32 26" />
      <path d="M23 19 C22 9, 31 5, 36 9" />
      <path d="M27 21 C28 13, 35 11, 38 14" />
      <path d="M17 31 l-2 7 l5 -3" />
      <circle cx="22" cy="24" r="1.3" fill="currentColor" stroke="none" />
      <path d="M32 26 C43 29, 47 41, 41 47 C37 51, 43 56, 50 52" />
      <path d="M50 52 l7 -7 M50 52 l7 4" />
      <path d="M26 30 C30 38, 34 42, 38 44" />
      <path d="M36 34 q3 2 2 5 M41 38 q3 1 3 4" />
    </>
  ),
  aquarius: (
    <>
      <path d="M14 10 H34 L31 16 C35 22, 33 30, 24 30 C15 30, 13 22, 17 16 Z" />
      <path d="M33 21 C40 22, 44 26, 44 32" />
      <path d="M44 36 v2 M42 41 v2 M46 41 v2" />
      <path d="M8 46 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0" />
      <path d="M8 55 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0" />
    </>
  ),
  pisces: (
    <>
      <path d="M8 20 C18 11, 36 11, 46 20 C36 29, 18 29, 8 20 Z" />
      <path d="M46 20 l9 -7 v14 Z" />
      <circle cx="15" cy="19" r="1.4" fill="currentColor" stroke="none" />
      <path d="M56 44 C46 35, 28 35, 18 44 C28 53, 46 53, 56 44 Z" />
      <path d="M18 44 l-9 -7 v14 Z" />
      <circle cx="49" cy="43" r="1.4" fill="currentColor" stroke="none" />
      <path d="M26 26 C22 32, 40 32, 38 38" strokeDasharray="2 3" />
    </>
  ),
};

export function ZodiacIcon({ sign, className }: { sign: SignKey; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[sign]}
    </svg>
  );
}
