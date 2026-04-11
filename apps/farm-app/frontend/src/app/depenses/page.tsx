'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Wallet } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

interface Ferme { id: number; nom: string }
interface Depense {
  id: number
  ferme_id: number
  date: string
  categorie: string
  montant: number
  description: string | null
  notes: string | null
}

const CATEGORIES = [
  { value: 'irrigation',    label: 'Irrigation',       icon: '💧', color: 'bg-blue-50 text-blue-700' },
  { value: 'construction',  label: 'Construction',     icon: '🏗️', color: 'bg-orange-50 text-orange-700' },
  { value: 'renovation',    label: 'Rénovation',       icon: '🔨', color: 'bg-amber-50 text-amber-700' },
  { value: 'alimentation',  label: 'Alimentation',     icon: '🐕', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'main_oeuvre',   label: "Main d'œuvre",     icon: '👷', color: 'bg-purple-50 text-purple-700' },
  { value: 'carburant',     label: 'Carburant',        icon: '⛽', color: 'bg-red-50 text-red-700' },
  { value: 'materiel',      label: 'Matériel',         icon: '🔧', color: 'bg-slate-50 text-slate-700' },
  { value: 'autre',         label: 'Autre',            icon: '📋', color: 'bg-gray-50 text-gray-700' },
]

const getCatConfig = (val: string) =>
  CATEGORIES.find(c => c.value === val) ?? { label: val, icon: '📋', color: 'bg-gray-50 text-gray-700' }

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function DepensesPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [selectedFerme, setSelectedFerme] = useState<number | ''>('')
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [loading, setLoading] = useState(false)
  const [annee, setAnnee] = useState(new Date().getFullYear())

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Depense | null>(null)
  const [form, setForm] = useState({ date: '', categorie: 'irrigation', montant: '', description: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadFermes = useCallback(async () => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    try {
      const r = await api.get('/fermes/')
      setFermes(r.data)
      if (r.data.length > 0 && selectedFerme === '') setSelectedFerme(r.data[0].id)
    } catch { router.push('/login') }
  }, [router, selectedFerme])

  const loadDepenses = useCallback(async () => {
    if (!selectedFerme) return
    setLoading(true)
    try {
      const r = await api.get('/depenses/', { params: { ferme_id: selectedFerme, annee } })
      setDepenses(r.data)
    } finally {
      setLoading(false)
    }
  }, [selectedFerme, annee])

  useEffect(() => { loadFermes() }, [])
  useEffect(() => { loadDepenses() }, [selectedFerme, annee])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ date: new Date().toISOString().split('T')[0], categorie: 'irrigation', montant: '', description: '', notes: '' })
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (d: Depense) => {
    setEditTarget(d)
    setForm({ date: d.date, categorie: d.categorie, montant: String(d.montant), description: d.description || '', notes: d.notes || '' })
    setFormError(null)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFerme) return
    setSubmitting(true)
    setFormError(null)
    try {
      const data = { ferme_id: selectedFerme, date: form.date, categorie: form.categorie, montant: parseFloat(form.montant), description: form.description || null, notes: form.notes || null }
      if (editTarget) {
        await api.put(`/depenses/${editTarget.id}`, data)
      } else {
        await api.post('/depenses/', data)
      }
      setShowForm(false)
      loadDepenses()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (d: Depense) => {
    if (!confirm(`Supprimer cette dépense de ${d.montant} TND ?`)) return
    await api.delete(`/depenses/${d.id}`)
    loadDepenses()
  }

  const totalAnnee = depenses.reduce((s, d) => s + d.montant, 0)

  // Group by category for summary
  const byCategorie: Record<string, number> = {}
  depenses.forEach(d => { byCategorie[d.categorie] = (byCategorie[d.categorie] || 0) + d.montant })
  const catSummary = Object.entries(byCategorie).sort((a, b) => b[1] - a[1])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen bg-slate-50 md:ml-64">
      <Navbar />
      <div className="pb-24 md:pb-0">
        <PageHeader
          icon={Wallet}
          title="Dépenses"
          subtitle="Toutes les charges de la ferme"
          gradient="bg-gradient-to-r from-orange-700 to-amber-600"
          stats={[
            { label: `Total ${annee}`, value: `${totalAnnee.toLocaleString('fr-FR')} TND` },
            { label: 'Entrées', value: String(depenses.length) },
          ]}
          action={
            <button onClick={openCreate} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus size={16} /> Ajouter
            </button>
          }
        />

        <div className="px-4 py-5 space-y-4">
          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <select
              className={INPUT + ' max-w-[200px]'}
              value={selectedFerme}
              onChange={e => setSelectedFerme(Number(e.target.value))}
            >
              {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            <select
              className={INPUT + ' max-w-[120px]'}
              value={annee}
              onChange={e => setAnnee(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Résumé par catégorie */}
          {catSummary.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Répartition {annee}</h3>
              <div className="space-y-2">
                {catSummary.map(([cat, total]) => {
                  const cfg = getCatConfig(cat)
                  const pct = totalAnnee > 0 ? Math.round(total / totalAnnee * 100) : 0
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} min-w-[110px] text-center`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 min-w-[90px] text-right">
                        {total.toLocaleString('fr-FR')} TND
                      </span>
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">Total</span>
                <span className="text-base font-bold text-orange-700">{totalAnnee.toLocaleString('fr-FR')} TND</span>
              </div>
            </div>
          )}

          {/* Liste des dépenses */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Chargement...</div>
          ) : depenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
              <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Aucune dépense enregistrée pour {annee}</p>
              <button onClick={openCreate} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Ajouter la première dépense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-50">
                {depenses.map(d => {
                  const cfg = getCatConfig(d.categorie)
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <span className="text-xl w-8 text-center">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          {d.description && <span className="text-sm text-slate-700 truncate">{d.description}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {d.notes && <span className="ml-2 italic">— {d.notes}</span>}
                        </div>
                      </div>
                      <span className="font-bold text-orange-700 text-sm whitespace-nowrap">{d.montant.toLocaleString('fr-FR')} TND</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(d)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal ajout / édition */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editTarget ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
            )}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date *</label>
                <input type="date" className={INPUT} required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Catégorie *</label>
                <select className={INPUT} required value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Montant (TND) *</label>
                <input type="number" step="0.01" min="0" className={INPUT} required value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="ex: 3200" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Description</label>
                <input className={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="ex: Achat 200m tuyau goutte-à-goutte" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Notes</label>
                <textarea className={INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informations complémentaires..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                  {submitting ? 'Enregistrement...' : editTarget ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
