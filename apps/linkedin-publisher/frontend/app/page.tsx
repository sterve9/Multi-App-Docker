"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, RefreshCw, Trash2, Eye, Linkedin, Zap, Loader2, Search, X, AlertCircle } from "lucide-react";
import { postsApi, Post, PostType, PostStatus, CreatePostPayload } from "./lib/api";

const STATUS_COLORS: Record<PostStatus, string> = {
  draft:      "bg-zinc-800 text-zinc-300 border border-zinc-700",
  processing: "bg-yellow-950/60 text-yellow-400 border border-yellow-800/40",
  ready:      "bg-blue-950/60 text-blue-400 border border-blue-800/40",
  published:  "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40",
  failed:     "bg-red-950/60 text-red-400 border border-red-800/40",
};

const STATUS_LABELS: Record<PostStatus, string> = {
  draft:      "Brouillon",
  processing: "En traitement...",
  ready:      "Prêt",
  published:  "Publié",
  failed:     "Échec",
};

const TYPE_LABELS: Record<PostType, string> = {
  milestone: "🏆 Milestone",
  update:    "📢 Update",
  learning:  "📚 Learning",
};

const DATE_FILTERS = [
  { label: "Tout",     value: "all" },
  { label: "Auj.",     value: "today" },
  { label: "7 jours",  value: "7d" },
  { label: "30 jours", value: "30d" },
] as const;
type DateFilter = typeof DATE_FILTERS[number]["value"];

function isWithinRange(dateStr: string, range: DateFilter): boolean {
  if (range === "all") return true;
  const date = new Date(dateStr).getTime();
  const now  = Date.now();
  if (range === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return date >= start.getTime();
  }
  const days = range === "7d" ? 7 : 30;
  return date >= now - days * 24 * 60 * 60 * 1000;
}

function getImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_API_URL || "https://api.linkedin.sterveshop.cloud";
  return `${base}${path}`;
}

function StatCard({
  label, value, color, active, onClick, pulse,
}: {
  label: string; value: number; color: string;
  active?: boolean; onClick?: () => void; pulse?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`relative group bg-zinc-900 border rounded-xl p-4 flex flex-col items-center gap-1 transition-all duration-200 w-full
        ${active
          ? "border-zinc-500 ring-1 ring-zinc-500/40 bg-zinc-800/60"
          : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40"
        }`}>
      {pulse && value > 0 && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
        </span>
      )}
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      {active && <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-zinc-400 rounded-full" />}
    </button>
  );
}

