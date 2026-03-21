import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold">TikTok Publisher</h1>
      <p className="text-gray-400 text-center max-w-md">
        Génère des vidéos TikTok virales avec Claude AI + Remotion
      </p>
      <div className="flex gap-4">
        <Link
          href="/create"
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition"
        >
          Créer une vidéo
        </Link>
        <Link
          href="/history"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
        >
          Historique
        </Link>
      </div>
    </main>
  );
}
