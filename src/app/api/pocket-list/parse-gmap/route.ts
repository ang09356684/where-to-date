import { fetchAndParseGmap, GmapFetchError } from "@/lib/gmap-parse";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "share.google",
  "www.google.com",
  "maps.google.com",
  "google.com",
]);

// 手機 gmaps 分享按鈕的 clipboard 是「店名\n\nhttps://share.google/xxx」這種混合字串，
// 從整段裡掃出第一個合法的 URL 再交給後續流程。
const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCT_RE = /[.,;)\]}'"]+$/;

function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches) return null;
  return matches[0].replace(TRAILING_PUNCT_RE, "");
}

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-url" }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return Response.json({ error: "invalid-url" }, { status: 400 });

  const candidate = extractFirstUrl(raw) ?? raw;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return Response.json({ error: "invalid-url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return Response.json({ error: "not-google" }, { status: 400 });
  }

  if (
    /(?:^|\.)google\.com$/.test(parsed.hostname) &&
    !parsed.pathname.startsWith("/maps")
  ) {
    return Response.json({ error: "not-google" }, { status: 400 });
  }

  try {
    const result = await fetchAndParseGmap(parsed.toString());
    if (!result.name && !result.address) {
      return Response.json({ error: "parse-failed" }, { status: 502 });
    }
    return Response.json(result);
  } catch (err) {
    if (err instanceof GmapFetchError) {
      return Response.json({ error: err.code }, { status: 502 });
    }
    return Response.json({ error: "fetch-failed" }, { status: 502 });
  }
}
