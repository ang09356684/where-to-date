import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const SITEMAP_URL = "https://www.opentix.life/otWebSitemap.xml";
const MAX_EVENTS = 50;
const CONCERT_KEYWORDS = /演唱會|巡迴|Live|Tour|LIVE|音樂節|Festival/i;

interface OpentixRaw {
  title: string;
  date?: string;
  venue?: string;
  link: string;
}

export async function syncOpentix(): Promise<SyncResult> {
  try {
    // Fetch sitemap and extract event URLs
    const sitemapRes = await fetch(SITEMAP_URL);
    const xml = await sitemapRes.text();

    const urlRegex = /https:\/\/www\.opentix\.life\/event\/\d+/g;
    const allUrls = [...new Set(xml.match(urlRegex) ?? [])];
    const eventUrls = allUrls.slice(0, MAX_EVENTS);

    if (eventUrls.length === 0) {
      writeRawJson("performances-opentix.json", []);
      return { source: "opentix", status: "success", count: 0 };
    }

    // Use Playwright to visit each event page
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const items: OpentixRaw[] = [];

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      for (const url of eventUrls) {
        try {
          await page.goto(url, { timeout: 10000, waitUntil: "domcontentloaded" });
          await page.waitForTimeout(2000);

          const title = await page.title().catch(() => "");
          // Clean up title — OPENTIX titles often end with " | OPENTIX"
          const cleanTitle = title
            .replace(/\s*[|｜]\s*OPENTIX.*$/i, "")
            .replace(/\s*-\s*OPENTIX.*$/i, "")
            .trim();

          if (cleanTitle && cleanTitle.length > 2) {
            items.push({
              title: cleanTitle,
              link: url,
            });
          }
        } catch {
          // Skip failed pages silently
        }
      }
    } finally {
      await browser.close();
    }

    writeRawJson("performances-opentix.json", items);
    return { source: "opentix", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "opentix",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function opentixPlaces(): Place[] {
  const raw: OpentixRaw[] = readRawJson("performances-opentix.json");
  return raw.map((item, i) => ({
    id: `opentix-${i}`,
    name: item.title,
    type: CONCERT_KEYWORDS.test(item.title) ? ("concert" as const) : ("music" as const),
    source: "opentix",
    category: "indoor" as const,
    address: "台北市",
    district: "不限",
    sourceUrl: item.link,
    startDate: item.date,
    goodFor: "both" as const,
  }));
}
