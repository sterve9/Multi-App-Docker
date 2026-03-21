"use client";

import { useEffect, useState } from "react";
import { api, Video } from "@/lib/api";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  GENERATING: "En cours…",
  READY: "Prêt",
  FAILED: "Échec",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-gray-400",
  GENERATING: "text-yellow-400 animate-pulse",
  READY: "text-green-400",
  FAILED: "text-red-400",
};

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    const load = () => api.listVideos().then(setVideos);
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historique</h1>
        <Link
          href="/create"
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-semibold transition"
        >
          + Nouvelle vidéo
        </Link>
      </div>

      {videos.length === 0 && (
        <p className="text-gray-500">Aucune vidéo générée pour l&apos;instant.</p>
      )}

      <ul className="flex flex-col gap-3">
        {videos.map((v) => (
          <li
            key={v.id}
            className="bg-gray-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{v.title}</p>
              <p className={`text-sm ${STATUS_COLOR[v.status] ?? "text-gray-400"}`}>
                {STATUS_LABEL[v.status] ?? v.status}
              </p>
            </div>
            {v.status === "READY" && v.video_path && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/videos/${v.id}.mp4`}
                download
                className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded-lg text-sm transition"
              >
                Télécharger
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
