import BrowseList from "@/components/BrowseList";

export default function TheaterPage() {
  return (
    <BrowseList
      title="戲劇 / 舞台劇"
      apiType="theater"
      icon="🎭"
      iconBg="bg-fuchsia-100"
      badgeBg="bg-fuchsia-50"
      badgeText="text-fuchsia-600"
      sourceLabels={{
        "culture-theater": "文化部",
      }}
      countLabel="場"
    />
  );
}
