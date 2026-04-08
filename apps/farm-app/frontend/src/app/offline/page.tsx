export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071c10] to-[#0f3320] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-6">🌿</div>
        <h1 className="text-2xl font-bold text-white mb-2">Pas de connexion</h1>
        <p className="text-emerald-400/70 text-sm mb-8">
          Reconnectez-vous à Internet pour accéder à Farm Manager.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
