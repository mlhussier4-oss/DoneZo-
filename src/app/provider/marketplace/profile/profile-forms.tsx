"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { paymentMethodOptions } from "@/config/marketplace";
import { idle } from "@/lib/forms";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { deletePortfolioPhoto, registerBusinessMedia, saveMarketplaceProfile } from "../actions";

type Values = {
  homeZip: string;
  radius: number;
  years: number | null;
  description: string;
  categories: string[];
  methods: string[];
};

export function MarketplaceProfileForm({ values, allCategories }: { values: Values; allCategories: { id: string; name: string; default_on?: boolean }[] }) {
  const [state, form] = useFormAction(saveMarketplaceProfile, idle);
  const e = state.fieldErrors ?? {};
  return (
    <Form form={form} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Home ZIP code" htmlFor="homeZip" hint="Where you're based." error={e.homeZip}>
          <Input id="homeZip" name="homeZip" defaultValue={values.homeZip} inputMode="numeric" maxLength={5} />
        </Field>
        <Field label="Service radius (miles)" htmlFor="radius" hint="How far you'll travel." error={e.radius}>
          <Input id="radius" name="radius" type="number" min={1} max={60} defaultValue={values.radius} />
        </Field>
        <Field label="Years in business" htmlFor="years" error={e.years}>
          <Input id="years" name="years" type="number" min={0} max={100} defaultValue={values.years ?? ""} />
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Services you get jobs for</legend>
        <p className="text-xs text-muted-foreground">Untick any service you don&apos;t want jobs for. Misc / other (odd jobs that don&apos;t fit a service) is on for everyone unless you turn it off.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {allCategories.map((c) => (
            <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 hover:bg-muted">
              <input type="checkbox" name="categories" value={c.id} defaultChecked={values.categories.includes(c.id)} className="size-5 accent-[var(--primary)]" />
              <span className="flex-1">{c.name}</span>
              {c.default_on ? <span className="text-xs text-muted-foreground">On by default</span> : null}
            </label>
          ))}
        </div>
        {e.categories ? <p className="text-sm text-destructive">{e.categories}</p> : null}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Payment methods you accept</legend>
        <div className="flex flex-wrap gap-2">
          {paymentMethodOptions.map((m) =>
            m.value === "card" ? (
              // Mandatory for every provider: always on, can't be unticked.
              <label key={m.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-sm">
                <input type="checkbox" checked disabled readOnly aria-describedby="card-required" className="size-5 accent-[var(--primary)]" />
                {m.label} <span className="text-xs text-muted-foreground">· required</span>
              </label>
            ) : (
              <label key={m.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted">
                <input type="checkbox" name="methods" value={m.value} defaultChecked={values.methods.includes(m.value)} className="size-5 accent-[var(--primary)]" />
                {m.label}
              </label>
            ),
          )}
        </div>
        <p id="card-required" className="text-xs text-muted-foreground">Every DoneZo provider accepts card, so it&apos;s always on. Connect Stripe on your Payments page to receive card payments.</p>
      </fieldset>
      <Field label="About your business" htmlFor="description" hint="Shown on your public profile." error={e.description}>
        <Textarea id="description" name="description" defaultValue={values.description} maxLength={2000} />
      </Field>
      <FormAlert state={state} />
      <SubmitButton>Save profile</SubmitButton>
    </Form>
  );
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function MediaUploader({ businessId, kind, label }: { businessId: string; kind: "logo" | "portfolio"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [caption, setCaption] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    const supabase = createBrowserSupabase();
    for (const file of Array.from(files).slice(0, kind === "logo" ? 1 : 10)) {
      const ext = EXT[file.type];
      if (!ext || file.size > 5 * 1024 * 1024) { setError(`${file.name}: use a JPG, PNG or WebP under 5 MB.`); continue; }
      const path = `${businessId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type });
      if (upErr) { setError(`Could not upload ${file.name}.`); continue; }
      const r = await registerBusinessMedia(kind, path, caption);
      if (r.error) setError(r.error);
    }
    setCaption("");
    if (input.current) input.current.value = "";
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        {kind === "portfolio" ? (
          <>
            <label htmlFor="portfolio-caption" className="sr-only">Caption</label>
            <Input id="portfolio-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" maxLength={200} />
          </>
        ) : null}
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus /> {busy ? "Uploading…" : label}</Button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === "portfolio"} className="sr-only" aria-label={label}
          data-testid={`${kind}-input`} onChange={(e) => upload(e.target.files)} />
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function DeletePortfolioButton({ photoId }: { photoId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" aria-label="Remove photo" disabled={pending} onClick={() => confirm("Remove this photo?") && start(() => deletePortfolioPhoto(photoId))}
      className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow hover:text-destructive">
      <Trash2 className="size-4" />
    </button>
  );
}
