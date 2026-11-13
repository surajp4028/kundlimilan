"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, BarChart3, ChevronRight, CreditCard, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Package,
  ScrollText, Settings, ShieldCheck, ShoppingBag, TicketPercent, UserCog, UserRound, Users, X,
} from "lucide-react";
import { LogoMark } from "@/components/site/logo";
import { useSite } from "@/lib/client/providers";
import { api } from "@/lib/client/api";
import { AdminProvider, useAdmin } from "./admin-context";
import type { AdminIdentity, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Users; perm?: Permission | "staff.manage" | "settings.manage" };
const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" }] },
  {
    section: "Business",
    items: [
      { href: "/admin/orders", label: "Orders & reports", icon: ShoppingBag, perm: "orders.view" },
      { href: "/admin/services", label: "Report catalogue", icon: Package, perm: "services.manage" },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, perm: "coupons.manage" },
      { href: "/admin/transactions", label: "Transactions", icon: CreditCard, perm: "payments.view" },
      { href: "/admin/api", label: "AstrologyAPI usage", icon: BarChart3, perm: "api.view" },
    ],
  },
  {
    section: "Customers",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, perm: "users.view" },
      { href: "/admin/messages", label: "Messages", icon: Inbox, perm: "messages.view" },
      { href: "/admin/sessions", label: "Session logs", icon: Activity, perm: "sessions.view" },
      { href: "/admin/audit", label: "Audit trail", icon: ScrollText, perm: "audit.view" },
    ],
  },
  {
    section: "Workspace",
    items: [
      { href: "/admin/staff", label: "Staff & access", icon: UserCog, perm: "staff.manage" },
      { href: "/admin/settings", label: "Settings & branding", icon: Settings, perm: "settings.manage" },
      { href: "/admin/profile", label: "My profile", icon: UserRound },
    ],
  },
];
const ALL = NAV.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));

export function AdminShell({ admin, children }: { admin: AdminIdentity; children: ReactNode }) {
  return (
    <AdminProvider value={admin}>
      <ShellInner>{children}</ShellInner>
    </AdminProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const path = usePathname();
  const site = useSite();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(false), [path]);
  const current = [...ALL].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === "/admin" ? path === "/admin" : path.startsWith(i.href)));
  const crumbs = path.startsWith("/admin/users/") ? ["Customers", "Users", "Profile"] : current ? [current.section, current.label] : ["Console"];

  return (
    <div className="admin-surface flex h-[100dvh] overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} path={path} admin={admin} />
      </div>
      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-50 flex lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setMobile(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="relative h-full">
              <Sidebar collapsed={false} onToggle={() => setMobile(false)} path={path} admin={admin} onNavigate={() => setMobile(false)} mobile />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/85 px-3 backdrop-blur-xl md:h-16 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMobile(true)} className="rounded-xl p-2 text-ink/70 hover:bg-paper lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin" className="flex items-center gap-2 lg:hidden">
              <LogoMark className="h-8 w-8" />
              <span className="font-caps text-sm font-semibold tracking-[.18em] text-gold-3">{site.site_name}</span>
            </Link>
            <nav className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
              {crumbs.map((c, i) => (
                <span key={c + i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink/25" />}
                  <span className={cn("truncate", i === crumbs.length - 1 ? "font-bold text-ink" : "font-medium text-muted")}>{c}</span>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Secure session
            </span>
            <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink/70 hover:border-ink/30 sm:flex">
              View site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link href="/admin/profile" title="My profile" className="rounded-xl ring-gold/50 transition hover:ring-2">
              <AgentAvatar name={admin.name} src={admin.avatar} />
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-[1400px] px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 md:px-8 md:py-8">
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function AgentAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" className={cn("h-9 w-9 shrink-0 rounded-xl object-cover", className)} />;
  return <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-light via-gold-bright to-gold text-xs font-extrabold text-ink", className)}>{initials(name)}</div>;
}

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Sidebar({ collapsed, onToggle, path, admin, onNavigate, mobile }: { collapsed: boolean; onToggle: () => void; path: string; admin: ReturnType<typeof useAdmin>; onNavigate?: () => void; mobile?: boolean }) {
  const site = useSite();
  const nav = NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || admin.can(i.perm)) })).filter((s) => s.items.length);
  return (
    <motion.aside animate={{ width: collapsed ? 84 : 272 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} className="relative flex h-full flex-col overflow-clip border-r border-line bg-white text-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

      <div className={cn("relative flex h-20 shrink-0 items-center gap-3 px-5", collapsed && "flex-col justify-center gap-1.5 px-0 pt-3")}>
        <Link href="/admin" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <LogoMark className="h-11 w-11 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="gold-text truncate font-caps text-lg font-semibold tracking-[.2em]">{site.site_name}</div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-muted">Admin console</div>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn("rounded-lg p-1.5 text-ink/50 transition hover:bg-paper hover:text-ink", !collapsed && "ml-auto")}
          aria-label={mobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {mobile ? <X className="h-5 w-5" /> : collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>
      <div className="relative mx-5 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <nav className="no-scrollbar relative flex-1 space-y-6 overflow-y-auto overflow-x-clip px-3 py-5">
        {nav.map((s) => (
          <div key={s.section}>
            {!collapsed ? <div className="mb-2 px-3 font-caps text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-3/80">{s.section}</div> : <div className="mx-auto mb-2 h-px w-8 bg-line" />}
            <div className="space-y-1">
              {s.items.map((i) => {
                const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={onNavigate}
                    title={collapsed ? i.label : undefined}
                    className={cn("group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", collapsed && "justify-center px-0", active ? "text-ink" : "text-ink/55 hover:bg-paper hover:text-ink")}
                  >
                    {active && <motion.span layoutId={mobile ? "admin-nav-m" : "admin-nav"} className="absolute inset-0 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/20 via-gold/[.08] to-transparent" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                    {active && <motion.span layoutId={mobile ? "admin-bar-m" : "admin-bar"} className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-gradient-to-b from-gold-bright to-gold" />}
                    <i.icon className={cn("relative h-[18px] w-[18px] shrink-0 transition group-hover:scale-110", active && "text-gold-3")} />
                    {!collapsed && <span className="relative truncate">{i.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative shrink-0 border-t border-line p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <div className={cn("flex items-center gap-3 rounded-2xl bg-paper p-2.5 ring-1 ring-line", collapsed && "flex-col gap-2 p-2")}>
          <Link href="/admin/profile" onClick={onNavigate} title="My profile" className={cn("flex min-w-0 items-center gap-3", collapsed ? "flex-col" : "flex-1")}>
            <AgentAvatar name={admin.name} src={admin.avatar} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{admin.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <ShieldCheck className="h-3 w-3 text-gold-3" /> {admin.role === "admin" ? "Administrator" : "Staff"}
                </div>
              </div>
            )}
          </Link>
          <button
            title="Log out"
            onClick={async () => {
              await api("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
              window.location.replace("/login?as=agent");
            }}
            className="rounded-lg p-2 text-ink/50 hover:bg-red-50 hover:text-red-600"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
