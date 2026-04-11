import BrowseList from "@/components/BrowseList";

export default function RestaurantsPage() {
  return (
    <BrowseList
      title="美食"
      apiType="food"
      icon="🍽️"
      iconBg="bg-orange-100"
      badgeBg="bg-orange-50"
      badgeText="text-orange-600"
      sourceLabels={{
        curated: "精選",
        "taoyuan-curated": "桃園精選",
        custom: "自訂",
      }}
      countLabel="筆"
    />
  );
}
