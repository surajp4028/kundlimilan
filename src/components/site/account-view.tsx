"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  AtSign, BadgeCheck, Camera, Copy, CreditCard, Download, Eye, FileText, Globe, LayoutGrid, Loader2, LogOut, Monitor, Pencil, Phone, Plus, Receipt,
  ScrollText, ShieldCheck, Smartphone, Sparkles, Trash2, UserRound, Users, X,
} from "lucide-react";
import { useAuth, useSite, type Me } from "@/lib/client/providers";
import { api, errMsg } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { OtpStep } from "@/components/auth/otp-step";
import { useRouter, useSearchParams } from "next/navigation";
import { BirthFields, emptyBirth, validateBirth, type BirthDraft } from "@/components/astro/birth-form";
import { Sheet } from "@/components/astro/wheel";
import { StatusPill } from "@/components/astro/order-status";
import { fmtBirth, inr, type BirthInput } from "@/lib/astro";
import { cn, timeAgo } from "@/lib/utils";

type Sess = { id: number; device: string; location: string | null; ip: string; client: string; created_at: string; last_seen_at: string; current: boolean };
type Section = "overview" | "reports" | "orders" | "payments" | "profiles" | "profile" | "devices" | "privacy";

const NAV: { key: Section; label: string; icon: typeof UserRound }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "reports", label: "My reports", icon: ScrollText },
  { key: "orders", label: "Orders", icon: Receipt },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "profiles", label: "Birth profiles", icon: Users },
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "devices", label: "Devices", icon: Monitor },
  { key: "privacy", label: "Privacy", icon: ShieldCheck },
];

type Report = { ref: string; service: string; title: string; size: number; downloads: number; lastDownloadedAt: string | null; at: string; language: string; url: string };
type Order = { ref: string; service: string; title: string; subject: string | null; amount: number; discount: number; status: string; paymentStatus: string; reportStatus: string; createdAt: string; paidAt: string | null; report: { url: string } | null; invoiceUrl: string | null };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const orderState = (o: Order) => (o.reportStatus === "ready" ? "ready" : o.status === "refunded" ? "refunded" : o.status === "cancelled" ? "cancelled" : o.paymentStatus === "unpaid" ? "awaiting" : o.status === "failed" ? "failed" : "generating");

function useData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    api<T>(url).then((r) => alive && setData(r)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, tick]);
  return [data, () => setTick((t) => t + 1)] as const;
}

