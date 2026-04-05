import BrowseList from "@/components/BrowseList";

export default function ConcertsPage() {
  return (
    <BrowseList
      title="音樂 / 演唱會"
      apiType="concert"
      icon="🎵"
      iconBg="bg-rose-100"
      badgeBg="bg-rose-50"
      badgeText="text-rose-600"
      sourceLabels={{
        "culture-music": "文化部",
        tixcraft: "拓元售票",
        "era-ticket": "年代售票",
      }}
      countLabel="場"
    />
  );
}
