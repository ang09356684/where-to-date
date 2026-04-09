"use client";

import { useState } from "react";

interface SyncProgress {
  progress: number;
  total: number;
  label: string;
}

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setSyncProgress(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines from buffer
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const match = line.match(/^data:\s*(.+)$/m);
          if (!match) continue;

          try {
            const data = JSON.parse(match[1]);

            if (data.done) {
              setResult(`同步完成！共 ${data.totalPlaces} 筆資料`);
              setSyncProgress(null);
            } else if (data.status !== "syncing") {
              setSyncProgress({
                progress: data.progress,
                total: data.total,
                label: data.label ?? data.source,
              });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch {
      setResult("同步失敗，請稍後再試");
      setSyncProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const pct = syncProgress
    ? Math.round((syncProgress.progress / syncProgress.total) * 100)
    : 0;

  return (
    <div className="mt-8 w-full max-w-lg mx-auto text-center">
      <button
        onClick={handleSync}
        disabled={loading}
        className="text-sm text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
      >
        {loading && !syncProgress
          ? "連線中..."
          : loading
            ? "同步中..."
            : "同步最新展覽 / 電影資料"}
      </button>

      {/* Progress bar */}
      {syncProgress && (
        <div className="mt-3 px-2">
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-900 dark:bg-gray-100 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {syncProgress.progress}/{syncProgress.total} — {syncProgress.label}
          </p>
        </div>
      )}

      {result && (
        <p className="mt-2 text-xs text-gray-500">{result}</p>
      )}
    </div>
  );
}
