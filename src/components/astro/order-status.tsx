"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Download, Eye, FileText, Hourglass, Loader2, Receipt, RefreshCcw, XCircle } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSite } from "@/lib/client/providers";
import { inr } from "@/lib/astro";
import { ZodiacWheel } from "./zodiac-wheel";
import { cn } from "@/lib/utils";

export type PublicOrder = {
  ref: string; service: string; title: string; subject: string | null; language: string; price: number; discount: number; amount: number; coupon: string | null;
  status: string; paymentStatus: string; reportStatus: string; method: string | null; paymentId: string | null; paidAt: string | null; completedAt: string | null; createdAt: string;
  report: { size: number; downloads: number; at: string; url: string } | null; invoiceUrl: string | null;
};

export function OrderStatus({ initial }: { initial: PublicOrder }) {
  const [o, setO] = useState(initial);
  const site = useSite();
  const live = o.reportStatus !== "ready" && o.status !== "refunded" && o.status !== "cancelled" && !(o.status === "failed" && o.reportStatus === "failed");
  useEffect(() => {
    if (!live) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      try {
        const r = await api<{ order: PublicOrder }>(`/api/orders/${o.ref}`);
        setO(r.order);
      } catch {}
      if (n > 200) clearInterval(t);
    }, o.paymentStatus === "paid" ? 3000 : 5000);
    return () => clearInterval(t);
  }, [live, o.ref, o.paymentStatus]);

  const state =
    o.reportStatus === "ready" ? "ready"
    : o.status === "refunded" ? "refunded"
    : o.status === "cancelled" ? "cancelled"
    : o.paymentStatus === "unpaid" ? "awaiting"
    : o.status === "failed" ? "failed"
    : "generating";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-12">
      <div className="lux-card overflow-hidden p-6 text-center sm:p-10">
        {state === "generating" && (
          <>
            <div className="mx-auto w-48"><ZodiacWheel /></div>
            <p className="eyebrow mt-4">Preparing your report</p>
            <h1 className="display mt-3 text-4xl text-ivory">The stars are being <em className="gold-text gold-shine">aligned</em></h1>
            <p className="mt-3 text-sm text-mist">Payment received. Your {o.title} is being prepared — this usually takes a few minutes. You can safely leave this page; we'll email it to you too.</p>
            <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-ink/10">
              <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-gold via-gold-bright to-gold" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }} />
            </div>
          </>
        )}
        {state === "ready" && (
          <>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-gold-light to-gold-bright text-ongold shadow-gold">
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>
            <p className="eyebrow mt-6">Your report is ready</p>
            <h1 className="display mt-3 text-4xl text-ivory">{o.title}</h1>
            {o.subject && <p className="mt-1 font-display text-xl text-gold-2">{o.subject}</p>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href={o.report!.url} className="btn-gold"><Download className="h-4 w-4" /> Download PDF</a>
              <a href={`${o.report!.url}?view=1`} target="_blank" rel="noopener" className="btn-ghost"><Eye className="h-4 w-4" /> Open in browser</a>
            </div>
            <p className="mt-4 text-xs text-mist">{(o.report!.size / 1024 / 1024).toFixed(1)} MB · always available under <Link href="/account?tab=reports" className="text-gold underline underline-offset-2">My Reports</Link></p>
          </>
        )}
        {state === "awaiting" && (
          <>
            <Hourglass className="mx-auto h-12 w-12 text-gold" />
            <h1 className="display mt-4 text-4xl text-ivory">Awaiting payment</h1>
            <p className="mt-3 text-sm text-mist">We haven't received the payment for this order yet. If money was debited, it will be confirmed automatically within a few minutes.</p>
            <Link href={`/reports/${o.service}`} className="btn-gold mt-6"><RefreshCcw className="h-4 w-4" /> Start again</Link>
          </>
        )}
        {state === "failed" && (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber" />
            <h1 className="display mt-4 text-4xl text-ivory">We hit a snag</h1>
            <p className="mt-3 text-sm text-mist">Your payment is safe. We couldn't prepare the report automatically — our team has been alerted and a full refund is started if it can't be completed. Need help? Write to <a className="text-gold" href={`mailto:${site.support_email}`}>{site.support_email}</a> with order <b>{o.ref}</b>.</p>
          </>
        )}
        {(state === "refunded" || state === "cancelled") && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-mist" />
            <h1 className="display mt-4 text-4xl text-ivory">{state === "refunded" ? "Refunded" : "Order cancelled"}</h1>
            <p className="mt-3 text-sm text-mist">{state === "refunded" ? "The amount has been refunded to your original payment method (5–7 working days)." : "This order expired before payment."}</p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-3xl border border-ink/[.08] bg-ink/[.025] p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-mist"><FileText className="h-4 w-4 text-gold" /> Order</span>
          <span className="font-mono text-ivory">{o.ref}</span>
        </div>
        <div className="hairline my-4" />
        <dl className="space-y-2.5">
          <Line k="Report" v={o.title} />
          {o.subject && <Line k="For" v={o.subject} />}
          <Line k="Language" v={o.language === "hi" ? "हिन्दी" : "English"} />
          {o.discount > 0 && <Line k={`Coupon ${o.coupon || ""}`} v={`− ${inr(o.discount)}`} />}
          <Line k="Amount" v={inr(o.amount)} strong />
          <Line k="Payment" v={o.paymentStatus === "paid" ? `Paid${o.method ? ` · ${o.method.toUpperCase()}` : ""}` : o.paymentStatus} />
          <Line k="Status" v={<StatusPill s={state} />} />
        </dl>
        {o.invoiceUrl && (
          <a href={o.invoiceUrl} className="mt-5 inline-flex items-center gap-2 text-sm text-gold hover:underline"><Receipt className="h-4 w-4" /> Download receipt</a>
        )}
      </div>
      {live && <p className="mt-4 flex items-center justify-center gap-2 text-xs text-mist"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating automatically</p>}
    </div>
  );
}

function Line({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-mist">{k}</dt>
      <dd className={cn("text-right text-ivory", strong && "font-display text-xl text-gold-2")}>{v}</dd>
    </div>
  );
}

export function StatusPill({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    ready: ["Report ready", "bg-emerald/15 text-emerald"],
    completed: ["Report ready", "bg-emerald/15 text-emerald"],
    generating: ["Preparing", "bg-gold/15 text-gold"],
    paid: ["Preparing", "bg-gold/15 text-gold"],
    awaiting: ["Awaiting payment", "bg-ink/10 text-mist"],
    pending: ["Awaiting payment", "bg-ink/10 text-mist"],
    failed: ["Needs attention", "bg-amber/15 text-amber"],
    refunded: ["Refunded", "bg-sky/15 text-sky"],
    cancelled: ["Cancelled", "bg-ink/10 text-dim"],
  };
  const [t, c] = map[s] || [s, "bg-ink/10 text-mist"];
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", c)}>{t}</span>;
}
