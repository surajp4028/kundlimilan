import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Cinzel, Plus_Jakarta_Sans, Noto_Serif_Devanagari } from "next/font/google";
import { Providers } from "@/lib/client/providers";
import { getPublicSettings } from "@/lib/server/settings";
import { getSessionUser } from "@/lib/server/session";
import { loadMe } from "@/lib/server/me";
import "./globals.css";

const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel", display: "swap" });
const deva = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: ["400", "600"], variable: "--font-deva-serif", display: "swap" });

/** Lighter / darker shades of the admin-chosen accent colour. */
function shade(hex: string, f: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)));
  return "#" + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  return {
    title: { default: `${s.site_name} — ${s.site_tagline}`, template: `%s · ${s.site_name}` },
    description: s.site_description,
    applicationName: s.site_name,
    robots: { index: true, follow: true },
    openGraph: { title: s.site_name, description: s.site_description, type: "website", siteName: s.site_name },
    icons: s.logo_mode === "upload" ? { icon: `/api/public/logo?v=${s.logo_version}` } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#7b1830", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers(); // dynamic rendering (per-request CSP nonce)
  const [settings, session] = await Promise.all([getPublicSettings(), getSessionUser()]);
  const me = session ? await loadMe(session.id) : null;
  const gold = /^#[0-9a-f]{6}$/i.test(settings.brand_color) ? settings.brand_color : "#e0a12a";
  // light theme: --gold* are deeper (readable on cream), --gold-bright/-light are the raw accent for fills & buttons
  const vars = { "--gold": shade(gold, -0.28), "--gold-2": shade(gold, -0.42), "--gold-3": shade(gold, -0.55), "--gold-bright": gold, "--gold-light": shade(gold, 0.55) } as React.CSSProperties;
  return (
    <html lang="en" data-scroll-behavior="smooth" style={vars} className={`${body.variable} ${cormorant.variable} ${cinzel.variable} ${deva.variable}`}>
      <body className="min-h-screen">
        <Providers settings={settings} initialUser={me ? { ...me, memberSince: new Date(me.memberSince).toISOString() } : null}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
