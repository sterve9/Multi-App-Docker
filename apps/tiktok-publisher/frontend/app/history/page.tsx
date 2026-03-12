'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      
      {/* Logo */}
      <div className="bg-yellow-500 rounded-2xl p-5 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>

      {/* Titre */}
      <h1 className="text-4xl font-bold text-white mb-2">TikTok Publisher</h1>
      <p className="text-gray-400 text-lg mb-12">Génère et publie des vidéos TikTok avec l&apos;IA</p>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        
        <Link href="/create" className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl p-8 flex flex-col gap-3 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.871V15.13a1 1 0 01-1.447.9L15 14" />
            <rect x="1" y="6" width="15" height="12" rx="2" ry="2" />
          </svg>
          <div>
            <p className="font-bold text-lg">Créer une vidéo</p>
            <p className="text-sm opacity-75">Script + visuels + voix off</p>
          </div>
        </Link>

        <Link href="/history" className="bg-gray-800 hover:bg-gray-700 text-white rounded-2xl p-8 flex flex-col gap-3 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div>
            <p className="font-bold text-lg">Historique</p>
            <p className="text-sm text-gray-400">Vidéos générées</p>
          </div>
        </Link>

      </div>
    </div>
  )
}
