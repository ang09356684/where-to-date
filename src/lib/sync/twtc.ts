import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://www.twtc.com.tw/exhibition.aspx?p=menu1";

interface TwtcRaw {
  title: string;
  dateRange: string;
  organizer?: string;
  venue: string;
  link?: string;
}

export async function syncTwtc(): Promise<SyncResult> {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(10000) });
    const html = await res.text();

    const items: TwtcRaw[] = [];

    // TWTC uses <table> with rows for each exhibition
    // Each row: date | name | organizer | phone | venue
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const row = match[0];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
      }

      // Expect: [date, name, organizer, phone, venue] or similar
      if (cells.length < 3) continue;

      const dateStr = cells[0];
      const name = cells[1]
        ?.replace(/\s+/g, " ")
        .replace(/\s*more\s*$/i, "")
        .trim();
      if (!name || name.length < 2 || dateStr.includes("展出日期")) continue;

      // Extract link if present
      const linkMatch = row.match(/href="([^"]*)"/);

      items.push({
        title: name,
        dateRange: dateStr,
        organizer: cells[2] || undefined,
        venue: cells.length >= 5 ? cells[4] : "世貿中心",
        link: linkMatch
          ? linkMatch[1].startsWith("http")
            ? linkMatch[1]
            : `https://www.twtc.com.tw/${linkMatch[1]}`
          : undefined,
      });
    }

    writeRawJson("exhibitions-twtc.json", items);
    return { source: "twtc", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "twtc",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function venueToAddress(venue: string): string {
  if (venue.includes("南港展覽館2") || venue.includes("南港二"))
    return "臺北市南港區經貿二路2號";
  if (venue.includes("南港展覽館") || venue.includes("南港一"))
    return "臺北市南港區經貿二路1號";
  return "臺北市信義區信義路五段5號";
}

function venueToDistrict(venue: string): string {
  if (venue.includes("南港")) return "南港區";
  return "信義區";
}

export function twtcPlaces(): Place[] {
  const raw: TwtcRaw[] = readRawJson("exhibitions-twtc.json");
  return raw.map((item, i) => ({
    id: `twtc-${i}`,
    name: item.title,
    type: "exhibition" as const,
    source: "twtc",
    category: "indoor" as const,
    address: venueToAddress(item.venue),
    district: venueToDistrict(item.venue),
    sourceUrl: item.link,
    goodFor: "both" as const,
  }));
}
