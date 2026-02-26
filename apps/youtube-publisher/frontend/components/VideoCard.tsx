"use client";

import { Video, api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ExternalLink, RefreshCw, Clock, RotateCcw, AlertTriangle, CheckCircle2, Mic, ImageIcon, Film, Upload } from "lucide-react";
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

const PROCESSING_STATUSES = ["scripting", "generating_images", "generating_audio", "assembling", "uploading"];

// ─── Pipeline steps avec % de progression ────────────────────────────────────
const PIPELINE_STEPS: {
  status: string;
  label: string;
  icon: React.ReactNode;
  percent: number;
}[] = [
  { status: "scripting",         label: "Script",     icon: <Film className="w-3 h-3" />,      percent: 10 },
  { status: "generating_images", label: "Images",     icon: <ImageIcon className="w-3 h-3" />, percent: 35 },
  { status: "generating_audio",  label: "Audio",      icon: <Mic className="w-3 h-3" />,       percent: 60 },
  { status: "assembling",        label: "Assemblage", icon: <RefreshCw className="w-3 h-3" />, percent: 80 },
  { status: "uploading",         label: "Upload",     icon: <Upload className="w-3 h-3" />,    percent: 95 },
];

const STEP_ORDER = PIPELINE_STEPS.map((s) => s.status);

function getProgressPercent(status: string): number {
  if (status === "ready" || status === "published") return 100;
  if (status === "failed") return 0;
  const step = PIPELINE_STEPS.find((s) => s.status === status);
  return step?.percent ?? 0;
}

function PipelineProgress({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STEP_ORDER.indexOf(currentStatus);
  const percent      = getProgressPercent(currentStatus);
  const currentStep  = PIPELINE_STEPS.find((s) => s.status === currentStatus);

  return (
    <div className="mb-3 space-y-2">

      {/* % label + étape courante */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          {currentStep && (
            <span className="animate-pulse text-blue-400">{currentStep.icon}</span>
          )}
          {currentStep?.label ?? currentStatus}
        </span>
        <span className="text-[11px] font-semibold text-blue-400 tabular-nums">{percent}%</span>
      </div>

      {/* Barre de progression */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent animate-[shimmer_2s_infinite]" />
        {/* Fill */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Steps dots */}
      <div className="flex items-center justify-between px-0.5">
        {PIPELINE_STEPS.map((step, i) => {
          const isDone    = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isPending = i > currentIndex;
          return (
            <div key={step.status} className="flex flex-col items-center gap-0.5">
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300
                ${isDone    ? "bg-emerald-400" : ""}
                ${isCurrent ? "bg-blue-400 ring-2 ring-blue-400/30 scale-125" : ""}
                ${isPending ? "bg-zinc-700" : ""}
              `} />
              <span className={`text-[9px] hidden sm:block transition-colors
                ${isDone    ? "text-emerald-600" : ""}
                ${isCurrent ? "text-blue-400 font-medium" : ""}
                ${isPending ? "text-zinc-700" : ""}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VideoCard ────────────────────────────────────────────────────────────────
export function VideoCard({ video, onDelete, onRefresh }: Props) {
  const [deleting,   setDeleting]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resuming,   setResuming]   = useState(false);
  const [showError,  setShowError]  = useState(false);

  const isProcessing = PROCESSING_STATUSES.includes(video.status);
  const isFailed     = video.status === "failed";
  const isReady      = video.status === "ready";
  const isPublished  = video.status === "published";

  async function handleDelete() {
    if (!confirm("Supprimer cette vidéo ?")) return;
    setDeleting(true);
    try {
      await api.deleteVideo(video.id);
      onDelete(video.id);
    } catch { setDeleting(false); }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const updated = await api.getVideo(video.id);
      onRefresh(updated);
    } finally { setRefreshing(false); }
  }

  async function handleResume() {
    if (!confirm("Reprendre le pipeline là où il s'est arrêté ?")) return;
    setResuming(true);
    try {
      await api.resumeVideo(video.id);
      await new Promise((r) => setTimeout(r, 1500));
      const updated = await api.getVideo(video.id);
      onRefresh(updated);
    } catch (e) { console.error(e); }
    finally { setResuming(false); }
  }

  return (
    <div className={`group relative bg-zinc-900 border rounded-xl p-5 transition-all duration-200
      ${isFailed     ? "border-red-900/60 hover:border-red-800" : ""}
      ${isProcessing ? "border-blue-900/40 hover:border-blue-800/60" : ""}
      ${!isFailed && !isProcessing ? "border-zinc-800 hover:border-zinc-700" : ""}
    `}>

      {/* Top shimmer bar — processing */}
      {isProcessing && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-violet-600 to-orange-500 rounded-t-xl animate-pulse" />
      )}

      {/* Published checkmark */}
      {isPublished && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Title + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm leading-snug">
            {video.title || video.topic || "Sans titre"}
          </h3>
          {video.topic && video.title && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{video.topic}</p>
          )}
        </div>
        {!isPublished && <StatusBadge status={video.status} />}
      </div>

      {/* Pipeline progress — processing only */}
      {isProcessing && <PipelineProgress currentStatus={video.status} />}

      {/* Description */}
      {video.description && !isProcessing && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{video.description}</p>
      )}

      {/* Error */}
      {isFailed && video.error_message && (
        <div className="mb-3">
          <button onClick={() => setShowError(!showError)}
            className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 transition-colors">
            <AlertTriangle className="w-3 h-3" />
            {showError ? "Masquer l'erreur" : "Voir l'erreur"}
          </button>
          {showError && (
            <div className="mt-1.5 p-2.5 bg-red-950/40 border border-red-900/40 rounded-lg text-[10px] text-red-300 font-mono break-all leading-relaxed max-h-24 overflow-y-auto">
              {video.error_message}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {video.tags && video.tags.length > 0 && !isProcessing && (
        <div className="flex flex-wrap gap-1 mb-3">
          {video.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700/60">
              #{tag}
            </span>
          ))}
          {video.tags.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 text-zinc-600">+{video.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Clock className="w-3 h-3" />
          {timeAgo(video.created_at)}
        </span>
        <div className="flex items-center gap-1">
          {isProcessing && (
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}
              className="h-7 w-7 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          {isFailed && (
            <Button size="sm" variant="ghost" onClick={handleResume} disabled={resuming}
              className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/50 gap-1">
              <RotateCcw className={`w-3.5 h-3.5 ${resuming ? "animate-spin" : ""}`} />
              {resuming ? "Reprise..." : "Relancer"}
            </Button>
          )}
          {(isReady || isPublished) && (
            <Button size="sm" variant="ghost" asChild
              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50">
              <a href={api.getDownloadUrl(video.id)} target="_blank" rel="noreferrer">
                <Download className="w-3.5 h-3.5 mr-1" />Télécharger
              </a>
            </Button>
          )}
          {video.youtube_url && (
            <Button size="sm" variant="ghost" asChild
              className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/50">
              <a href={video.youtube_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />YouTube
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}
            className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 hover:bg-red-950/50">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}