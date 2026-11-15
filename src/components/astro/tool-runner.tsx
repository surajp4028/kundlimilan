"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, Camera, ChevronDown, ImageIcon, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/client/api";
import { useAuth, useSite } from "@/lib/client/providers";
import { SIGNS } from "@/lib/astro";
import { MONTHS_HI, type ToolDef, VASTU_AGENCY, VASTU_CONCERNS, VASTU_DIRECTIONS, VASTU_ROOMS, type Opt } from "@/lib/tools-catalog";
import { BirthFields, emptyBirth, validateBirth, type BirthDraft } from "./birth-form";
import { DateWheel, PlaceSearch, Segmented, type PlaceValue } from "./pickers";
import { toJpeg, uploadPalmPhoto } from "./palm-input";
import { ToolResult, type ToolSection } from "./tool-result";
import { cn } from "@/lib/utils";

const BIRTH_KEY = "astro.tools.birth";
const DELHI: PlaceValue = { name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, tzId: "Asia/Kolkata" };
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DEG: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function Select({ value, onChange, options, lang, id }: { value: string; onChange: (v: string) => void; options: Opt[]; lang: "en" | "hi"; id?: string }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field appearance-none !pr-10">
        {options.map((o) => (
          <option key={o.v} value={o.v}>{lang === "hi" ? o.hi : o.en}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
    </div>
  );
}

/** Form + results for one catalogue tool. Nothing is fetched until the visitor presses the button. */
export function ToolRunner({ tool }: { tool: ToolDef }) {
  const site = useSite();
  const { user } = useAuth();
  const [lang, setLang] = useState<"en" | "hi">(tool.englishOnly ? "en" : site.default_language === "en" ? "en" : "hi");
  const hi = lang === "hi";
  const ui = (en: string, h: string) => (hi ? h : en);
  const now = new Date();
  const [param, setParam] = useState(tool.param?.default ?? "");
  const [birth, setBirth] = useState<BirthDraft>(emptyBirth("male"));
  const [birthErr, setBirthErr] = useState<Partial<Record<keyof BirthDraft, string>>>({});
  const [year, setYear] = useState(now.getFullYear());
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mYear, setMYear] = useState(now.getFullYear());
  const [place, setPlace] = useState<PlaceValue | null>(DELHI);
  const [date, setDate] = useState(istToday);
  const [sign, setSign] = useState<string>("aries");
  const [entrance, setEntrance] = useState("N");
  const [rooms, setRooms] = useState([{ type: "kitchen", direction: "SE" }, { type: "master_bedroom", direction: "SW" }, { type: "puja_room", direction: "NE" }]);
  const [concern, setConcern] = useState("NONE");
  const [agency, setAgency] = useState("UNKNOWN");
  const [plan, setPlan] = useState<string | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ sections: ToolSection[]; lang: "en" | "hi" } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // birth details typed once are reused by every tool in this tab
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BIRTH_KEY);
      if (raw) setBirth(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (birth.name || birth.date) sessionStorage.setItem(BIRTH_KEY, JSON.stringify(birth));
    } catch {}
  }, [birth]);

  function buildInput(): unknown | null {
    switch (tool.input) {
      case "birth":
      case "birth_year": {
        const v = validateBirth(birth);
        if (!v.ok) {
          setBirthErr({ [v.field]: v.message });
          toast.error(v.message);
          return null;
        }
        setBirthErr({});
        return tool.input === "birth" ? { person: v.value } : { person: v.value, year };
      }
      case "name_dob":
        if (name.trim().length < 2) return toast.error(ui("Enter the full name", "पूरा नाम लिखें")), null;
        if (!dob) return toast.error(ui("Select the date of birth", "जन्म तिथि चुनें")), null;
        return { name: name.trim(), date: dob };
      case "month_place":
        if (!place) return toast.error(ui("Choose a city", "शहर चुनें")), null;
        return { month, year: mYear, place };
      case "date_place":
        if (!place) return toast.error(ui("Choose a city", "शहर चुनें")), null;
        return { date, place };
      case "sign":
        return { sign };
      case "vastu_rooms":
        if (!rooms.length) return toast.error(ui("Add at least one room", "कम से कम एक कमरा जोड़ें")), null;
        return { entrance, rooms, concern, agency };
      case "vastu_plan":
        if (!plan) return toast.error(ui("Upload your floor plan", "घर का नक्शा अपलोड करें")), null;
        return { entranceDegree: DEG[entrance] ?? 0 };
    }
  }

  async function run() {
    const input = buildInput();
    if (!input) return;
    setBusy(true);
    setErr("");
    try {
      let finalInput = input as Record<string, unknown>;
      if (tool.input === "vastu_plan") {
        if (!user) {
          toast.error(ui("Please log in to upload your floor plan.", "नक्शा अपलोड करने के लिए लॉग इन करें।"));
          setBusy(false);
          return;
        }
        finalInput = { ...finalInput, photo: await uploadPalmPhoto(plan!) };
      }
      const r = await api<{ result: { sections: ToolSection[]; lang: "en" | "hi" } }>("/api/tools/run", { body: { tool: tool.slug, input: finalInput, param: tool.param ? param : null, lang } });
      setResult({ sections: r.result.sections, lang: r.result.lang });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e) {
      setErr(e instanceof Error && !("info" in e) ? e.message : errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function pickPlan(f: File | undefined) {
    if (!f) return;
    try {
      setPlan(await toJpeg(f));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (cam.current) cam.current.value = "";
      if (gal.current) gal.current.value = "";
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8">
      <div className="lux-card space-y-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ivory">{ui("Your details", "आपका विवरण")}</h2>
          {tool.englishOnly ? (
            <span className="rounded-full border border-gold/25 px-3 py-1 text-xs text-mist">{ui("Result in English", "परिणाम अंग्रेज़ी में")}</span>
          ) : (
            <Segmented className="w-44" value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }]} />
          )}
        </div>

        {tool.param && (
          <div>
            <label htmlFor="tool-param" className="label">{hi ? tool.param.hi : tool.param.en}</label>
            <Select id="tool-param" value={param} onChange={setParam} options={tool.param.options} lang={lang} />
          </div>
        )}

        {(tool.input === "birth" || tool.input === "birth_year") && <BirthFields idPrefix="tool" value={birth} onChange={setBirth} errors={birthErr} />}
        {tool.input === "birth_year" && (
          <div>
            <span className="label">{ui("Year", "वर्ष")}</span>
            <Segmented value={String(year)} onChange={(v) => setYear(Number(v))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
          </div>
        )}

        {tool.input === "name_dob" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nd-name" className="label">{ui("Full name", "पूरा नाम")}</label>
              <input id="nd-name" value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="e.g. Rahul Sharma" maxLength={60} />
            </div>
            <div>
              <span className="label">{ui("Date of birth", "जन्म तिथि")}</span>
              <DateWheel value={dob} onChange={setDob} />
            </div>
          </div>
        )}

        {(tool.input === "month_place" || tool.input === "date_place") && (
          <div className="space-y-4">
            {tool.input === "month_place" ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label htmlFor="m-month" className="label">{ui("Month", "महीना")}</label>
                  <Select id="m-month" value={String(month)} onChange={(v) => setMonth(Number(v))} lang={lang} options={MONTHS_EN.map((m, i) => ({ v: String(i + 1), en: m, hi: MONTHS_HI[i] }))} />
                </div>
                <div>
                  <span className="label">{ui("Year", "वर्ष")}</span>
                  <Segmented value={String(mYear)} onChange={(v) => setMYear(Number(v))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
                </div>
              </div>
            ) : (
              <div>
                <span className="label">{ui("Date", "तारीख़")}</span>
                <DateWheel value={date} onChange={setDate} label={ui("Choose a date", "तारीख़ चुनें")} minYear={now.getFullYear() - 1} maxYear={now.getFullYear() + 1} />
              </div>
            )}
            <div>
              <span className="label">{ui("City", "शहर")}</span>
              <PlaceSearch value={place} onChange={setPlace} placeholder={ui("Choose your city", "अपना शहर चुनें")} />
            </div>
          </div>
        )}

        {tool.input === "sign" && (
          <div>
            <span className="label">{ui("Your zodiac sign", "आपकी राशि")}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SIGNS.map((s) => (
                <button key={s.key} type="button" onClick={() => setSign(s.key)} className={cn("rounded-2xl border px-2 py-3 text-center transition", sign === s.key ? "border-[#c58b1d] bg-gradient-to-b from-gold-light to-gold-bright text-ongold shadow-gold" : "border-ink/[.08] bg-white hover:border-gold/50")}>
                  <div className="text-xl">{s.symbol}</div>
                  <div className="text-sm font-semibold">{s.hi}</div>
                  <div className="text-[11px] opacity-75">{s.en}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(tool.input === "vastu_rooms" || tool.input === "vastu_plan") && (
          <div>
            <label htmlFor="v-ent" className="label">{ui("Main door faces", "मुख्य द्वार की दिशा")}</label>
            <Select id="v-ent" value={entrance} onChange={setEntrance} options={VASTU_DIRECTIONS} lang={lang} />
          </div>
        )}

        {tool.input === "vastu_rooms" && (
          <div className="space-y-4">
            <div>
              <span className="label">{ui("Rooms and their direction", "कमरे और उनकी दिशा")}</span>
              <div className="space-y-2">
                {rooms.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Select value={r.type} onChange={(v) => setRooms(rooms.map((x, j) => (j === i ? { ...x, type: v } : x)))} options={VASTU_ROOMS} lang={lang} />
                    <Select value={r.direction} onChange={(v) => setRooms(rooms.map((x, j) => (j === i ? { ...x, direction: v } : x)))} options={VASTU_DIRECTIONS} lang={lang} />
                    <button type="button" aria-label="Remove room" onClick={() => setRooms(rooms.filter((_, j) => j !== i))} className="grid h-12 w-12 place-items-center rounded-2xl border border-ink/[.08] text-mist hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              {rooms.length < 40 && (
                <button type="button" onClick={() => setRooms([...rooms, { type: "bedroom", direction: "S" }])} className="btn-ghost mt-2 !py-2.5 text-sm"><Plus className="h-4 w-4" /> {ui("Add room", "कमरा जोड़ें")}</button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-con" className="label">{ui("Main concern", "मुख्य चिंता")}</label>
                <Select id="v-con" value={concern} onChange={setConcern} options={VASTU_CONCERNS} lang={lang} />
              </div>
              <div>
                <label htmlFor="v-ag" className="label">{ui("Your home", "आपका घर")}</label>
                <Select id="v-ag" value={agency} onChange={setAgency} options={VASTU_AGENCY} lang={lang} />
              </div>
            </div>
          </div>
        )}

        {tool.input === "vastu_plan" && (
          <div>
            <span className="label">{ui("Floor plan / house map", "घर का नक्शा")}</span>
            <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPlan(e.target.files?.[0])} />
            <input ref={gal} type="file" accept="image/*" className="hidden" onChange={(e) => pickPlan(e.target.files?.[0])} />
            {plan ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plan} alt="Floor plan" className="max-h-80 w-full rounded-2xl border border-gold/25 object-contain" />
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-gold/35 bg-gold/[.04] p-5 text-center text-sm text-mist">{ui("A clear photo or screenshot of the map, with North marked if possible.", "नक्शे की साफ़ फ़ोटो या स्क्रीनशॉट — हो सके तो उत्तर दिशा अंकित हो।")}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => cam.current?.click()} className="btn-ghost !py-3 text-sm"><Camera className="h-4 w-4" /> {ui("Camera", "कैमरा")}</button>
              <button type="button" onClick={() => gal.current?.click()} className="btn-ghost !py-3 text-sm"><ImageIcon className="h-4 w-4" /> {ui("Gallery", "गैलरी")}</button>
            </div>
            {!user && <p className="mt-2 text-xs text-mist">{ui("You'll need to log in to upload.", "अपलोड के लिए लॉग इन ज़रूरी है।")} <Link href={`/login?next=/tools/${tool.slug}`} className="font-semibold text-gold">{ui("Log in", "लॉग इन")}</Link></p>}
          </div>
        )}

        <button type="button" onClick={run} disabled={busy} className="btn-gold w-full !py-3.5 text-base">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} {busy ? ui("Calculating…", "गणना हो रही है…") : ui(`Show ${tool.en}`, `${tool.hi} देखें`)}
        </button>
        {err && <p className="flex items-center justify-center gap-2 text-center text-sm text-amber"><AlertTriangle className="h-4 w-4 shrink-0" /> {err}</p>}
      </div>

      {result && (
        <motion.div ref={resultRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-6 scroll-mt-24 transition", busy && "opacity-50")}>
          <ToolResult sections={result.sections} lang={result.lang} />
          <div className="mt-6 rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[.08] to-transparent p-5 text-center">
            <p className="font-display text-xl text-ivory">{ui("Want everything in one detailed PDF?", "सब कुछ एक विस्तृत PDF में चाहिए?")}</p>
            <Link href="/reports" className="btn-gold mt-3 inline-flex">{ui("See premium reports", "प्रीमियम रिपोर्ट देखें")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
