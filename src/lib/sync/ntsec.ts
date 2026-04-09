import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://www.ntsec.gov.tw/article/list.aspx?a=25";

interface NtsecRaw {
  title: string;
  date?: string;
  location?: string;
  imageUrl?: string;
  link: string;
}

export async function syncNtsec(): Promise<SyncResult> {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(10000) });
    const html = await res.text();

    const items: NtsecRaw[] = [];
    const seen = new Set<string>();

    // Structure:
    // <a href="...article/detail.aspx?a=5462" class="message-item click-cursor">
    //   <div><img src="...ArticleListPic/5462_2.png"><p>2024.07.31</p></div>
    //   <div class="newsMessage-content">《末日學校》特展</div>
    //   <div class="message-annotation">4F 東側展區</div>
    // </a>
    const itemRegex =
      /<a[^>]*href="([^"]*article\/detail\.aspx\?a=(\d+))"[^>]*class="[^"]*message-item[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
    let match;

    while ((match = itemRegex.exec(html)) !== null) {
      const link = match[1];
      const id = match[2];
      if (seen.has(id)) continue;
      seen.add(id);

      const block = match[0];

      const titleMatch = block.match(
        /class="newsMessage-content"[^>]*>([\s\S]*?)<\/div>/i
      );
      const dateMatch = block.match(/<p>(\d{4}\.\d{2}\.\d{2})<\/p>/);
      const imgMatch = block.match(
        /src="([^"]*ArticleListPic[^"]*)"/i
      );
      const locMatch = block.match(
        /class="message-annotation"[^>]*>([^<]*)<\/div>/i
      );

      const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
      if (!title || title.length < 3) continue;

      items.push({
        title,
        date: dateMatch?.[1],
        location: locMatch?.[1]?.trim(),
        imageUrl: imgMatch?.[1],
        link,
      });
    }

    writeRawJson("exhibitions-ntsec.json", items);
    return { source: "ntsec", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "ntsec",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function ntsecPlaces(): Place[] {
  const raw: NtsecRaw[] = readRawJson("exhibitions-ntsec.json");
  return raw.map((item, i) => ({
    id: `ntsec-${i}`,
    name: item.title,
    type: "exhibition" as const,
    source: "ntsec",
    category: "indoor" as const,
    address: "臺北市士林區士商路189號",
    district: "士林區",
    imageUrl: item.imageUrl,
    sourceUrl: item.link,
    goodFor: "both" as const,
  }));
}
