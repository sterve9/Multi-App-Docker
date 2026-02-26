import { VideoStatus } from "@/lib/api";

const statusConfig: Record<VideoStatus, { label: string; color: string; dot: string }> = {
  PENDING: { label: "En attente", color: "text-zinc-400 bg-zinc-800 border-zinc-700", dot: "bg-zinc-400" },
  GENERATING_SCRIPT: { label: "Script...", color: "text-blue-300 bg-blue-950 border-blue-800", dot: "bg-blue-400 animate-pulse" },
  GENERATING_IMAGES: { label: "Images...", color: "text-violet-300 bg-violet-950 border-violet-800", dot: "bg-violet-400 animate-pulse" },
  GENERATING_AUDIO: { label: "Audio...", color: "text-amber-300 bg-amber-950 border-amber-800", dot: "bg-amber-400 animate-pulse" },
  ASSEMBLING_VIDEO: { label: "Assemblage...", color: "text-orange-300 bg-orange-950 border-orange-800", dot: "bg-orange-400 animate-pulse" },
  COMPLETED: { label: "Terminé", color: "text-emerald-300 bg-emerald-950 border-emerald-800", dot: "bg-emerald-400" },
  FAILED: { label: "Erreur", color: "text-red-300 bg-red-950 border-red-800", dot: "bg-red-400" },
  PUBLISHED: { label: "Publié", color: "text-sky-300 bg-sky-950 border-sky-800", dot: "bg-sky-400" },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}