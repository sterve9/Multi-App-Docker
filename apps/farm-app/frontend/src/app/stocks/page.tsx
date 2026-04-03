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

const CATEGORIES = ['pesticide', 'fertilisant', 'materiel', 'emballage', 'autre']
const CAT_BADGES: Record<string, string> = {
  pesticide: 'bg-red-100 text-red-700',
  fertilisant: 'bg-green-100 text-green-700',
  materiel: 'bg-blue-100 text-blue-700',
  emballage: 'bg-purple-100 text-purple-700',
  autre: 'bg-gray-100 text-gray-600',
}
const CAT_ICONS: Record<string, string> = {
  pesticide: '🧪', fertilisant: '🌱', materiel: '🔧', emballage: '📦', autre: '🗂️',
}

export default function StocksPage() {
  const router = useRouter()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [form, setForm] = useState({
    nom: '', categorie: 'pesticide',
    quantite: '0', unite: '', seuil_alerte: '0', notes: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = async () => {
    const r = await api.get('/stocks/')
    setStocks(r.data)
  }

  const resetForm = () => {
    setForm({ nom: '', categorie: 'pesticide', quantite: '0', unite: '', seuil_alerte: '0', notes: '' })
    setEditId(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }
  const openEdit = (s: Stock) => {
    setForm({
      nom: s.nom,
      categorie: s.categorie,
      quantite: s.quantite.toString(),
      unite: s.unite || '',
      seuil_alerte: s.seuil_alerte.toString(),
      notes: s.notes || ''
    })
    setEditId(s.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      quantite: parseFloat(form.quantite),
      seuil_alerte: parseFloat(form.seuil_alerte),
      unite: form.unite || null,
    }
    if (editId) await api.put(`/stocks/${editId}`, payload)
    else await api.post('/stocks/', payload)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce stock ?')) return
    await api.delete(`/stocks/${id}`)
    loadData()
  }

  const isAlert = (s: Stock) => s.seuil_alerte > 0 && s.quantite <= s.seuil_alerte

  let filtered = stocks
  if (filterCategorie) filtered = filtered.filter(s => s.categorie === filterCategorie)
  if (showAlertsOnly) filtered = filtered.filter(isAlert)

  const alertCount = stocks.filter(isAlert).length

  return (
    <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-farm-green">📦 Stocks</h1>
            {alertCount > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <TriangleAlert size={12} /> {alertCount} alerte{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-farm-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CAT_ICONS[c]} {c}</option>)}
          </select>
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition border ${showAlertsOnly ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <TriangleAlert size={14} /> Alertes seulement
          </button>
        </div>

        {/* Grille stocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const alert = isAlert(s)
            const pct = s.seuil_alerte > 0 ? Math.min((s.quantite / (s.seuil_alerte * 3)) * 100, 100) : 100
            return (
              <div key={s.id} className={`bg-white rounded-xl shadow p-4 border-l-4 ${alert ? 'border-red-400' : 'border-farm-green'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CAT_ICONS[s.categorie] || '📦'}</span>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{s.nom}</h3>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${CAT_BADGES[s.categorie] || 'bg-gray-100 text-gray-600'}`}>
                        {s.categorie}
                      </span>
                    </div>
                  </div>
                  {alert && <TriangleAlert size={16} className="text-red-500 shrink-0 mt-0.5" />}
                </div>

                {/* Quantité */}
                <div className={`text-2xl font-bold mb-1 ${alert ? 'text-red-600' : 'text-gray-800'}`}>
                  {s.quantite} <span className="text-sm font-normal text-gray-500">{s.unite || 'unités'}</span>
                </div>

                {/* Barre de progression */}
                {s.seuil_alerte > 0 && (
                  <div className="mb-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${alert ? 'bg-red-400' : 'bg-farm-green'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Seuil alerte : {s.seuil_alerte} {s.unite || ''}</div>
                  </div>
                )}

                {s.notes && <p className="text-xs text-gray-400 italic mb-2 line-clamp-1">{s.notes}</p>}

                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1 text-xs text-farm-green hover:bg-farm-green-pale py-1.5 rounded-lg transition">
                    <Pencil size={13} /> Modifier
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition">
                    <Trash2 size={13} /> Supprimer
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-30" />
              <p>{showAlertsOnly ? 'Aucune alerte de stock ✅' : 'Aucun stock — clique sur Ajouter'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-farm-green">{editId ? 'Modifier le stock' : 'Nouveau stock'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nom *</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Ex: Copper 50WP" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Catégorie *</label>
                  <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CAT_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unité</label>
                  <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="kg, L, sacs..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Quantité</label>
                  <input type="number" step="0.01" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Seuil d'alerte</label>
                  <input type="number" step="0.01" value={form.seuil_alerte} onChange={e => setForm({...form, seuil_alerte: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Fournisseur, référence..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 bg-farm-green text-white py-2 rounded-lg text-sm font-medium hover:bg-green-800">
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
