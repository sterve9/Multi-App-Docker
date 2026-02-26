"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Video, VideoStatus } from "@/lib/api";
import { VideoCard } from "@/components/VideoCard";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { StatusBadge } from "../components/StatusBadge";
import { RefreshCw, Youtube, Film, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROCESSING_STATUSES: VideoStatus[] = [
  "scripting", "generating_images", "generating_audio", "assembling", "uploading",
];

const ALL_STATUSES: VideoStatus[] = [
  "draft", "scripting", "generating_images", "generating_audio",
  "assembling", "ready", "uploading", "published", "failed",
];

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        <div className="text-xs text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [videos, setVideos]           = useState<Video[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filter, setFilter]           = useState<VideoStatus | "ALL">("ALL");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const data = await api.listVideos();
      setVideos(data);
      setLastRefresh(new Date());
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  useEffect(() => {
    const hasProcessing = videos.some((v) => PROCESSING_STATUSES.includes(v.status));
    if (!hasProcessing) return;
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const handleCreated = (video: Video) => setVideos((p) => [video, ...p]);
  const handleDelete  = (id: string)   => setVideos((p) => p.filter((v) => v.id !== id));
  const handleRefresh = (updated: Video) => setVideos((p) => p.map((v) => v.id === updated.id ? updated : v));

  const filtered = filter === "ALL" ? videos : videos.filter((v) => v.status === filter);
  const stats = {
    total:      videos.length,
    processing: videos.filter((v) => PROCESSING_STATUSES.includes(v.status)).length,
    ready:      videos.filter((v) => v.status === "ready").length,
    published:  videos.filter((v) => v.status === "published").length,
    failed:     videos.filter((v) => v.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-none">YouTube Publisher</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Pipeline IA automatisé</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 hidden sm:block">
              {lastRefresh ? lastRefresh.toLocaleTimeString("fr-FR") : "--:--:--"}
            </span>
            <Button variant="ghost" size="sm" onClick={fetchVideos}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <CreateVideoDialog onCreated={handleCreated} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total"    value={stats.total}
            icon={<Film className="w-4 h-4 text-zinc-300" />}           color="bg-zinc-800" />
          <StatCard label="En cours" value={stats.processing}
            icon={<RefreshCw className="w-4 h-4 text-blue-400" />}      color="bg-blue-950" />
          <StatCard label="Prêtes"   value={stats.ready}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} color="bg-emerald-950" />
          <StatCard label="Publiées" value={stats.published}
            icon={<Youtube className="w-4 h-4 text-sky-400" />}         color="bg-sky-950" />
          <StatCard label="Erreurs"  value={stats.failed}
            icon={<XCircle className="w-4 h-4 text-red-400" />}         color="bg-red-950" />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {videos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === "ALL" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}>
              Toutes ({videos.length})
            </button>
            {ALL_STATUSES.map((s) => {
              const count = videos.filter((v) => v.status === s).length;
              if (count === 0) return null;
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}>
                  <StatusBadge status={s} />
                  <span className="text-zinc-500">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-44 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-zinc-900 rounded-2xl mb-4 border border-zinc-800">
              <Film className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">Aucune vidéo</p>
            <p className="text-zinc-600 text-sm mt-1">Lance le pipeline pour créer ta première vidéo</p>
            <div className="mt-6"><CreateVideoDialog onCreated={handleCreated} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={handleDelete} onRefresh={handleRefresh} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}