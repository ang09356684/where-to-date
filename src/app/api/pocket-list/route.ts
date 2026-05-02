import { NextResponse } from "next/server";
import { readRawJson, writeRawJson } from "@/lib/data";
import { combineAllPlaces } from "@/lib/combine";
import type { Place } from "@/types";

const FILENAME = "pocket-list.json";

export async function GET() {
  const places = readRawJson<Place[]>(FILENAME);
  return NextResponse.json(places);
}

export async function POST(request: Request) {
  const body: Omit<Place, "id" | "source"> = await request.json();

  const id = `pocket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const place: Place = { ...body, id, source: "pocket" };

  const existing = readRawJson<Place[]>(FILENAME);
  existing.push(place);
  writeRawJson(FILENAME, existing);
  combineAllPlaces();

  return NextResponse.json(place, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Payload must be an array of places" },
      { status: 400 }
    );
  }
  writeRawJson(FILENAME, body);
  combineAllPlaces();
  return NextResponse.json({ ok: true, count: body.length });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const existing = readRawJson<Place[]>(FILENAME);
  const filtered = existing.filter((p) => p.id !== id);
  writeRawJson(FILENAME, filtered);
  combineAllPlaces();

  return NextResponse.json({ ok: true });
}
