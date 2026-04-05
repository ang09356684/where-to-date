import { NextResponse } from "next/server";
import { syncCulture, syncCultureMusic, syncCultureTheater } from "@/lib/sync/culture";
import { syncHuashan } from "@/lib/sync/huashan";
import { syncSongshan } from "@/lib/sync/songshan";
import { syncTwtc } from "@/lib/sync/twtc";
import { syncNtsec } from "@/lib/sync/ntsec";
import { syncAtmovies } from "@/lib/sync/atmovies";
import { syncTaipeiAttractions } from "@/lib/sync/taipei-attractions";
import { syncTaoyuan } from "@/lib/sync/taoyuan";
import { syncTixcraft } from "@/lib/sync/tixcraft";
import { syncEraTicket } from "@/lib/sync/era-ticket";
import { syncKham } from "@/lib/sync/kham";
import { syncOpentix } from "@/lib/sync/opentix";
import { syncKktix } from "@/lib/sync/kktix";
import { combineAllPlaces } from "@/lib/combine";
import type { SyncResult } from "@/types";

export async function POST() {
  const results: SyncResult[] = await Promise.all([
    syncCulture(),
    syncCultureMusic(),
    syncCultureTheater(),
    syncHuashan(),
    syncSongshan(),
    syncTwtc(),
    syncNtsec(),
    syncAtmovies(),
    syncTaipeiAttractions(),
    syncTaoyuan(),
    syncTixcraft(),
    syncEraTicket(),
    syncKham(),
    syncOpentix(),
    syncKktix(),
  ]);

  const allPlaces = combineAllPlaces();

  return NextResponse.json({
    results,
    totalPlaces: allPlaces.length,
  });
}
