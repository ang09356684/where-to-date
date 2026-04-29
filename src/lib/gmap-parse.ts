export type GmapParseResult = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

// `maps.app.goo.gl/...` short links serve a JS-only SPA stub to desktop browsers.
// Bot UAs (facebookexternalhit, googlebot, generic curl) get the real 302 redirect
// to `www.google.com/maps/place/...` and a server-rendered page with og:title
// containing both name and address joined by " · ".
const BOT_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const FETCH_HEADERS = {
  "User-Agent": BOT_UA,
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
} as const;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1.5 * 1024 * 1024;

export class GmapFetchError extends Error {
  constructor(public code: "fetch-failed" | "timeout" | "parse-failed") {
    super(code);
    this.name = "GmapFetchError";
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    });
}

function parseFromUrl(url: string): GmapParseResult {
  const out: GmapParseResult = {};

  const nameMatch = url.match(/\/maps\/place\/([^/@?#]+)/);
  if (nameMatch) {
    try {
      const decoded = decodeURIComponent(nameMatch[1].replace(/\+/g, " ")).trim();
      if (decoded) out.name = decoded;
    } catch {
      /* ignore */
    }
  }

  const dst = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const m = dst ?? at;
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      out.lat = lat;
      out.lng = lng;
    }
  }

  return out;
}

type LdAddress =
  | string
  | {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };

type LdItem = {
  "@type"?: string | string[];
  name?: string;
  address?: LdAddress;
};

const PLACE_TYPES = /^(Place|Restaurant|LocalBusiness|TouristAttraction|FoodEstablishment|Hotel|Store|Museum|Park)/;

function extractJsonLd(html: string): LdItem[] {
  const out: LdItem[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") out.push(item as LdItem);
        }
      } else if (parsed && typeof parsed === "object") {
        out.push(parsed as LdItem);
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return out;
}

function flattenLdAddress(addr: LdAddress | undefined): string | undefined {
  if (!addr) return;
  if (typeof addr === "string") return addr.trim() || undefined;
  const parts = [
    addr.postalCode,
    addr.addressRegion,
    addr.addressLocality,
    addr.streetAddress,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  return parts.length ? parts.join("") : undefined;
}

function findPlaceLd(items: LdItem[]): { name?: string; address?: string } {
  for (const item of items) {
    const t = item["@type"];
    const types = Array.isArray(t) ? t : t ? [t] : [];
    if (!types.some((x) => PLACE_TYPES.test(String(x)))) continue;
    const name = typeof item.name === "string" ? item.name.trim() : undefined;
    const address = flattenLdAddress(item.address);
    if (name || address) return { name, address };
  }
  return {};
}

function parseMetaContent(html: string, attr: string, key: string): string | undefined {
  const re1 = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`,
    "i"
  );
  const m = html.match(re1) ?? html.match(re2);
  if (!m) return;
  const decoded = decodeHtmlEntities(m[1]).trim();
  return decoded || undefined;
}

function cleanOgTitle(raw: string): string {
  return raw.replace(/\s*[·\-–—]\s*Google\s*(Maps|地圖)\s*$/i, "").trim();
}

// Google Maps og:title format: "<NAME> · <ADDRESS>" (middle dot U+00B7 with spaces).
// Split on the FIRST such separator only — addresses can themselves contain `·`.
function splitOgTitle(raw: string): { name?: string; address?: string } {
  const cleaned = cleanOgTitle(raw);
  const sepIdx = cleaned.search(/\s+[·•・]\s+/);
  if (sepIdx === -1) return cleaned ? { name: cleaned } : {};
  const name = cleaned.slice(0, sepIdx).trim();
  const rest = cleaned.slice(sepIdx).replace(/^\s+[·•・]\s+/, "").trim();
  const result: { name?: string; address?: string } = {};
  if (name) result.name = name;
  if (rest) result.address = rest;
  return result;
}

const TW_ADDRESS_RE =
  /(?:\d{3,5}\s*)?(?:台北市|臺北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|臺中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|臺南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|臺東縣|澎湖縣|金門縣|連江縣|基隆市)[^"<>\n]{4,80}?(?:號|樓|段)/;

function parseAddressByRegex(html: string): string | undefined {
  const m = html.match(TW_ADDRESS_RE);
  if (!m) return;
  return decodeHtmlEntities(m[0]).trim();
}

const GENERIC_DESCRIPTIONS = [
  /Find local businesses/i,
  /Google Maps 提供您準確的/,
  /地圖搜尋本地商家/,
];

function isGenericDescription(text: string): boolean {
  return GENERIC_DESCRIPTIONS.some((re) => re.test(text));
}

export function parseGoogleMapsHtml(html: string, finalUrl: string): GmapParseResult {
  const result: GmapParseResult = {};

  const fromUrl = parseFromUrl(finalUrl);
  if (fromUrl.name) result.name = fromUrl.name;
  if (fromUrl.lat != null) result.lat = fromUrl.lat;
  if (fromUrl.lng != null) result.lng = fromUrl.lng;

  const og = parseMetaContent(html, "property", "og:title");
  if (og) {
    const split = splitOgTitle(og);
    if (split.name && !result.name) result.name = split.name;
    if (split.address && !result.address) result.address = split.address;
  }

  const ld = findPlaceLd(extractJsonLd(html));
  if (ld.name && !result.name) result.name = ld.name;
  if (ld.address && !result.address) result.address = ld.address;

  if (!result.address) {
    const desc = parseMetaContent(html, "name", "description");
    if (desc && !isGenericDescription(desc)) result.address = desc;
  }

  if (!result.address) {
    const fromBody = parseAddressByRegex(html);
    if (fromBody) result.address = fromBody;
  }

  return result;
}

function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ["g_st", "shorturl"]) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return url;
  }
}

async function readBoundedText(res: Response): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  try {
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      total += value.byteLength;
    }
    html += decoder.decode();
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  return html;
}

async function fetchOnce(url: string, extraHeaders?: HeadersInit): Promise<{ html: string; finalUrl: string }> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { ...FETCH_HEADERS, ...extraHeaders },
  });
  if (!res.ok) throw new GmapFetchError("fetch-failed");
  const html = await readBoundedText(res);
  return { html, finalUrl: res.url };
}

export async function fetchAndParseGmap(url: string): Promise<GmapParseResult & { resolvedUrl: string }> {
  const cleanUrl = stripTrackingParams(url);
  let html: string;
  let finalUrl: string;

  try {
    ({ html, finalUrl } = await fetchOnce(cleanUrl));
  } catch (err) {
    if (err instanceof GmapFetchError) throw err;
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new GmapFetchError("timeout");
    }
    throw new GmapFetchError("fetch-failed");
  }

  if (/consent\.google\.com/.test(finalUrl)) {
    try {
      const retried = await fetchOnce(cleanUrl, { Cookie: "CONSENT=YES+" });
      if (!/consent\.google\.com/.test(retried.finalUrl)) {
        html = retried.html;
        finalUrl = retried.finalUrl;
      }
    } catch {
      /* fall through to whatever we got from URL parse */
    }
  }

  const parsed = parseGoogleMapsHtml(html, finalUrl);
  return { ...parsed, resolvedUrl: finalUrl };
}
