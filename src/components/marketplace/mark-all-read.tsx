"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/marketplace/actions";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => markAllNotificationsRead())}>Mark all as read</Button>;
}
