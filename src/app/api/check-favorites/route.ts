import { NextResponse } from "next/server";
import { readCombinedPlaces } from "@/lib/data";

export async function POST(request: Request) {
  const { ids }: { ids: string[] } = await request.json();
  const allPlaces = readCombinedPlaces();
  const activeIds = new Set(allPlaces.map((p) => p.id));

  const results: Record<string, boolean> = {};
  for (const id of ids) {
    results[id] = activeIds.has(id);
  }

  return NextResponse.json({ results });
}
