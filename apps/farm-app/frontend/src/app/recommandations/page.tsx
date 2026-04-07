'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, X, ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface Ferme { id: number; nom: string }
interface Recommandation {
  id: number
  ferme_id: number
  ferme: Ferme
  date: string
  auteur: string
  contenu: string
  priorite: 'haute' | 'normale' | 'basse'
  statut: 'en_attente' | 'appliquee' | 'ignoree'
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

const PRIORITE_CONFIG = {
  haute:   { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',   label: '⚡ Haute' },
  normale: { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200', label: '· Normale' },
  basse:   { color: 'text-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-200', label: '↓ Basse' },
}
const STATUT_CONFIG = {
  en_attente: { color: 'text-amber-600', bg: 'bg-amber-50',   icon: Clock,         label: 'En attente' },
  appliquee:  { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, label: 'Appliquée' },
  ignoree:    { color: 'text-slate-400', bg: 'bg-slate-100',  icon: X,             label: 'Ignorée' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RecommandationsPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [recs, setRecs] = useState<Recommandation[]>([])
  const [filterFerme, setFilterFerme] = useState<number | ''>('')
  const [filterStatut, setFilterStatut] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; visible: boolean; exiting: boolean }>({ msg: '', visible: false, exiting: false })
  const [form, setForm] = useState({ ferme_id: '', auteur: 'Ingénieur', contenu: '', priorite: 'normale', statut: 'en_attente' })

  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ msg: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadData = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterFerme) params.set('ferme_id', String(filterFerme))
    if (filterStatut) params.set('statut', filterStatut)
    const r = await api.get(`/recommandations/?${params}`)
    setRecs(r.data)
  }, [filterFerme, filterStatut])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    api.get('/fermes/').then(r => setFermes(r.data))
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setForm({ ferme_id: fermes[0]?.id.toString() || '', auteur: 'Ingénieur', contenu: '', priorite: 'normale', statut: 'en_attente' })
    setEditId(null); setFormError(null); setShowForm(true)
  }
  const openEdit = (r: Recommandation) => {
    setForm({ ferme_id: r.ferme_id.toString(), auteur: r.auteur, contenu: r.contenu, priorite: r.priorite, statut: r.statut })
    setEditId(r.id); setFormError(null); setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setFormError(null)
    try {
      if (editId) {
        await api.put(`/recommandations/${editId}`, { auteur: form.auteur, contenu: form.contenu, priorite: form.priorite, statut: form.statut })
        showToast('Recommandation mise à jour')
      } else {
        await api.post('/recommandations/', { ...form, ferme_id: parseInt(form.ferme_id) })
        showToast('Recommandation ajoutée')
      }
      setShowForm(false); loadData()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally { setSubmitting(false) }
  }

  const updateStatut = async (id: number, statut: string) => {
    await api.put(`/recommandations/${id}`, { statut })
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette recommandation ?')) return
    await api.delete(`/recommandations/${id}`); loadData()
  }

  const enAttente = recs.filter(r => r.statut === 'en_attente').length

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Recommandations</h1>
              <p className="text-slate-400 text-sm mt-0.5">Carnet de suivi ingénieur</p>
            </div>
            {enAttente > 0 && (
              <span className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-amber-200">
                <Clock size={13} /> {enAttente} en attente
              </span>
            )}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95">
            <Plus size={16} /> Nouvelle
          </button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-6 flex-wrap fade-in-up" style={{ animationDelay: '60ms' }}>
          <select value={filterFerme} onChange={e => setFilterFerme(e.target.value ? Number(e.target.value) : '')} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition">
            <option value="">Toutes les fermes</option>
            {fermes.map(f => <option key={f.id} value={f.id}>🏡 {f.nom}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition">
            <option value="">Tous les statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="appliquee">✅ Appliquée</option>
            <option value="ignoree">❌ Ignorée</option>
          </select>
        </div>

        {/* Liste */}
        {recs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100 fade-in-up">
            <ClipboardList size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-semibold">Aucune recommandation</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Commence par noter une observation de terrain.</p>
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={16} /> Ajouter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec, i) => {
              const prio = PRIORITE_CONFIG[rec.priorite]
              const stat = STATUT_CONFIG[rec.statut]
              const StatIcon = stat.icon
              return (
                <div
                  key={rec.id}
                  className={`bg-white rounded-2xl shadow-sm border card-hover fade-in-up overflow-hidden ${rec.priorite === 'haute' ? 'border-red-200' : 'border-slate-100'}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {rec.priorite === 'haute' && <div className="h-1 w-full bg-red-400" />}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Meta */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${prio.color} ${prio.bg} ${prio.border}`}>{prio.label}</span>
                          <span className="text-xs text-slate-400 font-medium">🏡 {rec.ferme.nom}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{rec.auteur}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{formatDate(rec.date)}</span>
                        </div>
                        {/* Contenu */}
                        <p className="text-sm text-slate-700 leading-relaxed">{rec.contenu}</p>
                      </div>
                      {/* Statut + actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <select
                          value={rec.statut}
                          onChange={e => updateStatut(rec.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${stat.color} ${stat.bg}`}
                        >
                          <option value="en_attente">⏳ En attente</option>
                          <option value="appliquee">✅ Appliquée</option>
                          <option value="ignoree">❌ Ignorée</option>
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(rec)} className="text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition">Éditer</button>
                          <button onClick={() => handleDelete(rec.id)} className="text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition">Suppr.</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier' : 'Nouvelle recommandation'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            {formError && <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ferme *</label>
                  <select value={form.ferme_id} onChange={e => setForm({...form, ferme_id: e.target.value})} required className={INPUT}>
                    <option value="" disabled>-- Sélectionner --</option>
                    {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Auteur</label>
                  <input value={form.auteur} onChange={e => setForm({...form, auteur: e.target.value})} className={INPUT} placeholder="Ingénieur" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priorité</label>
                  <select value={form.priorite} onChange={e => setForm({...form, priorite: e.target.value})} className={INPUT}>
                    <option value="haute">⚡ Haute</option>
                    <option value="normale">· Normale</option>
                    <option value="basse">↓ Basse</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Recommandation *</label>
                <textarea value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} required rows={4} className={INPUT} placeholder="Appliquer du sulfate de potassium sur la parcelle B, dose 3 kg/ha..." />
              </div>
              {editId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} className={INPUT}>
                    <option value="en_attente">⏳ En attente</option>
                    <option value="appliquee">✅ Appliquée</option>
                    <option value="ignoree">❌ Ignorée</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95">
                  {submitting ? 'Enregistrement...' : editId ? 'Enregistrer' : 'Ajouter'}
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
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