export default function Home() {
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filter, setFilter]       = useState<PostStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch]       = useState("");
  const [error, setError]         = useState("");
  const [form, setForm]           = useState<CreatePostPayload>({
    raw_content: "", post_type: "update", user_id: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await postsApi.list();
      setPosts(data);
      setError("");
    } catch (e) {
      setError("Erreur de connexion au serveur");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Auto-refresh quand des posts sont en processing
  useEffect(() => {
    const hasProcessing = posts.some((p) => p.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(() => fetchPosts(true), 8000);
    return () => clearInterval(interval);
  }, [posts, fetchPosts]);

  const handleCreate = async () => {
    if (!form.raw_content.trim()) return;
    setSubmitting(true);
    try {
      await postsApi.create(form);
      setShowForm(false);
      setForm({ raw_content: "", post_type: "update", user_id: 1 });
      await fetchPosts();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce post ?")) return;
    await postsApi.delete(id);
    setPosts((p) => p.filter((post) => post.id !== id));
  };

  const stats = {
    draft:      posts.filter((p) => p.status === "draft").length,
    processing: posts.filter((p) => p.status === "processing").length,
    ready:      posts.filter((p) => p.status === "ready").length,
    published:  posts.filter((p) => p.status === "published").length,
    failed:     posts.filter((p) => p.status === "failed").length,
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const statusOk = filter === "ALL" ? true : p.status === filter;
      const dateOk   = isWithinRange(p.created_at, dateFilter);
      const q        = search.trim().toLowerCase();
      const searchOk = q === ""
        ? true
        : (p.raw_content ?? "").toLowerCase().includes(q) ||
          (p.processed_content ?? "").toLowerCase().includes(q) ||
          (p.title ?? "").toLowerCase().includes(q);
      return statusOk && dateOk && searchOk;
    });
  }, [posts, filter, dateFilter, search]);

  const hasActiveFilters = search !== "" || dateFilter !== "all" || filter !== "ALL";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-none">LinkedIn Publisher</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Automatisé par Claude + n8n</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchPosts()} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors">
              {refreshing
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                : <RefreshCw className="w-4 h-4" />}
              Actualiser
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />Nouveau post
            </button>
          </div>
        </div>

        {/* Bannière processing */}
        {stats.processing > 0 && (
          <div className="border-t border-zinc-800/60 bg-yellow-950/20">
            <div className="max-w-5xl mx-auto px-6 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin shrink-0" />
              <span className="text-xs text-yellow-300">
                <span className="font-semibold">{stats.processing}</span> post{stats.processing > 1 ? "s" : ""} en cours de traitement…
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-600/40 to-transparent ml-2" />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Brouillon"     value={posts.length}      color="text-white"
            active={filter === "ALL"} onClick={() => setFilter("ALL")} />
          <StatCard label="En traitement" value={stats.processing}  color="text-yellow-400"
            active={filter === "processing"} onClick={() => setFilter(filter === "processing" ? "ALL" : "processing")} pulse />
          <StatCard label="Prêt"          value={stats.ready}       color="text-blue-400"
            active={filter === "ready"} onClick={() => setFilter(filter === "ready" ? "ALL" : "ready")} />
          <StatCard label="Publié"        value={stats.published}   color="text-emerald-400"
            active={filter === "published"} onClick={() => setFilter(filter === "published" ? "ALL" : "published")} />
          <StatCard label="Échec"         value={stats.failed}      color="text-red-400"
            active={filter === "failed"} onClick={() => setFilter(filter === "failed" ? "ALL" : "failed")} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Search + date filters */}
        {posts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
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
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5">
              {DATE_FILTERS.map((df) => (
                <button key={df.value} onClick={() => setDateFilter(df.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    dateFilter === df.value
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}>
                  {df.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reset filters */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {filteredPosts.length} résultat{filteredPosts.length !== 1 ? "s" : ""}
              {search && <span className="text-zinc-500"> pour "<span className="text-zinc-400">{search}</span>"</span>}
            </p>
            <button onClick={() => { setSearch(""); setDateFilter("all"); setFilter("ALL"); }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />Réinitialiser
            </button>
          </div>
        )}

        {/* Liste posts */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-zinc-900 rounded-2xl mb-4 border border-zinc-800">
              <Zap className="w-8 h-8 text-zinc-600" />
            </div>
            {hasActiveFilters ? (
              <>
                <p className="text-zinc-400 font-medium">Aucun résultat</p>
                <button onClick={() => { setSearch(""); setDateFilter("all"); setFilter("ALL"); }}
                  className="mt-3 text-xs text-zinc-500 hover:text-white underline underline-offset-2">
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-400 font-medium">Aucun post pour l'instant</p>
                <p className="text-zinc-600 text-sm mt-1">Crée ton premier post LinkedIn avec l'IA</p>
                <button onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 text-sm text-blue-400 border border-blue-800/40 rounded-lg hover:bg-blue-950/40 transition-colors">
                  Créer un post
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div key={post.id}
                className={`group relative bg-zinc-900 border rounded-xl p-5 flex items-start gap-4 transition-all duration-200
                  ${post.status === "failed"     ? "border-red-900/60 hover:border-red-800" : ""}
                  ${post.status === "processing" ? "border-yellow-900/40 hover:border-yellow-800/60" : ""}
                  ${post.status !== "failed" && post.status !== "processing" ? "border-zinc-800 hover:border-zinc-700" : ""}
                `}>

                {/* Top progress bar — processing */}
                {post.status === "processing" && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-blue-500 to-yellow-400 rounded-t-xl animate-pulse" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-zinc-500">{TYPE_LABELS[post.post_type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">
                    {post.processed_content || post.raw_content}
                  </p>
                  {post.title && (
                    <p className="text-xs text-zinc-500 mt-1 font-medium">📌 {post.title}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">
                    {new Date(post.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>

                {post.final_image_path && (
                  <img src={getImageUrl(post.final_image_path)} alt="thumbnail"
                    className="w-20 h-16 object-cover rounded-lg border border-zinc-700" />
                )}

                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setSelectedPost(post)}
                    className="p-2 text-zinc-600 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(post.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal nouveau post */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">Nouveau post LinkedIn</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-1">Type de post</label>
                <select value={form.post_type}
                  onChange={(e) => setForm({ ...form, post_type: e.target.value as PostType })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                  <option value="milestone">🏆 Milestone</option>
                  <option value="update">📢 Update</option>
                  <option value="learning">📚 Learning</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-1">Votre idée brute</label>
                <textarea rows={5} value={form.raw_content}
                  onChange={(e) => setForm({ ...form, raw_content: e.target.value })}
                  placeholder="Décrivez votre idée... Claude va l'améliorer et générer une image automatiquement !"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" />
                <p className="text-xs text-zinc-600 mt-1">{form.raw_content.length}/5000 — min. 10 caractères</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate}
                disabled={submitting || form.raw_content.length < 10}
                className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</>
                  : <><Zap className="w-4 h-4" />Lancer le workflow</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail post */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Détail du post</h2>
              <button onClick={() => setSelectedPost(null)}
                className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{TYPE_LABELS[selectedPost.post_type]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedPost.status]}`}>
                  {STATUS_LABELS[selectedPost.status]}
                </span>
              </div>
              {selectedPost.title && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Titre</p>
                  <p className="font-semibold text-white">{selectedPost.title}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Contenu</p>
                <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedPost.processed_content || selectedPost.raw_content}
                </p>
              </div>
              {selectedPost.bullets && selectedPost.bullets.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Points clés</p>
                  <ul className="space-y-1.5">
                    {selectedPost.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-zinc-400">
                        <span className="text-blue-500 mt-0.5">•</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedPost.final_image_path && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Image générée</p>
                  <img src={getImageUrl(selectedPost.final_image_path)} alt="generated"
                    className="w-full rounded-lg border border-zinc-700" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}