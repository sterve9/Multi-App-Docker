'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Apple, CheckCircle } from 'lucide-react'

interface Parcelle { id: number; nom: string; ferme_id: number; variete: string }
interface Ferme { id: number; nom: string }
interface Recolte {
  id: number; parcelle_id: number; date: string
  quantite_kg: number; qualite: string | null
  destination: string | null; notes: string | null
  prix_kg: number
}

const QUALITES = ['1ere catégorie', '2eme catégorie', 'mixte']
const QUALITE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  '1ere catégorie': { bg: 'bg-yellow-50',  text: 'text-yellow-700', label: '⭐ 1ère catégorie' },
  '2eme catégorie': { bg: 'bg-blue-50',    text: 'text-blue-600',   label: '✅ 2ème catégorie' },
  'mixte':          { bg: 'bg-slate-50',   text: 'text-slate-600',  label: '📦 Mixte' },
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function RecoltesPage() {
  const router = useRouter()
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [recoltes, setRecoltes] = useState<Recolte[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterParcelle, setFilterParcelle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; visible: boolean; exiting: boolean }>({ msg: '', visible: false, exiting: false })
  const [form, setForm] = useState({
    parcelle_id: '', date: new Date().toISOString().split('T')[0],
    quantite_kg: '', qualite: '1ere catégorie', destination: '', prix_kg: '', notes: ''
  })

  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ msg: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadData = useCallback(async () => {
    const [f, p, r] = await Promise.all([api.get('/fermes/'), api.get('/parcelles/'), api.get('/recoltes/')])
    setFermes(f.data); setParcelles(p.data); setRecoltes(r.data)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router, loadData])

  useEffect(() => {
    if (parcelles.length > 0 && !editId) {
      setForm(prev => ({ ...prev, parcelle_id: prev.parcelle_id || parcelles[0].id.toString() }))
    }
  }, [parcelles, editId])

  const openAdd = () => {
    setForm({ parcelle_id: parcelles[0]?.id?.toString() || '', date: new Date().toISOString().split('T')[0], quantite_kg: '', qualite: '1ere catégorie', destination: '', prix_kg: '', notes: '' })
    setEditId(null); setFormError(null); setShowForm(true)
  }
  const openEdit = (r: Recolte) => {
    setForm({ parcelle_id: r.parcelle_id.toString(), date: r.date, quantite_kg: r.quantite_kg.toString(), qualite: r.qualite || '1ere catégorie', destination: r.destination || '', prix_kg: r.prix_kg?.toString() || '', notes: r.notes || '' })
    setEditId(r.id); setFormError(null); setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setFormError(null)
    try {
      const payload = {
        parcelle_id: parseInt(form.parcelle_id),
        date: form.date,
        quantite_kg: parseFloat(form.quantite_kg),
        qualite: form.qualite || null,
        destination: form.destination || null,
        prix_kg: form.prix_kg ? parseFloat(form.prix_kg) : 0,
        notes: form.notes || null,
      }
      if (editId) await api.put(`/recoltes/${editId}`, payload)
      else await api.post('/recoltes/', payload)
      setShowForm(false); loadData()
      showToast(editId ? 'Récolte mise à jour' : 'Récolte enregistrée')
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette récolte ?')) return
    await api.delete(`/recoltes/${id}`); loadData()
  }

  const getParcelleName = (id: number) => parcelles.find(p => p.id === id)?.nom || '—'
  const getFermeName = (parcelleId: number) => {
    const p = parcelles.find(p => p.id === parcelleId)
    return p ? fermes.find(f => f.id === p.ferme_id)?.nom || '—' : '—'
  }

  const filtered = filterParcelle ? recoltes.filter(r => r.parcelle_id === parseInt(filterParcelle)) : recoltes
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const totalKg = filtered.reduce((sum, r) => sum + r.quantite_kg, 0)
  const totalValeur = filtered.reduce((sum, r) => sum + (r.quantite_kg * (r.prix_kg || 0)), 0)

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Récoltes</h1>
            <p className="text-slate-400 text-sm mt-0.5">{recoltes.length} récolte{recoltes.length !== 1 ? 's' : ''} enregistrée{recoltes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap fade-in-up" style={{ animationDelay: '60ms' }}>
          <select value={filterParcelle} onChange={e => setFilterParcelle(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes les parcelles</option>
            {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          {totalKg > 0 && (
            <div className="bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-xl border border-emerald-100">
              🏆 {totalKg.toLocaleString()} kg
            </div>
          )}
          {totalValeur > 0 && (
            <div className="bg-orange-50 text-orange-700 text-sm font-semibold px-4 py-2 rounded-xl border border-orange-100">
              💰 {totalValeur.toLocaleString('fr-TN')} TND
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sorted.map((r, i) => {
            const qcfg = QUALITE_CONFIG[r.qualite || ''] || QUALITE_CONFIG['mixte']
            const valeur = r.quantite_kg * (r.prix_kg || 0)
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-4 card-hover fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-lg shrink-0">🍋</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-slate-800 tabular-nums">{r.quantite_kg.toLocaleString()} kg</span>
                    {r.qualite && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${qcfg.bg} ${qcfg.text}`}>{qcfg.label}</span>
                    )}
                    {r.prix_kg > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600">
                        {r.prix_kg} TND/kg · {valeur.toLocaleString('fr-TN')} TND
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-3 flex-wrap">
                    <span>📍 {getParcelleName(r.parcelle_id)} · {getFermeName(r.parcelle_id)}</span>
                    <span>📅 {new Date(r.date).toLocaleDateString('fr-FR')}</span>
                    {r.destination && <span>🚚 {r.destination}</span>}
                  </div>
                  {r.notes && <p className="text-xs text-slate-400 mt-1 italic">{r.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <Apple size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">Aucune récolte — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier la récolte' : 'Nouvelle récolte'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            {formError && <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Parcelle *</label>
                  <select value={form.parcelle_id} onChange={e => setForm({...form, parcelle_id: e.target.value})} required className={INPUT}>
                    {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantité (kg) *</label>
                  <input type="number" step="0.1" value={form.quantite_kg} onChange={e => setForm({...form, quantite_kg: e.target.value})} required className={INPUT} placeholder="500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prix/kg (TND)</label>
                  <input type="number" step="0.01" value={form.prix_kg} onChange={e => setForm({...form, prix_kg: e.target.value})} className={INPUT} placeholder="45" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Qualité</label>
                  <select value={form.qualite} onChange={e => setForm({...form, qualite: e.target.value})} className={INPUT}>
                    {QUALITES.map(q => <option key={q} value={q}>{QUALITE_CONFIG[q]?.label || q}</option>)}
                  </select>
                </div>
              </div>
              {form.quantite_kg && form.prix_kg && (
                <div className="bg-emerald-50 rounded-xl px-4 py-3 text-sm text-emerald-700">
                  Valeur estimée : <span className="font-bold">{(parseFloat(form.quantite_kg) * parseFloat(form.prix_kg)).toLocaleString('fr-TN')} TND</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                <input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className={INPUT} placeholder="Marché local, Export..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Observations..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enregistrement...
                    </span>
                  ) : editId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
