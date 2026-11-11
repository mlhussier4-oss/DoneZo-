"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { jobStatuses, type JobStatus } from "@/lib/crm/labels";
import { idle } from "@/lib/forms";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { deleteJobPhoto, invoiceJob, registerJobPhoto, saveJobNotes, setJobAssignees, setJobStatus } from "../actions";

/** The usual next steps for each status; any status can still be chosen from "More". */
const nextSteps: Record<JobStatus, JobStatus[]> = {
  new: ["scheduled", "in_progress"],
  scheduled: ["in_progress", "completed"],
  in_progress: ["completed", "awaiting_payment"],
  awaiting_payment: ["completed"],
  completed: [],
  canceled: ["scheduled"],
};
const actionLabel: Partial<Record<JobStatus, string>> = {
  scheduled: "Mark scheduled",
  in_progress: "Start job",
  awaiting_payment: "Awaiting payment",
  completed: "Mark complete",
};

const employeeStatuses: JobStatus[] = ["in_progress", "awaiting_payment", "completed"];

export function StatusControls({ jobId, status, limited = false, hideComplete = false }: { jobId: string; status: JobStatus; limited?: boolean; hideComplete?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const change = (s: JobStatus) =>
    start(async () => {
      const result = await setJobStatus(jobId, s);
      setError(result.error);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nextSteps[status].filter((s) => (!limited || employeeStatuses.includes(s)) && !(hideComplete && (s === "completed" || s === "awaiting_payment"))).map((s) => (
          <Button key={s} size="sm" variant={s === "completed" ? "primary" : "outline"} disabled={pending} onClick={() => change(s)}>
            {actionLabel[s] ?? s}
          </Button>
        ))}
        <label className="sr-only" htmlFor="status-select">Set status</label>
        <select
          id="status-select"
          value=""
          disabled={pending}
          onChange={(e) => {
            const s = e.target.value as JobStatus;
            if (s === "canceled" && !confirm("Cancel this job?")) return;
            if (s) change(s);
          }}
          className="h-9 cursor-pointer rounded-lg border border-input bg-card px-2 text-sm"
        >
          <option value="">More…</option>
          {jobStatuses.filter((s) => s.value !== status && (!limited || employeeStatuses.includes(s.value))).map((s) => (
            <option key={s.value} value={s.value}>{s.value === "canceled" ? "Cancel job" : `Set to ${s.label}`}</option>
          ))}
        </select>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function NotesForm({ jobId, notes }: { jobId: string; notes: string | null }) {
  const [state, action] = useFormAction(saveJobNotes.bind(null, jobId), idle);
  return (
    <Form form={action}  className="space-y-2">
      <label htmlFor="job-notes" className="sr-only">Job notes</label>
      <Textarea id="job-notes" name="notes" defaultValue={notes ?? ""} maxLength={5000} placeholder="Notes for this job (only your business sees these)" />
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" variant="outline">Save notes</SubmitButton>
        {state.message ? <span className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-success")}>{state.message}</span> : null}
      </div>
    </Form>
  );
}

const MAX_BYTES = 10 * 1024 * 1024;
const allowed: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

export function PhotoUploader({ businessId, jobId }: { businessId: string; jobId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [caption, setCaption] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    const supabase = createBrowserSupabase();
    for (const file of Array.from(files)) {
      const ext = allowed[file.type];
      if (!ext) { setError(`${file.name}: use a JPG, PNG, WebP or HEIC photo.`); continue; }
      if (file.size > MAX_BYTES) { setError(`${file.name} is larger than 10 MB.`); continue; }
      // Files go into this business's private folder; storage rules reject any other folder.
      const path = `${businessId}/${jobId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("job-photos").upload(path, file, { contentType: file.type });
      if (upErr) { setError(`Could not upload ${file.name}.`); continue; }
      const result = await registerJobPhoto(jobId, path, caption);
      if (result.error) setError(result.error);
    }
    setCaption("");
    if (input.current) input.current.value = "";
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="photo-caption" className="sr-only">Photo caption</label>
        <Input id="photo-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional), e.g. Before" maxLength={300} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          <Camera /> {busy ? "Uploading…" : "Add photos"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="sr-only"
          aria-label="Choose photos"
          data-testid="photo-input"
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function DeletePhotoButton({ photoId }: { photoId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Delete photo"
      disabled={pending}
      onClick={() => confirm("Delete this photo?") && start(() => deleteJobPhoto(photoId))}
      className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function CreateInvoiceButton({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await invoiceJob(jobId);
          if (r?.error) setError(r.error);
        })}
      >
        {pending ? "Creating…" : "Create invoice"}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function AssigneePicker({ jobId, team, assigned }: { jobId: string; team: { user_id: string; name: string; role: string }[]; assigned: string[] }) {
  const [selected, setSelected] = useState<string[]>(assigned);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const dirty = selected.length !== assigned.length || selected.some((s) => !assigned.includes(s));
  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Assigned to</legend>
        {team.map((m) => (
          <label key={m.user_id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(m.user_id)}
              onChange={(e) => { setSaved(false); setSelected(e.target.checked ? [...selected, m.user_id] : selected.filter((s) => s !== m.user_id)); }}
            />
            {m.name} <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={pending || !dirty} onClick={() => start(async () => { const r = await setJobAssignees(jobId, selected); setError(r.error); setSaved(!r.error); })}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && !dirty ? <span className="text-sm text-success">Saved</span> : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
