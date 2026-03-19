'use client'
import { useState } from 'react'
import { Loader2, Video, Edit3, RotateCcw, Copy, Check } from 'lucide-react'
import { generateVideo, getVideoStatus } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function ScriptResult() {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { script, setScript, format, duration, setStep, setVideoJob, updateVideoStatus, reset } = useAppStore()

  if (!script) return null

  const handleGenerateVideo = async () => {
    setLoading(true)
    setStep('generating')
    try {
      const job = await generateVideo({ ...script, format, duration })
      setVideoJob(job.video_id)

      const interval = setInterval(async () => {
        const status = await getVideoStatus(job.video_id)
        updateVideoStatus(status.status, status.progress, status.message, status.video_url)
        if (status.status === 'done' || status.status === 'error') {
          clearInterval(interval)
          if (status.status === 'done') setStep('preview')
          setLoading(false)
        }
      }, 2000)
    } catch (e) {
      setStep('script')
      setLoading(false)
    }
  }

  const handleCopySalesText = () => {
    navigator.clipboard.writeText(script.sales_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Script généré</h2>
        <button onClick={reset} className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm">
          <RotateCcw className="w-4 h-4" /> Recommencer
        </button>
      </div>

      {/* Structure des 3 phases */}
      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg py-2 text-amber-400 font-medium">⚡ HOOK</div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg py-2 text-blue-400 font-medium">📦 PRODUIT</div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg py-2 text-green-400 font-medium">💡 PROBLÈME/SOL.</div>
      </div>

      {/* Hook */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="text-xs font-medium text-amber-400 mb-1 uppercase tracking-wider">⚡ Hook — accroche</div>
        <p className="text-white font-medium">{script.hook}</p>
      </div>

      {/* Script voix off */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-1">
          <Edit3 className="w-3 h-3" /> Script voix off (Hook → Produit → Problème/Solution)
        </div>
        <textarea
          value={script.script}
          onChange={(e) => setScript({ ...script, script: e.target.value })}
          className="w-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none min-h-32"
        />
      </div>

      {/* Captions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">📝 Sous-titres à l'écran</div>
        <div className="space-y-2">
          {script.captions.map((cap, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
              <input
                value={cap}
                onChange={(e) => {
                  const updated = [...script.captions]
                  updated[i] = e.target.value
                  setScript({ ...script, captions: updated })
                }}
                className="flex-1 bg-zinc-800 text-zinc-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Texte de vente Facebook */}
      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            📣 Texte de vente Facebook — prêt à publier
          </div>
          <button
            onClick={handleCopySalesText}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {copied ? <><Check className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
        <textarea
          value={script.sales_text}
          onChange={(e) => setScript({ ...script, sales_text: e.target.value })}
          className="w-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none min-h-36"
        />
        <div className="mt-2 text-xs text-blue-500">
          🔗 Lien inclus : https://rituel.sterveshop.cloud
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">🏷️ Hashtags Facebook</div>
        <div className="flex flex-wrap gap-2">
          {script.tags.map((tag, i) => (
            <span key={i} className="bg-zinc-800 text-amber-400 text-xs px-3 py-1 rounded-full">{tag}</span>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerateVideo}
        disabled={loading}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Video className="w-5 h-5" /> Générer la vidéo
      </button>
    </div>
  )
}
