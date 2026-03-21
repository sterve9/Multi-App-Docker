"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const DURATIONS = [
  { value: 60, label: "1 min" },
  { value: 90, label: "1 min 30" },
  { value: 120, label: "2 min" },
];

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    topic: "",
    duration_seconds: 60,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.generate(form);
      router.push("/history");
    } catch (err) {
      alert("Erreur lors de la génération");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Nouvelle vidéo TikTok</h1>
      <p className="text-gray-400 text-sm mb-6">
        Script IA + ta voix clonée + rendu Remotion
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Titre de la vidéo</label>
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-pink-600"
            placeholder="ex: Comment gagner de l'argent avec ChatGPT"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Sujet / idée du conseil IA
          </label>
          <textarea
            className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-pink-600 h-28 resize-none"
            placeholder="ex: Comment utiliser Claude AI pour automatiser ses réponses clients et gagner 2h par jour"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Durée</label>
          <div className="flex gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setForm({ ...form, duration_seconds: d.value })}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                  form.duration_seconds === d.value
                    ? "bg-pink-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg font-semibold transition"
        >
          {loading ? "Génération en cours…" : "Générer la vidéo"}
        </button>
      </form>
    </main>
  );
}
