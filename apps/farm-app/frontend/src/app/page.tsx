'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Trees, Apple, Syringe, TriangleAlert } from 'lucide-react'

interface DashboardFerme {
  ferme: { id: number; nom: string; localisation: string; surface_ha: number }
  nb_parcelles: number
  nb_arbres_total: number
  recolte_total_kg: number
  dernier_traitement: string | null
  stocks_alerte: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardFerme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    api.get('/fermes/dashboard/all')
      .then(r => setData(r.data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-farm-green text-lg">Chargement...</div>
    </div>
  )

  return (
    <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-farm-green mb-6">📊 Tableau de bord</h1>

        {data.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 shadow">
            <div className="text-4xl mb-3">🌱</div>
            <p className="font-medium">Aucune ferme configurée</p>
            <p className="text-sm mt-1">Commence par ajouter tes fermes et parcelles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.map((d) => (
              <div key={d.ferme.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-farm-green">{d.ferme.nom}</h2>
                    <p className="text-gray-500 text-sm">{d.ferme.localisation} · {d.ferme.surface_ha} ha</p>
                  </div>
                  <span className="bg-farm-green-pale text-farm-green text-xs font-medium px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Trees size={20} className="text-farm-green" />} label="Parcelles" value={d.nb_parcelles} />
                  <StatCard icon={<span className="text-xl">🌳</span>} label="Arbres" value={d.nb_arbres_total} />
                  <StatCard icon={<Apple size={20} className="text-farm-orange" />} label="Récoltes (kg)" value={d.recolte_total_kg.toFixed(0)} />
                  <StatCard
                    icon={<TriangleAlert size={20} className={d.stocks_alerte > 0 ? 'text-red-500' : 'text-gray-400'} />}
                    label="Alertes stock"
                    value={d.stocks_alerte}
                    alert={d.stocks_alerte > 0}
                  />
                </div>

                {d.dernier_traitement && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <Syringe size={14} />
                    Dernier traitement : <span className="font-medium text-gray-700">{new Date(d.dernier_traitement).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, alert = false }: { icon: React.ReactNode; label: string; value: number | string; alert?: boolean }) {
  return (
    <div className={`rounded-xl p-3 flex items-center gap-3 ${alert ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}
