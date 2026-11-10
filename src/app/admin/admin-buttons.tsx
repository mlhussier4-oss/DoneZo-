"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveReport, saveServiceArea, setBusinessVerified, type AdminState } from "./actions";

export function VerifyButton({ businessId, verified }: { businessId: string; verified: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={verified ? "ghost" : "outline"} disabled={pending} onClick={() => {
      const note = prompt(verified ? "Remove verification? Reason (optional):" : "What did you check? (e.g. license + insurance on file)");
      if (note !== null) start(async () => { await setBusinessVerified(businessId, !verified, note); });
    }}>
      {verified ? "Unverify" : "Verify"}
    </Button>
  );
}

export function ResolveButton({ reportId }: { reportId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => {
      const note = prompt("Resolution note (what was done):");
      if (note !== null) start(async () => { await resolveReport(reportId, note); });
    }}>
      Mark resolved
    </Button>
  );
}

export function ServiceAreaForm({ area }: { area?: { id: string; name: string; center_zip: string; radius_miles: number; is_active: boolean } }) {
  const [state, form] = useFormAction<AdminState>(saveServiceArea, { status: "idle" });
  const p = area?.id ?? "new";
  return (
    <Form form={form} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="id" value={area?.id ?? ""} />
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`n-${p}`}>Name</Label><Input id={`n-${p}`} name="name" defaultValue={area?.name} /></div>
      <div className="space-y-1.5"><Label htmlFor={`z-${p}`}>Center ZIP</Label><Input id={`z-${p}`} name="centerZip" defaultValue={area?.center_zip} inputMode="numeric" maxLength={5} /></div>
      <div className="space-y-1.5"><Label htmlFor={`r-${p}`}>Radius (miles)</Label><Input id={`r-${p}`} name="radius" type="number" min={1} max={150} defaultValue={area?.radius_miles ?? 25} /></div>
      <div className="space-y-1.5"><Label htmlFor={`a-${p}`}>Status</Label>
        <Select id={`a-${p}`} name="isActive" defaultValue={area?.is_active === false ? "false" : "true"}>
          <option value="true">Open</option><option value="false">Closed</option>
        </Select>
      </div>
      <SubmitButton size="sm" variant={area ? "outline" : "primary"}>{area ? "Save" : "Add area"}</SubmitButton>
      <div className="sm:col-span-5"><FormAlert state={state} /></div>
    </Form>
  );
}
