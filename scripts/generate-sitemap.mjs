import { writeFile } from "node:fs/promises";

if (process.env.GITHUB_ACTIONS && !process.env.SITE_URL)
  throw new Error(
    "SITE_URL repository variable is required for production SEO files.",
  );
const base = (process.env.SITE_URL || "http://localhost:4173").replace(
  /\/$/,
  "",
);
const routes = [
  "/",
  "/about",
  "/concerns",
  "/services",
  "/packages",
  "/shop",
  "/booking",
  "/gallery",
  "/results",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/cancellation-policy",
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${base}/#${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile("dist/sitemap.xml", xml);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
);
console.log(`Generated sitemap and robots file with ${routes.length} routes.`);
