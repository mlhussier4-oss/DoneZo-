"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { convertEstimate, deleteDraft, setEstimateStatus } from "../../invoices/actions";

export function EstimateButtons({ estimateId, status }: { estimateId: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? <Button size="sm" disabled={pending} onClick={() => run(() => setEstimateStatus(estimateId, "sent"))}>Mark as sent</Button> : null}
        {status === "sent" ? (
          <>
            <Button size="sm" disabled={pending} onClick={() => run(() => setEstimateStatus(estimateId, "accepted"))}>Customer accepted</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setEstimateStatus(estimateId, "declined"))}>Customer declined</Button>
          </>
        ) : null}
        {status === "accepted" || status === "sent" ? (
          <Button size="sm" variant={status === "accepted" ? "primary" : "outline"} disabled={pending} onClick={() => run(() => convertEstimate(estimateId))}>
            Turn into invoice
          </Button>
        ) : null}
        {status === "draft" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Delete this draft estimate?") && run(() => deleteDraft("estimate", estimateId))}>
            Delete draft
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
