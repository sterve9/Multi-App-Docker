"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, VideoFormat } from "@/lib/api";
import { Plus, Loader2, Sparkles } from "lucide-react";

interface Props {
  onCreated: (videoId: number) => void;
}

const STYLES = [
  { value: "storytelling", label: "Storytelling" },
  { value: "documentaire", label: "Documentaire" },
  { value: "educatif",     label: "Éducatif" },
  { value: "motivation",   label: "Motivation" },
];

export function CreateVideoDialog({ onCreated }: Props) {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [topic, setTopic]   = useState("");
  const [style, setStyle]   = useState("storytelling");
  const [format, setFormat] = useState<VideoFormat>("economique");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.createVideo({ topic: topic.trim(), style, format });
      onCreated(res.video_id);
      setOpen(false);
      setTopic("");
      setStyle("storytelling");
      setFormat("economique");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-500 text-white gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          Nouvelle vidéo
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-red-400" />
            Lancer le pipeline
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">
              Sujet <span className="text-red-400">*</span>
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Kofi découvre le secret d'Ama..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Style</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    style === s.value
                      ? "border-red-500 bg-red-950/40 text-red-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("economique")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  format === "economique"
                    ? "border-red-500 bg-red-950/40 text-red-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">Économique</div>
                <div className="text-[10px] opacity-60 mt-0.5">Images + Ken Burns</div>
              </button>
              <button
                type="button"
                onClick={() => setFormat("premium")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  format === "premium"
                    ? "border-red-500 bg-red-950/40 text-red-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">Premium</div>
                <div className="text-[10px] opacity-60 mt-0.5">Clips Kling 3.0</div>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !topic.trim()}
              className="bg-red-600 hover:bg-red-500 text-white gap-2 font-semibold min-w-[140px]">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Lancement...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Lancer le pipeline</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
