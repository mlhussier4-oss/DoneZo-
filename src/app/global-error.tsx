"use client";

import "./globals.css";

/** Last-resort screen if the whole site layout fails. Keeps its own <html> and <body>. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground">
        <title>Something went wrong · DoneZo</title>
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">DoneZo is having trouble</h1>
          <p className="text-muted-foreground">Please try again in a moment.</p>
          <button type="button" onClick={() => retry()} className="mt-2 rounded-lg bg-cta px-4 py-2 font-semibold text-cta-foreground">Try again</button>
        </div>
      </body>
    </html>
  );
}
