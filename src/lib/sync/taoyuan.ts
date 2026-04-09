import { writeRawJson, readRawJson } from "@/lib/data";
import type { Place, SyncResult } from "@/types";

const URL = "https://travel.tycg.gov.tw/open-api/zh-tw/Travel/Attraction";

interface TaoyuanRawAttraction {
  id: number;
  name: string;
  categories: string[];
  description: string;
  location: {
    zipcode: string;
    district: string;
    address: string;
    longitude: number;
    latitude: number;
  };
  hours: string;
  admission: string;
  facilities: string[];
  website: string;
}

function parseXmlAttractions(xml: string): TaoyuanRawAttraction[] {
  const results: TaoyuanRawAttraction[] = [];
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

    results.push({
      id,
      name: get("Name"),
      categories: getAll("Class"),
      description: get("Description"),
      location: {
        zipcode: get("Zipcode"),
        district: get("District"),
        address: get("Address"),
        longitude: parseFloat(get("Px")) || 0,
        latitude: parseFloat(get("Py")) || 0,
      },
      hours: get("Opentime"),
      admission: get("Ticketinfo"),
      facilities: [],
      website: get("TYWebsite"),
    });
  }

  return results;
}

export async function syncTaoyuan(): Promise<SyncResult> {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(10000) });
    const xml = await res.text();
    const attractions = parseXmlAttractions(xml);

    writeRawJson("attractions-taoyuan.json", attractions);

    return {
      source: "taoyuan",
      status: "success",
      count: attractions.length,
    };
  } catch (e) {
    return {
      source: "taoyuan",
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function guessCategory(
  attraction: TaoyuanRawAttraction
): "indoor" | "outdoor" | "both" {
  const cats = (attraction.categories ?? []).join(" ");
  const name = attraction.name;
  const desc = attraction.description ?? "";
  const all = `${cats} ${name} ${desc}`;

  if (
    all.match(/步道|山|溪|瀑布|湖|海|公園|農場|花|自然|生態|觀景|天空/)
  ) {
    return "outdoor";
  }
  if (all.match(/博物館|美術館|紀念館|文化館|展覽|觀光工廠|室內/)) {
    return "indoor";
  }
  return "both";
}

export function taoyuanPlaces(): Place[] {
  const raw: TaoyuanRawAttraction[] = readRawJson(
    "attractions-taoyuan.json"
  );
  return raw.map((item) => ({
    id: `taoyuan-${item.id}`,
    name: item.name,
    type: "attraction" as const,
    source: "taoyuan",
    category: guessCategory(item),
    address: `桃園市${item.location.district}${item.location.address}`,
    district: item.location.district,
    lat: item.location.latitude,
    lng: item.location.longitude,
    sourceUrl: item.website
      ? `https://${item.website}`
      : undefined,
    goodFor: "both" as const,
    price: item.admission || undefined,
  }));
}
