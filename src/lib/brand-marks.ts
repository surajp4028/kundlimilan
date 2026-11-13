/**
 * ASTRO emblem marks as plain SVG markup (our own constant strings — no user input).
 * Used by the <LogoMark> component (gold follows Admin → Branding colour) and by
 * scripts/export-brand.mts to write /public/brand/*.svg + PNG.
 *
 *   monogram — thin ring + geometric "A"
 *   simha    — lion head, mane of 12 petals (one per rashi), mandala ring
 *   kumbh    — kalash with mango leaves & coconut, mandala ring
 *   ganesh   — Ganesha line-art, mandala ring
 */
export type MarkKind = "photo" | "painting" | "monogram" | "simha" | "kumbh" | "ganesh";
export const MARKS: { key: MarkKind; label: string }[] = [
  { key: "photo", label: "Ganesh ji · photo (your image)" },
  { key: "painting", label: "Ganesh ji · painting (Ravi Varma Press)" },
  { key: "ganesh", label: "Ganesh ji · face emblem" },
  { key: "simha", label: "Simha · lion emblem" },
  { key: "kumbh", label: "Kumbh · kalash emblem" },
  { key: "monogram", label: "Minimal A monogram" },
];
export const isMark = (v: string): v is MarkKind => MARKS.some((m) => m.key === v);

const f = (n: number) => Math.round(n * 100) / 100;

function gradient(id: string, c: { g1: string; g2: string; g3: string }) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.g2}"/><stop offset=".55" stop-color="${c.g1}"/><stop offset="1" stop-color="${c.g3}"/></linearGradient></defs>`;
}

/** Ornamental ring: two circles + scalloped petals + dots (viewBox 200). */
function mandala(g: string, petals = 24, r = 90) {
  let p = "";
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const a1 = a - Math.PI / petals, a2 = a + Math.PI / petals;
    const x1 = 100 + (r - 8) * Math.sin(a1), y1 = 100 - (r - 8) * Math.cos(a1);
    const x2 = 100 + (r - 8) * Math.sin(a2), y2 = 100 - (r - 8) * Math.cos(a2);
    const cx = 100 + (r + 3) * Math.sin(a), cy = 100 - (r + 3) * Math.cos(a);
    p += `<path d="M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}"/>`;
    const dx = 100 + (r + 6) * Math.sin(a), dy = 100 - (r + 6) * Math.cos(a);
    p += `<circle cx="${f(dx)}" cy="${f(dy)}" r="1.3" fill="url(#${g})" stroke="none"/>`;
  }
  return `<g fill="none" stroke="url(#${g})" stroke-linecap="round"><circle cx="100" cy="100" r="${r - 8}" stroke-width="1.6"/><circle cx="100" cy="100" r="${r - 13}" stroke-width=".7" stroke-dasharray="1.5 4"/><g stroke-width="1.4">${p}</g></g>`;
}

