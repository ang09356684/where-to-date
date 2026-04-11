import Header from "@/components/Header";
import InputForm from "@/components/InputForm";
import SyncButton from "@/components/SyncButton";
import Link from "next/link";

const BROWSE_LINKS = [
  { href: "/exhibitions", label: "展覽", icon: "🎨" },
  { href: "/concerts", label: "演唱會", icon: "🎤" },
  { href: "/music", label: "音樂會", icon: "🎼" },
  { href: "/theater", label: "戲劇", icon: "🎭" },
  { href: "/movies", label: "電影", icon: "🎬" },
  { href: "/attractions", label: "景點", icon: "🏞️" },
  { href: "/food", label: "美食", icon: "🍽️" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <Header />
      <InputForm />

      <Link
        href="/favorites"
        className="mt-8 flex w-full max-w-lg items-center justify-center gap-2 rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 py-3 text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/40"
      >
        ❤️ 我的最愛
      </Link>

      <Link
        href="/custom-places"
        className="mt-3 flex w-full max-w-lg items-center justify-center gap-2 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 py-3 text-sm font-medium text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-100 dark:hover:bg-violet-900/40"
      >
        📍 自訂地點
      </Link>

      <div className="mt-3 grid w-full max-w-lg grid-cols-2 gap-3">
        {BROWSE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {link.icon} {link.label}
          </Link>
        ))}
      </div>

      <SyncButton />
    </main>
  );
}
