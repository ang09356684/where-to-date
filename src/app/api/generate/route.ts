import { NextResponse } from "next/server";
import { generateItineraries } from "@/lib/generate";
import type { GenerateRequest } from "@/types";

export async function POST(request: Request) {
  const body: GenerateRequest = await request.json();

  // Backward compat: normalize single string to array
  if (typeof body.type === "string") {
    body.type = (body.type as string).split(",").filter(Boolean) as GenerateRequest["type"];
  }

  const itineraries = generateItineraries(body);

  return NextResponse.json({ itineraries });
}
