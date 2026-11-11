"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, X } from "lucide-react";
import { CategoryIcon } from "@/components/brand/category-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { categoryQuestions, timingLabel, timingOptions, type Timing } from "@/config/marketplace";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { cancelRequest } from "../../customer/requests/actions";
import { checkZip, createRequest, registerRequestPhotos } from "./actions";

type Category = { id: string; slug: string; name: string; icon: string; description: string | null };
type Photo = { file: File; url: string };

const STEPS = ["Service", "Photos", "Details", "Timing", "Location", "Review"] as const;
const MAX_PHOTOS = 8;
const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

export function PostJobWizard({
  categories,
  initialCategory,
  signedInRole,
  today,
}: {
  categories: Category[];
  initialCategory?: string;
  signedInRole: "customer" | "provider" | "admin" | null;
  today: string;
}) {
  const router = useRouter();
  const preset = categories.find((c) => c.slug === initialCategory);
  const [step, setStep] = useState(preset ? 1 : 0);
  const [category, setCategory] = useState<Category | undefined>(preset);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [timing, setTiming] = useState<Timing | "">("");
  const [preferredDate, setPreferredDate] = useState("");
  const [zip, setZip] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Austin");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [pending, start] = useTransition();
  const requestId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const go = (n: number) => {
    setError(undefined);
    setStep(n);
    window.scrollTo({ top: 0 });
  };

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) { setError(`You can add up to ${MAX_PHOTOS} photos.`); break; }
      if (!EXT[file.type]) { setError(`${file.name}: use a JPG, PNG, WebP or HEIC photo.`); continue; }
      if (file.size > MAX_BYTES) { setError(`${file.name} is larger than 10 MB.`); continue; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function nextFromLocation() {
    start(async () => {
      if (!line1.trim() || !city.trim()) { setError("Enter the street address and city."); return; }
      const result = await checkZip(zip.trim());
      if (!result.ok) { setError(result.message); return; }
      go(5);
    });
  }

  async function post() {
    setError(undefined);
    setStatus("Posting your job…");
    const result = await createRequest({
      id: requestId,
      categoryId: category!.id,
      description,
      details,
      timing: timing as Timing,
      preferredDate: timing === "specific_date" ? preferredDate : null,
      zip: zip.trim(),
      photoCount: photos.length,
      line1,
      line2,
      city,
      phone,
      smsConsent,
    });
    if (!result.ok) { setStatus(undefined); setError(result.message); return; }

    if (photos.length) {
      setStatus("Uploading photos…");
      const supabase = createBrowserSupabase();
      const uploaded: string[] = [];
      for (const p of photos) {
        const path = `${result.userId}/${result.id}/${crypto.randomUUID()}.${EXT[p.file.type]}`;
        const { error: upErr } = await supabase.storage.from("request-photos").upload(path, p.file, { contentType: p.file.type });
        if (!upErr) uploaded.push(path);
      }
      if (!uploaded.length) {
        // A job without photos never goes out (owner decision 2026-11-12).
        await cancelRequest(result.id);
        setStatus(undefined);
        setError("Your photos didn't upload, so the job wasn't posted. Check your connection and try again.");
        return;
      }
      await registerRequestPhotos(result.id, uploaded);
    }
    // Straight to the dashboard, where bids appear live under the job (owner decision 2026-11-12).
    router.push(`/customer?posted=${result.id}`);
  }

  function submit() {
    start(async () => {
      if (signedInRole === "customer") return post();
      if (signedInRole) { setError("You're signed in with a provider or admin account. Sign out, then post the job as a customer."); return; }
      // No email, password or card: a private guest account is created on this device (owner decision 2026-11-12).
      setStatus("Posting your job…");
      const { error: signInError } = await createBrowserSupabase().auth.signInAnonymously();
      if (signInError) { setStatus(undefined); setError("We couldn't post your job just now. Please try again in a minute."); return; }
      await post();
    });
  }

  const canContinue = [
    Boolean(category),
    photos.length > 0, // photos are required (owner decision 2026-11-12)
    description.trim().length > 0,
    Boolean(timing) && (timing !== "specific_date" || Boolean(preferredDate)),
    zip.trim().length === 5,
    true,
  ][step];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden /> Back
            </button>
          ) : <span />}
          <span className="text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      {step === 0 ? (
        <section aria-labelledby="step-title" className="space-y-4">
          <h1 id="step-title" className="text-2xl font-bold tracking-tight sm:text-3xl">What do you need done?</h1>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { setCategory(c); setDetails({}); go(1); }}
                  className={cn(
                    "flex h-full w-full cursor-pointer flex-col items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary-soft",
                    category?.id === c.id ? "border-primary ring-1 ring-primary" : "border-border",
                  )}
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-cta">
                    <CategoryIcon name={c.icon} className="size-6" />
                  </span>
                  <span className="font-semibold">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Add photos</h1>
          <p className="text-muted-foreground">Add at least one photo of the job (2 or 3 is best) so providers can give you an accurate price. Up to {MAX_PHOTOS}.</p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input bg-card px-4 py-10 text-center hover:border-primary hover:bg-primary-soft">
            <Camera className="size-8 text-primary" aria-hidden />
            <span className="font-semibold">Take or choose photos</span>
            <span className="text-sm text-muted-foreground">JPG, PNG or HEIC, up to 10 MB each</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" data-testid="request-photos" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </label>
          {photos.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p, i) => (
                <li key={p.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-card/90 shadow">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Describe the job</h1>
          <Field label="What needs to be done?" htmlFor="description" hint="A sentence or two is plenty.">
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} autoFocus
              placeholder={category?.slug === "junk-removal" ? "E.g. old couch and a mattress in the garage" : "E.g. front and back yard, about a quarter acre"} />
          </Field>
          {(categoryQuestions[category?.slug ?? ""] ?? []).map((q) => (
            <fieldset key={q.key} className="space-y-2">
              <legend className="text-sm font-medium">{q.label} <span className="font-normal text-muted-foreground">(optional)</span></legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const picked = (details[q.key] ?? "").split(", ").filter(Boolean);
                  const on = picked.includes(o);
                  return (
                    <button key={o} type="button" aria-pressed={on}
                      onClick={() => setDetails((d) => {
                        const n = { ...d };
                        // Multi-choice questions keep every picked answer, in the order shown.
                        const next = q.multiple ? q.options.filter((x) => (x === o ? !on : picked.includes(x))) : on ? [] : [o];
                        if (next.length) n[q.key] = next.join(", "); else delete n[q.key];
                        return n;
                      })}
                      className={cn("min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted")}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">When do you need it?</h1>
          <div className="grid gap-2" role="radiogroup" aria-label="Timing">
            {timingOptions.map((t) => (
              <button key={t.value} type="button" role="radio" aria-checked={timing === t.value} onClick={() => setTiming(t.value)}
                className={cn("flex min-h-12 cursor-pointer items-center justify-between rounded-lg border bg-card px-4 text-left font-medium",
                  timing === t.value ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:bg-muted")}>
                {t.label}
                {timing === t.value ? <Check className="size-5 text-primary" aria-hidden /> : null}
              </button>
            ))}
          </div>
          {timing === "specific_date" ? (
            <Field label="Preferred date" htmlFor="preferredDate">
              <Input id="preferredDate" type="date" min={today} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </Field>
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Where is the job?</h1>
          <Alert tone="info">Providers only see your ZIP code. Your address and phone are shared only with the provider you choose.</Alert>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Street address" htmlFor="line1"><Input id="line1" value={line1} onChange={(e) => setLine1(e.target.value)} autoComplete="address-line1" /></Field>
            </div>
            <Field label="Apt / unit" htmlFor="line2"><Input id="line2" value={line2} onChange={(e) => setLine2(e.target.value)} autoComplete="address-line2" /></Field>
            <div className="sm:col-span-2">
              <Field label="City" htmlFor="city"><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /></Field>
            </div>
            <Field label="ZIP code" htmlFor="zip"><Input id="zip" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" /></Field>
          </div>
          <Field label="Mobile phone (optional)" htmlFor="phone" hint="For your provider to reach you once you've hired them.">
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} />
          </Field>
          {phone.trim() ? (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} className="mt-0.5 size-5 accent-[var(--primary)]" />
              <span>Text me updates about this job (bids, messages and payment links). Message and data rates may apply. Reply STOP to opt out.</span>
            </label>
          ) : null}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Review and post</h1>
          <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
            {[
              ["Service", category?.name, 0],
              ["Photos", photos.length ? `${photos.length} added` : "None", 1],
              ["Details", [description, ...Object.values(details)].filter(Boolean).join(" · "), 2],
              ["When", timing === "specific_date" ? preferredDate : timingLabel(timing), 3],
              ["Where", `${line1}${line2 ? `, ${line2}` : ""}, ${city} ${zip}`, 4],
            ].map(([label, value, s]) => (
              <div key={label as string} className="flex items-start justify-between gap-3 px-4 py-3">
                <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="flex-1 break-words">{value}</dd>
                <button type="button" onClick={() => go(s as number)} className="cursor-pointer text-primary hover:underline">Edit</button>
              </div>
            ))}
          </dl>

          <p className="text-sm text-muted-foreground">No email, password or card needed. Bids appear live on your dashboard, and you only pay the provider you choose, after the job is done.</p>
          {signedInRole === null ? <p className="mt-2 text-xs text-muted-foreground">By posting you agree to DoneZo&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p> : null}
        </section>
      ) : null}

      {error ? <Alert tone="error" className="mt-4">{error}</Alert> : null}
      {status && !error ? <Alert tone="info" className="mt-4">{status}</Alert> : null}

      {step > 0 ? (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          {step < 4 ? (
            <Button size="lg" className="w-full" disabled={!canContinue} onClick={() => go(step + 1)}>
              {step === 1 && !photos.length ? "Add a photo to continue" : "Continue"}
            </Button>
          ) : step === 4 ? (
            <Button size="lg" className="w-full" disabled={!canContinue || pending} onClick={nextFromLocation}>
              {pending ? "Checking…" : "Continue"}
            </Button>
          ) : (
            <Button size="lg" variant="accent" className="w-full" disabled={pending || Boolean(status && !error)} onClick={submit}>
              {pending || (status && !error) ? (status ?? "Please wait…") : "Post job"}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
