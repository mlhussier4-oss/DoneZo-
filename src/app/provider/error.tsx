"use client";

import { ErrorView } from "@/components/errors/error-view";

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} homeHref="/provider" />;
}
