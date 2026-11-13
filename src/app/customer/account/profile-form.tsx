"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Form, useFormAction } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { saveGuestAccount, setAvatar, updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ firstName, email }: { firstName: string; email: string }) {
  const [state, action] = useFormAction<ProfileState>(updateProfile, { status: "idle" });
  return (
    <Form form={action} className="space-y-4" noValidate>
      <Field label="First name" htmlFor="firstName" hint="Providers only ever see your first name and photo." error={state.fieldErrors?.firstName}>
        <Input id="firstName" name="firstName" defaultValue={firstName} autoComplete="given-name" maxLength={30} />
      </Field>
      <Field label="Email" htmlFor="email" hint="For logging in. Never shared with providers.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={action.pending}>{action.pending ? "Saving…" : "Save"}</Button>
        <Link href="/account/update-password" className="text-sm text-primary hover:underline">Change password</Link>
      </div>
    </Form>
  );
}

/** Square crop, 256 px JPEG: small and quick to load anywhere. */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", 0.85));
}

export function PhotoForm({ userId, path, firstName }: { userId: string; path: string | null; firstName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    start(async () => {
      if (!file.type.startsWith("image/")) { setError("Choose a photo (JPG, PNG or HEIC)."); return; }
      let blob: Blob;
      try { blob = await resize(file); } catch { setError("That photo couldn't be read. Try a JPG or PNG."); return; }
      const newPath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await createBrowserSupabase().storage.from("avatars").upload(newPath, blob, { contentType: "image/jpeg" });
      if (upErr) { setError("Upload failed. Please try again."); return; }
      const r = await setAvatar(newPath);
      if (r.error) setError(r.error);
    });
  };

  return (
    <div className="flex items-center gap-4" data-testid="profile-photo">
      <Avatar path={path} name={firstName || "?"} size="lg" />
      <div className="space-y-2">
        <p className="text-sm font-medium">Profile photo <span className="font-normal text-muted-foreground">(optional)</span></p>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/*" className="sr-only" aria-label="Choose a profile photo" data-testid="avatar-input"
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
            <Camera /> {pending ? "Saving…" : path ? "Change photo" : "Add a photo"}
          </Button>
          {path ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await setAvatar(null); if (r.error) setError(r.error); })}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

export function SaveAccountForm({ firstName }: { firstName: string }) {
  const [state, action] = useFormAction<ProfileState>(saveGuestAccount, { status: "idle" });
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return (
    <Form form={action} className="space-y-4" noValidate data-testid="save-account">
      <Field label="First name" htmlFor="save-firstName" error={state.fieldErrors?.firstName}>
        <Input id="save-firstName" name="firstName" defaultValue={firstName} autoComplete="given-name" maxLength={30} />
      </Field>
      <Field label="Email" htmlFor="save-email" hint="Never shared with providers." error={state.fieldErrors?.email}>
        <Input id="save-email" name="email" type="email" autoComplete="email" />
      </Field>
      <Field label="Password" htmlFor="save-password" hint="At least 8 characters, with a letter and a number." error={state.fieldErrors?.password}>
        <Input id="save-password" name="password" type="password" autoComplete="new-password" />
      </Field>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <Button type="submit" variant="accent" disabled={action.pending}>{action.pending ? "Saving…" : "Save my account"}</Button>
    </Form>
  );
}
