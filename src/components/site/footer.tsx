"use client";
import Link from "next/link";
import { Camera as Instagram, Mail, MessageCircle, Phone, PlayCircle as Youtube, ThumbsUp as Facebook, AtSign as Twitter, ShieldCheck, Lock, BadgeIndianRupee } from "lucide-react";
import { useSite } from "@/lib/client/providers";
import { Logo } from "./logo";
import { useNav } from "./navbar";

export function Footer() {
  const s = useSite();
  const links = useNav();
  const socials = [
    { href: s.social_instagram, icon: Instagram, label: "Instagram" },
    { href: s.social_youtube, icon: Youtube, label: "YouTube" },
    { href: s.social_facebook, icon: Facebook, label: "Facebook" },
    { href: s.social_x, icon: Twitter, label: "X" },
  ].filter((x) => x.href);
  return (
    <footer className="band-maroon relative mt-24 overflow-hidden pb-dock">
      <div className="paisley-edge h-5 opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo size="lg" showTagline />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-mist">{s.site_tagline}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ icon: Lock, t: "256-bit encrypted" }, { icon: ShieldCheck, t: "Secure Razorpay" }, { icon: BadgeIndianRupee, t: "No hidden charges" }].map((b) => (
              <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full border border-[#f7d27a]/25 bg-white/[.06] px-3 py-1.5 text-[11px] text-ivory-2">
                <b.icon className="h-3.5 w-3.5 text-gold" /> {b.t}
              </span>
            ))}
          </div>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" aria-label={x.label} className="grid h-10 w-10 place-items-center rounded-full border border-gold/20 text-gold transition hover:bg-gold/10">
                  <x.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <FooterCol title="Explore" links={[{ href: "/reports", label: "All reports" }, ...links.filter((l) => l.href !== "/reports").map((l) => ({ href: l.href, label: l.label }))]} />
        <FooterCol title="Company" links={[{ href: "/about", label: "About us" }, { href: "/contact", label: "Contact" }, { href: "/account", label: "My account" }, { href: "/account?tab=reports", label: "My reports" }]} />
        <div>
          <h4 className="eyebrow">Support</h4>
          <ul className="mt-4 space-y-3 text-sm text-ivory-2">
            <li><a href={`mailto:${s.support_email}`} className="inline-flex items-center gap-2 hover:text-[#f7d27a]"><Mail className="h-4 w-4 text-[#f7d27a]" /> {s.support_email}</a></li>
            <li><a href={`tel:${s.support_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-[#f7d27a]"><Phone className="h-4 w-4 text-[#f7d27a]" /> {s.support_phone}</a></li>
            {s.whatsapp && (
              <li><a href={`https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#f7d27a]"><MessageCircle className="h-4 w-4 text-[#f7d27a]" /> WhatsApp</a></li>
            )}
            <li className="pt-2 text-xs leading-relaxed text-mist">{s.company_address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#f7d27a]/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} {s.company_legal_name || s.site_name}. All rights reserved.</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-[#f7d27a]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#f7d27a]">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-[#f7d27a]">Refund policy</Link>
          </div>
        </div>
        <p className="mx-auto max-w-7xl px-5 pb-6 text-[11px] leading-relaxed text-dim sm:px-8">{s.footer_note}</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="eyebrow">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-ivory-2 transition hover:text-[#f7d27a]">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
