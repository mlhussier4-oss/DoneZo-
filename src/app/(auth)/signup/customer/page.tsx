import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailCodeForm } from "../../_components/email-code-form";

export const metadata: Metadata = { title: "Customer sign up" };

export default function CustomerSignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Just your email. You can also skip this and create your account when you post your first job.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmailCodeForm askName />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Run a service business?{" "}
          <Link href="/signup/provider" className="font-medium text-primary hover:underline">
            Sign up as a provider
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
