"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { clearMyHome } from "./actions";

export function ClearHomeButton() {
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => clearMyHome())}>Clear</Button>;
}
