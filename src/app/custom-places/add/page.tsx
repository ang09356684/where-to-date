"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PlaceType } from "@/types";

const TYPES: { value: PlaceType; label: string }[] = [
  { value: "exhibition", label: "展覽" },
  { value: "concert", label: "演唱會" },
  { value: "music", label: "音樂會" },
  { value: "theater", label: "戲劇" },
  { value: "movie", label: "電影" },
  { value: "attraction", label: "景點" },
  { value: "restaurant", label: "餐廳" },
  { value: "cafe", label: "咖啡廳" },
  { value: "bar", label: "酒吧" },
];

const CATEGORIES = [
  { value: "both", label: "都可以" },
  { value: "indoor", label: "室內" },
  { value: "outdoor", label: "室外" },
] as const;

function extractDistrict(address: string): string {
  const match = address.match(
    /(中正區|大安區|信義區|中山區|松山區|大同區|萬華區|士林區|北投區|文山區|南港區|內湖區|桃園區|中壢區|大溪區|復興區|龍潭區)/
  );
  return match ? match[1] : "不限";
}

export default function AddCustomPlacePage() {
  const router = useRouter();
  const [type, setType] = useState<PlaceType>("restaurant");
  const [category, setCategory] = useState<"indoor" | "outdoor" | "both">(
    "both"
  );
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = name.trim() && address.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");

    try {
      const district = extractDistrict(address.trim());
      const res = await fetch("/api/custom-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          category,
          address: address.trim(),
          district,
          goodFor: "both" as const,
        }),
      });

      if (!res.ok) throw new Error("儲存失敗");
      router.push("/custom-places");
    } catch {
      setError("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <Link
          href="/custom-places"
          className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; 返回自訂地點
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">
          新增地點
        </h1>

        {/* Type selector */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            分類
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  type === t.value
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category selector */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            場景
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  category === c.value
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            地點名稱
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：鼎泰豐信義店"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none"
          />
        </div>

        {/* Address input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            地址
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例：台北市信義區信義路二段194號"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none"
          />
          {address.trim() && (
            <p className="mt-1.5 text-xs text-gray-400">
              行政區：{extractDistrict(address.trim())}
            </p>
          )}
        </div>

        {/* Preview */}
        {canSave && (
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
            <p className="mb-1 text-xs font-medium text-gray-400">預覽</p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {name.trim()}
            </p>
            <p className="text-sm text-gray-500">{address.trim()}</p>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                {TYPES.find((t) => t.value === type)?.label}
              </span>
              <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                {CATEGORIES.find((c) => c.value === category)?.label}
              </span>
              <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                {extractDistrict(address.trim())}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full rounded-full bg-gray-900 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
      </div>
    </main>
  );
}
