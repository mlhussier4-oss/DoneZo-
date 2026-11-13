"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { setCardFee, type AdminState } from "../actions";

export function FeeForm({ percent }: { percent: number }) {
  const [state, form] = useFormAction<AdminState>(setCardFee, { status: "idle" });
  return (
    <Form form={form} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="percent">HomeHire fee on card payments (%)</Label>
        <Input id="percent" name="percent" defaultValue={percent} inputMode="decimal" className="w-32" />
      </div>
      <SubmitButton size="sm" variant="outline">Save</SubmitButton>
      <div className="w-full"><FormAlert state={state} /></div>
    </Form>
  );
}
