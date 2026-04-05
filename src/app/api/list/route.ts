import { NextResponse } from "next/server";
import { readCombinedPlaces } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const all = readCombinedPlaces();
  const filtered = type
    ? all.filter((p) => p.type === type)
    : all;

  return NextResponse.json({ places: filtered, total: filtered.length });
}
