/**
 * Brand settings. HomeHire is the approved working name; change it here and the
 * whole site updates. The logo is a placeholder (see components/brand/logo.tsx).
 */
export const brand = {
  name: "HomeHire",
  tagline: "Post a job. Receive bids. Choose your provider.",
  description:
    "HomeHire connects homeowners with local service providers, and gives providers the tools to run their whole business.",
  /** Shown on the Help page only when set (NEXT_PUBLIC_SUPPORT_EMAIL). Signed-in users use the support form. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
} as const;
