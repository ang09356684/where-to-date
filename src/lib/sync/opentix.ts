import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const SITEMAP_URL = "https://www.opentix.life/otWebSitemap.xml";
const MAX_EVENTS = 50;
const BATCH_SIZE = 10;
const CONCERT_KEYWORDS = /演唱會|巡迴|Live|Tour|LIVE|音樂節|Festival/i;

interface OpentixRaw {
  title: string;
  date?: string;
  venue?: string;
  link: string;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[—\-|｜]\s*OPENTIX.*$/i, "")
    .trim();
}

export async function syncOpentix(): Promise<SyncResult> {
  try {
    const sitemapRes = await fetch(SITEMAP_URL, { signal: AbortSignal.timeout(10000) });
    const xml = await sitemapRes.text();

    const urlRegex = /https:\/\/www\.opentix\.life\/event\/\d+/g;
    const allUrls = [...new Set(xml.match(urlRegex) ?? [])];
    const eventUrls = allUrls.slice(0, MAX_EVENTS);

    if (eventUrls.length === 0) {
      writeRawJson("performances-opentix.json", []);
      return { source: "opentix", status: "success", count: 0 };
    }

    const items: OpentixRaw[] = [];

    // Fetch pages in parallel batches
    for (let i = 0; i < eventUrls.length; i += BATCH_SIZE) {
      const batch = eventUrls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          const html = await res.text();

          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = cleanTitle(titleMatch?.[1] ?? "");

          return { title, link: url };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.title.length > 2) {
          items.push(r.value);
        }
      }
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
