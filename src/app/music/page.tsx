import BrowseList from "@/components/BrowseList";

export default function MusicPage() {
  return (
    <BrowseList
      title="音樂會"
      apiType="music"
      icon="🎼"
      iconBg="bg-indigo-100"
      badgeBg="bg-indigo-50"
      badgeText="text-indigo-600"
      sourceLabels={{
        "culture-music": "文化部",
      }}
      countLabel="場"
    />
  );
}
