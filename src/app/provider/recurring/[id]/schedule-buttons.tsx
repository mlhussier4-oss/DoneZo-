"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setScheduleStatus } from "../actions";

export function ScheduleStatusButtons({ scheduleId, status }: { scheduleId: string; status: "active" | "paused" | "canceled" }) {
  const [pending, start] = useTransition();
  if (status === "canceled") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => setScheduleStatus(scheduleId, "paused"))}>
          Pause
        </Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => start(() => setScheduleStatus(scheduleId, "active"))}>
          Resume
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Cancel this recurring service? Upcoming visits that haven't started are removed. Past and completed visits are kept."))
            start(() => setScheduleStatus(scheduleId, "canceled"));
        }}
      >
        Cancel service
      </Button>
    </div>
  );
}
