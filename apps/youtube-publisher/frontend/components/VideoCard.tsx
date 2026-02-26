"use client";

import { Video, api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { useState } from "react";

interface Props {
  video: Video;
  onDelete: (id: string) => void;
  onRefresh: (video: Video) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

const isProcessing = (status: string) =>
  ["GENERATING_SCRIPT", "GENERATING_IMAGES", "GENERATING_AUDIO", "ASSEMBLING_VIDEO"].includes(status);

export function VideoCard({ video, onDelete, onRefresh }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer cette vidéo ?")) return;
    setDeleting(true);
    try {
      await api.deleteVideo(video.id);
      onDelete(video.id);
    } catch {
      setDeleting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const updated = await api.getVideo(video.id);
      onRefresh(updated);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all duration-200">
      {isProcessing(video.status) && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-violet-600 to-orange-600 rounded-t-xl animate-pulse" />
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm">
            {video.title || video.topic || "Sans titre"}
          </h3>
          {video.topic && video.title && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{video.topic}</p>
          )}
        </div>
        <StatusBadge status={video.status} />
      </div>

      {video.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{video.description}</p>
      )}

      {video.tags && video.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {video.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
              #{tag}
            </span>
          ))}
          {video.tags.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 text-zinc-500">+{video.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Clock className="w-3 h-3" />
          {timeAgo(video.created_at)}
        </span>

        <div className="flex items-center gap-1">
          {isProcessing(video.status) && (
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}
              className="h-7 w-7 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          {video.status === "COMPLETED" && (
            <Button size="sm" variant="ghost" asChild
              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950">
              <a href={api.getDownloadUrl(video.id)} target="_blank" rel="noreferrer">
                <Download className="w-3.5 h-3.5 mr-1" />Télécharger
              </a>
            </Button>
          )}
          {video.youtube_url && (
            <Button size="sm" variant="ghost" asChild
              className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950">
              <a href={video.youtube_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />YouTube
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}
            className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 hover:bg-red-950">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}