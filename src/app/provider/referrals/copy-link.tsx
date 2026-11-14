"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copy or share the provider's referral link. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Your referral link" data-testid="referral-link"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 text-sm" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="accent" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select-and-copy still works */ }
        }}>
          {copied ? <><Check /> Copied</> : <><Copy /> Copy link</>}
        </Button>
        {canShare ? (
          <Button type="button" variant="outline" onClick={() => navigator.share({ title: "Join me on HomeHire", text: "I use HomeHire to find local jobs and run my business. Sign up with my link:", url }).catch(() => {})}>
            <Share2 /> Share
          </Button>
        ) : null}
      </div>
    </div>
  );
}
