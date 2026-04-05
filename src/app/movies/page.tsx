import BrowseList from "@/components/BrowseList";

export default function MoviesPage() {
  return (
    <BrowseList
      title="現正上映電影"
      apiType="movie"
      icon="🎬"
      iconBg="bg-blue-100"
      badgeBg="bg-blue-50"
      badgeText="text-blue-600"
      countLabel="部"
    />
  );
}
