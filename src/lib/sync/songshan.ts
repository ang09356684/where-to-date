import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://www.songshanculturalpark.org/exhibition";

interface SongshanRaw {
  title: string;
  startDate?: string;
  endDate?: string;
  link: string;
  imageUrl?: string;
}

export async function syncSongshan(): Promise<SyncResult> {
  try {
    const res = await fetch(URL);
    const html = await res.text();

    const items: SongshanRaw[] = [];
    const seen = new Set<string>();

    // Structure: <a href="/exhibition/activity/{id}">
    //              <img src="/gallery/..." alt="">
    //              <h3>title</h3>
    //              <p>2025-12-27 - 2026-04-06</p>
    //            </a>
    const linkRegex =
      /href="(\/exhibition\/activity\/[^"]+)"[\s\S]*?<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      if (seen.has(link)) continue;
      seen.add(link);

      const block = match[0];

      // Extract image
      const imgMatch = block.match(/src="(\/gallery\/[^"]+)"/);
      // Extract title from <p class="title"> or <h3>
      const titleMatch =
        block.match(/<p[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ??
        block.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
      // Extract date range
      const dateMatch = block.match(
        /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/
      );

      const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
      if (!title || title.length < 3) continue;

      items.push({
        title,
        startDate: dateMatch?.[1],
        endDate: dateMatch?.[2],
        link: `https://www.songshanculturalpark.org${link}`,
        imageUrl: imgMatch
          ? `https://www.songshanculturalpark.org${imgMatch[1]}`
          : undefined,
      });
    }

    writeRawJson("exhibitions-songshan.json", items);
    return { source: "songshan", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "songshan",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function songshanPlaces(): Place[] {
  const raw: SongshanRaw[] = readRawJson("exhibitions-songshan.json");
  return raw.map((item, i) => ({
    id: `songshan-${i}`,
    name: item.title,
    type: "exhibition" as const,
    source: "songshan",
    category: "indoor" as const,
    address: "臺北市信義區光復南路133號",
    district: "信義區",
    imageUrl: item.imageUrl,
    sourceUrl: item.link,
    startDate: item.startDate,
    endDate: item.endDate,
    goodFor: "both" as const,
  }));
}
