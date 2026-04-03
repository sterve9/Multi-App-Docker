'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Apple } from 'lucide-react'

interface Parcelle { id: number; nom: string; ferme_id: number; variete: string }
interface Ferme { id: number; nom: string }
interface Recolte {
  id: number; parcelle_id: number; date: string
  quantite_kg: number; qualite: string | null
  destination: string | null; notes: string | null
}

const QUALITES = ['premium', 'standard', 'deuxieme_choix']
const QUALITE_BADGES: Record<string, string> = {
  premium: 'bg-yellow-100 text-yellow-700',
  standard: 'bg-blue-100 text-blue-700',
  deuxieme_choix: 'bg-gray-100 text-gray-600',
}
const QUALITE_LABELS: Record<string, string> = {
  premium: '⭐ Premium',
  standard: '✅ Standard',
  deuxieme_choix: '📦 2ème choix',
}

export default function RecoltesPage() {
  const router = useRouter()
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [recoltes, setRecoltes] = useState<Recolte[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterParcelle, setFilterParcelle] = useState('')
  const [form, setForm] = useState({
    parcelle_id: '', date: new Date().toISOString().split('T')[0],
    quantite_kg: '', qualite: 'standard', destination: '', notes: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = async () => {
    const [f, p, r] = await Promise.all([
      api.get('/fermes/'), api.get('/parcelles/'), api.get('/recoltes/')
    ])
    setFermes(f.data)
    setParcelles(p.data)
    setRecoltes(r.data)
  }

  const resetForm = () => {
    setForm({
      parcelle_id: parcelles[0]?.id?.toString() || '',
      date: new Date().toISOString().split('T')[0],
      quantite_kg: '', qualite: 'standard', destination: '', notes: ''
    })
    setEditId(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }
  const openEdit = (r: Recolte) => {
    setForm({
      parcelle_id: r.parcelle_id.toString(),
      date: r.date,
      quantite_kg: r.quantite_kg.toString(),
      qualite: r.qualite || 'standard',
      destination: r.destination || '',
      notes: r.notes || ''
    })
    setEditId(r.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      parcelle_id: parseInt(form.parcelle_id),
      quantite_kg: parseFloat(form.quantite_kg),
      qualite: form.qualite || null,
      destination: form.destination || null,
    }
    if (editId) await api.put(`/recoltes/${editId}`, payload)
    else await api.post('/recoltes/', payload)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette récolte ?')) return
    await api.delete(`/recoltes/${id}`)
    loadData()
  }

  const getParcelleName = (id: number) => parcelles.find(p => p.id === id)?.nom || '—'
  const getFermeName = (parcelleId: number) => {
    const p = parcelles.find(p => p.id === parcelleId)
    return p ? fermes.find(f => f.id === p.ferme_id)?.nom || '—' : '—'
  }
  const getVariete = (parcelleId: number) => parcelles.find(p => p.id === parcelleId)?.variete || ''

  const filtered = filterParcelle
    ? recoltes.filter(r => r.parcelle_id === parseInt(filterParcelle))
    : recoltes

  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Total kg
  const totalKg = filtered.reduce((sum, r) => sum + r.quantite_kg, 0)

  return (
    <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-farm-green">🍊 Récoltes</h1>
          <button onClick={openAdd} className="flex items-center gap-2 bg-farm-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Filtre + stat */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <select value={filterParcelle} onChange={e => setFilterParcelle(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
            <option value="">Toutes les parcelles</option>
            {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          {totalKg > 0 && (
            <div className="bg-farm-green-pale text-farm-green text-sm font-medium px-3 py-1.5 rounded-lg">
              🏆 Total : <span className="font-bold">{totalKg.toFixed(0)} kg</span>
            </div>
          )}
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {sorted.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
              <div className="text-2xl mt-0.5">🍋</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-gray-800">{r.quantite_kg.toFixed(0)} kg</span>
                  {r.qualite && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUALITE_BADGES[r.qualite] || 'bg-gray-100 text-gray-600'}`}>
                      {QUALITE_LABELS[r.qualite] || r.qualite}
                    </span>
                  )}
                  {getVariete(r.parcelle_id) && (
                    <span className="text-xs text-gray-400 capitalize">({getVariete(r.parcelle_id)})</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  📍 {getParcelleName(r.parcelle_id)} · {getFermeName(r.parcelle_id)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  📅 {new Date(r.date).toLocaleDateString('fr-FR')}
                  {r.destination && <span> · 🚚 {r.destination}</span>}
                </div>
                {r.notes && <p className="text-xs text-gray-500 mt-1 italic">{r.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(r)} className="p-1.5 text-farm-green hover:bg-farm-green-pale rounded-lg transition">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Apple size={40} className="mx-auto mb-2 opacity-30" />
              <p>Aucune récolte enregistrée — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-farm-green">{editId ? 'Modifier la récolte' : 'Nouvelle récolte'}</h2>
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
                  <label className="text-xs font-medium text-gray-600">Quantité (kg) *</label>
                  <input type="number" step="0.1" value={form.quantite_kg} onChange={e => setForm({...form, quantite_kg: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Qualité</label>
                  <select value={form.qualite} onChange={e => setForm({...form, qualite: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {QUALITES.map(q => <option key={q} value={q}>{QUALITE_LABELS[q] || q}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Destination</label>
                <input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Ex: Marché local, Export..." />
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
