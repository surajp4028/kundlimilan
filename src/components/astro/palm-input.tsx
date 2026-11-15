"use client";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, Hand, ImageIcon, Loader2, RefreshCw, Sun, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { DateWheel, Segmented } from "./pickers";
import { PalmArt } from "./palm-art";
import { cn } from "@/lib/utils";

export type PalmDraft = { name: string; gender: "male" | "female"; date: string; photo: string | null; preview: string | null };
export const emptyPalm = (): PalmDraft => ({ name: "", gender: "male", date: "", photo: null, preview: null });

export function validatePalm(p: PalmDraft): { ok: true } | { ok: false; field: "name" | "date" | "photo"; message: string } {
  if (p.name.trim().length < 2) return { ok: false, field: "name", message: "Enter the full name" };
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(p.name.trim())) return { ok: false, field: "name", message: "Name can only contain letters" };
  if (!p.date) return { ok: false, field: "date", message: "Select the date of birth" };
  if (!p.preview) return { ok: false, field: "photo", message: "Add a photo of your palm" };
  return { ok: true };
}

/** Phone photos can be 5–12 MB (and HEIC on iPhone): redraw to a ≤1600 px JPEG so it uploads fast and the API accepts it. */
export async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("This photo couldn't be opened. Please try another one."));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** data: URL → Blob without fetch() (the CSP's connect-src doesn't allow data: URLs). */
function dataUrlToBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(",");
  const type = /data:([^;]+)/.exec(head)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Uploads the compressed palm photo; returns its id. */
export async function uploadPalmPhoto(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const fd = new FormData();
  fd.append("file", blob, "palm.jpg");
  const res = await fetch("/api/palm/photo", { method: "POST", body: fd, credentials: "same-origin", headers: { "X-Requested-With": "km" } });
  const j = (await res.json().catch(() => ({}))) as { photo?: string; error?: { message?: string } };
  if (!res.ok || !j.photo) throw new Error(j.error?.message || "Couldn't upload the photo. Please try again.");
  return j.photo;
}

const TIPS = [
  { i: Sun, t: "Good light", h: "अच्छी रोशनी में" },
  { i: Hand, t: "Whole palm, fingers slightly apart", h: "पूरी खुली हथेली" },
  { i: ZoomIn, t: "Sharp, not blurry", h: "साफ़, धुंधली नहीं" },
];

export function PhotoPicker({ value, onChange, invalid }: { value: string | null; onChange: (dataUrl: string) => void; invalid?: boolean }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) return toast.error("Please choose a photo.");
    setBusy(true);
    try {
      onChange(await toJpeg(f));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (cam.current) cam.current.value = "";
      if (gal.current) gal.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">Photo of your palm · हथेली की फ़ोटो</span>
      {/* capture="environment" → opens the rear camera directly on phones; the second input opens the gallery / files */}
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-ink/[.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Your palm" className="mx-auto max-h-80 w-full object-contain" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald px-3 py-1 text-xs font-semibold text-white shadow"><CheckCircle2 className="h-3.5 w-3.5" /> Photo added</div>
          <div className="grid grid-cols-2 gap-2 border-t border-gold/20 bg-white/85 p-2">
            <button type="button" onClick={() => cam.current?.click()} className="btn-ghost !py-2.5 text-sm"><Camera className="h-4 w-4" /> Retake</button>
            <button type="button" onClick={() => gal.current?.click()} className="btn-ghost !py-2.5 text-sm"><RefreshCw className="h-4 w-4" /> Choose another</button>
          </div>
        </div>
      ) : (
        <div className={cn("rounded-3xl border-2 border-dashed p-5 text-center transition", invalid ? "border-rose/60 bg-rose/[.04]" : "border-gold/35 bg-gold/[.04]")}>
          <div className="relative mx-auto w-36">
            <PalmArt className="w-full" frame scan={!busy} />
            {busy && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-9 w-9 animate-spin text-gold" /></div>}
            <span className="absolute -right-6 top-2 rotate-6 rounded-full bg-maroon px-2.5 py-0.5 text-[10.5px] font-semibold text-[#fbe7b8] shadow">Like this · ऐसे</span>
          </div>
          <p className="mt-4 font-display text-xl text-ivory">Send a clear photo of your open palm</p>
          <p className="text-sm text-mist">Use the hand you write with · जिस हाथ से आप लिखते हैं</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => cam.current?.click()} className="btn-gold w-full !py-3.5"><Camera className="h-5 w-5" /> Take photo · कैमरा</button>
            <button type="button" disabled={busy} onClick={() => gal.current?.click()} className="btn-ghost w-full !py-3.5"><ImageIcon className="h-5 w-5" /> From gallery · गैलरी</button>
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {TIPS.map((t) => (
          <div key={t.t} className="rounded-2xl border border-ink/[.07] bg-ink/[.025] p-2.5 text-center">
            <t.i className="mx-auto h-4 w-4 text-gold" />
            <div className="mt-1 text-[11px] font-semibold leading-tight text-ivory">{t.t}</div>
            <div className="text-[10.5px] leading-tight text-mist">{t.h}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PalmFields({ value, onChange, errors }: { value: PalmDraft; onChange: (v: PalmDraft) => void; errors?: Partial<Record<"name" | "date" | "photo", string>> }) {
  const set = <K extends keyof PalmDraft>(k: K, v: PalmDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <PhotoPicker value={value.preview} invalid={!!errors?.photo} onChange={(dataUrl) => onChange({ ...value, preview: dataUrl, photo: null })} />
      {errors?.photo && <p className="-mt-3 text-xs text-rose">{errors.photo}</p>}
      <div>
        <label htmlFor="palm-name" className="label">Full name</label>
        <input id="palm-name" value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" maxLength={60} autoComplete="name" className={cn("field", errors?.name && "!border-rose/60")} />
        {errors?.name && <p className="mt-1 text-xs text-rose">{errors.name}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Gender</span>
          <Segmented value={value.gender} onChange={(v) => set("gender", v)} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
        </div>
        <div>
          <span className="label">Date of birth</span>
          <DateWheel value={value.date} onChange={(v) => set("date", v)} invalid={!!errors?.date} />
          {errors?.date && <p className="mt-1 text-xs text-rose">{errors.date}</p>}
        </div>
      </div>
    </div>
  );
}
