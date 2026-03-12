'use client'
import { useState } from 'react'
import { Download, Send, RotateCcw, CheckCircle } from 'lucide-react'
import { publishVideo, getVideoUrl } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function VideoPlayer() {
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const { videoId, script, reset } = useAppStore()

  if (!videoId) return null

  const videoUrl = getVideoUrl(videoId)

  const handlePublish = async () => {
    if (!script || !videoId) return
    setPublishing(true)
    try {
      await publishVideo(videoId, script.description, script.tags)
      setPublished(true)
    } catch (e) {
      alert('Erreur publication — vérifie ton webhook n8n')
    } finally {
      setPublishing(false)
    }
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

      {/* Infos */}
      {script && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Description</div>
            <p className="text-zinc-200 text-sm">{script.description}</p>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-2">Tags</div>
            <div className="flex flex-wrap gap-1">
              {script.tags.map((tag, i) => (
                <span key={i} className="bg-zinc-800 text-amber-400 text-xs px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={videoUrl}
          download={`tiktok-${videoId}.mp4`}
          className="flex items-center justify-center gap-2 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
        >
          <Download className="w-5 h-5" /> Télécharger
        </a>

        <button
          onClick={handlePublish}
          disabled={publishing || published}
          className="flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all"
        >
          {published ? (
            <><CheckCircle className="w-5 h-5" /> Publié !</>
          ) : publishing ? (
            <><RotateCcw className="w-5 h-5 animate-spin" /> Publication...</>
          ) : (
            <><Send className="w-5 h-5" /> Publier sur TikTok</>
          )}
        </button>
      </div>
    </div>
  )
}
