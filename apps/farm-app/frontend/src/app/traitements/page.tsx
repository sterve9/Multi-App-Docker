'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Syringe } from 'lucide-react'

interface Parcelle { id: number; nom: string; ferme_id: number }
interface Ferme { id: number; nom: string }
interface Traitement {
  id: number; parcelle_id: number; date: string
  type_traitement: string; produit: string | null
  dose: number | null; unite: string | null; notes: string | null
}

const TYPES = ['pesticide', 'fertilisant', 'irrigation', 'taille', 'autre']
const TYPE_BADGES: Record<string, string> = {
  pesticide: 'bg-red-100 text-red-700',
  fertilisant: 'bg-green-100 text-green-700',
  irrigation: 'bg-blue-100 text-blue-700',
  taille: 'bg-purple-100 text-purple-700',
  autre: 'bg-gray-100 text-gray-600',
}
const TYPE_ICONS: Record<string, string> = {
  pesticide: '🧪', fertilisant: '🌱', irrigation: '💧', taille: '✂️', autre: '🔧',
}

export default function TraitementsPage() {
  const router = useRouter()
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [traitements, setTraitements] = useState<Traitement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterParcelle, setFilterParcelle] = useState('')
  const [form, setForm] = useState({
    parcelle_id: '', date: new Date().toISOString().split('T')[0],
    type_traitement: 'pesticide', produit: '', dose: '', unite: 'L/ha', notes: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = async () => {
    const [f, p, t] = await Promise.all([
      api.get('/fermes/'), api.get('/parcelles/'), api.get('/traitements/')
    ])
    setFermes(f.data)
    setParcelles(p.data)
    setTraitements(t.data)
  }

  const resetForm = () => {
    setForm({
      parcelle_id: parcelles[0]?.id?.toString() || '',
      date: new Date().toISOString().split('T')[0],
      type_traitement: 'pesticide', produit: '', dose: '', unite: 'L/ha', notes: ''
    })
    setEditId(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }
  const openEdit = (t: Traitement) => {
    setForm({
      parcelle_id: t.parcelle_id.toString(),
      date: t.date,
      type_traitement: t.type_traitement,
      produit: t.produit || '',
      dose: t.dose?.toString() || '',
      unite: t.unite || 'L/ha',
      notes: t.notes || ''
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      parcelle_id: parseInt(form.parcelle_id),
      dose: form.dose ? parseFloat(form.dose) : null,
    }
    if (editId) await api.put(`/traitements/${editId}`, payload)
    else await api.post('/traitements/', payload)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce traitement ?')) return
    await api.delete(`/traitements/${id}`)
    loadData()
  }

  const getParcelleName = (id: number) => parcelles.find(p => p.id === id)?.nom || '—'
  const getFermeName = (parcelleId: number) => {
    const p = parcelles.find(p => p.id === parcelleId)
    return p ? fermes.find(f => f.id === p.ferme_id)?.nom || '—' : '—'
  }

  const filtered = filterParcelle
    ? traitements.filter(t => t.parcelle_id === parseInt(filterParcelle))
    : traitements

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-farm-green">💉 Traitements</h1>
          <button onClick={openAdd} className="flex items-center gap-2 bg-farm-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Filtre */}
        <div className="mb-4">
          <select value={filterParcelle} onChange={e => setFilterParcelle(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
            <option value="">Toutes les parcelles</option>
            {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {sorted.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
              <div className="text-2xl mt-0.5">{TYPE_ICONS[t.type_traitement] || '🔧'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BADGES[t.type_traitement] || 'bg-gray-100 text-gray-600'}`}>
                    {t.type_traitement}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{t.produit || 'Sans produit'}</span>
                  {t.dose && <span className="text-xs text-gray-500">{t.dose} {t.unite}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  📍 {getParcelleName(t.parcelle_id)} · {getFermeName(t.parcelle_id)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  📅 {new Date(t.date).toLocaleDateString('fr-FR')}
                </div>
                {t.notes && <p className="text-xs text-gray-500 mt-1 italic">{t.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="p-1.5 text-farm-green hover:bg-farm-green-pale rounded-lg transition">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Syringe size={40} className="mx-auto mb-2 opacity-30" />
              <p>Aucun traitement — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-farm-green">{editId ? 'Modifier le traitement' : 'Nouveau traitement'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Parcelle *</label>
                  <select value={form.parcelle_id} onChange={e => setForm({...form, parcelle_id: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Type *</label>
                  <select value={form.type_traitement} onChange={e => setForm({...form, type_traitement: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Produit</label>
                  <input value={form.produit} onChange={e => setForm({...form, produit: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Ex: Copper 50WP" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Dose</label>
                  <input type="number" step="0.01" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="2.5" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unité</label>
                  <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="L/ha" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Observations..." />
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
