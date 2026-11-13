/** Writes /public/brand/<mark>.svg + <mark>-logo.svg (with wordmark) for every emblem. PNGs are rendered separately. */
import fs from "node:fs";
import path from "node:path";
const { markInner, MARKS, HEX } = await import("../src/lib/brand-marks.ts");
const dir = path.resolve(import.meta.dirname, "../public/brand");
for (const m of MARKS.filter((x) => x.key !== "painting" && x.key !== "photo")) {
  fs.writeFileSync(path.join(dir, `mark-${m.key}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="1024" height="1024">${markInner(m.key, "x", HEX)}</svg>\n`);
  fs.writeFileSync(
    path.join(dir, `logo-${m.key}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 270" width="800" height="1080">${markInner(m.key, "x", HEX)}<text x="100" y="236" text-anchor="middle" font-family="Cinzel, Trajan Pro, Georgia, serif" font-size="30" font-weight="600" letter-spacing="7" fill="url(#mgx)">ASTRO</text><text x="100" y="258" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" letter-spacing="4.5" fill="#a9a1c4">VEDIC ASTROLOGY</text></svg>\n`,
  );
}
console.log("✓ brand svgs written");
