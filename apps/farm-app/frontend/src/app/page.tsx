'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Trees, Apple, Syringe, TriangleAlert, MapPin, Plus, X, CheckCircle, Trash2 } from 'lucide-react'

interface DashboardFerme {
  ferme: { id: number; nom: string; localisation: string; surface_ha: number }
  nb_parcelles: number
  nb_arbres_total: number
  recolte_total_kg: number
  dernier_traitement: string | null
  stocks_alerte: number
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

// Hook compteur animé
function useCountUp(target: number, duration = 900, trigger = true) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!trigger || target === 0) { setCount(target); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.round(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, trigger])
  return count
}

// Toast
interface ToastState { message: string; visible: boolean; exiting: boolean }

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardFerme[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', localisation: '', surface_ha: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false, exiting: false })
  const [animated, setAnimated] = useState(false)

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ message: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadData = useCallback(() => {
    api.get('/fermes/dashboard/all')
      .then(r => {
        setData(r.data)
        setAnimated(false)
        setTimeout(() => setAnimated(true), 50)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router, loadData])

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
      showToast('Ferme créée avec succès')
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-48 skeleton rounded-lg" />
            <div className="h-4 w-64 skeleton rounded-lg" />
          </div>
          <div className="h-10 w-36 skeleton rounded-xl" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <div className="h-24 skeleton" />
              <div className="p-5 grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
            <p className="text-slate-400 text-sm mt-1">Vue d&apos;ensemble de vos exploitations</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={16} /> Nouvelle ferme
          </button>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100 fade-in-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trees size={28} className="text-emerald-400" />
            </div>
            <p className="font-semibold text-slate-600">Aucune ferme configurée</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Commence par créer ta première ferme.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
            >
              <Plus size={16} /> Créer une ferme
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.map((d, index) => (
              <FermeCard key={d.ferme.id} d={d} index={index} animated={animated} onDelete={async () => {
                if (!confirm(`Supprimer "${d.ferme.nom}" et toutes ses données ?`)) return
                await api.delete(`/fermes/${d.ferme.id}`)
                loadData()
                showToast('Ferme supprimée')
              }} />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
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
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enregistrement...
                    </span>
                  ) : 'Créer la ferme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}>
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium whitespace-nowrap">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

function FermeCard({ d, index, animated, onDelete }: { d: DashboardFerme; index: number; animated: boolean; onDelete: () => void }) {
  const parcelles = useCountUp(d.nb_parcelles, 700, animated)
  const arbres = useCountUp(d.nb_arbres_total, 900, animated)
  const recoltes = useCountUp(d.recolte_total_kg, 800, animated)
  const alertes = useCountUp(d.stocks_alerte, 500, animated)

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden card-hover border border-slate-100 fade-in-up"
      style={{ animationDelay: `${index * 90}ms` }}
    >
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
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-lg">
              Active
            </span>
            <button
              onClick={onDelete}
              className="p-1.5 text-white/40 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition"
              title="Supprimer la ferme"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 grid grid-cols-2 gap-3">
        <StatCard
          icon={<MapPin size={18} className="text-emerald-600" />}
          bg="bg-emerald-50"
          label="Parcelles"
          value={parcelles}
        />
        <StatCard
          icon={<Trees size={18} className="text-green-600" />}
          bg="bg-green-50"
          label="Arbres"
          value={arbres.toLocaleString()}
        />
        <StatCard
          icon={<Apple size={18} className="text-orange-500" />}
          bg="bg-orange-50"
          label="Récoltes (kg)"
          value={recoltes > 0 ? recoltes.toLocaleString() : '—'}
        />
        <StatCard
          icon={
            alertes > 0 ? (
              <span className="relative flex items-center justify-center w-5 h-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50" />
                <TriangleAlert size={18} className="relative text-red-500" />
              </span>
            ) : (
              <TriangleAlert size={18} className="text-slate-300" />
            )
          }
          bg={alertes > 0 ? 'bg-red-50' : 'bg-slate-50'}
          label="Alertes stock"
          value={alertes}
          alert={alertes > 0}
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
  )
}

function StatCard({ icon, bg, label, value, alert = false }: {
  icon: React.ReactNode; bg: string; label: string; value: number | string; alert?: boolean
}) {
  return (
    <div className={`rounded-xl p-3.5 flex items-center gap-3 ${bg} ${alert ? 'alert-pulse' : ''}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className={`text-lg font-bold tabular-nums ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