function simha(g: string) {
  // mane: 12 petals (the 12 rashis)
  let mane = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tip = { x: 100 + 70 * Math.sin(a), y: 100 - 70 * Math.cos(a) };
    const l = { x: 100 + 46 * Math.sin(a - 0.24), y: 100 - 46 * Math.cos(a - 0.24) };
    const rr = { x: 100 + 46 * Math.sin(a + 0.24), y: 100 - 46 * Math.cos(a + 0.24) };
    const cl = { x: 100 + 64 * Math.sin(a - 0.2), y: 100 - 64 * Math.cos(a - 0.2) };
    const cr = { x: 100 + 64 * Math.sin(a + 0.2), y: 100 - 64 * Math.cos(a + 0.2) };
    mane += `<path d="M${f(l.x)} ${f(l.y)} Q${f(cl.x)} ${f(cl.y)} ${f(tip.x)} ${f(tip.y)} Q${f(cr.x)} ${f(cr.y)} ${f(rr.x)} ${f(rr.y)}"/>`;
    const ix = 100 + 56 * Math.sin(a), iy = 100 - 56 * Math.cos(a);
    mane += `<path d="M${f(100 + 48 * Math.sin(a))} ${f(100 - 48 * Math.cos(a))} L${f(ix)} ${f(iy)}" stroke-width="1" opacity=".7"/>`;
  }
  return `<g fill="none" stroke="url(#${g})" stroke-linecap="round" stroke-linejoin="round">
    <g stroke-width="2">${mane}</g>
    <path d="M100 58 L124 68 L134 96 L124 124 L100 140 L76 124 L66 96 L76 68 Z" stroke-width="2.6"/>
    <path d="M78 70 Q72 58 82 56 Q88 60 86 66 M122 70 Q128 58 118 56 Q112 60 114 66" stroke-width="2"/>
    <path d="M100 64 L100 104" stroke-width="1.4" opacity=".8"/>
    <path d="M86 70 Q93 80 92 104 M114 70 Q107 80 108 104" stroke-width="1.4" opacity=".8"/>
    <path d="M78 92 Q86 85 94 92 Q86 96 78 92 Z M122 92 Q114 85 106 92 Q114 96 122 92 Z" stroke-width="1.8"/>
    <circle cx="86" cy="91.6" r="1.8" fill="url(#${g})" stroke="none"/><circle cx="114" cy="91.6" r="1.8" fill="url(#${g})" stroke="none"/>
    <path d="M90 106 Q100 100 110 106 L100 117 Z" fill="url(#${g})" stroke-width="1.4"/>
    <path d="M100 117 L100 123 M88 124 Q94 131 100 123 Q106 131 112 124" stroke-width="1.8"/>
    <path d="M82 114 l-10 -2 M82 118 l-10 2 M118 114 l10 -2 M118 118 l10 2" stroke-width="1" opacity=".7"/>
    <path d="M92 134 Q100 140 108 134" stroke-width="1.4" opacity=".8"/>
  </g>`;
}

function kumbh(g: string) {
  return `<g fill="none" stroke="url(#${g})" stroke-linecap="round" stroke-linejoin="round">
    <path d="M100 56 C 86 50, 84 36, 100 30 C 116 36, 114 50, 100 56 Z" stroke-width="2.2"/>
    <path d="M100 30 C 98 24, 102 20, 104 17 M100 30 C 96 26, 93 25, 90 26" stroke-width="1.6"/>
    <path d="M92 58 C 72 48, 58 52, 50 62 C 66 66, 82 64, 92 60 Z" stroke-width="2"/>
    <path d="M108 58 C 128 48, 142 52, 150 62 C 134 66, 118 64, 108 60 Z" stroke-width="2"/>
    <path d="M90 62 C 76 64, 66 74, 64 86 C 76 80, 86 72, 92 64 Z" stroke-width="2"/>
    <path d="M110 62 C 124 64, 134 74, 136 86 C 124 80, 114 72, 108 64 Z" stroke-width="2"/>
    <path d="M58 60 L88 61 M142 60 L112 61 M68 82 L90 64 M132 82 L110 64" stroke-width="1" opacity=".6"/>
    <path d="M78 62 H122" stroke-width="3"/>
    <path d="M84 62 L86 72 H114 L116 62" stroke-width="2.2"/>
    <path d="M82 72 H118" stroke-width="2.4"/>
    <path d="M86 72 C 60 84, 56 120, 72 138 C 84 152, 116 152, 128 138 C 144 120, 140 84, 114 72" stroke-width="2.6"/>
    <path d="M66 100 H134" stroke-width="1.4" opacity=".85"/>
    <path d="M64 108 H136" stroke-width="1.4" opacity=".85"/>
    <path d="M70 100 Q75 104 80 100 Q85 104 90 100 Q95 104 100 100 Q105 104 110 100 Q115 104 120 100 Q125 104 130 100" stroke-width="1" opacity=".75"/>
    <circle cx="100" cy="124" r="9" stroke-width="1.6"/>
    <path d="M100 117 V131 M93 124 H107" stroke-width="1.4"/>
    <circle cx="100" cy="124" r="2" fill="url(#${g})" stroke="none"/>
    <path d="M80 148 Q100 158 120 148 M84 152 L80 160 H120 L116 152" stroke-width="2"/>
  </g>`;
}

