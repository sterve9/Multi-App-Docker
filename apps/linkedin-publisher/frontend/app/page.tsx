"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Eye, Linkedin, Zap } from "lucide-react";
import { postsApi, Post, PostType, PostStatus, CreatePostPayload } from "./lib/api";

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  ready: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Brouillon",
  processing: "En traitement...",
  ready: "Prêt",
  published: "Publié",
  failed: "Échec",
};

const TYPE_LABELS: Record<PostType, string> = {
  milestone: "🏆 Milestone",
  update: "📢 Update",
  learning: "📚 Learning",
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [form, setForm] = useState<CreatePostPayload>({
    raw_content: "",
    post_type: "update",
    user_id: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await postsApi.list();
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleCreate = async () => {
    if (!form.raw_content.trim()) return;
    setSubmitting(true);
    try {
      await postsApi.create(form);
      setShowForm(false);
      setForm({ raw_content: "", post_type: "update", user_id: 1 });
      await fetchPosts();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce post ?")) return;
    await postsApi.delete(id);
    setPosts((p) => p.filter((post) => post.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">LinkedIn Publisher</h1>
              <p className="text-xs text-gray-500">Automatisé par Claude + n8n</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchPosts} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />Actualiser
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />Nouveau post
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-5 gap-3 mb-8">
          {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
            <div key={s} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-800">{posts.filter((p) => p.status === s).length}</div>
              <div className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun post pour l'instant.</p>
            <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
              Créer votre premier post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500">{TYPE_LABELS[post.post_type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}>{STATUS_LABELS[post.status]}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{post.processed_content || post.raw_content}</p>
                  {post.title && <p className="text-xs text-gray-400 mt-1 font-medium">📌 {post.title}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {post.final_image_path && (
                  <img src={`http://localhost:8000${post.final_image_path}`} alt="thumbnail" className="w-20 h-16 object-cover rounded-lg border border-gray-100" />
                )}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setSelectedPost(post)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nouveau post LinkedIn</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Type de post</label>
                <select value={form.post_type} onChange={(e) => setForm({ ...form, post_type: e.target.value as PostType })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="milestone">🏆 Milestone</option>
                  <option value="update">📢 Update</option>
                  <option value="learning">📚 Learning</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Votre idée brute</label>
                <textarea rows={5} value={form.raw_content} onChange={(e) => setForm({ ...form, raw_content: e.target.value })} placeholder="Décrivez votre idée... Claude va l'améliorer et générer une image automatiquement !" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <p className="text-xs text-gray-400 mt-1">{form.raw_content.length}/5000 — min. 10 caractères</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreate} disabled={submitting || form.raw_content.length < 10} className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" />Envoi...</> : <><Zap className="w-4 h-4" />Lancer le workflow</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Détail du post</h2>
              <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Type</p>
                <p>{TYPE_LABELS[selectedPost.post_type]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Statut</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedPost.status]}`}>{STATUS_LABELS[selectedPost.status]}</span>
              </div>
              {selectedPost.title && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Titre généré</p>
                  <p className="font-semibold">{selectedPost.title}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Contenu</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.processed_content || selectedPost.raw_content}</p>
              </div>
              {selectedPost.bullets && selectedPost.bullets.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Points clés</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedPost.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
              {selectedPost.final_image_path && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Image générée</p>
                  <img src={`http://localhost:8000${selectedPost.final_image_path}`} alt="generated" className="w-full rounded-lg border border-gray-100" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
