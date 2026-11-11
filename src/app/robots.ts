import type { MetadataRoute } from "next";

/** During the private test, ask search engines not to list any page. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_PRIVATE_TEST === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/provider", "/customer", "/admin", "/i/", "/e/", "/api/"] } };
}
