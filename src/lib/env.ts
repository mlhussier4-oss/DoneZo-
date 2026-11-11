function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

// NEXT_PUBLIC_ values must be referenced literally so Next.js can inline them in the browser bundle.
export const publicEnv = {
  siteUrl: () => required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
};

/** An absolute URL on this site, built from the configured site address (not the request's Host header). */
export function siteUrl(path: string): URL {
  return new URL(path, publicEnv.siteUrl());
}
