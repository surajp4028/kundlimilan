"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Loader2, MapPin, Search, Sunrise, Sunset, Moon, Sun } from "lucide-react";
import { Sheet, WheelColumn, WheelFrame, useToggle } from "./wheel";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MONTH_NUMS = Array.from({ length: 12 }, (_, i) => i + 1);
const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function fmtDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const [y, m, d] = v.split("-").map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}
export function fmtTime(v: string) {
  if (!/^\d{2}:\d{2}$/.test(v)) return "";
  const [h, mi] = v.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(mi)} ${h < 12 ? "AM" : "PM"}`;
}

function Trigger({ icon: Icon, value, placeholder, onClick, invalid, id }: { icon: typeof CalendarDays; value: string; placeholder: string; onClick: () => void; invalid?: boolean; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-invalid={invalid || undefined}
      className={cn("field flex items-center gap-3 text-left", !value && "text-dim")}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-gold" />
      <span className={cn("flex-1 truncate", value && "font-medium text-ivory")}>{value || placeholder}</span>
    </button>
  );
}

/** Date of birth — day / month / year wheels in a sheet. Value: "YYYY-MM-DD". */
export function DateWheel({ value, onChange, id, invalid, label = "Date of birth", minYear = 1900, maxYear = new Date().getFullYear() }: { value: string; onChange: (v: string) => void; id?: string; invalid?: boolean; label?: string; minYear?: number; maxYear?: number }) {
  const [open, show, hide] = useToggle();
  const init = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").map(Number) as [number, number, number];
    return [1995, 1, 1] as [number, number, number];
  };
  const [[y, m, d], set] = useState(init);
  useEffect(() => {
    if (open) set(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i), [minYear, maxYear]);
  const days = useMemo(() => Array.from({ length: daysIn(y, m) }, (_, i) => i + 1), [y, m]);
  const dd = Math.min(d, days.length);
  return (
    <>
      <Trigger id={id} icon={CalendarDays} value={fmtDate(value)} placeholder="Select date" onClick={show} invalid={invalid} />
      <Sheet
        open={open}
        onClose={hide}
        title={label}
        footer={
          <button type="button" className="btn-gold w-full" onClick={() => (onChange(`${y}-${pad(m)}-${pad(dd)}`), hide())}>
            Confirm · {dd} {MONTHS[m - 1]} {y}
          </button>
        }
      >
        <WheelFrame>
          <WheelColumn label="Day" items={days} value={dd} onChange={(v) => set(([yy, mm]) => [yy, mm, v])} render={(v) => pad(v)} className="max-w-[26%]" />
          <WheelColumn label="Month" items={MONTH_NUMS} value={m} onChange={(v) => set(([yy, , d0]) => [yy, v, Math.min(d0, daysIn(yy, v))])} render={(v) => MONTHS_LONG[v - 1]} />
          <WheelColumn label="Year" items={years} value={y} onChange={(v) => set(([, mm, d0]) => [v, mm, Math.min(d0, daysIn(v, mm))])} className="max-w-[30%]" />
        </WheelFrame>
      </Sheet>
    </>
  );
}

/** Time of birth — hour / minute / AM-PM wheels with a sky preview. Value: "HH:MM" (24 h). */
export function TimeWheel({ value, onChange, id, invalid, label = "Time of birth" }: { value: string; onChange: (v: string) => void; id?: string; invalid?: boolean; label?: string }) {
  const [open, show, hide] = useToggle();
  const init = () => {
    if (/^\d{2}:\d{2}$/.test(value)) {
      const [h, mi] = value.split(":").map(Number);
      return { h12: ((h + 11) % 12) + 1, mi, pm: h >= 12 };
    }
    return { h12: 6, mi: 0, pm: false };
  };
  const [t, setT] = useState(init);
  useEffect(() => {
    if (open) setT(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const h24 = (t.h12 % 12) + (t.pm ? 12 : 0);
  const phase = h24 < 5 ? { icon: Moon, t: "Night" } : h24 < 8 ? { icon: Sunrise, t: "Dawn" } : h24 < 17 ? { icon: Sun, t: "Day" } : h24 < 20 ? { icon: Sunset, t: "Dusk" } : { icon: Moon, t: "Night" };
  return (
    <>
      <Trigger id={id} icon={Clock3} value={fmtTime(value)} placeholder="Select time" onClick={show} invalid={invalid} />
      <Sheet
        open={open}
        onClose={hide}
        title={label}
        footer={
          <>
            <button type="button" className="btn-gold w-full" onClick={() => (onChange(`${pad(h24)}:${pad(t.mi)}`), hide())}>
              Confirm · {t.h12}:{pad(t.mi)} {t.pm ? "PM" : "AM"}
            </button>
            <p className="mt-3 text-center text-xs text-mist">Exact time matters — even a few minutes can change the Lagna.</p>
          </>
        }
      >
        <div className="mb-3 flex items-center justify-center gap-2 text-sm text-mist">
          <phase.icon className="h-4 w-4 text-gold" /> {phase.t}
        </div>
        <WheelFrame>
          <WheelColumn label="Hour" items={MONTH_NUMS} value={t.h12} onChange={(v) => setT((s) => ({ ...s, h12: v }))} render={(v) => pad(v)} />
          <div className="flex items-center font-display text-3xl text-gold">:</div>
          <WheelColumn label="Minute" items={MINUTES} value={t.mi} onChange={(v) => setT((s) => ({ ...s, mi: v }))} render={(v) => pad(v)} />
          <WheelColumn label="AM or PM" items={["AM", "PM"]} value={t.pm ? "PM" : "AM"} onChange={(v) => setT((s) => ({ ...s, pm: v === "PM" }))} className="max-w-[26%]" />
        </WheelFrame>
      </Sheet>
    </>
  );
}

export type PlaceValue = { name: string; lat: number; lon: number; tzId?: string | null };

/** Birth place search (built-in cities instantly, worldwide via API). */
export function PlaceSearch({ value, onChange, id, invalid, placeholder = "City of birth" }: { value: PlaceValue | null; onChange: (p: PlaceValue | null) => void; id?: string; invalid?: boolean; placeholder?: string }) {
  const [open, show, hide] = useToggle();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<(PlaceValue & { country?: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api<{ places: (PlaceValue & { country?: string })[] }>(`/api/places?q=${encodeURIComponent(s)}`, { signal: ctrl.signal });
        setItems(r.places);
      } catch {
        /* aborted / offline */
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => (clearTimeout(t), ctrl.abort());
  }, [q]);
  return (
    <>
      <Trigger id={id} icon={MapPin} value={value?.name || ""} placeholder={placeholder} onClick={show} invalid={invalid} />
      <Sheet open={open} onClose={hide} title="Place of birth">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city, town or village…" className="field !pl-11" autoComplete="off" enterKeyHint="search" />
          {busy && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gold" />}
        </div>
        <ul className="no-scrollbar mt-3 max-h-[46vh] min-h-40 space-y-1 overflow-y-auto pb-2">
          {items.map((p) => (
            <li key={`${p.name}-${p.lat}-${p.lon}`}>
              <button
                type="button"
                onClick={() => (onChange({ name: p.name, lat: p.lat, lon: p.lon, tzId: p.tzId }), hide(), setQ(""))}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-ink/5 active:bg-ink/10"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/5"><MapPin className="h-4 w-4 text-gold" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ivory">{p.name.split(",")[0]}</span>
                  <span className="block truncate text-[13px] text-ivory-2">{p.name.split(",").slice(1).join(",").trim() || p.country}</span>
                  <span className="block text-[11px] text-dim">{p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°</span>
                </span>
              </button>
            </li>
          ))}
          {!busy && q.trim().length >= 2 && items.length === 0 && <li className="px-3 py-8 text-center text-sm text-mist">No places found. Try the nearest town or district.</li>}
          {q.trim().length < 2 && <li className="px-3 py-8 text-center text-sm text-mist">Type at least 2 letters — e.g. “Varanasi”, “Pune”, “London”.</li>}
        </ul>
      </Sheet>
    </>
  );
}

/** Pill segmented control. */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div role="radiogroup" className={cn("grid gap-1 rounded-2xl border border-ink/10 bg-ink/[.04] p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-xl py-2.5 text-sm transition", value === o.value ? "bg-gradient-to-b from-gold-light to-gold-bright font-semibold text-ongold shadow-gold" : "text-mist hover:text-ivory")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
