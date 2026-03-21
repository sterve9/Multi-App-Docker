'use client'
import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { generateScript } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function ScriptForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setScript, setStep, setParams } = useAppStore()

  const [theme, setTheme] = useState('')
  const [format, setFormat] = useState<'image_animee' | 'video_ia'>('image_animee')
  const [duration, setDuration] = useState<'15' | '30' | '60'>('30')

  const handleSubmit = async () => {
    if (!theme.trim()) return setError('Entre un thème pour continuer')
    setError('')
    setLoading(true)
    try {
      const result = await generateScript({ theme, format, duration })
      setParams(theme, format, duration)
      setScript(result)
      setStep('script')
    } catch (e) {
      setError('Erreur lors de la génération — vérifie ta clé Anthropic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Créer une vidéo pub Facebook</h1>
        <p className="text-zinc-400">Script Hook → Produit → Problème/Solution · Visuels IA · Voix off · Texte de vente</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">

        {/* Thème */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Thème de la vidéo
          </label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex: fatigue masculine, rituel ancestral miel gingembre, énergie naturelle..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none h-24"
          />
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Format vidéo</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'image_animee', label: '🖼️ Image animée', desc: 'Image IA + voix off + captions' },
              { value: 'video_ia', label: '🎬 Vidéo IA', desc: 'Vidéo générée + voix off + captions' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value as typeof format)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === opt.value
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium mb-1">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Durée */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Durée</label>
          <div className="flex gap-3">
            {(['15', '30', '60'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                  duration === d
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Génération du script...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Générer le script</>
          )}
        </button>
      </div>
    </div>
  )
}