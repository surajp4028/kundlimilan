"use client";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { MobileDock, Navbar } from "./navbar";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";

/** Every public page: night sky + stars, navbar, content, footer, mobile dock. */
export function SiteShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="sky relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="stars" />
        <div className="stars-2" />
      </div>
      <div className="relative">
        <Navbar />
        <main className={cn(!footer && "pb-dock")}>{children}</main>
        {footer && <Footer />}
        <MobileDock />
      </div>
    </div>
  );
}

/** Page heading block used by inner pages. */
export function PageHero({ eyebrow, title, accent, subtitle, children }: { eyebrow: string; title: string; accent?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative mx-auto max-w-4xl px-5 pb-8 pt-8 text-center sm:pt-14">
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="eyebrow">
        ✦ {eyebrow} ✦
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="display mt-4 text-[2.6rem] text-ivory sm:text-6xl">
        {title} {accent && <em className="gold-text gold-shine not-italic">{accent}</em>}
      </motion.h1>
      {subtitle && (
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-mist sm:text-base">
          {subtitle}
        </motion.p>
      )}
      {children}
    </section>
  );
}

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-7xl px-4 sm:px-8", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ eyebrow, title, accent, subtitle, align = "center" }: { eyebrow: string; title: string; accent?: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={cn("mb-10", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-3 text-4xl text-ivory sm:text-5xl">
        {title} {accent && <em className="gold-text not-italic">{accent}</em>}
      </h2>
      {subtitle && <p className="mt-4 text-[15px] leading-relaxed text-mist">{subtitle}</p>}
    </div>
  );
}
