"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue } from "motion/react";
import { ChevronLeft, ChevronRight, Copy, Inbox, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* =====================================================================
 * ASTRO admin UI kit — light "paper" surface, ink text, gold accent.
 * ===================================================================== */

/** Page number that resets to 1 whenever `key` (the active filters) changes. */
export function usePage(key: string) {
  const [s, setS] = useState({ key, page: 1 });
  const page = s.key === key ? s.page : 1;
  return [page, (p: number) => setS({ key, page: p })] as const;
}

export function PageHeader({ title, sub, actions, icon }: { title: string; sub?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-end">
      <div className="flex items-start gap-3.5">
        {icon && (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-light via-gold-bright to-gold text-ongold shadow-[0_12px_30px_-12px_rgba(185,133,47,0.8)] md:h-12 md:w-12 [&_svg]:h-5 [&_svg]:w-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight text-ink md:text-[2.2rem]">{title}</h1>
          {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)}>{children}</div>;
}

export function CardHead({ title, right, sub }: { title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
      <div>
        <div className="text-sm font-bold text-ink">{title}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

type Tone = "gold" | "violet" | "emerald" | "sky" | "rose";
const TONE_RGB: Record<Tone, string> = { gold: "232,182,90", violet: "155,123,255", emerald: "79,214,162", sky: "115,198,255", rose: "240,122,149" };
const TONE_ICON: Record<Tone, string> = {
  gold: "from-gold-light via-gold-bright to-gold text-ongold",
  violet: "from-violet to-[#6d4bd8] text-white",
  emerald: "from-emerald to-[#20a978] text-white",
  sky: "from-sky to-[#3a8fd8] text-white",
  rose: "from-rose to-[#d24d6c] text-white",
};
const TONE_BAR: Record<Tone, string> = { gold: "bg-gold", violet: "bg-violet", emerald: "bg-emerald", sky: "bg-sky", rose: "bg-rose" };

/** Stat card: cursor-following glow, gradient icon, optional sparkline. */
export function StatCard({ label, value, hint, icon, tone = "gold", spark }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: Tone; spark?: number[] }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const bg = useMotionTemplate`radial-gradient(220px circle at ${x}px ${y}px, rgba(${TONE_RGB[tone]},0.16), transparent 75%)`;
  const max = Math.max(1, ...(spark || [0]));
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className="group relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 md:p-5"
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br [&_svg]:h-[17px] [&_svg]:w-[17px]", TONE_ICON[tone])}>{icon}</div>
      </div>
      <div className="relative mt-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-2xl font-extrabold tracking-tight text-ink tabular-nums md:text-[1.7rem]">{value}</div>
          {hint && <div className="mt-0.5 text-xs font-medium text-muted">{hint}</div>}
        </div>
        {spark && spark.length > 1 && (
          <div className="hidden h-10 items-end gap-[3px] sm:flex">
            {spark.map((v, i) => (
              <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(8, (v / max) * 100)}%` }} transition={{ delay: i * 0.03 }} className={cn("w-1.5 rounded-full opacity-70", TONE_BAR[tone])} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const BADGE: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  captured: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
  generating: "border-sky-200 bg-sky-50 text-sky-700",
  not_started: "border-neutral-200 bg-neutral-50 text-neutral-600",
  hidden: "border-neutral-200 bg-neutral-50 text-neutral-600",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  cache: "border-sky-200 bg-sky-50 text-sky-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  error: "border-red-200 bg-red-50 text-red-700",
  disabled: "border-red-200 bg-red-50 text-red-700",
  locked: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-violet-200 bg-violet-50 text-violet-700",
  admin: "border-ink bg-ink text-white",
  staff: "border-violet-200 bg-violet-50 text-violet-700",
  new: "border-amber-300 bg-amber-50 text-amber-800",
  featured: "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800",
};
export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const key = (tone || String(children)).toLowerCase();
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold capitalize", BADGE[key] || "border-neutral-200 bg-neutral-50 text-neutral-600")}>
      {(key === "active" || key === "completed" || key === "ready") && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {key === "generating" && <Loader2 className="h-3 w-3 animate-spin" />}
      {typeof children === "string" ? children.replace(/_/g, " ") : children}
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/15 sm:w-auto sm:min-w-[280px] sm:flex-1 md:flex-none">
      <Search className="h-4 w-4 shrink-0 text-neutral-400" />
      <input value={value} onChange={(e) => onChange(e.target.value.slice(0, 100))} placeholder={placeholder} className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-neutral-400" />
    </label>
  );
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: [string, string][]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink/80 outline-none focus:border-gold", className)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function Btn({ children, onClick, variant = "outline", disabled, className, type = "button", title }: { children: ReactNode; onClick?: () => void; variant?: "outline" | "dark" | "danger" | "brand" | "ghost"; disabled?: boolean; className?: string; type?: "button" | "submit"; title?: string }) {
  const v = {
    outline: "border border-line bg-white text-ink/80 hover:border-ink/25 hover:bg-paper",
    dark: "bg-ink text-white hover:bg-ink/90 shadow-[0_8px_20px_-10px_rgba(23,19,43,0.6)]",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    brand: "bg-gradient-to-b from-gold-light via-gold-bright to-gold text-ongold hover:brightness-105 shadow-[0_10px_24px_-12px_rgba(185,133,47,0.9)]",
    ghost: "text-ink/70 hover:bg-paper",
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={cn("inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50", v[variant], className)}>
      {children}
    </button>
  );
}

export function Table({ head, children, loading, empty, colSpan, minWidth = 880 }: { head: string[]; children: ReactNode; loading?: boolean; empty?: boolean; colSpan?: number; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] text-ink" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-paper/80 text-[11px] font-bold uppercase tracking-wider text-muted">
            {head.map((h, i) => (
              <th key={h + i} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {loading && empty ? (
            <tr>
              <td colSpan={colSpan || head.length} className="py-16 text-center text-neutral-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={colSpan || head.length}>
                <Empty />
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ title = "Nothing here yet", sub = "Records will appear as they come in." }: { title?: string; sub?: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper">
        <Inbox className="h-5 w-5 text-gold-3" />
      </div>
      <div className="mt-3 text-sm font-semibold text-ink">{title}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 md:p-4">{children}</div>;
}

export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
      <span>{total === 0 ? "0 results" : `${(page - 1) * size + 1}–${Math.min(total, page * size)} of ${total}`}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-line p-1.5 hover:bg-paper disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-line p-1.5 hover:bg-paper disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Initials first; the photo fades in on top once it has loaded. */
export function Avatar({ name, className, src }: { name: string | null; className?: string; src?: string | null }) {
  const initials = (name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [state, setState] = useState<{ src: string | null | undefined; s: "loading" | "loaded" | "error" }>({ src, s: "loading" });
  const st = state.src === src ? state.s : "loading";
  return (
    <div className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-light to-gold-bright/60 text-[11px] font-extrabold text-ink ring-1 ring-white", className)}>
      <span className={cn("transition-opacity", st === "loaded" && "opacity-0")}>{initials}</span>
      {src && st !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || "Profile photo"}
          onLoad={() => setState({ src, s: "loaded" })}
          onError={() => setState({ src, s: "error" })}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", st === "loaded" ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}

export function Forbidden() {
  return (
    <Card className="mx-auto mt-16 max-w-md p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-2xl">🔒</div>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">No access</h2>
      <p className="mt-1 text-sm text-muted">Your role doesn&apos;t include this section. Ask an administrator to grant permission.</p>
    </Card>
  );
}

/* ----------------------------- Form controls ----------------------------- */

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="text-[12px] font-bold uppercase tracking-wider text-ink/60">{children}</span>
      {hint && <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-neutral-400 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:bg-paper disabled:text-muted";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "h-auto min-h-[90px] py-2.5 leading-relaxed", props.className)} />;
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", on ? "bg-gradient-to-r from-gold-bright to-gold" : "bg-line")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow", on ? "right-1" : "left-1")} />
    </button>
  );
}

/** Filter chips with counts. */
export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number; tone?: string }[] }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          onClick={() => onChange(i.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
            value === i.value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70 hover:border-ink/30",
          )}
        >
          {i.label}
          {i.count !== undefined && <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", value === i.value ? "bg-white/15" : i.tone || "bg-paper text-muted")}>{i.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- Overlays ----------------------------- */

function usePortal() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.body), []);
  return el;
}

function useLockScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
}

/** Right-side drawer (full screen on phones). */
export function Drawer({ open, onClose, title, sub, children, footer, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  const el = usePortal();
  useLockScroll(open, onClose);
  if (!el) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="admin-surface fixed inset-0 z-[80] flex justify-end !bg-transparent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn("relative flex h-full w-full flex-col bg-paper shadow-2xl", width)}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-4">
              <div className="min-w-0">
                <div className="truncate font-display text-2xl font-semibold text-ink">{title}</div>
                {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-ink/60 hover:bg-paper" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="flex flex-wrap gap-2 border-t border-line bg-white px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    el,
  );
}

/** Centred dialog (bottom sheet on phones). */
export function Modal({ open, onClose, title, children, footer, icon }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; icon?: ReactNode }) {
  const el = usePortal();
  useLockScroll(open, onClose);
  if (!el) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="admin-surface fixed inset-0 z-[90] flex items-end justify-center !bg-transparent p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-md rounded-t-3xl border border-line bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
          >
            {icon && <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper text-gold-3">{icon}</div>}
            <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
            {children && <div className="mt-2 text-sm text-muted">{children}</div>}
            {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    el,
  );
}

/** Pretty JSON block with copy. */
export function Json({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs font-bold text-ink">
        {title}
        <button onClick={() => navigator.clipboard?.writeText(body).then(() => toast.success("Copied"))} className="rounded p-1 text-muted hover:bg-paper hover:text-ink" aria-label="Copy">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed text-ink/80">{body}</pre>
    </div>
  );
}

export const pretty = (s: string | null | unknown) => {
  if (s === null || s === undefined || s === "") return "—";
  if (typeof s !== "string") return JSON.stringify(s, null, 2);
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
};

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line/70 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-5 py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words font-medium text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function copy(text: string, label = "Copied") {
  navigator.clipboard?.writeText(text).then(() => toast.success(label));
}
