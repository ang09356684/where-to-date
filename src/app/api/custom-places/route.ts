import { NextResponse } from "next/server";
import { readRawJson, writeRawJson } from "@/lib/data";
import { combineAllPlaces } from "@/lib/combine";
import type { Place } from "@/types";

const FILENAME = "custom-places.json";

export async function GET() {
  const places = readRawJson<Place[]>(FILENAME);
  return NextResponse.json(places);
}

export async function POST(request: Request) {
  const body: Omit<Place, "id" | "source"> = await request.json();

  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const place: Place = { ...body, id, source: "custom" };

  const existing = readRawJson<Place[]>(FILENAME);
  existing.push(place);
  writeRawJson(FILENAME, existing);
  combineAllPlaces();

  return NextResponse.json(place, { status: 201 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const existing = readRawJson<Place[]>(FILENAME);
  const filtered = existing.filter((p) => p.id !== id);
  writeRawJson(FILENAME, filtered);
  combineAllPlaces();

  return NextResponse.json({ ok: true });
}
