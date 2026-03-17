"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, VideoFormat } from "@/lib/api";
import { Plus, Loader2, Sparkles, Shuffle } from "lucide-react";

interface Props {
  onCreated: (videoId: number) => void;
}

const TOPIC_SUGGESTIONS = [
  "Kofi découvre qu'Ama pleure chaque nuit en secret",
  "Ama reçoit des messages d'un autre homme — Kofi l'apprend",
  "Kofi surprend Ama en train de faire ses valises",
  "Ama confie à sa mère que Kofi n'est plus l'homme qu'il était",
  "Kofi trouve un cahier intime qu'Ama pensait bien caché",
  "Ama refuse pour la première fois de toucher Kofi",
  "Un ami de Kofi flirte ouvertement avec Ama devant lui",
  "Kofi entend Ama rire au téléphone comme elle ne rit plus avec lui",
  "Ama demande à Kofi de dormir dans une autre chambre",
  "Kofi comprend que ses enfants ont honte de lui",
];

const SERIE_ID = "couple_virilite";
const STYLE    = "cinematique";

export function CreateVideoDialog({ onCreated }: Props) {
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [topic, setTopic]         = useState("");
  const [format, setFormat]       = useState<VideoFormat>("economique");
  const [nextEpisode, setNextEpisode] = useState<number>(1);

  // Auto-calcule le prochain numéro d'épisode à l'ouverture
  useEffect(() => {
    if (!open) return;
    api.listVideos().then((videos) => {
      const serie = videos.filter((v) => v.serie_id === SERIE_ID);
      const max   = serie.length > 0 ? Math.max(...serie.map((v) => v.episode_number ?? 0)) : 0;
      setNextEpisode(max + 1);
    }).catch(() => {});
  }, [open]);

  function pickRandom() {
    const current = topic.trim();
    const others  = TOPIC_SUGGESTIONS.filter((s) => s !== current);
    setTopic(others[Math.floor(Math.random() * others.length)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.createVideo({
        topic:          topic.trim(),
        style:          STYLE,
        format,
        serie_id:       SERIE_ID,
        episode_number: nextEpisode,
      });
      onCreated(res.video_id);
      setOpen(false);
      setTopic("");
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
          Nouvel épisode
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-red-400" />
            Épisode {nextEpisode} — Kofi &amp; Ama
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Sujet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">
                Sujet de l'épisode <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={pickRandom}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Shuffle className="w-3 h-3" />
                Suggestion aléatoire
              </button>
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Kofi découvre qu'Ama pleure chaque nuit en secret..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500 resize-none transition-colors"
              required
            />

            {/* Sujets suggérés */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors text-left ${
                    topic === s
                      ? "border-red-500 bg-red-950/50 text-red-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Format de génération</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("economique")}
                className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                  format === "economique"
                    ? "border-red-500 bg-red-950/40 text-red-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">Économique</div>
                <div className="text-[10px] opacity-60 mt-0.5">Images Flux + Ken Burns · ~5 min</div>
              </button>
              <button
                type="button"
                onClick={() => setFormat("premium")}
                className={`px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                  format === "premium"
                    ? "border-red-500 bg-red-950/40 text-red-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className="font-medium">Premium ✦</div>
                <div className="text-[10px] opacity-60 mt-0.5">Clips Kling 3.0 · ~20 min</div>
              </button>
            </div>
          </div>

          {/* Info série */}
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            Série <span className="text-zinc-300 font-medium mx-1">couple_virilite</span>
            · CTA automatique vers
            <span className="text-zinc-300 font-medium ml-1">rituel.sterveshop.cloud</span>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !topic.trim()}
              className="bg-red-600 hover:bg-red-500 text-white gap-2 font-semibold min-w-[160px]">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Lancement...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Générer l'épisode {nextEpisode}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