export function AccountView() {
  const { user, setUser, logout } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (NAV.some((n) => n.key === sp.get("tab")) ? sp.get("tab") : "overview") as Section;
  const go = (t: Section) => router.replace(`/account?tab=${t}`, { scroll: false });
  const [edit, setEdit] = useState<"email" | "phone" | null>(null);
  const site = useSite();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 sm:pt-8">
      <div className="lux-card overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gold-bright/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 rounded-full bg-gradient-to-b from-gold-light to-gold p-[3px] sm:h-20 sm:w-20">
            <AvatarButton user={user} onChange={setUser} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Namaste</p>
            <h1 className="display truncate text-3xl text-ivory sm:text-4xl">{user.name || "Welcome"}</h1>
            <button
              type="button"
              onClick={() => (navigator.clipboard?.writeText(user.uid), toast.success("Customer ID copied"))}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-white px-2.5 py-0.5 font-mono text-xs text-ivory-2"
            >
              {user.uid} <Copy className="h-3 w-3 text-gold" />
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="hidden items-center gap-2 rounded-full border border-ink/10 px-4 py-2 text-sm text-mist hover:text-ivory sm:flex"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[230px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {NAV.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => go(n.key)}
              className={cn(
                "relative flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition lg:rounded-2xl",
                tab === n.key ? "bg-gradient-to-b from-gold-light to-gold-bright font-semibold text-ongold shadow-gold" : "border border-ink/[.08] bg-white text-ivory-2 hover:border-gold/40 lg:border-transparent lg:bg-transparent",
              )}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
        </nav>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="min-w-0 space-y-5">
            {tab === "overview" && <Overview go={go} />}
            {tab === "reports" && <Reports />}
            {tab === "orders" && <Orders />}
            {tab === "payments" && <Payments />}
            {tab === "profiles" && <Profiles />}
            {tab === "profile" && (
              <>
                <ProfileForm user={user} onSaved={setUser} />
                <Panel title="Contact details" sub="Used for login codes and report emails.">
                  <div className="grid gap-3 md:grid-cols-2">
                    <ContactCard icon={<AtSign className="h-5 w-5" />} label="Email" value={user.email} verified={user.emailVerified} onEdit={() => setEdit("email")} />
                    <ContactCard icon={<Phone className="h-5 w-5" />} label="Mobile" value={user.phone} verified={user.phoneVerified} onEdit={() => setEdit("phone")} />
                  </div>
                </Panel>
              </>
            )}
            {tab === "devices" && <Devices />}
            {tab === "privacy" && <Privacy supportEmail={site.support_email} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {edit && <ChangeContact channel={edit} current={edit === "email" ? user.email : user.phone} onClose={() => setEdit(null)} onDone={(u) => (setUser(u), setEdit(null))} />}
      </AnimatePresence>
    </div>
  );
}

function Panel({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="lux-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
        <div>
          <h2 className="font-display text-2xl text-ivory">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-mist">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ icon: Icon, title, text, cta }: { icon: typeof FileText; title: string; text: string; cta?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-gold/30 bg-gold-bright/[.05] px-6 py-10 text-center">
      <Icon className="mx-auto h-9 w-9 text-gold" />
      <p className="mt-3 font-display text-2xl text-ivory">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-mist">{text}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

const Skeleton = () => <div className="h-20 animate-pulse rounded-2xl bg-ink/[.04]" />;

function Overview({ go }: { go: (t: Section) => void }) {
  const [r] = useData<{ reports: Report[] }>("/api/reports");
  const [o] = useData<{ orders: Order[] }>("/api/orders");
  const paid = (o?.orders || []).filter((x) => x.paymentStatus !== "unpaid");
  const spent = paid.filter((x) => x.paymentStatus === "paid").reduce((a, x) => a + x.amount, 0);
  const pending = (o?.orders || []).filter((x) => orderState(x) === "generating");
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Reports", v: r ? r.reports.length : "–", i: ScrollText, t: "reports" as const },
          { l: "Orders", v: o ? paid.length : "–", i: Receipt, t: "orders" as const },
          { l: "Spent", v: o ? inr(spent) : "–", i: CreditCard, t: "payments" as const },
        ].map((x) => (
          <button key={x.l} type="button" onClick={() => go(x.t)} className="lux-card p-4 text-left transition hover:-translate-y-0.5">
            <x.i className="h-5 w-5 text-gold" />
            <div className="mt-3 font-display text-2xl text-ivory sm:text-3xl">{x.v}</div>
            <div className="text-xs text-mist">{x.l}</div>
          </button>
        ))}
      </div>
      {pending.length > 0 && (
        <Panel title="Being prepared" sub="These reports are being generated right now.">
          <div className="space-y-2">
            {pending.map((x) => (
              <Link key={x.ref} href={`/orders/${x.ref}`} className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold-bright/[.06] p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
                <span className="flex-1 text-sm text-ivory">{x.title} · {x.subject}</span>
                <span className="text-xs text-gold">View →</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
      <Panel title="Latest reports" action={<button onClick={() => go("reports")} className="text-xs font-semibold text-gold">View all →</button>}>
        {!r ? <Skeleton /> : r.reports.length === 0 ? (
          <Empty icon={Sparkles} title="No reports yet" text="Your purchased reports will appear here, ready to download any time." cta={<Link href="/reports" className="btn-gold">Explore reports</Link>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{r.reports.slice(0, 4).map((x) => <ReportCard key={x.ref} r={x} />)}</div>
        )}
      </Panel>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/kundli", t: "Free Kundli", d: "Charts, planets & dasha", i: Sparkles },
          { href: "/matching", t: "Kundli Milan", d: "36-guna compatibility", i: Users },
          { href: "/reports", t: "All reports", d: "Detailed PDF reports", i: FileText },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="lux-card group flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-bright/15 text-gold"><x.i className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block font-display text-xl text-ivory">{x.t}</span><span className="block text-xs text-mist">{x.d}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}

function ReportCard({ r }: { r: Report }) {
  return (
    <div className="flex flex-col rounded-2xl border border-ink/[.08] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-10 shrink-0 place-items-center rounded-lg border border-gold/30 bg-gradient-to-b from-gold-light/60 to-white text-[10px] font-bold text-gold">PDF</span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-display text-lg leading-tight text-ivory">{r.title}</div>
          <div className="mt-1 text-[11px] text-mist">{fmtDate(r.at)} · {(r.size / 1048576).toFixed(1)} MB · {r.language === "hi" ? "हिन्दी" : "English"}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={r.url} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-gold-light to-gold-bright py-2 text-sm font-semibold text-ongold"><Download className="h-4 w-4" /> Download</a>
        <a href={`${r.url}?view=1`} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/10 py-2 text-sm text-ivory-2"><Eye className="h-4 w-4" /> View</a>
      </div>
      <div className="mt-2 text-center text-[10px] text-dim">Order {r.ref}{r.downloads ? ` · downloaded ${r.downloads}×` : ""}</div>
    </div>
  );
}

function Reports() {
  const [r] = useData<{ reports: Report[] }>("/api/reports");
  return (
    <Panel title="My reports" sub="Every report you've purchased — stored privately, download any time.">
      {!r ? <Skeleton /> : r.reports.length === 0 ? (
        <Empty icon={ScrollText} title="No reports yet" text="Order your first report — it will be saved here forever." cta={<Link href="/reports" className="btn-gold">Browse reports</Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{r.reports.map((x) => <ReportCard key={x.ref} r={x} />)}</div>
      )}
    </Panel>
  );
}

function Orders() {
  const [o] = useData<{ orders: Order[] }>("/api/orders");
  return (
    <Panel title="Orders" sub="All your orders with status, receipt and report.">
      {!o ? <Skeleton /> : o.orders.length === 0 ? (
        <Empty icon={Receipt} title="No orders yet" text="When you order a report, it shows up here." />
      ) : (
        <div className="space-y-2">
          {o.orders.map((x) => (
            <Link key={x.ref} href={`/orders/${x.ref}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/[.08] bg-white p-4 transition hover:border-gold/40">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg text-ivory">{x.title}</div>
                <div className="truncate text-xs text-mist">{x.subject} · {fmtDate(x.createdAt)} · <span className="font-mono">{x.ref}</span></div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-gold-2">{inr(x.amount)}</div>
                <StatusPill s={orderState(x)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

type Attempt = { id: number; orderRef: string; paymentId: string | null; status: string; method: string | null; amount: number | null; error: string | null; verified: boolean; at: string; title: string | null };
function Payments() {
  const [d] = useData<{ attempts: Attempt[]; refunds: { orderRef: string; refundId: string | null; amount: number; status: string; at: string }[] }>("/api/account/transactions");
  return (
    <>
      <Panel title="Payments" sub="Every payment attempt — successful or not.">
        {!d ? <Skeleton /> : d.attempts.length === 0 ? (
          <Empty icon={CreditCard} title="No payments yet" text="Your payment history will appear here." />
        ) : (
          <div className="space-y-2">
            {d.attempts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/[.08] bg-white p-4">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", a.status === "captured" ? "bg-emerald/15 text-emerald" : a.status === "failed" ? "bg-rose/15 text-rose" : "bg-ink/5 text-mist")}><CreditCard className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ivory">{a.title || "Report"} <span className="font-mono text-xs font-normal text-mist">· {a.orderRef}</span></div>
                  <div className="truncate text-xs text-mist">{new Date(a.at).toLocaleString("en-IN")} · {a.method?.toUpperCase() || "—"} · {a.paymentId}{a.error ? ` · ${a.error}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-ivory">{a.amount != null ? `₹${a.amount}` : "—"}</div>
                  <div className={cn("text-[11px] font-semibold capitalize", a.status === "captured" ? "text-emerald" : a.status === "failed" ? "text-rose" : "text-mist")}>{a.status === "captured" ? "successful" : a.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      {d && d.refunds.length > 0 && (
        <Panel title="Refunds">
          <div className="space-y-2">
            {d.refunds.map((r) => (
              <div key={(r.refundId || "") + r.at} className="flex items-center justify-between rounded-2xl border border-ink/[.08] bg-white p-4 text-sm">
                <span className="text-ivory">{r.orderRef} <span className="text-xs text-mist">· {new Date(r.at).toLocaleDateString("en-IN")}</span></span>
                <span className="text-ivory">₹{r.amount} · <span className={r.status === "processed" ? "text-emerald" : "text-gold"}>{r.status}</span></span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

type SavedProfile = BirthInput & { id: number; label: string };
function Profiles() {
  const [d, reload] = useData<{ profiles: SavedProfile[]; max: number }>("/api/account/profiles");
  const [editing, setEditing] = useState<{ id?: number; label: string; b: BirthDraft } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!editing) return;
    const v = validateBirth(editing.b);
    if (!v.ok) return toast.error(v.message);
    if (!editing.label.trim()) return toast.error("Give this profile a label, e.g. Me, Wife, Son");
    setBusy(true);
    try {
      await api(editing.id ? `/api/account/profiles/${editing.id}` : "/api/account/profiles", { method: editing.id ? "PUT" : "POST", body: { ...v.value, label: editing.label.trim() } });
      toast.success("Profile saved");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Birth profiles"
      sub="Save family members' birth details once — pick them in one tap on any form."
      action={<Button size="sm" onClick={() => setEditing({ label: "", b: emptyBirth() })}><Plus className="h-4 w-4" /> Add</Button>}
    >
      {!d ? <Skeleton /> : d.profiles.length === 0 ? (
        <Empty icon={Users} title="No saved profiles" text="Add yourself and your family to fill forms instantly." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {d.profiles.map((p) => (
            <div key={p.id} className="rounded-2xl border border-ink/[.08] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-gold-bright/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{p.label}</span>
                  <div className="mt-2 font-display text-xl text-ivory">{p.name}</div>
                  <div className="text-xs text-mist">{fmtBirth(p)}</div>
                </div>
                <div className="flex gap-1">
                  <button aria-label="Edit" onClick={() => setEditing({ id: p.id, label: p.label, b: { name: p.name, gender: p.gender, date: p.date, time: p.time, place: p.place } })} className="rounded-lg p-2 text-mist hover:text-gold"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={async () => { if (!confirm(`Delete ${p.label}?`)) return; await api(`/api/account/profiles/${p.id}`, { method: "DELETE" }).catch((e) => toast.error(errMsg(e))); reload(); }} className="rounded-lg p-2 text-mist hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit profile" : "New birth profile"} footer={<Button className="w-full" size="lg" loading={busy} onClick={save}>Save profile</Button>}>
        {editing && (
          <div className="no-scrollbar max-h-[60vh] space-y-4 overflow-y-auto px-2 pb-2">
            <div>
              <label className="label" htmlFor="pf-label">Label</label>
              <input id="pf-label" className="field" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value.slice(0, 24) })} placeholder="Me, Wife, Son…" />
            </div>
            <BirthFields idPrefix="pf" value={editing.b} onChange={(b) => setEditing({ ...editing, b })} saveable={false} />
          </div>
        )}
      </Sheet>
    </Panel>
  );
}

/** Uploads a profile photo (jpg/png/webp ≤ 2 MB) → stored privately in S3 under the SKYO ID folder. */
async function uploadAvatar(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Photo must be 2 MB or smaller.");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/account/avatar", { method: "POST", body: fd, headers: { "X-Requested-With": "km" }, credentials: "same-origin" });
  const j = (await res.json().catch(() => ({}))) as { avatar?: string; error?: { message?: string } };
  if (!res.ok || !j.avatar) throw new Error(j.error?.message || "Upload failed. Please try again.");
  return j.avatar;
}

function useAvatarUpload(user: Me, onChange: (u: Me) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = () => input.current?.click();
  const el = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true);
        try {
          const avatar = await uploadAvatar(f);
          onChange({ ...user, avatar });
          toast.success("Profile photo updated");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
  const remove = async () => {
    setBusy(true);
    try {
      await api("/api/account/avatar", { method: "DELETE" });
      onChange({ ...user, avatar: null });
      toast.success("Profile photo removed");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return { pick, remove, busy, el };
}

function AvatarImg({ user, className }: { user: Me; className?: string }) {
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} alt="Profile photo" className={cn("rounded-full object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-bright font-semibold text-ongold", className)}>{(user.name || "T")[0].toUpperCase()}</div>
  );
}

function AvatarButton({ user, onChange }: { user: Me; onChange: (u: Me) => void }) {
  const up = useAvatarUpload(user, onChange);
  return (
    <>
      {up.el}
      <button onClick={up.pick} title="Change profile photo" className="group absolute inset-[7px] overflow-hidden rounded-full">
        <AvatarImg user={user} className="h-full w-full text-2xl" />
        <span className={cn("absolute inset-0 flex items-center justify-center bg-black/45 transition", up.busy ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          {up.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </button>
    </>
  );
}

function ProfileForm({ user, onSaved }: { user: Me; onSaved: (u: Me) => void }) {
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const up = useAvatarUpload(user, onSaved);
  return (
    <Panel title="Profile" sub="This name appears on your receipts and emails.">
      {up.el}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-surface p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
        <AvatarImg user={user} className="h-14 w-14 shrink-0 text-xl sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Profile photo</div>
          <div className="text-xs leading-relaxed text-muted">JPG, PNG or WebP · up to 2 MB · stored privately</div>
        </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button type="button" variant="outline" loading={up.busy} onClick={up.pick}><Camera className="h-4 w-4" /> {user.avatar ? "Change" : "Upload"}</Button>
          {user.avatar && <Button type="button" variant="outline" disabled={up.busy} onClick={up.remove}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>
      <form
        className="max-w-md space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            const r = await api<{ user: Me }>("/api/account/profile", { method: "PATCH", body: { name } });
            onSaved(r.user);
            toast.success("Profile updated");
          } catch (e) {
            toast.error(errMsg(e));
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" icon={<UserRound className="h-4 w-4" />} />
        <Button type="submit" loading={saving} disabled={name.trim().length < 2 || name === user.name}>Save changes</Button>
      </form>
    </Panel>
  );
}

function ContactCard({ icon, label, value, verified, onEdit }: { icon: ReactNode; label: string; value: string | null; verified: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">{label} {value && verified && <BadgeCheck className="h-3.5 w-3.5 text-mint" />}</div>
        <div className="truncate font-bold text-ink">{value || "Not added"}</div>
      </div>
      <button onClick={onEdit} className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-brand hover:bg-brand-soft"><Pencil className="h-3.5 w-3.5" /> {value ? "Change" : "Add"}</button>
    </div>
  );
}

function Devices() {
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<{ sessions: Sess[] }>("/api/account/sessions").then((r) => alive && setSessions(r.sessions)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);
  return (
    <Panel
      title="Devices & security"
      sub="Devices where you're signed in. Log out any you don't recognise."
      action={sessions && sessions.length > 1 ? <Button variant="danger" size="sm" onClick={async () => (await api("/api/account/sessions", { body: { all: true } }), toast.success("Logged out from all other devices"), reload())}>Log out all others</Button> : undefined}
    >
      <div className="space-y-2">
        {(sessions || []).map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={cn("flex flex-wrap items-center gap-4 rounded-2xl border p-4", s.current ? "border-mint/40 bg-mint/5" : "border-line")}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface">{s.device.startsWith("Mobile") ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-bold">{s.device}{s.current && <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">THIS DEVICE</span>}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Globe className="h-3 w-3" /> {s.location || "Unknown location"} · {s.ip} · active {timeAgo(s.last_seen_at)}</div>
            </div>
            {!s.current && <button onClick={async () => (await api("/api/account/sessions", { body: { id: s.id } }), reload())} className="rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Log out</button>}
          </motion.div>
        ))}
        {!sessions && <div className="h-16 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef0f6_0%,#f8f9fc_40%,#eef0f6_80%)] bg-[length:200%_100%]" />}
      </div>
    </Panel>
  );
}

function Privacy({ supportEmail }: { supportEmail: string }) {
  return (
    <Panel title="Privacy & data" sub="Your rights under India's DPDP Act, 2023.">
      <div className="grid gap-3 md:grid-cols-2">
        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent("Data access request")}`} className="rounded-2xl border border-line p-5 transition hover:border-brand">
          <Download className="h-5 w-5 text-brand" />
          <div className="mt-3 font-bold">Request a copy of my data</div>
          <div className="text-sm text-muted">We&apos;ll email it within 30 days.</div>
        </a>
        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent("Account deletion request")}`} className="rounded-2xl border border-line p-5 transition hover:border-red-300">
          <Trash2 className="h-5 w-5 text-red-500" />
          <div className="mt-3 font-bold">Delete my account</div>
          <div className="text-sm text-muted">Order and payment records we must keep by law are retained.</div>
        </a>
      </div>
      <p className="mt-4 text-xs text-muted">Your email, mobile and login details are encrypted at rest. Read our <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.</p>
    </Panel>
  );
}

/** Add / change email or mobile: OTP to the new value; server rejects values used by another account. */
function ChangeContact({ channel, current, onClose, onDone }: { channel: "email" | "phone"; current: string | null; onClose: () => void; onDone: (u: Me) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ challengeId: string; sentTo: string; resendIn: number } | null>(null);
  const isEmail = channel === "email";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const send = async () => {
    const r = await api<{ challengeId: string; sentTo: string; resendIn: number }>("/api/account/contact/send", { body: { channel, value } });
    setChallenge(r);
    return r.resendIn;
  };
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-deep sm:rounded-3xl"
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-muted hover:bg-surface" aria-label="Close"><X className="h-5 w-5" /></button>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{isEmail ? <AtSign className="h-6 w-6" /> : <Phone className="h-6 w-6" />}</div>
        <h3 className="font-display text-3xl">{current ? `Change ${isEmail ? "email" : "mobile number"}` : `Add ${isEmail ? "email" : "mobile number"}`}</h3>
        <p className="mt-1 text-sm text-muted">{current ? <>Current: <b className="text-ink">{current}</b>. </> : null}We&apos;ll send a code to the new {isEmail ? "email" : "number"} to confirm it&apos;s yours.</p>
        <div className="mt-6">
          {!challenge ? (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setErr(null);
                try {
                  await send();
                } catch (e) {
                  setErr(errMsg(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {isEmail ? (
                <Field label="New email" name="new-email" type="email" autoFocus autoComplete="email" icon={<AtSign className="h-4 w-4" />} value={value} onChange={(e) => setValue(e.target.value.slice(0, 190))} error={err || undefined} />
              ) : (
                <Field label="New mobile number" name="new-phone" type="tel" inputMode="numeric" autoFocus prefix="+91" icon={<Phone className="h-4 w-4" />} value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 10))} error={err || undefined} />
              )}
              <Button type="submit" className="w-full" size="lg" loading={busy} disabled={isEmail ? !value.includes("@") : value.length !== 10}>Send OTP</Button>
            </form>
          ) : (
            <OtpStep
              sentTo={challenge.sentTo}
              resendIn={challenge.resendIn}
              onBack={() => setChallenge(null)}
              onResend={send}
              cta={`Verify & update ${isEmail ? "email" : "mobile"}`}
              onVerify={async (code) => {
                try {
                  const r = await api<{ user: Me }>("/api/account/contact/verify", { body: { challengeId: challenge.challengeId, code } });
                  toast.success(`${isEmail ? "Email" : "Mobile number"} updated`);
                  onDone(r.user);
                } catch (e) {
                  throw new Error(errMsg(e));
                }
              }}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