function ganesh(g: string) {
  // Ganesha face (from /public/brand/ganesh-color.svg) in gold, face only
  return `<g transform="translate(16 2) scale(.42)" stroke="url(#${g})" stroke-linejoin="round" stroke-linecap="round" fill="none">
    <g stroke-width="8">
      <path d="M142 160 C 68 124, 30 210, 66 280 C 90 324, 140 316, 158 276"/>
      <path d="M258 160 C 332 124, 370 210, 334 280 C 310 324, 260 316, 242 276"/>
      <path d="M138 150 C 132 200, 142 240, 170 266 M262 150 C 268 200, 258 240, 230 266"/>
      <path d="M132 156 L 144 96 Q 168 112, 180 82 Q 200 40, 220 82 Q 232 112, 256 96 L 268 156 Z"/>
      <path d="M128 162 H 272"/>
      <path d="M184 214 C 180 262, 174 312, 190 352 C 204 390, 252 400, 266 370 C 274 350, 250 336, 236 352"/>
      <path d="M216 214 C 214 270, 206 324, 214 350"/>
      <path d="M170 258 C 154 284, 154 304, 168 310 C 172 292, 178 278, 184 266"/>
    </g>
    <g stroke-width="5">
      <path d="M136 186 C 94 172, 74 224, 94 262 C 108 288, 132 286, 146 266"/>
      <path d="M264 186 C 306 172, 326 224, 306 262 C 292 288, 268 286, 254 266"/>
      <path d="M158 206 Q 174 192 190 206 Q 174 216 158 206 Z M210 206 Q 226 192 242 206 Q 226 216 210 206 Z"/>
      <path d="M190 172 L200 192 L210 172"/>
    </g>
    <circle cx="200" cy="116" r="12" fill="url(#${g})" stroke="none"/>
    <circle cx="200" cy="48" r="9" fill="url(#${g})" stroke="none"/>
    <circle cx="175" cy="205" r="6" fill="url(#${g})" stroke="none"/><circle cx="225" cy="205" r="6" fill="url(#${g})" stroke="none"/>
  </g>`;
}

function monogram(g: string) {
  return `<circle cx="100" cy="100" r="92" fill="none" stroke="url(#${g})" stroke-width="5"/><path d="M53 153 L100 47 L147 153 M73 119 H127" fill="none" stroke="url(#${g})" stroke-width="10.5" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10"/>`;
}

/** Inner SVG markup for a 200×200 viewBox. */
export function markInner(kind: MarkKind, id: string, colors = { g1: "var(--gold, #e8b65a)", g2: "var(--gold-2, #f7dc9f)", g3: "var(--gold-3, #b9852f)" }) {
  const g = `mg${id}`;
  if (kind === "painting" || kind === "photo")
    return (
      gradient(g, colors) +
      `<defs><clipPath id="c${g}"><circle cx="100" cy="100" r="86"/></clipPath></defs>` +
      `<circle cx="100" cy="100" r="97" fill="#fff8ea" stroke="url(#${g})" stroke-width="5"/>` +
      `<image href="${kind === "photo" ? "/brand/ganesh-face2.png" : "/brand/ganesh-face.jpg"}" x="12" y="12" width="176" height="176" preserveAspectRatio="xMidYMid slice" clip-path="url(#c${g})"/>` +
      `<circle cx="100" cy="100" r="86" fill="none" stroke="url(#${g})" stroke-width="2.5"/>`
    );
  const body = kind === "simha" ? mandala(g) + simha(g) : kind === "kumbh" ? mandala(g) + kumbh(g) : kind === "ganesh" ? `<circle cx="100" cy="100" r="96" fill="none" stroke="url(#${g})" stroke-width="3"/><circle cx="100" cy="100" r="89" fill="none" stroke="url(#${g})" stroke-width="1" opacity=".6"/>` + ganesh(g) : monogram(g);
  return gradient(g, colors) + body;
}

export const HEX = { g1: "#b8852f", g2: "#e0ad4f", g3: "#6f4a12" };
