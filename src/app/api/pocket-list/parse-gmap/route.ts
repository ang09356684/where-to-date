import { fetchAndParseGmap, GmapFetchError } from "@/lib/gmap-parse";

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "maps.google.com",
  "google.com",
]);

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-url" }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return Response.json({ error: "invalid-url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(raw);
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
