import type { Place, CultureRawItem } from "@/types";
import { writeRawJson, readRawJson } from "@/lib/data";
import type { SyncResult } from "@/types";

const BASE_URL =
  "https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=";

function isTaipei(item: CultureRawItem): boolean {
  return (item.showInfo ?? []).some((s) => {
    const loc = (s.location ?? "") + (s.locationName ?? "");
    return loc.includes("臺北") || loc.includes("台北");
  });
}

function extractDistrict(address: string): string {
  const match = address.match(/(臺北市|台北市)(.{2,3}區)/);
  return match ? match[2] : "其他";
}

function toPlace(
  item: CultureRawItem,
  type: Place["type"],
  sourcePrefix: string
): Place {
  const info = item.showInfo?.[0];
  return {
    id: `${sourcePrefix}-${item.UID}`,
    name: item.title,
    type,
    source: sourcePrefix,
    category: "indoor",
    address: info?.location ?? "",
    district: extractDistrict(info?.location ?? ""),
    lat: info?.latitude ? parseFloat(info.latitude) : undefined,
    lng: info?.longitude ? parseFloat(info.longitude) : undefined,
    imageUrl: item.imageUrl || undefined,
    sourceUrl: item.sourceWebPromote || item.webSales || undefined,
    startDate: item.startDate?.replaceAll("/", "-"),
    endDate: item.endDate?.replaceAll("/", "-"),
    goodFor: "both",
    price: info?.price || undefined,
  };
}

async function syncCategory(
  category: number,
  filename: string,
  sourceName: string
): Promise<SyncResult> {
  try {
    const res = await fetch(`${BASE_URL}${category}`, { signal: AbortSignal.timeout(10000) });
    const all: CultureRawItem[] = await res.json();
    const taipei = all.filter(isTaipei);

    writeRawJson(filename, taipei);

    return { source: sourceName, status: "success", count: taipei.length };
  } catch (e) {
    return {
      source: sourceName,
      status: "error",
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// category=6 展覽
export async function syncCulture(): Promise<SyncResult> {
  return syncCategory(6, "exhibitions-culture.json", "culture");
}

// category=1 音樂（演唱會、音樂會）
export async function syncCultureMusic(): Promise<SyncResult> {
  return syncCategory(1, "performances-music.json", "culture-music");
}

// category=2 戲劇（舞台劇、音樂劇）
export async function syncCultureTheater(): Promise<SyncResult> {
  return syncCategory(2, "performances-theater.json", "culture-theater");
}

export function culturePlaces(): Place[] {
  const raw: CultureRawItem[] = readRawJson("exhibitions-culture.json");
  return raw.map((item) => toPlace(item, "exhibition", "culture"));
}

const CONCERT_KEYWORDS = /演唱會|巡迴|Live|Tour|LIVE|音樂節|Festival/i;

function isConcert(title: string): boolean {
  return CONCERT_KEYWORDS.test(title);
}

export function cultureMusicPlaces(): Place[] {
  const raw: CultureRawItem[] = readRawJson("performances-music.json");
  return raw.map((item) =>
    toPlace(
      item,
      isConcert(item.title) ? "concert" : "music",
      "culture-music"
    )
  );
}

export function cultureTheaterPlaces(): Place[] {
  const raw: CultureRawItem[] = readRawJson("performances-theater.json");
  return raw.map((item) => toPlace(item, "theater", "culture-theater"));
}
