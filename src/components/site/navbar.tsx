"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { BookOpenText, CalendarDays, ChevronRight, Hash, Heart, Home, LogOut, Menu, ScrollText, Sparkles, Sun, User2, X } from "lucide-react";
import { useAuth, useSite } from "@/lib/client/providers";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/reports", label: "Reports", icon: ScrollText, tool: null },
  { href: "/kundli", label: "Free Kundli", icon: Sparkles, tool: "tool_kundli" },
  { href: "/matching", label: "Kundli Milan", icon: Heart, tool: "tool_matching" },
  { href: "/horoscope", label: "Horoscope", icon: Sun, tool: "tool_horoscope" },
  { href: "/panchang", label: "Panchang", icon: CalendarDays, tool: "tool_panchang" },
  { href: "/numerology", label: "Numerology", icon: Hash, tool: "tool_numerology" },
] as const;

export function useNav() {
  const s = useSite() as unknown as Record<string, string>;
  return NAV.filter((n) => !n.tool || s[n.tool] === "on");
}

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const site = useSite();
  const path = usePathname();
  const links = useNav();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled((s) => (s ? v > 8 : v > 32)));
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  return (
    <>
      {site.maintenance_mode === "on" && (
        <div className="relative z-[60] bg-gradient-to-r from-gold via-gold-bright to-gold px-4 py-2 text-center text-xs font-semibold text-ongold">{site.maintenance_message}</div>
      )}
      <header className={cn("sticky top-0 z-50 transition-all duration-500 ease-out", scrolled ? "px-2 pt-2 sm:px-4" : "px-0 pt-0")}>
        <nav
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-3 border px-4 transition-[height,border-radius,background-color,border-color,box-shadow,backdrop-filter,color] duration-300 ease-out sm:px-6",
            scrolled ? "nav-maroon h-14 rounded-2xl border-[#f7d27a]/30" : "nav-idle h-16 rounded-none border-transparent sm:h-20",
          )}
        >
          <Link href="/" aria-label={`${site.site_name} home`} className="shrink-0">
            <Logo size={scrolled ? "sm" : "md"} />
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("relative rounded-full px-3.5 py-2 text-sm text-ivory/80 transition hover:text-ivory", path.startsWith(l.href) && "text-gold")}
              >
                {path.startsWith(l.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-gold/10 ring-1 ring-gold/30" />}
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/account" className="hidden items-center gap-2 rounded-full border border-gold/25 bg-ink/5 py-1.5 pl-1.5 pr-4 text-sm text-ivory transition hover:border-gold/60 sm:flex">
                <Avatar name={user.name} src={user.avatar} />
                <span className="max-w-28 truncate">{user.name?.split(" ")[0] || "Account"}</span>
              </Link>
            ) : (
              <Link href="/login" className="btn-gold hidden !px-5 !py-2.5 text-sm sm:inline-flex">
                Sign in
              </Link>
            )}
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-gold/25 bg-ink/5 text-ivory lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>
      <AnimatePresence>{open && <MobileMenu onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

export function Avatar({ name, src, className }: { name: string | null | undefined; src?: string | null; className?: string }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("h-7 w-7 rounded-full object-cover ring-1 ring-gold/40", className)} />
  ) : (
    <span className={cn("grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-bright text-[11px] font-bold text-ongold", className)}>{initials}</span>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const site = useSite();
  const router = useRouter();
  const links = useNav();
  return (
    <motion.div className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="sky absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col border-l border-gold/20 safe-bottom"
      >
        <div className="stars" />
        <div className="relative flex items-center justify-between px-5 pt-5">
          <Logo size="sm" />
          <button aria-label="Close menu" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-gold/25 bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-6 px-5">
          {user ? (
            <Link href="/account" className="lux-card flex items-center gap-3 p-4">
              <Avatar name={user.name} src={user.avatar} className="h-11 w-11 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-xl">{user.name || "My account"}</div>
                <div className="text-xs text-mist">{user.uid}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-gold" />
            </Link>
          ) : (
            <Link href="/login" className="btn-gold w-full">Sign in / Create account</Link>
          )}
        </div>
        <nav className="relative mt-6 flex-1 overflow-y-auto px-3">
          {[{ href: "/", label: "Home", icon: Home }, ...links].map((l, i) => (
            <motion.div key={l.href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <Link href={l.href} className="flex items-center gap-4 rounded-2xl px-3 py-3.5 text-ivory/90 active:bg-ink/5">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/20 bg-gold/5 text-gold">
                  <l.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-display text-xl">{l.label}</span>
              </Link>
            </motion.div>
          ))}
          {user && (
            <>
              <Link href="/account?tab=reports" className="flex items-center gap-4 rounded-2xl px-3 py-3.5 text-ivory/90">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/20 bg-gold/5 text-gold"><BookOpenText className="h-[18px] w-[18px]" /></span>
                <span className="font-display text-xl">My Reports</span>
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                  router.push("/");
                }}
                className="flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-mist"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10"><LogOut className="h-[18px] w-[18px]" /></span>
                <span className="text-base">Sign out</span>
              </button>
            </>
          )}
        </nav>
        <div className="relative border-t border-gold/10 px-5 py-4 text-xs text-mist">
          {site.support_phone} · {site.support_email}
        </div>
      </motion.aside>
    </motion.div>
  );
}

