'use client'
import { useAppStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'

export default function VideoProgress() {
  const { videoProgress, videoMessage, videoStatus } = useAppStore()

  const steps = [
    { label: 'Voix off ElevenLabs', threshold: 10 },
    { label: 'Visuels Kie.ai', threshold: 35 },
    { label: 'Assemblage FFmpeg', threshold: 70 },
    { label: 'Vidéo prête', threshold: 100 },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Génération en cours</h2>
        <p className="text-zinc-400 mb-8">{videoMessage || 'Initialisation...'}</p>

        {/* Barre de progression */}
        <div className="bg-zinc-800 rounded-full h-3 mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${videoProgress}%` }}
          />
        </div>

        {/* Étapes */}
        <div className="space-y-3 text-left">
          {steps.map((step, i) => {
            const done = videoProgress >= step.threshold
            const active = videoProgress < step.threshold &&
              (i === 0 || videoProgress >= steps[i - 1].threshold)
            return (
              <div key={i} className={`flex items-center gap-3 ${done ? 'text-amber-400' : active ? 'text-white' : 'text-zinc-600'}`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${
                  done ? 'bg-amber-500 border-amber-500 text-black' :
                  active ? 'border-amber-500 text-amber-400' :
                  'border-zinc-700'
                }`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-sm">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}