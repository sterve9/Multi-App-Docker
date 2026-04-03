'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Ferme { id: number; nom: string }
interface Parcelle {
  id: number; ferme_id: number; nom: string; variete: string
  nb_arbres: number; surface_ha: number; annee_plantation: number; statut: string; notes: string
}

const VARIETES = ['citron', 'orange', 'clementine', 'mixte']
const STATUTS = ['active', 'repos', 'replantation']
const BADGES: Record<string, string> = {
  citron: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  clementine: 'bg-amber-100 text-amber-800',
  mixte: 'bg-green-100 text-green-800',
}

export default function ParcellesPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ nom: '', ferme_id: '', variete: 'citron', nb_arbres: '', surface_ha: '', annee_plantation: '', statut: 'active', notes: '' })
  const [filterFerme, setFilterFerme] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  const loadData = async () => {
    const [f, p] = await Promise.all([api.get('/fermes/'), api.get('/parcelles/')])
    setFermes(f.data)
    setParcelles(p.data)
  }

  const resetForm = () => {
    setForm({ nom: '', ferme_id: fermes[0]?.id?.toString() || '', variete: 'citron', nb_arbres: '', surface_ha: '', annee_plantation: '', statut: 'active', notes: '' })
    setEditId(null)
  }

  const openAdd = () => { resetForm(); setShowForm(true) }
  const openEdit = (p: Parcelle) => {
    setForm({ nom: p.nom, ferme_id: p.ferme_id.toString(), variete: p.variete, nb_arbres: p.nb_arbres?.toString() || '', surface_ha: p.surface_ha?.toString() || '', annee_plantation: p.annee_plantation?.toString() || '', statut: p.statut, notes: p.notes || '' })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, ferme_id: parseInt(form.ferme_id), nb_arbres: form.nb_arbres ? parseInt(form.nb_arbres) : null, surface_ha: form.surface_ha ? parseFloat(form.surface_ha) : null, annee_plantation: form.annee_plantation ? parseInt(form.annee_plantation) : null }
    if (editId) await api.put(`/parcelles/${editId}`, payload)
    else await api.post('/parcelles/', payload)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette parcelle ?')) return
    await api.delete(`/parcelles/${id}`)
    loadData()
  }

  const filtered = filterFerme ? parcelles.filter(p => p.ferme_id === parseInt(filterFerme)) : parcelles

  return (
    <div className="md:ml-56 min-h-screen pb-20 md:pb-0">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-farm-green">🗺️ Parcelles</h1>
          <button onClick={openAdd} className="flex items-center gap-2 bg-farm-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Filtre ferme */}
        <div className="mb-4">
          <select value={filterFerme} onChange={e => setFilterFerme(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
            <option value="">Toutes les fermes</option>
            {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>

        {/* Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{p.nom}</h3>
                  <p className="text-xs text-gray-500">{fermes.find(f => f.id === p.ferme_id)?.nom}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${BADGES[p.variete] || 'bg-gray-100 text-gray-600'}`}>
                  {p.variete}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                {p.nb_arbres && <div>🌳 <span className="font-medium">{p.nb_arbres}</span> arbres</div>}
                {p.surface_ha && <div>📐 <span className="font-medium">{p.surface_ha}</span> ha</div>}
                {p.annee_plantation && <div>📅 Planté en <span className="font-medium">{p.annee_plantation}</span></div>}
                <div className={`capitalize text-xs font-medium ${p.statut === 'active' ? 'text-green-600' : 'text-gray-500'}`}>● {p.statut}</div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs text-farm-green hover:bg-farm-green-pale py-1.5 rounded-lg transition">
                  <Pencil size={13} /> Modifier
                </button>
                <button onClick={() => handleDelete(p.id)} className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition">
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🌱</div>
              <p>Aucune parcelle — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-farm-green">{editId ? 'Modifier la parcelle' : 'Nouvelle parcelle'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Nom *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Parcelle A" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Ferme *</label>
                  <select value={form.ferme_id} onChange={e => setForm({...form, ferme_id: e.target.value})} required className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Variété *</label>
                  <select value={form.variete} onChange={e => setForm({...form, variete: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {VARIETES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green">
                    {STATUTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Nb arbres</label>
                  <input type="number" value={form.nb_arbres} onChange={e => setForm({...form, nb_arbres: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="150" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Surface (ha)</label>
                  <input type="number" step="0.1" value={form.surface_ha} onChange={e => setForm({...form, surface_ha: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="2.5" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Année de plantation</label>
                <input type="number" value={form.annee_plantation} onChange={e => setForm({...form, annee_plantation: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="2015" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green" placeholder="Informations complémentaires..." />
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
