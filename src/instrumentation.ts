import type { Instrumentation } from "next";

/**
 * Every server error is written to the server log as one line of JSON with the same code ("digest")
 * the user sees, so support can find it. Hosting providers collect these logs automatically.
 * Request bodies, cookies and headers are never logged.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(JSON.stringify({
    level: "error",
    at: new Date().toISOString(),
    digest: e.digest,
    message: e.message,
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
  }));
};
