"use client";

import { useEffect, useRef, useState } from "react";

export type Palette = {
  id: string;
  name: string;
  emoji: string;
  accent: string;     // 主要 CTA、選中 chip
  onAccent: string;   // accent 上的文字（通常是白）
  heart: string;      // 我的最愛
  pin: string;        // 口袋名單
  surface: string;    // 頁面背景柔和色
  surfaceDark?: string; // dark mode 對應背景
};

// 來源：https://webdesignrankings.com/resources/lolcolors/
// 每個 palette 取自 lolcolors 4 色配色，並依照本專案語意（accent / heart / pin / surface）對應
export const PALETTES: Palette[] = [
  {
    id: "default",
    name: "預設",
    emoji: "🍎",
    accent: "#111827",
    onAccent: "#FFFFFF",
    heart: "#FF2D55",
    pin: "#AF52DE",
    surface: "#FFFFFF",
    surfaceDark: "#0A0A0A",
  },
  {
    id: "mint-lavender",
    name: "薄荷紫",
    emoji: "💎",
    accent: "#519D9E",
    onAccent: "#FFFFFF",
    heart: "#D1B6E1",
    pin: "#58C9B9",
    surface: "#E5F1F0",
    surfaceDark: "#1F3535",
  },
  {
    id: "peach-pop",
    name: "蜜桃橘",
    emoji: "🍑",
    accent: "#CE6D39",
    onAccent: "#FFFFFF",
    heart: "#F17F42",
    pin: "#754F44",
    surface: "#FFEEE4",
    surfaceDark: "#2B1F18",
  },
  {
    id: "primary-pop",
    name: "原色普普",
    emoji: "🎨",
    accent: "#30A9DE",
    onAccent: "#FFFFFF",
    heart: "#E53A40",
    pin: "#EFDC05",
    surface: "#FFFFFF",
    surfaceDark: "#0A0A0A",
  },
  {
    id: "lavender-mist",
    name: "薰衣草",
    emoji: "💜",
    accent: "#566270",
    onAccent: "#FFFFFF",
    heart: "#A593E0",
    pin: "#A593E0",
    surface: "#FFFFF3",
    surfaceDark: "#222630",
  },
  {
    id: "sunset-slate",
    name: "暮色橙",
    emoji: "🌅",
    accent: "#383A3F",
    onAccent: "#FFFFFF",
    heart: "#F68657",
    pin: "#F6B352",
    surface: "#FFF3E2",
    surfaceDark: "#1F2124",
  },
  {
    id: "forest-mint",
    name: "森林綠",
    emoji: "🌲",
    accent: "#285943",
    onAccent: "#FFFFFF",
    heart: "#8CD790",
    pin: "#77AF9C",
    surface: "#D7FFF1",
    surfaceDark: "#0E2118",
  },
  {
    id: "deep-purple",
    name: "深紫夜",
    emoji: "🌌",
    accent: "#9055A2",
    onAccent: "#FFFFFF",
    heart: "#D499B9",
    pin: "#2E294E",
    surface: "#F5E8EE",
    surfaceDark: "#011638",
  },
  {
    id: "retro-pop",
    name: "復古普普",
    emoji: "📻",
    accent: "#D81159",
    onAccent: "#FFFFFF",
    heart: "#FFBC42",
    pin: "#218380",
    surface: "#FFFAF0",
    surfaceDark: "#1A1820",
  },
  {
    id: "pastel-rainbow",
    name: "粉彩虹",
    emoji: "🌈",
    accent: "#84B1ED",
    onAccent: "#FFFFFF",
    heart: "#EE7785",
    pin: "#C89EC4",
    surface: "#E9F8F1",
    surfaceDark: "#1F3530",
  },
  {
    id: "sunset-coral",
    name: "夕陽珊瑚",
    emoji: "🪸",
    accent: "#FE4365",
    onAccent: "#FFFFFF",
    heart: "#FC9D9A",
    pin: "#C8C8A9",
    surface: "#FCEDE3",
    surfaceDark: "#2B1F1B",
  },
  {
    id: "tangerine-navy",
    name: "蜜柑藍",
    emoji: "🍊",
    accent: "#274555",
    onAccent: "#FFFFFF",
    heart: "#FF7761",
    pin: "#F9A11B",
    surface: "#FFF7E5",
    surfaceDark: "#0F1A22",
  },
  {
    id: "vintage-rose",
    name: "復古玫瑰",
    emoji: "🌹",
    accent: "#E94E77",
    onAccent: "#FFFFFF",
    heart: "#D68189",
    pin: "#C6A49A",
    surface: "#F5E5EA",
    surfaceDark: "#1F2B27",
  },
  {
    id: "retro-poster",
    name: "復古海報",
    emoji: "🎪",
    accent: "#BD1550",
    onAccent: "#FFFFFF",
    heart: "#E97F02",
    pin: "#F8CA00",
    surface: "#FFF7E5",
    surfaceDark: "#490A3D",
  },
];

function applyPalette(p: Palette) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  root.style.setProperty("--theme-accent", p.accent);
  root.style.setProperty("--theme-on-accent", p.onAccent);
  root.style.setProperty("--theme-heart", p.heart);
  root.style.setProperty("--theme-pin", p.pin);
  root.style.setProperty(
    "--theme-surface",
    isDark && p.surfaceDark ? p.surfaceDark : p.surface
  );
}

function readInitialIndex(): number {
  if (typeof window === "undefined") return 0;
  const savedId = window.localStorage.getItem("palette-id");
  if (!savedId) return 0;
  const found = PALETTES.findIndex((p) => p.id === savedId);
  if (found >= 0) return found;
  window.localStorage.removeItem("palette-id");
  return 0;
}

function readInitialDark(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export default function PaletteSwitcher() {
  const [index, setIndex] = useState<number>(0);
  const [dark, setDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Hydration-safe init: SSR renders defaults, client adopts localStorage values after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(readInitialIndex());
    setDark(readInitialDark());
    setMounted(true);
  }, []);

  useEffect(() => {
    applyPalette(PALETTES[index]);

    const observer = new MutationObserver(() => {
      applyPalette(PALETTES[index]);
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (i: number) => {
    setIndex(i);
    localStorage.setItem("palette-id", PALETTES[i].id);
  };

  const setMode = (next: boolean) => {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const current = PALETTES[index];

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="fixed right-4 top-4 z-50 h-10 w-10"
      />
    );
  }

  return (
    <div ref={wrapRef} className="fixed right-4 top-4 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="切換主題與配色"
        aria-expanded={open}
        title={`${dark ? "深色" : "淺色"}・${current.name}`}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        🎨
      </button>

      {open && (
        <div className="mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div
            role="group"
            aria-label="深淺模式"
            className="mb-2 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700"
          >
            <button
              onClick={() => setMode(false)}
              aria-pressed={!dark}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                !dark
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              ☀️ 淺色
            </button>
            <button
              onClick={() => setMode(true)}
              aria-pressed={dark}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                dark
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              🌙 深色
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto pr-0.5">
            {PALETTES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  select(i);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                  i === index
                    ? "bg-gray-100 dark:bg-gray-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <span>{p.emoji}</span>
                <span className="flex gap-0.5">
                  {[p.accent, p.heart, p.pin, p.surface].map((c, j) => (
                    <span
                      key={j}
                      className="h-4 w-3 rounded-sm border border-gray-200 dark:border-gray-700"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="flex-1 text-gray-700 dark:text-gray-200">
                  {p.name}
                </span>
                {i === index && (
                  <span className="text-gray-500 dark:text-gray-300">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
