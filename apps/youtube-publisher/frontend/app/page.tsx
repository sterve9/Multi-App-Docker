"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Video, VideoStatus } from "@/lib/api";
import { VideoCard } from "@/components/VideoCard";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { StatusBadge } from "../components/StatusBadge";
import { RefreshCw, Youtube, Film, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROCESSING_STATUSES: VideoStatus[] = [
  "scripting", "generating_images", "generating_audio", "assembling", "uploading",
];

const ALL_STATUSES: VideoStatus[] = [
  "draft", "scripting", "generating_images", "generating_audio",
  "assembling", "ready", "uploading", "published", "failed",
];

function StatCard({
  label, value, icon, color, active, onClick, pulse,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
  onClick?: () => void;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative group bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 transition-all duration-200 w-full text-left
        ${active
          ? "border-zinc-500 ring-1 ring-zinc-500/40 bg-zinc-800/60"
          : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40"
        }`}
    >
      {pulse && value > 0 && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      <div className={`p-2.5 rounded-lg shrink-0 ${color} transition-transform duration-200 group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white tabular-nums leading-none">{value}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
      </div>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-zinc-400 rounded-full" />
      )}
    </button>
  );
}

export default function Dashboard() {
  const [videos, setVideos]           = useState<Video[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [filter, setFilter]           = useState<VideoStatus | "ALL">("ALL");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchVideos = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.listVideos();
      setVideos(data);
      setLastRefresh(new Date());
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  useEffect(() => {
    const hasProcessing = videos.some((v) => PROCESSING_STATUSES.includes(v.status));
    if (!hasProcessing) return;
    const interval = setInterval(() => fetchVideos(true), 10000);
    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const handleCreated = (video: Video) => setVideos((p) => [video, ...p]);
  const handleDelete  = (id: string)   => setVideos((p) => p.filter((v) => v.id !== id));
  const handleRefresh = (updated: Video) => setVideos((p) => p.map((v) => v.id === updated.id ? updated : v));

  const stats = {
    total:      videos.length,
    processing: videos.filter((v) => PROCESSING_STATUSES.includes(v.status)).length,
    ready:      videos.filter((v) => v.status === "ready").length,
    published:  videos.filter((v) => v.status === "published").length,
    failed:     videos.filter((v) => v.status === "failed").length,
  };

  const filterByGroup = (group: "processing" | "ready" | "published" | "failed") => {
    const groupMap: Record<string, VideoStatus[]> = {
      processing: PROCESSING_STATUSES,
      ready:      ["ready"],
      published:  ["published"],
      failed:     ["failed"],
    };
    const statuses = groupMap[group];
    if (statuses.includes(filter as VideoStatus)) {
      setFilter("ALL");
    } else {
      const primary = statuses.find((s) => videos.some((v) => v.status === s)) ?? statuses[0];
      setFilter(primary);
    }
  };

  const isGroupActive = (group: "processing" | "ready" | "published" | "failed") => {
    const groupMap: Record<string, VideoStatus[]> = {
      processing: PROCESSING_STATUSES,
      ready:      ["ready"],
      published:  ["published"],
      failed:     ["failed"],
    };
    return groupMap[group].includes(filter as VideoStatus);
  };

  const filteredDisplay = filter === "ALL"
    ? videos
    : PROCESSING_STATUSES.includes(filter as VideoStatus)
      ? videos.filter((v) => PROCESSING_STATUSES.includes(v.status))
      : videos.filter((v) => v.status === filter);

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
            <span className="text-xs text-zinc-600 hidden sm:block tabular-nums">
              {lastRefresh ? lastRefresh.toLocaleTimeString("fr-FR") : "--:--:--"}
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={() => fetchVideos()}
              disabled={refreshing}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8 w-8 p-0"
            >
              {refreshing
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                : <RefreshCw className="w-4 h-4" />
              }
            </Button>
            <CreateVideoDialog onCreated={handleCreated} />
          </div>
        </div>

        {/* Bannière en cours */}
        {stats.processing > 0 && (
          <div className="border-t border-zinc-800/60 bg-blue-950/20">
            <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
              <span className="text-xs text-blue-300">
                <span className="font-semibold">{stats.processing}</span> vidéo{stats.processing > 1 ? "s" : ""} en cours de génération…
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-blue-600/40 to-transparent ml-2" />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stat cards cliquables */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total"    value={stats.total}
            icon={<Film className="w-4 h-4 text-zinc-300" />}
            color="bg-zinc-800"
            active={filter === "ALL"}
            onClick={() => setFilter("ALL")}
          />
          <StatCard label="En cours" value={stats.processing}
            icon={<RefreshCw className="w-4 h-4 text-blue-400" />}
            color="bg-blue-950"
            active={isGroupActive("processing")}
            onClick={() => filterByGroup("processing")}
            pulse
          />
          <StatCard label="Prêtes"   value={stats.ready}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            color="bg-emerald-950"
            active={isGroupActive("ready")}
            onClick={() => filterByGroup("ready")}
          />
          <StatCard label="Publiées" value={stats.published}
            icon={<Youtube className="w-4 h-4 text-sky-400" />}
            color="bg-sky-950"
            active={isGroupActive("published")}
            onClick={() => filterByGroup("published")}
          />
          <StatCard label="Erreurs"  value={stats.failed}
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            color="bg-red-950"
            active={isGroupActive("failed")}
            onClick={() => filterByGroup("failed")}
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Filter bar */}
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

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-44 animate-pulse" />
            ))}
          </div>
        ) : filteredDisplay.length === 0 ? (
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
            {filteredDisplay.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={handleDelete} onRefresh={handleRefresh} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}