import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const fallbackSiteUrl = "https://dealyva.me";
const siteUrl = (
  process.env.PUBLIC_SITE_URL ||
  process.env.VITE_PUBLIC_SITE_URL ||
  fallbackSiteUrl
).replace(/\/+$/, "");
const browserRoutes = process.env.SEO_CLEAN_URLS === "true";
const feed = JSON.parse(
  await readFile(resolve("public/data/promotions.json"), "utf8"),
);
const promotions = Array.isArray(feed?.promotions) ? feed.promotions : [];
const staticRoutes = [
  "",
  "/marques",
  "/categories",
  "/a-propos",
  "/comment-ca-marche",
  "/faq",
  "/mentions-legales",
  "/conditions-utilisation",
  "/confidentialite",
  "/cookies",
];
const brandRoutes = [
  ...new Set(
    promotions
      .map((promotion) => promotion?.brandId)
      .filter((value) => typeof value === "string" && value),
  ),
].map((brandId) => `/marque/${encodeURIComponent(brandId)}`);
const offerRoutes = promotions
  .map((promotion) => promotion?.id)
  .filter((value) => typeof value === "string" && value)
  .map((promotionId) => `/offre/${encodeURIComponent(promotionId)}`);
const routes = browserRoutes
  ? [...staticRoutes, ...brandRoutes, ...offerRoutes]
  : [""];
const now = new Date().toISOString().slice(0, 10);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(
    (route) =>
      `  <url><loc>${siteUrl}${route}</loc><lastmod>${now}</lastmod></url>`,
  ),
  "</urlset>",
  "",
].join("\n");
const robots = [
  "User-agent: *",
  "Allow: /",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

await Promise.all([
  writeFile(resolve("public/sitemap.xml"), sitemap),
  writeFile(resolve("public/robots.txt"), robots),
]);

console.log(
  `SEO généré : ${routes.length} URL${routes.length > 1 ? "s" : ""} pour ${siteUrl}`,
);
