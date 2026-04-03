'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Package, TriangleAlert } from 'lucide-react'

interface Stock {
  id: number; nom: string; categorie: string
  quantite: number; unite: string | null
  seuil_alerte: number; notes: string | null
}

const CATEGORIES = ['pesticide', 'engrais', 'materiel', 'autre']
const CAT_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  pesticide: { bg: 'bg-red-50',     text: 'text-red-600',     icon: '🧪' },
  engrais:   { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🌱' },
  materiel:  { bg: 'bg-blue-50',    text: 'text-blue-600',    icon: '🔧' },
  autre:     { bg: 'bg-slate-50',   text: 'text-slate-500',   icon: '📦' },
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function StocksPage() {
  const router = useRouter()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [form, setForm] = useState({ nom: '', categorie: 'pesticide', quantite: '0', unite: '', seuil_alerte: '0', notes: '' })

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = async () => { const r = await api.get('/stocks/'); setStocks(r.data) }
  const openAdd = () => { setForm({ nom: '', categorie: 'pesticide', quantite: '0', unite: '', seuil_alerte: '0', notes: '' }); setEditId(null); setShowForm(true) }
  const openEdit = (s: Stock) => { setForm({ nom: s.nom, categorie: s.categorie, quantite: s.quantite.toString(), unite: s.unite || '', seuil_alerte: s.seuil_alerte.toString(), notes: s.notes || '' }); setEditId(s.id); setShowForm(true) }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, quantite: parseFloat(form.quantite), seuil_alerte: parseFloat(form.seuil_alerte), unite: form.unite || null }
    if (editId) await api.put(`/stocks/${editId}`, payload)
    else await api.post('/stocks/', payload)
    setShowForm(false); loadData()
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce stock ?')) return
    await api.delete(`/stocks/${id}`); loadData()
  }

  const isAlert = (s: Stock) => s.seuil_alerte > 0 && s.quantite <= s.seuil_alerte

  let filtered = stocks
  if (filterCategorie) filtered = filtered.filter(s => s.categorie === filterCategorie)
  if (showAlertsOnly) filtered = filtered.filter(isAlert)
  const alertCount = stocks.filter(isAlert).length

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Stocks</h1>
              <p className="text-slate-400 text-sm mt-0.5">{stocks.length} article{stocks.length !== 1 ? 's' : ''} en stock</p>
            </div>
            {alertCount > 0 && (
              <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-red-100">
                <TriangleAlert size={13} /> {alertCount} alerte{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CAT_CONFIG[c]?.icon} {c}</option>)}
          </select>
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition border ${showAlertsOnly ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <TriangleAlert size={14} /> Alertes seulement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const alert = isAlert(s)
            const cfg = CAT_CONFIG[s.categorie] || CAT_CONFIG.autre
            const pct = s.seuil_alerte > 0 ? Math.min((s.quantite / (s.seuil_alerte * 3)) * 100, 100) : 100
            return (
              <div key={s.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden card-hover ${alert ? 'border-red-200' : 'border-slate-100'}`}>
                <div className={`h-1 w-full ${alert ? 'bg-red-400' : 'bg-emerald-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{s.nom}</h3>
                        <span className={`text-xs font-semibold capitalize ${cfg.text}`}>{s.categorie}</span>
                      </div>
                    </div>
                    {alert && <TriangleAlert size={16} className="text-red-500 shrink-0" />}
                  </div>

                  <div className={`text-3xl font-bold mb-1 ${alert ? 'text-red-600' : 'text-slate-800'}`}>
                    {s.quantite.toLocaleString()}
                    <span className="text-sm font-normal text-slate-400 ml-1">{s.unite || 'unités'}</span>
                  </div>

                  {s.seuil_alerte > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${alert ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Seuil : {s.seuil_alerte} {s.unite || ''}</p>
                    </div>
                  )}

                  {s.notes && <p className="text-xs text-slate-400 italic mt-2 line-clamp-1">{s.notes}</p>}

                  <div className="flex gap-1 mt-4 pt-3 border-t border-slate-50">
                    <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 py-1.5 rounded-lg transition">
                      <Pencil size={13} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition">
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <Package size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">{showAlertsOnly ? 'Aucune alerte de stock ✅' : 'Aucun stock — clique sur Ajouter'}</p>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier le stock' : 'Nouveau stock'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required className={INPUT} placeholder="Copper 50WP" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Catégorie *</label>
                  <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className={INPUT}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CAT_CONFIG[c]?.icon} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unité</label>
                  <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className={INPUT} placeholder="kg, L, sacs..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantité</label>
                  <input type="number" step="0.01" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seuil d&apos;alerte</label>
                  <input type="number" step="0.01" value={form.seuil_alerte} onChange={e => setForm({...form, seuil_alerte: e.target.value})} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Fournisseur, référence..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                  {editId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
