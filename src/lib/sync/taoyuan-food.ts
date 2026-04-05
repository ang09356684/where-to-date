import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://travel.tycg.gov.tw/open-api/zh-tw/Shop/Consume";

interface TaoyuanFoodRaw {
  id: number;
  name: string;
  categories: string[];
  description: string;
  district: string;
  address: string;
  longitude: number;
  latitude: number;
  website: string;
  openTime: string;
  charge: string;
}

function parseXmlFood(xml: string): TaoyuanFoodRaw[] {
  const results: TaoyuanFoodRaw[] = [];
  const infoRegex = /<Info>([\s\S]*?)<\/Info>/gi;
  let match;

  while ((match = infoRegex.exec(xml)) !== null) {
    const block = match[1];

    const get = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const getAll = (tag: string): string[] => {
      const matches: string[] = [];
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi");
      let m2;
      while ((m2 = r.exec(block)) !== null) {
        matches.push(m2[1].trim());
      }
      return matches;
    };

    const id = parseInt(get("Id"), 10);
    if (!id) continue;

    let name = get("Name");
    // API often returns empty Name; try extracting from Description
    if (!name) {
      const desc = get("Description");
      // Use first meaningful phrase or skip
      const firstSentence = desc.split(/[，。,\.]/)[0]?.trim() ?? "";
      // If description starts with a location/brand pattern, skip it
      if (firstSentence.length > 2 && firstSentence.length < 30) {
        name = firstSentence;
      }
    }
    if (!name || name.length < 2) continue;

    const categories = getAll("Class");

    // Skip non-food items (e.g. cinemas, department stores)
    const allText = `${name} ${categories.join(" ")}`;
    if (allText.match(/影城|百貨|購物|飯店客房|旅館|民宿/)) continue;

    results.push({
      id,
      name,
      categories,
      description: get("Description"),
      district: get("District"),
      address: get("Address"),
      longitude: parseFloat(get("Px")) || 0,
      latitude: parseFloat(get("Py")) || 0,
      website: get("TYWebsite"),
      openTime: get("Open-Time"),
      charge: get("Charge"),
    });
  }

  return results;
}

function guessType(item: TaoyuanFoodRaw): "restaurant" | "cafe" | "bar" {
  const all = `${item.name} ${item.categories.join(" ")} ${item.description}`;
  if (all.match(/咖啡|cafe|茶|甜點|烘焙|冰/i)) return "cafe";
  if (all.match(/酒|bar|pub|啤酒/i)) return "bar";
  return "restaurant";
}

export async function syncTaoyuanFood(): Promise<SyncResult> {
  try {
    const res = await fetch(URL);
    const xml = await res.text();
    const items = parseXmlFood(xml);

    writeRawJson("restaurants-taoyuan.json", items);

    return {
      source: "taoyuan-food",
      status: "success",
      count: items.length,
    };
  } catch (e) {
    return {
      source: "taoyuan-food",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function taoyuanFoodPlaces(): Place[] {
  const raw: TaoyuanFoodRaw[] = readRawJson("restaurants-taoyuan.json");
  return raw.map((item) => ({
    id: `ty-food-${item.id}`,
    name: item.name,
    type: guessType(item),
    source: "taoyuan-food",
    category: "indoor" as const,
    address: `桃園市${item.district}${item.address}`,
    district: item.district,
    lat: item.latitude || undefined,
    lng: item.longitude || undefined,
    sourceUrl: item.website
      ? `https://${item.website}`
      : undefined,
    goodFor: "both" as const,
    price: item.charge || undefined,
  }));
}
