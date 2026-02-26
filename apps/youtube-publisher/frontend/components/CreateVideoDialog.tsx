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
import { Textarea } from "@/components/ui/textarea";
import { api, Video } from "@/lib/api";
import { Plus, Loader2, Sparkles } from "lucide-react";

interface Props {
  onCreated: (video: Video) => void;
}

export function CreateVideoDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const video = await api.createVideo({
        topic: topic.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      await api.generateVideo(video.id);
      onCreated({ ...video, status: "GENERATING_SCRIPT" });
      setOpen(false);
      setTopic("");
      setTitle("");
      setDescription("");
      setTags("");
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
              placeholder="Ex: L'histoire secrète de la pizza napolitaine"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Titre (optionnel)</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Laisse vide pour que Claude le génère"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Description (optionnel)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description YouTube..."
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Tags (séparés par des virgules)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="pizza, histoire, cuisine italienne"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
            />
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