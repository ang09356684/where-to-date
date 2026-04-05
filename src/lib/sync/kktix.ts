import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://kktix.com/events";

interface KktixRaw {
  title: string;
  date?: string;
  link: string;
}

export async function syncKktix(): Promise<SyncResult> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const items: KktixRaw[] = [];

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(URL, { timeout: 15000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      // Extract event data from rendered page
      const events = await page.evaluate(() => {
        const results: { title: string; date?: string; link: string }[] = [];

        // Try common KKTIX selectors
        const cards = document.querySelectorAll(
          ".event-list-item, [class*='event'], article, .card"
        );

        cards.forEach((card) => {
          const linkEl = card.querySelector("a[href*='/events/']") as HTMLAnchorElement;
          const titleEl =
            card.querySelector("h2, h3, .name, [class*='title'], [class*='name']");
          const dateEl =
            card.querySelector("time, .date, [class*='date'], [class*='time']");

          const title = titleEl?.textContent?.trim() ?? "";
          const link = linkEl?.href ?? "";

          if (title && title.length > 2 && link) {
            results.push({
              title,
              date: dateEl?.textContent?.trim(),
              link,
            });
          }
        });

        // Fallback: extract all event links if card selectors miss
        if (results.length === 0) {
          document.querySelectorAll("a[href*='/events/']").forEach((a) => {
            const el = a as HTMLAnchorElement;
            const text = el.textContent?.trim() ?? "";
            if (text.length > 3 && text.length < 100) {
              results.push({ title: text, link: el.href });
            }
          });
        }

        return results;
      });

      // Deduplicate by link
      const seen = new Set<string>();
      for (const ev of events) {
        if (!seen.has(ev.link)) {
          seen.add(ev.link);
          items.push(ev);
        }
      }
    } finally {
      await browser.close();
    }

    writeRawJson("performances-kktix.json", items);
    return { source: "kktix", status: "success", count: items.length };
  } catch (e) {
    return {
      source: "kktix",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function kktixPlaces(): Place[] {
  const raw: KktixRaw[] = readRawJson("performances-kktix.json");
  return raw.map((item, i) => ({
    id: `kktix-${i}`,
    name: item.title,
    type: "concert" as const,
    source: "kktix",
    category: "indoor" as const,
    address: "台北市",
    district: "不限",
    sourceUrl: item.link,
    goodFor: "both" as const,
  }));
}
