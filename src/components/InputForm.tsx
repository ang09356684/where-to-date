"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CITIES = [
  { value: "不限", label: "不限" },
  { value: "台北", label: "台北" },
  { value: "桃園", label: "桃園" },
  { value: "宜蘭", label: "宜蘭" },
] as const;

const SUB_DISTRICTS: Record<string, { value: string; label: string }[]> = {
  台北: [
    { value: "台北-不限", label: "不限" },
    { value: "中正區", label: "中正" },
    { value: "大安區", label: "大安" },
    { value: "信義區", label: "信義" },
    { value: "中山區", label: "中山" },
    { value: "松山區", label: "松山" },
    { value: "大同區", label: "大同" },
    { value: "萬華區", label: "萬華" },
    { value: "士林區", label: "士林" },
    { value: "北投區", label: "北投" },
    { value: "文山區", label: "文山" },
    { value: "南港區", label: "南港" },
    { value: "內湖區", label: "內湖" },
  ],
  桃園: [
    { value: "桃園-不限", label: "不限" },
    { value: "桃園區", label: "桃園" },
    { value: "中壢區", label: "中壢" },
    { value: "平鎮區", label: "平鎮" },
    { value: "八德區", label: "八德" },
    { value: "楊梅區", label: "楊梅" },
    { value: "蘆竹區", label: "蘆竹" },
    { value: "龜山區", label: "龜山" },
    { value: "大園區", label: "大園" },
    { value: "觀音區", label: "觀音" },
    { value: "新屋區", label: "新屋" },
    { value: "大溪區", label: "大溪" },
    { value: "龍潭區", label: "龍潭" },
    { value: "復興區", label: "復興" },
  ],
  宜蘭: [
    { value: "宜蘭-不限", label: "不限" },
    { value: "宜蘭市", label: "宜蘭" },
    { value: "羅東鎮", label: "羅東" },
    { value: "蘇澳鎮", label: "蘇澳" },
    { value: "頭城鎮", label: "頭城" },
    { value: "礁溪鄉", label: "礁溪" },
    { value: "壯圍鄉", label: "壯圍" },
    { value: "員山鄉", label: "員山" },
    { value: "冬山鄉", label: "冬山" },
    { value: "五結鄉", label: "五結" },
    { value: "三星鄉", label: "三星" },
    { value: "大同鄉", label: "大同" },
    { value: "南澳鄉", label: "南澳" },
  ],
};

const TYPES = [
  { value: "all", label: "不限" },
  { value: "exhibition", label: "展覽" },
  { value: "concert", label: "演唱會" },
  { value: "music", label: "音樂會" },
  { value: "theater", label: "戲劇" },
  { value: "movie", label: "電影" },
  { value: "attraction", label: "景點" },
  { value: "food", label: "美食" },
] as const;

const SETTINGS = [
  { value: "both", label: "都可以" },
  { value: "indoor", label: "室內" },
  { value: "outdoor", label: "室外" },
] as const;

interface ChipGroupProps {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

function ChipGroup({ label, options, selected, onSelect }: ChipGroupProps) {
  return (
    <div className="mb-6">
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MultiChipGroupProps {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  maxSelect: number;
  allValue: string;
  onSelect: (values: string[]) => void;
}

function MultiChipGroup({ label, options, selected, maxSelect, allValue, onSelect }: MultiChipGroupProps) {
  const isFull = selected.length >= maxSelect && !selected.includes(allValue);

  const handleClick = (value: string) => {
    if (value === allValue) {
      onSelect([allValue]);
      return;
    }

    if (selected.includes(allValue)) {
      onSelect([value]);
      return;
    }

    if (selected.includes(value)) {
      const next = selected.filter((v) => v !== value);
      onSelect(next.length === 0 ? [allValue] : next);
      return;
    }

    if (selected.length < maxSelect) {
      onSelect([...selected, value]);
    }
  };

  return (
    <div className="mb-6">
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = selected.includes(opt.value);
          const isDisabled = isFull && !isActive && opt.value !== allValue;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleClick(opt.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : isDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-40 dark:bg-gray-800 dark:text-gray-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function InputForm() {
  const router = useRouter();
  const [city, setCity] = useState("不限");
  const [subDistrict, setSubDistrict] = useState("");
  const [types, setTypes] = useState<string[]>(["all"]);
  const [setting, setSetting] = useState("both");

  const handleCitySelect = (value: string) => {
    setCity(value);
    setSubDistrict("");
  };

  const handleSubmit = () => {
    // Determine the district value to send
    let district = "不限";
    if (city === "不限") {
      district = "不限";
    } else if (!subDistrict || subDistrict.endsWith("-不限")) {
      // City selected but no sub-district → send city name for city-wide match
      district = `${city}-all`;
    } else {
      district = subDistrict;
    }

    const params = new URLSearchParams({ district, type: types.join(","), setting });
    router.push(`/result?${params.toString()}`);
  };

  const subOptions = SUB_DISTRICTS[city];

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* City selector */}
      <ChipGroup
        label="地點"
        options={CITIES}
        selected={city}
        onSelect={handleCitySelect}
      />

      {/* Sub-district selector (expandable) */}
      {subOptions && (
        <div className="mb-6 -mt-3 ml-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          <label className="mb-2 block text-xs font-medium text-gray-400">
            區域
          </label>
          <div className="flex flex-wrap gap-2">
            {subOptions.map((opt) => {
              const isActive = subDistrict === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSubDistrict(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MultiChipGroup
        label="類型（最多 3 個）"
        options={TYPES}
        selected={types}
        maxSelect={3}
        allValue="all"
        onSelect={setTypes}
      />
      <ChipGroup
        label="場景"
        options={SETTINGS}
        selected={setting}
        onSelect={setSetting}
      />
      <button
        onClick={handleSubmit}
        className="mt-4 w-full rounded-full bg-gray-900 py-3 text-lg font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
      >
        幫我安排！
      </button>
    </div>
  );
}
