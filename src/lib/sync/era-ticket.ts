import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://www.ticket.com.tw/";

interface EraRaw {
  title: string;
  date: string;
  imageUrl?: string;
  link: string;
}

export async function syncEraTicket(): Promise<SyncResult> {
  try {
    const res = await fetch(URL);
    const html = await res.text();

    const items: EraRaw[] = [];
    const seen = new Set<string>();

    // Structure: <a href="...UTK0201_.aspx?PRODUCT_ID=...">
    //   <img src="..."> <div>date</div> <h4>title</h4>
    // </a>
    const blockRegex =
      /<a[^>]*href="([^"]*PRODUCT_ID=[^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
      const link = match[1];
      const productId = link.match(/PRODUCT_ID=([^&"]+)/)?.[1] ?? "";
      if (!productId || seen.has(productId)) continue;
      seen.add(productId);

      const block = match[0];

      // Extract title from <h4>
      const titleMatch = block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
      // Extract image
      const imgMatch = block.match(/src="([^"]*utiki[^"]*)"/i);
      // Extract date
      const dateMatch = block.match(
        /(\d{2}\/\d{2}\([^)]*\)(?:\s*-\s*\d{2}\/\d{2}\([^)]*\))?)/
      );

      const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";
      if (!title || title.length < 3) continue;

      items.push({
        title,
        date: dateMatch?.[1]?.trim() ?? "",
        imageUrl: imgMatch?.[1],
        link: link.startsWith("http")
          ? link
          : `https://www.ticket.com.tw${link}`,
      });
    }

    writeRawJson("performances-era.json", items);
    return { source: "era-ticket", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "era-ticket",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function eraTicketPlaces(): Place[] {
  const raw: EraRaw[] = readRawJson("performances-era.json");
  return raw.map((item, i) => ({
    id: `era-${i}`,
    name: item.title,
    type: "concert" as const,
    source: "era-ticket",
    category: "indoor" as const,
    address: "台北市",
    district: "不限",
    imageUrl: item.imageUrl,
    sourceUrl: item.link,
    goodFor: "both" as const,
  }));
}
