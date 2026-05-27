import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/auth/"],
    },
    sitemap: "https://finace-bit.vercel.app/sitemap.xml",
  }
}
