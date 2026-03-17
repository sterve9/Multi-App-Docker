"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus, RefreshCw, Trash2, Linkedin, Loader2, Search, X,
  AlertCircle, Upload, Download, RotateCcw, Sparkles, Shuffle,
  Image as ImageIcon, CheckCircle2, XCircle,
} from "lucide-react";
import { api, Post, PostStatus } from "./lib/api";

// ── Sujets suggérés ──────────────────────────────────────────────────────────
const TOPIC_SUGGESTIONS = [
  "L'IA ne va pas prendre ton job. Quelqu'un qui sait l'utiliser, oui.",
  "J'ai automatisé 6 heures de travail par jour grâce à l'IA",
  "Dans 5 ans, il y aura deux types d'entreprises : celles qui utilisent l'IA, et les autres",
  "Tu n'as pas besoin d'être développeur pour construire avec l'IA",
  "J'ai créé une équipe IA entière. Ils ne dorment jamais.",
  "Le prompt parfait vaut mieux que le diplôme parfait",
  "Ce que tu fais encore manuellement en 2025 te coûte plus que tu ne le crois",
  "L'IA m'a appris quelque chose que 10 ans d'école n'ont pas réussi",
  "J'ai construit un assistant IA qui connaît mon business mieux que certains employés",
  "Le futur n'appartient pas aux plus intelligents. Il appartient aux plus adaptables.",
];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft:      { label: "Brouillon",    color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  processing: { label: "En cours…",   color: "bg-yellow-950/60 text-yellow-400 border-yellow-800/40" },
  ready:      { label: "Prêt",        color: "bg-blue-950/60 text-blue-400 border-blue-800/40" },
  uploading:  { label: "Publication…",color: "bg-violet-950/60 text-violet-400 border-violet-800/40" },
  published:  { label: "Publié",      color: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40" },
  failed:     { label: "Échec",       color: "bg-red-950/60 text-red-400 border-red-800/40" },
};

const PROCESSING: PostStatus[] = ["processing", "uploading"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCard({
  post, onDelete, onRefresh,
}: {
  post: Post;
  onDelete: (id: number) => void;
  onRefresh: (p: Post) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [retrying,   setRetrying]   = useState(false);
  const [preview,    setPreview]    = useState(false);

  const cfg        = STATUS_CONFIG[post.status];
  const isReady    = post.status === "ready";
  const isProcessing = PROCESSING.includes(post.status);
  const isFailed   = post.status === "failed";
  const isPublished= post.status === "published";
  const imageUrl   = post.image_filename ? api.getImageUrl(post.image_filename) : null;

  async function handlePublish() {
    if (!confirm("Publier ce post sur LinkedIn ?")) return;
    setPublishing(true);
    try {
      const updated = await api.publishPost(post.id);
      onRefresh(updated);
    } catch (e) { console.error(e); }
    finally { setPublishing(false); }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await api.retryPost(post.id);
      await new Promise((r) => setTimeout(r, 1500));
      const updated = await api.getPost(post.id);
      onRefresh(updated);
    } catch (e) { console.error(e); }
    finally { setRetrying(false); }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce post ?")) return;
    await api.deletePost(post.id);
    onDelete(post.id);
  }

  return (
    <>
      {/* Preview modal image */}
      {preview && imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(false)}>
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(false)}
              className="absolute -top-9 right-0 text-zinc-400 hover:text-white flex items-center gap-1 text-sm">
              <X className="w-4 h-4" /> Fermer
            </button>
            <img src={imageUrl} alt="post" className="w-full rounded-2xl border border-zinc-700" />
            <a href={imageUrl} download={post.image_filename}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors">
              <Download className="w-4 h-4" /> Télécharger pour Instagram
            </a>
          </div>
        </div>
      )}

      <div className={`relative bg-zinc-900 border rounded-2xl overflow-hidden transition-all duration-200
        ${isFailed     ? "border-red-900/60" : ""}
        ${isProcessing ? "border-yellow-900/40" : ""}
        ${!isFailed && !isProcessing ? "border-zinc-800 hover:border-zinc-700" : ""}
      `}>
        {/* Shimmer top bar */}
        {isProcessing && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-blue-500 to-violet-500 animate-pulse" />
        )}

        {/* Image thumbnail + overlay statut */}
        {imageUrl ? (
          <div className="relative w-full aspect-[9/16] max-h-48 overflow-hidden bg-zinc-800">
            <img src={imageUrl} alt="generated" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
            <div className="absolute top-2 right-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 bg-zinc-800/50 border-b border-zinc-800">
            {isProcessing
              ? <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              : <ImageIcon className="w-5 h-5 text-zinc-600" />
            }
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Hook */}
          {post.hook ? (
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {post.hook}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 italic line-clamp-2">{post.topic}</p>
          )}

          {/* Reflection snippet */}
          {post.reflection && (
            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {post.reflection}
            </p>
          )}

          {/* Error */}
          {isFailed && post.error_message && (
            <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-2 py-1.5 line-clamp-2">
              {post.error_message}
            </p>
          )}

          {/* Status (si pas d'image) */}
          {!imageUrl && (
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-600">{timeAgo(post.created_at)}</span>
            <div className="flex items-center gap-1">
              {/* Aperçu image */}
              {imageUrl && (
                <button onClick={() => setPreview(true)}
                  className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-violet-950/40 rounded-lg transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Retry */}
              {(isFailed || post.status === "uploading") && (
                <button onClick={handleRetry} disabled={retrying}
                  title={post.status === "uploading" ? "Débloquer et relancer" : "Réessayer"}
                  className="p-1.5 text-amber-500 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors">
                  <RotateCcw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                </button>
              )}
              {/* Publier LinkedIn */}
              {isReady && (
                <button onClick={handlePublish} disabled={publishing}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-400 border border-blue-800/40 hover:bg-blue-950/40 rounded-lg transition-colors">
                  {publishing
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Upload className="w-3 h-3" />}
                  Publier
                </button>
              )}
              {/* LinkedIn link */}
              {isPublished && post.linkedin_post_id && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              {/* Delete */}
              <button onClick={handleDelete}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Home() {
  const [posts,      setPosts]      = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [topic,      setTopic]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter,     setFilter]     = useState<PostStatus | "ALL">("ALL");
  const [search,     setSearch]     = useState("");

  const fetchPosts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.listPosts();
      setPosts(data);
      setError("");
    } catch { setError("Erreur de connexion au serveur"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const hasActive = posts.some((p) => PROCESSING.includes(p.status));
    if (!hasActive) return;
    const interval = setInterval(() => fetchPosts(true), 8000);
    return () => clearInterval(interval);
  }, [posts, fetchPosts]);

  async function handleCreate() {
    if (!topic.trim()) return;
    setSubmitting(true);
    try {
      const res  = await api.createPost(topic.trim());
      const post = await api.getPost(res.post_id);
      setPosts((p) => [post, ...p]);
      setShowForm(false);
      setTopic("");
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  function pickRandom() {
    const others = TOPIC_SUGGESTIONS.filter((s) => s !== topic);
    setTopic(others[Math.floor(Math.random() * others.length)]);
  }

  const handleDelete  = (id: number)  => setPosts((p) => p.filter((x) => x.id !== id));
  const handleRefresh = (updated: Post) => setPosts((p) => p.map((x) => x.id === updated.id ? updated : x));

  const stats = {
    total:      posts.length,
    processing: posts.filter((p) => PROCESSING.includes(p.status)).length,
    ready:      posts.filter((p) => p.status === "ready").length,
    published:  posts.filter((p) => p.status === "published").length,
    failed:     posts.filter((p) => p.status === "failed").length,
  };

  const filteredPosts = useMemo(() => posts.filter((p) => {
    const statusOk = filter === "ALL" ? true : p.status === filter;
    const q = search.trim().toLowerCase();
    const searchOk = q === ""
      ? true
      : (p.topic ?? "").toLowerCase().includes(q) ||
        (p.hook  ?? "").toLowerCase().includes(q);
    return statusOk && searchOk;
  }), [posts, filter, search]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-none">LinkedIn Publisher</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Personal branding IA automatisé</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchPosts()} disabled={refreshing}
              className="p-2 text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors">
              {refreshing
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              <Plus className="w-4 h-4" /> Nouveau post
            </button>
          </div>
        </div>

        {stats.processing > 0 && (
          <div className="border-t border-zinc-800/60 bg-yellow-950/20">
            <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin shrink-0" />
              <span className="text-xs text-yellow-300">
                <span className="font-semibold">{stats.processing}</span> post{stats.processing > 1 ? "s" : ""} en cours de génération…
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total",      value: stats.total,      key: "ALL",       color: "text-white" },
            { label: "En cours",   value: stats.processing, key: "processing",color: "text-yellow-400" },
            { label: "Prêts",      value: stats.ready,      key: "ready",     color: "text-blue-400" },
            { label: "Publiés",    value: stats.published,  key: "published", color: "text-emerald-400" },
            { label: "Erreurs",    value: stats.failed,     key: "failed",    color: "text-red-400" },
          ].map((s) => (
            <button key={s.key}
              onClick={() => setFilter(filter === s.key ? "ALL" : s.key as PostStatus | "ALL")}
              className={`relative bg-zinc-900 border rounded-xl p-4 flex flex-col items-center gap-1 transition-all
                ${filter === s.key
                  ? "border-zinc-500 ring-1 ring-zinc-500/40 bg-zinc-800/60"
                  : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40"
                }`}>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
              {filter === s.key && <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-zinc-400 rounded-full" />}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un post…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grid posts */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-zinc-900 rounded-2xl mb-4 border border-zinc-800">
              <Sparkles className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">Aucun post</p>
            <p className="text-zinc-600 text-sm mt-1">Lance le pipeline pour générer ton premier post IA</p>
            <button onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 text-sm text-blue-400 border border-blue-800/40 rounded-lg hover:bg-blue-950/40 transition-colors">
              Créer un post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} onRefresh={handleRefresh} />
            ))}
          </div>
        )}
      </main>

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" /> Nouveau post IA
              </h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Sujet ou idée <span className="text-blue-400">*</span></label>
                <button onClick={pickRandom}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Shuffle className="w-3 h-3" /> Aléatoire
                </button>
              </div>
              <textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: L'IA va transformer complètement la façon dont les entrepreneurs travaillent..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none transition-colors" />

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {TOPIC_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setTopic(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors text-left ${
                      topic === s
                        ? "border-blue-500 bg-blue-950/50 text-blue-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }`}>
                    {s.length > 55 ? s.slice(0, 55) + "…" : s}
                  </button>
                ))}
              </div>

              {/* Info pipeline */}
              <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Claude génère le hook + la réflexion · nano-banana-pro génère l'image 9:16
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={submitting || !topic.trim()}
                className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors font-semibold">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Génération...</>
                  : <><Sparkles className="w-4 h-4" />Lancer le pipeline</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
