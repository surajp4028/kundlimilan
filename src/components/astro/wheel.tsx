"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROW = 46; // px per row
const VISIBLE = 5;

/** One scroll-snap column (iOS style). Calls onChange once scrolling settles. */
export function WheelColumn<T extends string | number>({ items, value, onChange, render, className, label }: { items: T[]; value: T; onChange: (v: T) => void; render?: (v: T) => ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(() => Math.max(0, items.indexOf(value)));
  const idx = items.indexOf(value);

  // jump to the selected value (on open / when the list changes)
  useEffect(() => {
    const el = ref.current;
    if (!el || idx < 0) return;
    if (Math.round(el.scrollTop / ROW) !== idx) el.scrollTo({ top: idx * ROW, behavior: "instant" as ScrollBehavior });
    setActive(idx);
  }, [idx, items.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    setActive(i);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (items[i] !== value) {
        onChange(items[i]);
        if ("vibrate" in navigator) navigator.vibrate?.(4);
      }
    }, 110);
  };

  const pick = (i: number) => ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });

  return (
    <div className={cn("relative flex-1", className)}>
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), pick(Math.min(items.length - 1, active + 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), pick(Math.max(0, active - 1)));
        }}
        className="no-scrollbar relative snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none"
        style={{ height: ROW * VISIBLE, paddingBlock: ROW * 2, scrollPaddingBlock: ROW * 2, maskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)", WebkitMaskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)" }}
      >
        {items.map((it, i) => {
          const d = Math.abs(i - active);
          return (
            <button
              type="button"
              key={String(it)}
              role="option"
              aria-selected={i === active}
              onClick={() => pick(i)}
              className={cn("flex w-full snap-center items-center justify-center transition-all duration-150", i === active ? "font-display text-[1.6rem] text-gold-2" : "text-lg text-ivory/60")}
              style={{ height: ROW, opacity: d > 2 ? 0.25 : 1 - d * 0.25, transform: `perspective(400px) rotateX(${Math.max(-60, Math.min(60, (i - active) * 18))}deg)` }}
              tabIndex={-1}
            >
              {render ? render(it) : it}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Bottom sheet on phones, centred card on larger screens. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
            className="sky relative w-full max-w-md overflow-hidden rounded-t-[2rem] border border-gold/20 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-deep sm:rounded-[2rem]"
          >
            <div className="stars" />
            <div className="relative mx-auto mt-3 h-1.5 w-12 rounded-full bg-ink/20 sm:hidden" />
            <div className="relative flex items-center justify-between px-6 pb-2 pt-4">
              <h3 className="font-display text-2xl text-ivory">{title}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-mist hover:text-ivory">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative px-4">{children}</div>
            {footer && <div className="relative px-6 pt-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Highlight band behind the centre row of a set of wheels. */
export function WheelFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-2xl border border-gold/30 bg-gold/[.07]" style={{ height: ROW }} />
      <div className="relative flex gap-1">{children}</div>
    </div>
  );
}

export const useToggle = (initial = false) => {
  const [v, setV] = useState(initial);
  return [v, useCallback(() => setV(true), []), useCallback(() => setV(false), [])] as const;
};
