"use client";

import { useState } from "react";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      const summary = data.results
        .map(
          (r: { source: string; status: string; count: number }) =>
            `${r.source}: ${r.count}筆`
        )
        .join(" / ");
      setResult(`同步完成！${summary}（共 ${data.totalPlaces} 筆）`);
    } catch {
      setResult("同步失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 text-center">
      <button
        onClick={handleSync}
        disabled={loading}
        className="text-sm text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
      >
        {loading ? "同步中..." : "同步最新展覽 / 電影資料"}
      </button>
      {result && (
        <p className="mt-2 text-xs text-gray-500">{result}</p>
      )}
    </div>
  );
}
