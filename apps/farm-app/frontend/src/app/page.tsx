'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Trees, Apple, Syringe, TriangleAlert, MapPin, Plus, X } from 'lucide-react'

interface DashboardFerme {
  ferme: { id: number; nom: string; localisation: string; surface_ha: number }
  nb_parcelles: number
  nb_arbres_total: number
  recolte_total_kg: number
  dernier_traitement: string | null
  stocks_alerte: number
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardFerme[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', localisation: '', surface_ha: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = () => {
    api.get('/fermes/dashboard/all')
      .then(r => setData(r.data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await api.post('/fermes/', {
        nom: form.nom,
        localisation: form.localisation || null,
        surface_ha: form.surface_ha ? parseFloat(form.surface_ha) : null,
      })
      setShowForm(false)
      setForm({ nom: '', localisation: '', surface_ha: '' })
      loadData()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
            <p className="text-slate-400 text-sm mt-1">Vue d&apos;ensemble de vos exploitations</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow">
            <Plus size={16} /> Nouvelle ferme
          </button>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trees size={28} className="text-emerald-400" />
            </div>
            <p className="font-semibold text-slate-600">Aucune ferme configurée</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Commence par créer ta première ferme.</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={16} /> Créer une ferme
            </button>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Nouvelle ferme</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
            )}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  required
                  className={INPUT}
                  placeholder="Ma ferme"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Localisation</label>
                <input
                  value={form.localisation}
                  onChange={e => setForm({ ...form, localisation: e.target.value })}
                  className={INPUT}
                  placeholder="Ville, Région"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Surface (ha)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.surface_ha}
                  onChange={e => setForm({ ...form, surface_ha: e.target.value })}
                  className={INPUT}
                  placeholder="10.5"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                  {submitting ? 'Enregistrement...' : 'Créer la ferme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
