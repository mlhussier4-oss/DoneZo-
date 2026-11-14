"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { acceptBid, cancelBookingAsCustomer, cancelRequest, decideChangeOrder, submitReview } from "../actions";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error));
  return { pending, error, run };
}

export function AcceptBidButton({ bidId, businessName, priceCents }: { bidId: string; businessName: string; priceCents: number }) {
  const { pending, error, run } = useRun();
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (confirm(`Choose ${businessName} for ${formatMoney(priceCents)}?\n\nThey'll be notified right away and have 5 minutes to confirm with an arrival time. You can chat with them below. You pay after the work is done.`))
            run(() => acceptBid(bidId));
        }}
      >
        {pending ? "Notifying them…" : `Choose ${businessName}`}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const { pending, error, run } = useRun();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm("Cancel this request? Providers will be told it's no longer available.") && run(() => cancelRequest(requestId))}>
        Cancel request
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const { pending, error, run } = useRun();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => {
        const reason = prompt("Cancel this booking? This counts on your cancellation record (3 within 6 months pauses your marketplace access). Tell the provider why (optional):");
        if (reason !== null) run(() => cancelBookingAsCustomer(bookingId, reason));
      }}>
        Cancel booking
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}

export function ChangeOrderDecision({ changeOrderId }: { changeOrderId: string }) {
  const { pending, error, run } = useRun();
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => decideChangeOrder(changeOrderId, true))}>Approve new price</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => decideChangeOrder(changeOrderId, false))}>Decline</Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function ReviewForm({ bookingId, businessName }: { bookingId: string; businessName: string }) {
  const { pending, error, run } = useRun();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">How did {businessName} do?</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-muted">
              <Star className={cn("size-7", n <= rating ? "fill-warning text-warning" : "text-input")} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Comments (optional)" htmlFor="review-comment">
        <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
      </Field>
      <Button disabled={pending || rating === 0} onClick={() => run(() => submitReview(bookingId, rating, comment))}>Post review</Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export { ReportProblemForm } from "@/components/marketplace/report-problem-form";
