import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";

async function RedirectToHome(): Promise<null> {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/login");
}

/** Sends each user to their own area. */
export default function DashboardPage() {
  return (
    <Suspense>
      <RedirectToHome />
    </Suspense>
  );
}
