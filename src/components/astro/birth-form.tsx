"use client";
import { useEffect, useState } from "react";
import { BookmarkPlus, Check, UserRound } from "lucide-react";
import { toast } from "sonner";
import { DateWheel, PlaceSearch, Segmented, TimeWheel, type PlaceValue } from "./pickers";
import { useAuth } from "@/lib/client/providers";
import { api, errMsg } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { BirthInput } from "@/lib/astro";

export type BirthDraft = { name: string; gender: "male" | "female" | "other"; date: string; time: string; place: PlaceValue | null };
export const emptyBirth = (gender: BirthDraft["gender"] = "male"): BirthDraft => ({ name: "", gender, date: "", time: "", place: null });

export function validateBirth(b: BirthDraft): { ok: true; value: BirthInput } | { ok: false; field: keyof BirthDraft; message: string } {
  if (b.name.trim().length < 2) return { ok: false, field: "name", message: "Enter the full name" };
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(b.name.trim())) return { ok: false, field: "name", message: "Name can only contain letters" };
  if (!b.date) return { ok: false, field: "date", message: "Select the date of birth" };
  if (!b.time) return { ok: false, field: "time", message: "Select the time of birth" };
  if (!b.place) return { ok: false, field: "place", message: "Choose the place of birth" };
  return { ok: true, value: { name: b.name.trim(), gender: b.gender, date: b.date, time: b.time, place: { name: b.place.name, lat: b.place.lat, lon: b.place.lon, tzId: b.place.tzId ?? null } } };
}

type SavedProfile = BirthInput & { id: number; label: string };
let profileCache: SavedProfile[] | null = null;

export function useSavedProfiles() {
  const { user } = useAuth();
  const [list, setList] = useState<SavedProfile[]>(profileCache || []);
  useEffect(() => {
    if (!user) return;
    api<{ profiles: SavedProfile[] }>("/api/account/profiles")
      .then((r) => {
        profileCache = r.profiles;
        setList(r.profiles);
      })
      .catch(() => {});
  }, [user]);
  return list;
}

export function BirthFields({ value, onChange, errors, idPrefix, title, accent, lockGender, saveable = true }: { value: BirthDraft; onChange: (b: BirthDraft) => void; errors?: Partial<Record<keyof BirthDraft, string>>; idPrefix: string; title?: string; accent?: "rose" | "sky" | "gold"; lockGender?: boolean; saveable?: boolean }) {
  const { user } = useAuth();
  const profiles = useSavedProfiles();
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof BirthDraft>(k: K, v: BirthDraft[K]) => onChange({ ...value, [k]: v });
  const pick = (p: SavedProfile) => onChange({ name: p.name, gender: lockGender ? value.gender : p.gender, date: p.date, time: p.time, place: p.place });
  const dot = accent === "rose" ? "bg-rose" : accent === "sky" ? "bg-sky" : "bg-gold";

  async function save() {
    const v = validateBirth(value);
    if (!v.ok) return toast.error(v.message);
    setSaving(true);
    try {
      await api("/api/account/profiles", { body: { ...v.value, label: v.value.name.split(" ")[0].slice(0, 24) } });
      profileCache = null;
      toast.success("Saved to your profiles");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          <h3 className="font-display text-2xl text-ivory">{title}</h3>
        </div>
      )}
      {user && profiles.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-1">
          {profiles.map((p) => {
            const on = value.name === p.name && value.date === p.date && value.time === p.time;
            return (
              <button key={p.id} type="button" onClick={() => pick(p)} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition", on ? "border-gold bg-gold/15 text-gold-2" : "border-ink/10 bg-ink/[.04] text-ivory-2 hover:border-gold/40")}>
                {on ? <Check className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5 text-gold" />} {p.label}
              </button>
            );
          })}
        </div>
      )}
      <div>
        <label htmlFor={`${idPrefix}-name`} className="label">Full name</label>
        <input id={`${idPrefix}-name`} value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" autoComplete="name" className="field" aria-invalid={!!errors?.name || undefined} maxLength={60} />
        {errors?.name && <p className="mt-1.5 text-xs text-danger">{errors.name}</p>}
      </div>
      {!lockGender && (
        <div>
          <span className="label">Gender</span>
          <Segmented value={value.gender} onChange={(v) => set("gender", v)} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-date`} className="label">Date of birth</label>
          <DateWheel id={`${idPrefix}-date`} value={value.date} onChange={(v) => set("date", v)} invalid={!!errors?.date} />
          {errors?.date && <p className="mt-1.5 text-xs text-danger">{errors.date}</p>}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-time`} className="label">Time of birth</label>
          <TimeWheel id={`${idPrefix}-time`} value={value.time} onChange={(v) => set("time", v)} invalid={!!errors?.time} />
          {errors?.time && <p className="mt-1.5 text-xs text-danger">{errors.time}</p>}
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-place`} className="label">Place of birth</label>
        <PlaceSearch id={`${idPrefix}-place`} value={value.place} onChange={(v) => set("place", v)} invalid={!!errors?.place} />
        {errors?.place && <p className="mt-1.5 text-xs text-danger">{errors.place}</p>}
      </div>
      {user && saveable && (
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 text-xs text-mist transition hover:text-gold">
          <BookmarkPlus className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save these details to my profiles"}
        </button>
      )}
    </div>
  );
}
