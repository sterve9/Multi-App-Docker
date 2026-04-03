'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Trees, Apple, Syringe, TriangleAlert, MapPin } from 'lucide-react'

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
    <div className="md:ml-64 min-h-screen flex items-center justify-center">
      <Navbar />
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-sm">Chargement...</span>
      </div>
    </div>
  )

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1">Vue d&apos;ensemble de vos exploitations</p>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trees size={28} className="text-emerald-400" />
            </div>
            <p className="font-semibold text-slate-600">Aucune ferme configurée</p>
            <p className="text-sm text-slate-400 mt-1">Commence par créer tes fermes et parcelles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.map((d) => (
              <div key={d.ferme.id} className="bg-white rounded-2xl shadow-sm overflow-hidden card-hover border border-slate-100">
                {/* Gradient header */}
                <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{d.ferme.nom}</h2>
                      <div className="flex items-center gap-1.5 mt-1 text-emerald-100/80 text-sm">
                        <MapPin size={13} />
                        {d.ferme.localisation}
                        {d.ferme.surface_ha && <span>· {d.ferme.surface_ha} ha</span>}
                      </div>
                    </div>
                    <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                      Active
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-5 grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MapPin size={18} className="text-emerald-600" />}
                    bg="bg-emerald-50"
                    label="Parcelles"
                    value={d.nb_parcelles}
                  />
                  <StatCard
                    icon={<Trees size={18} className="text-green-600" />}
                    bg="bg-green-50"
                    label="Arbres"
                    value={d.nb_arbres_total.toLocaleString()}
                  />
                  <StatCard
                    icon={<Apple size={18} className="text-orange-500" />}
                    bg="bg-orange-50"
                    label="Récoltes (kg)"
                    value={d.recolte_total_kg > 0 ? d.recolte_total_kg.toLocaleString() : '—'}
                  />
                  <StatCard
                    icon={<TriangleAlert size={18} className={d.stocks_alerte > 0 ? 'text-red-500' : 'text-slate-300'} />}
                    bg={d.stocks_alerte > 0 ? 'bg-red-50' : 'bg-slate-50'}
                    label="Alertes stock"
                    value={d.stocks_alerte}
                    alert={d.stocks_alerte > 0}
                  />
                </div>

                {d.dernier_traitement && (
                  <div className="px-5 pb-4 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-50 pt-3">
                    <Syringe size={13} />
                    Dernier traitement :
                    <span className="font-semibold text-slate-600">
                      {new Date(d.dernier_traitement).toLocaleDateString('fr-FR')}
                    </span>
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

function StatCard({ icon, bg, label, value, alert = false }: {
  icon: React.ReactNode; bg: string; label: string; value: number | string; alert?: boolean
}) {
  return (
    <div className={`rounded-xl p-3.5 flex items-center gap-3 ${bg}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className={`text-lg font-bold ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
