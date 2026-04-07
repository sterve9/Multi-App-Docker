'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Syringe, Package, CheckCircle } from 'lucide-react'

interface Parcelle { id: number; nom: string; ferme_id: number }
interface Ferme { id: number; nom: string }
interface Stock { id: number; nom: string; quantite: number; unite: string | null; ferme_id: number }
interface Traitement {
  id: number; parcelle_id: number; date: string
  type_traitement: string; produit: string | null
  dose: number | null; unite: string | null; notes: string | null
  stock_id: number | null
}

const TYPES = ['pesticide', 'engrais', 'irrigation', 'taille', 'autre']
const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  pesticide:  { bg: 'bg-red-50',     text: 'text-red-600',     icon: '🧪' },
  engrais:    { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🌱' },
  irrigation: { bg: 'bg-blue-50',    text: 'text-blue-600',    icon: '💧' },
  taille:     { bg: 'bg-purple-50',  text: 'text-purple-600',  icon: '✂️' },
  autre:      { bg: 'bg-slate-50',   text: 'text-slate-500',   icon: '🔧' },
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function TraitementsPage() {
  const router = useRouter()
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [traitements, setTraitements] = useState<Traitement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterParcelle, setFilterParcelle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; visible: boolean; exiting: boolean }>({ msg: '', visible: false, exiting: false })
  const [form, setForm] = useState({
    parcelle_id: '', date: new Date().toISOString().split('T')[0],
    type_traitement: 'pesticide', produit: '', dose: '', unite: 'L/ha', notes: '',
    stock_id: '',
  })

  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ msg: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadData = useCallback(async () => {
    const [f, p, t, s] = await Promise.allSettled([
      api.get('/fermes/'),
      api.get('/parcelles/'),
      api.get('/traitements/'),
      api.get('/stocks/'),
    ])
    if (f.status === 'fulfilled') setFermes(f.value.data)
    if (p.status === 'fulfilled') setParcelles(p.value.data)
    if (t.status === 'fulfilled') setTraitements(t.value.data)
    if (s.status === 'fulfilled') setStocks(s.value.data)
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

  // Filtrer les stocks selon la ferme de la parcelle sélectionnée
  const selectedParcelle = parcelles.find(p => p.id === parseInt(form.parcelle_id))
  const stocksFerme = stocks.filter(s => selectedParcelle ? s.ferme_id === selectedParcelle.ferme_id : true)

  // Stock sélectionné pour afficher le stock disponible
  const selectedStock = stocks.find(s => s.id === parseInt(form.stock_id))

  const openAdd = () => {
    setForm({ parcelle_id: parcelles[0]?.id?.toString() || '', date: new Date().toISOString().split('T')[0], type_traitement: 'pesticide', produit: '', dose: '', unite: 'L/ha', notes: '', stock_id: '' })
    setEditId(null); setFormError(null); setShowForm(true)
  }
  const openEdit = (t: Traitement) => {
    setForm({ parcelle_id: t.parcelle_id.toString(), date: t.date, type_traitement: t.type_traitement, produit: t.produit || '', dose: t.dose?.toString() || '', unite: t.unite || 'L/ha', notes: t.notes || '', stock_id: t.stock_id?.toString() || '' })
    setEditId(t.id); setFormError(null); setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setFormError(null)
    try {
      const payload = {
        parcelle_id: parseInt(form.parcelle_id),
        date: form.date,
        type_traitement: form.type_traitement,
        produit: form.produit || null,
        dose: form.dose ? parseFloat(form.dose) : null,
        unite: form.unite || null,
        notes: form.notes || null,
        stock_id: form.stock_id ? parseInt(form.stock_id) : null,
      }
      if (editId) await api.put(`/traitements/${editId}`, payload)
      else await api.post('/traitements/', payload)
      setShowForm(false); loadData()
      const msg = (form.stock_id && form.dose && !editId)
        ? `Traitement enregistré — sortie de ${form.dose} ${form.unite || 'unités'} déduite du stock`
        : 'Traitement enregistré'
      showToast(msg)
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce traitement ?')) return
    await api.delete(`/traitements/${id}`); loadData()
  }

  const getParcelleName = (id: number) => parcelles.find(p => p.id === id)?.nom || '—'
  const getFermeName = (parcelleId: number) => {
    const p = parcelles.find(p => p.id === parcelleId)
    return p ? fermes.find(f => f.id === p.ferme_id)?.nom || '—' : '—'
  }
  const getStockName = (stockId: number | null) => stockId ? stocks.find(s => s.id === stockId)?.nom || null : null

  const sorted = [...(filterParcelle ? traitements.filter(t => t.parcelle_id === parseInt(filterParcelle)) : traitements)]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Traitements</h1>
            <p className="text-slate-400 text-sm mt-0.5">{traitements.length} traitement{traitements.length !== 1 ? 's' : ''} enregistré{traitements.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="mb-5 fade-in-up" style={{ animationDelay: '60ms' }}>
          <select value={filterParcelle} onChange={e => setFilterParcelle(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes les parcelles</option>
            {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {sorted.map((t, i) => {
            const cfg = TYPE_CONFIG[t.type_traitement] || TYPE_CONFIG.autre
            const stockNom = getStockName(t.stock_id)
            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-4 card-hover fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${cfg.bg} ${cfg.text}`}>{t.type_traitement}</span>
                    <span className="text-sm font-bold text-slate-700">{t.produit || 'Sans produit'}</span>
                    {t.dose && <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{t.dose} {t.unite}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-3 flex-wrap">
                    <span>📍 {getParcelleName(t.parcelle_id)} · {getFermeName(t.parcelle_id)}</span>
                    <span>📅 {new Date(t.date).toLocaleDateString('fr-FR')}</span>
                    {stockNom && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Package size={11} /> {stockNom}
                      </span>
                    )}
                  </div>
                  {t.notes && <p className="text-xs text-slate-400 mt-1 italic">{t.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <Syringe size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">Aucun traitement — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier le traitement' : 'Nouveau traitement'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            {formError && <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Parcelle *</label>
                  <select value={form.parcelle_id} onChange={e => setForm({...form, parcelle_id: e.target.value, stock_id: ''})} required className={INPUT}>
                    {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type *</label>
                  <select value={form.type_traitement} onChange={e => setForm({...form, type_traitement: e.target.value})} className={INPUT}>
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Produit (nom libre)</label>
                  <input value={form.produit} onChange={e => setForm({...form, produit: e.target.value})} className={INPUT} placeholder="Copper 50WP" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dose utilisée</label>
                  <input type="number" step="0.01" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} className={INPUT} placeholder="2.5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unité</label>
                  <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className={INPUT} placeholder="L/ha, kg..." />
                </div>
              </div>

              {/* Lien stock — déduction automatique */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Déduire du stock</span>
                  <span className="text-xs text-slate-400">(optionnel)</span>
                </div>
                <select
                  value={form.stock_id}
                  onChange={e => setForm({...form, stock_id: e.target.value})}
                  className={INPUT}
                >
                  <option value="">— Aucun stock lié</option>
                  {stocksFerme.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nom} · {s.quantite} {s.unite || 'unités'} disponibles
                    </option>
                  ))}
                </select>
                {selectedStock && form.dose && (
                  <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                    selectedStock.quantite < parseFloat(form.dose || '0')
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {selectedStock.quantite < parseFloat(form.dose || '0')
                      ? `⚠️ Stock insuffisant : ${selectedStock.quantite} ${selectedStock.unite || 'unités'} disponibles`
                      : `✓ Après déduction : ${(selectedStock.quantite - parseFloat(form.dose)).toFixed(2)} ${selectedStock.unite || 'unités'}`
                    }
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Observations, conditions météo..." />
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
