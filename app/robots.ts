import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waveanime.me";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/anime/", "/watch/", "/schedule/", "/search/", "/continue-watching/"],
      disallow: ["/admin/", "/api/", "/profile/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
