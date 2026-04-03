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

  useEffect(() => {
    if (parcelles.length > 0 && !editId) {
      setForm(prev => ({ ...prev, parcelle_id: prev.parcelle_id || parcelles[0].id.toString() }))
    }
  }, [parcelles, editId])

  const loadData = async () => {
    const [f, p, t] = await Promise.all([api.get('/fermes/'), api.get('/parcelles/'), api.get('/traitements/')])
    setFermes(f.data); setParcelles(p.data); setTraitements(t.data)
  }

  const openAdd = () => {
    setForm({ parcelle_id: parcelles[0]?.id?.toString() || '', date: new Date().toISOString().split('T')[0], type_traitement: 'pesticide', produit: '', dose: '', unite: 'L/ha', notes: '' })
    setEditId(null); setShowForm(true)
  }
  const openEdit = (t: Traitement) => {
    setForm({ parcelle_id: t.parcelle_id.toString(), date: t.date, type_traitement: t.type_traitement, produit: t.produit || '', dose: t.dose?.toString() || '', unite: t.unite || 'L/ha', notes: t.notes || '' })
    setEditId(t.id); setShowForm(true)
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, parcelle_id: parseInt(form.parcelle_id), dose: form.dose ? parseFloat(form.dose) : null }
    if (editId) await api.put(`/traitements/${editId}`, payload)
    else await api.post('/traitements/', payload)
    setShowForm(false); loadData()
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

  const sorted = [...(filterParcelle ? traitements.filter(t => t.parcelle_id === parseInt(filterParcelle)) : traitements)]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Traitements</h1>
            <p className="text-slate-400 text-sm mt-0.5">{traitements.length} traitement{traitements.length !== 1 ? 's' : ''} enregistré{traitements.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        <div className="mb-5">
          <select value={filterParcelle} onChange={e => setFilterParcelle(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes les parcelles</option>
            {parcelles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {sorted.map(t => {
            const cfg = TYPE_CONFIG[t.type_traitement] || TYPE_CONFIG.autre
            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-4 card-hover">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${cfg.bg} ${cfg.text}`}>
                      {t.type_traitement}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{t.produit || 'Sans produit'}</span>
                    {t.dose && <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{t.dose} {t.unite}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                    <span>📍 {getParcelleName(t.parcelle_id)} · {getFermeName(t.parcelle_id)}</span>
                    <span>📅 {new Date(t.date).toLocaleDateString('fr-FR')}</span>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier le traitement' : 'Nouveau traitement'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type *</label>
                  <select value={form.type_traitement} onChange={e => setForm({...form, type_traitement: e.target.value})} className={INPUT}>
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Produit</label>
                  <input value={form.produit} onChange={e => setForm({...form, produit: e.target.value})} className={INPUT} placeholder="Copper 50WP" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dose</label>
                  <input type="number" step="0.01" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} className={INPUT} placeholder="2.5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unité</label>
                  <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className={INPUT} placeholder="L/ha" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Observations..." />
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