/** Aceternity-style floating dock (as on SKYO): phones get an expanding stack from a gold button, desktop a magnifying dock. */
export function MobileDock() {
  const path = usePathname();
  const { user } = useAuth();
  const links = useNav();
  const { scrollY } = useScroll();
  const [showDesk, setShowDesk] = useState(true);
  // visible from the start; tucks away only near the very bottom so it never covers the footer links
  useMotionValueEvent(scrollY, "change", (v) => setShowDesk(v + window.innerHeight < document.documentElement.scrollHeight - 120));
  if (path.startsWith("/admin")) return null;
  const items = [
    { href: "/", label: "Home", icon: Home },
    ...links.map((l) => ({ href: l.href, label: l.label, icon: l.icon })),
    { href: user ? "/account" : "/login", label: user ? "My account" : "Sign in", icon: User2 },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  // phones: only the 5 most-used destinations (the rest live in the ☰ menu)
  const phoneItems = [
    { href: "/kundli", short: "Kundli", label: "Free Kundli", icon: Sparkles },
    { href: "/matching", short: "Milan", label: "Kundli Milan", icon: Heart },
    { href: "/", short: "Home", label: "Home", icon: Home },
    { href: "/horoscope", short: "Rashifal", label: "Horoscope", icon: Sun },
    { href: user ? "/account" : "/login", short: user ? "Account" : "Sign in", label: user ? "My account" : "Sign in", icon: User2 },
  ];
  return (
    <>
      {/* ---------- phones: compact floating dock ---------- */}
      <motion.nav
        aria-label="Quick navigation"
        initial={{ y: 80, opacity: 0, x: "-50%" }}
        animate={{ y: 0, opacity: 1, x: "-50%" }}
        transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.2 }}
        className="nav-maroon fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex items-center gap-1 rounded-2xl border border-[#f7d27a]/30 p-1.5 lg:hidden"
      >
        {phoneItems.map((it) => {
          const on = active(it.href);
          if (it.href === "/")
            return (
              <Link key="home" href="/" aria-label="Home" className="relative flex w-[3.6rem] flex-col items-center gap-0.5">
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  className={cn("-mt-7 grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#6e122a] bg-gradient-to-b from-gold-light to-gold-bright text-ongold shadow-gold", on && "ring-2 ring-[#f7d27a] ring-offset-2 ring-offset-[#6e122a]")}
                >
                  <Home className="h-6 w-6" />
                </motion.span>
                <span className="text-[10px] font-semibold leading-none tracking-wide text-[#f7d27a]">Home</span>
              </Link>
            );
          return (
            <Link key={it.href} href={it.href} aria-label={it.label} className="relative flex w-[3.6rem] flex-col items-center gap-0.5 py-1">
              {on && <motion.span layoutId="mdock-pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-xl bg-gradient-to-b from-gold-light to-gold-bright shadow-gold" />}
              <motion.span whileTap={{ scale: 0.85 }} className={cn("relative grid h-6 w-6 place-items-center", on ? "text-ongold" : "text-[#f7d27a]")}>
                <it.icon className="h-[19px] w-[19px]" />
              </motion.span>
              <span className={cn("relative text-[10px] font-semibold leading-none tracking-wide", on ? "text-ongold" : "text-[#fbe7b8]/85")}>{it.short}</span>
            </Link>
          );
        })}
      </motion.nav>

      {/* ---------- desktop: magnifying dock ---------- */}
      <AnimatePresence>
        {showDesk && (
          <motion.div
            key="desk"
            initial={{ y: 90, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 90, opacity: 0, x: "-50%" }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed bottom-5 left-1/2 z-40 hidden lg:block"
          >
            <DeskDock items={items} active={active} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type DockItem = { href: string; label: string; icon: typeof Home };
function DeskDock({ items, active }: { items: DockItem[]; active: (h: string) => boolean }) {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div onMouseMove={(e) => mouseX.set(e.pageX)} onMouseLeave={() => mouseX.set(Infinity)} className="nav-maroon flex h-[3.4rem] items-end gap-2 rounded-2xl border border-[#f7d27a]/30 px-3 pb-2.5">
      {items.map((it) => (
        <DeskDockIcon key={it.href} it={it} mouseX={mouseX} on={active(it.href)} />
      ))}
    </motion.div>
  );
}

function DeskDockIcon({ it, mouseX, on }: { it: DockItem; mouseX: MotionValue<number>; on: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const dist = useTransform(mouseX, (v) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return v - b.x - b.width / 2;
  });
  const size = useSpring(useTransform(dist, [-120, 0, 120], [34, 56, 34]), { mass: 0.1, stiffness: 150, damping: 12 });
  const icon = useSpring(useTransform(dist, [-120, 0, 120], [16, 26, 16]), { mass: 0.1, stiffness: 150, damping: 12 });
  return (
    <Link href={it.href} aria-label={it.label}>
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn("relative grid aspect-square place-items-center rounded-full border", on ? "border-[#f7d27a] bg-gradient-to-b from-gold-light to-gold-bright text-ongold" : "border-[#f7d27a]/35 bg-white/[.08] text-[#f7d27a]")}
      >
        <AnimatePresence>
          {hover && (
            <motion.span initial={{ opacity: 0, y: 8, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 2, x: "-50%" }} className="absolute -top-8 left-1/2 whitespace-nowrap rounded-md bg-maroon-2 px-2 py-0.5 text-xs font-semibold text-[#fff4e2] shadow-deep">
              {it.label}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span style={{ width: icon, height: icon }} className="grid place-items-center [&_svg]:h-full [&_svg]:w-full">
          <it.icon />
        </motion.span>
      </motion.div>
    </Link>
  );
}
