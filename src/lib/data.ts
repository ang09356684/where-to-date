import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { Place } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const COMBINED_DIR = path.join(DATA_DIR, "combined");

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readRawJson<T>(filename: string): T {
  const filePath = path.join(RAW_DIR, filename);
  if (!existsSync(filePath)) return [] as unknown as T;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function writeRawJson(filename: string, data: unknown): void {
  ensureDir(RAW_DIR);
  writeFileSync(
    path.join(RAW_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export function readCombinedPlaces(): Place[] {
  const filePath = path.join(COMBINED_DIR, "all-places.json");
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function writeCombinedJson(filename: string, data: unknown): void {
  ensureDir(COMBINED_DIR);
  writeFileSync(
    path.join(COMBINED_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}
