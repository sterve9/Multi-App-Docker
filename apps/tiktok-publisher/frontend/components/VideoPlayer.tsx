'use client'
import { useState } from 'react'
import { Download, RotateCcw, Copy, Check, Facebook } from 'lucide-react'
import { getVideoUrl } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function VideoPlayer() {
  const [copiedSales, setCopiedSales] = useState(false)
  const [copiedTags, setCopiedTags] = useState(false)
  const { videoId, script, reset } = useAppStore()

  if (!videoId) return null

  const videoUrl = getVideoUrl(videoId)

  const handleCopySales = () => {
    if (!script) return
    navigator.clipboard.writeText(script.sales_text)
    setCopiedSales(true)
    setTimeout(() => setCopiedSales(false), 2000)
  }

  const handleCopyTags = () => {
    if (!script) return
    navigator.clipboard.writeText(script.tags.join(' '))
    setCopiedTags(true)
    setTimeout(() => setCopiedTags(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Vidéo prête ✅</h2>
        <button onClick={reset} className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm">
          <RotateCcw className="w-4 h-4" /> Nouvelle vidéo
        </button>
      </div>

      {/* Player */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <video
          src={videoUrl}
          controls
          className="w-full max-h-96 object-contain bg-black"
          style={{ aspectRatio: '9/16', maxHeight: '500px' }}
        />
      </div>

      {/* Téléchargement — pleine largeur */}
      <a
        href={videoUrl}
        download={`facebook-rituel-${videoId}.mp4`}
        className="flex items-center justify-center gap-2 w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all text-lg"
      >
        <Download className="w-6 h-6" /> Télécharger la vidéo
      </a>

      {/* Texte de vente — prêt à coller sur Facebook */}
      {script && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-400 uppercase tracking-wider">
              <Facebook className="w-4 h-4" /> Texte de vente — colle sur Facebook
            </div>
            <button
              onClick={handleCopySales}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copiedSales ? <><Check className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier</>}
            </button>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">{script.sales_text}</p>
          <div className="text-xs text-blue-500 pt-1 border-t border-blue-900/50">
            🔗 https://rituel.sterveshop.cloud
          </div>
        </div>
      )}

      {/* Hashtags */}
      {script && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">🏷️ Hashtags</div>
            <button
              onClick={handleCopyTags}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              {copiedTags ? <><Check className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier</>}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {script.tags.map((tag, i) => (
              <span key={i} className="bg-zinc-800 text-amber-400 text-xs px-2 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Guide publication manuelle */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">📋 Étapes de publication</div>
        <ol className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">1.</span> Télécharge la vidéo ci-dessus</li>
          <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">2.</span> Ouvre Facebook → Créer une publication</li>
          <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">3.</span> Ajoute la vidéo téléchargée</li>
          <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">4.</span> Colle le texte de vente (bouton Copier ci-dessus)</li>
          <li className="flex items-start gap-2"><span className="text-amber-500 font-bold">5.</span> Publie ou programme ta campagne 🚀</li>
        </ol>
      </div>
    </div>
  )
}
