"use client";

import { useEffect } from "react";
import { markNewJobsSeen } from "./actions";

/** Clears the red "new jobs" badge once the provider has opened the job board. */
export function MarkNewJobsSeen({ count }: { count: number }) {
  useEffect(() => { if (count > 0) void markNewJobsSeen(); }, [count]);
  return null;
}
