import type { MetadataRoute } from "next";
import { indexable, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api", "/login", "/activate", "/forgot", "/set-password"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
