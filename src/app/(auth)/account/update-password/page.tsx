import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the password-reset email; the proxy requires a signed-in session.
export default function UpdatePasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a password</CardTitle>
        <p className="text-sm text-muted-foreground">You&apos;ll use it with your email to sign in to DoneZo.</p>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
