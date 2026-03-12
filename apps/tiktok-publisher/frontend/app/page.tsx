import Link from 'next/link'
import { Video, History, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">TikTok Publisher</h1>
        <p className="text-zinc-400 text-lg">Génère et publie des vidéos TikTok avec l&apos;IA</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <Link href="/create" className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl p-6 transition-all group">
          <Video className="w-8 h-8 mb-3" />
          <div className="text-lg font-bold">Créer une vidéo</div>
          <div className="text-sm opacity-70 mt-1">Script + visuels + voix off</div>
        </Link>

        <Link href="/history" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-2xl p-6 transition-all">
          <History className="w-8 h-8 mb-3 text-zinc-400" />
          <div className="text-lg font-bold">Historique</div>
          <div className="text-sm text-zinc-400 mt-1">Vidéos générées</div>
        </Link>
      </div>
    </main>
  )
}