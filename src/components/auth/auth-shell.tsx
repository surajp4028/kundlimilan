"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { GaneshShowcase } from "@/components/astro/ganesh-showcase";
import { Meteors } from "@/components/ui/meteors";
import { useSite } from "@/lib/client/providers";

export function AuthShell({ children, quote }: { children: ReactNode; image?: string; quote?: string }) {
  const site = useSite();
  return (
    <div className="sky relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="pointer-events-none absolute inset-0"><div className="stars" /><div className="stars-2" /></div>
      <aside className="relative hidden overflow-hidden border-r border-gold/15 lg:block">
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora-blob absolute -left-1/4 top-1/4 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(255,170,70,.35),transparent_65%)] blur-2xl" />
          <div className="aurora-blob absolute -right-1/4 bottom-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(200,52,31,.14),transparent_65%)] blur-2xl [animation-delay:-8s]" />
          <Meteors number={12} className="meteor-gold" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/"><Logo size="lg" /></Link>
          <div>
            <div className="mx-auto w-[min(380px,70%)]">
              <GaneshShowcase plaque="गणपति बप्पा मोरया" />
            </div>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="display mx-auto mt-10 max-w-lg text-center text-4xl text-ivory xl:text-5xl">
              {quote || (
                <>
                  Your chart, your reports — <em className="gold-text">always with you.</em>
                </>
              )}
            </motion.p>
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-ivory-2">
              {[
                { i: Lock, t: "AES-256 encrypted" },
                { i: ShieldCheck, t: "DPDP compliant" },
                { i: BadgeCheck, t: "No passwords to leak" },
              ].map((b) => (
                <span key={b.t} className="flex items-center gap-1.5 rounded-full border border-gold/20 bg-white/70 px-3 py-1.5">
                  <b.i className="h-3.5 w-3.5 text-gold" /> {b.t}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-mist">© {new Date().getFullYear()} {site.company_legal_name || site.site_name}</p>
        </div>
      </aside>
      <main className="relative flex flex-col">
        <div className="relative flex items-center justify-between p-5 lg:hidden">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="relative mx-auto -mb-2 w-44 lg:hidden">
          <GaneshShowcase />
        </div>
        <div className="relative flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="lux-card relative w-full max-w-[460px] overflow-hidden p-6 sm:p-9"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-light via-gold-bright to-gold" />
            {children}
          </motion.div>
        </div>
        <p className="relative px-6 pb-6 text-center text-xs text-mist">
          Need help? <Link href="/contact" className="font-semibold text-ivory hover:underline">Contact us</Link> · {site.support_email}
        </p>
      </main>
    </div>
  );
}

export function StepHeader({ title, sub, eyebrow }: { title: string; sub?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-7">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className="display text-[2.1rem] text-ivory sm:text-4xl">{title}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-mist">{sub}</p>}
    </div>
  );
}
