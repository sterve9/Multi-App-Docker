'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import Link from 'next/link'
import { Plus, Pencil, Trash2, X, MapPin, Trees, LayoutGrid, List } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

interface Ferme { id: number; nom: string }
interface Parcelle {
  id: number; ferme_id: number; nom: string; variete: string
  nb_arbres: number; surface_ha: number; annee_plantation: number; statut: string; notes: string
}

const VARIETES = ['citron', 'orange', 'clementine', 'mixte']
const STATUTS = ['active', 'repos', 'replantation']

const VARIETE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  citron:     { bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-400' },
  orange:     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  clementine: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  mixte:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
}
const STATUT_STYLE: Record<string, string> = {
  active:       'text-emerald-600',
  repos:        'text-slate-400',
  replantation: 'text-orange-500',
}

const VARIETE_MAP: Record<string, { fill: string; border: string; emoji: string }> = {
  citron:     { fill: 'bg-yellow-100',  border: 'border-yellow-300', emoji: '🍋' },
  orange:     { fill: 'bg-orange-100',  border: 'border-orange-300', emoji: '🟠' },
  clementine: { fill: 'bg-amber-100',   border: 'border-amber-300',  emoji: '🍊' },
  mixte:      { fill: 'bg-emerald-100', border: 'border-emerald-300',emoji: '🌿' },
}
const STATUT_FILL: Record<string, string> = {
  active:       'opacity-100',
  repos:        'opacity-40',
  replantation: 'opacity-60',
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function ParcellesPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ nom: '', ferme_id: '', variete: 'citron', nb_arbres: '', surface_ha: '', annee_plantation: '', statut: 'active', notes: '' })
  const [filterFerme, setFilterFerme] = useState('')
  const [viewMode, setViewMode] = useState<'plan' | 'liste'>('plan')

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    loadData()
  }, [router])

  // Bug fix: set default ferme_id when fermes loads (race condition)
  useEffect(() => {
    if (fermes.length > 0 && !editId) {
      setForm(prev => ({ ...prev, ferme_id: prev.ferme_id || fermes[0].id.toString() }))
    }
  }, [fermes, editId])

  const loadData = async () => {
    const [f, p] = await Promise.all([api.get('/fermes/'), api.get('/parcelles/')])
    setFermes(f.data)
    setParcelles(p.data)
  }

  const openAdd = () => {
    setForm({ nom: '', ferme_id: fermes[0]?.id?.toString() || '', variete: 'citron', nb_arbres: '', surface_ha: '', annee_plantation: '', statut: 'active', notes: '' })
    setEditId(null)
    setShowForm(true)
  }

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
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">
        <PageHeader
          icon={MapPin}
          title="Parcelles"
          subtitle="Plan et gestion des parcelles agrumicoles"
          gradient="from-green-700 to-emerald-600"
          stats={[
            { label: 'parcelles', value: parcelles.length, color: 'slate' },
            { label: 'en production', value: parcelles.filter(p => p.statut === 'en_production').length, color: 'emerald' },
            { label: 'arbres total', value: parcelles.reduce((s, p) => s + (p.nb_arbres || 0), 0).toLocaleString('fr-FR'), color: 'blue' },
          ]}
          action={
            <button onClick={openAdd} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95">
              <Plus size={16} /> Ajouter
            </button>
          }
        />

        {/* Filter + Toggle */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <select value={filterFerme} onChange={e => setFilterFerme(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes les fermes</option>
            {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'plan' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={13} /> Plan
            </button>
            <button
              onClick={() => setViewMode('liste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'liste' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List size={13} /> Liste
            </button>
          </div>
        </div>

        {/* Plan de ferme */}
        {viewMode === 'plan' && filtered.length > 0 && (
          <PlanFerme parcelles={filtered} fermes={fermes} onEdit={openEdit} />
        )}

        {/* Grid — visible en mode liste uniquement */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === 'plan' ? 'hidden' : ''}`}>
          {filtered.map(p => {
            const vs = VARIETE_STYLE[p.variete] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' }
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden card-hover">
                {/* Top accent */}
                <div className={`h-1 w-full ${vs.dot}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{p.nom}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{fermes.find(f => f.id === p.ferme_id)?.nom}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${vs.bg} ${vs.text}`}>
                      {p.variete}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    {p.nb_arbres > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Trees size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">{p.nb_arbres.toLocaleString()}</span> arbres
                      </div>
                    )}
                    {p.surface_ha > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">{p.surface_ha}</span> ha
                      </div>
                    )}
                    {p.annee_plantation > 0 && (
                      <div className="text-slate-400 text-xs col-span-2">Planté en <span className="font-semibold text-slate-600">{p.annee_plantation}</span></div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                    <span className={`text-xs font-semibold capitalize ${STATUT_STYLE[p.statut] || 'text-slate-400'}`}>
                      ● {p.statut}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <MapPin size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm">Aucune parcelle — clique sur Ajouter</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier la parcelle' : 'Nouvelle parcelle'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            {fermes.length === 0 && (
              <div className="mx-6 mt-2 mb-0 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                Aucune ferme disponible.{' '}
                <Link href="/" className="font-semibold underline hover:text-amber-900">Créez d'abord une ferme sur le Dashboard.</Link>
              </div>
            )}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required className={INPUT} placeholder="Parcelle A" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ferme *</label>
                  <select value={form.ferme_id} onChange={e => setForm({...form, ferme_id: e.target.value})} required className={INPUT}>
                    <option value="" disabled>-- Sélectionner --</option>
                    {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Variété *</label>
                  <select value={form.variete} onChange={e => setForm({...form, variete: e.target.value})} className={INPUT}>
                    {VARIETES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} className={INPUT}>
                    {STATUTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nb arbres</label>
                  <input type="number" value={form.nb_arbres} onChange={e => setForm({...form, nb_arbres: e.target.value})} className={INPUT} placeholder="150" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Surface (ha)</label>
                  <input type="number" step="0.1" value={form.surface_ha} onChange={e => setForm({...form, surface_ha: e.target.value})} className={INPUT} placeholder="2.5" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Année de plantation</label>
                <input type="number" value={form.annee_plantation} onChange={e => setForm({...form, annee_plantation: e.target.value})} className={INPUT} placeholder="2015" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Informations complémentaires..." />
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

function PlanFerme({ parcelles, fermes, onEdit }: {
  parcelles: Parcelle[]
  fermes: Ferme[]
  onEdit: (p: Parcelle) => void
}) {
  const [tooltip, setTooltip] = useState<Parcelle | null>(null)

  // Grouper par ferme
  const byFerme: Record<number, Parcelle[]> = {}
  for (const p of parcelles) {
    if (!byFerme[p.ferme_id]) byFerme[p.ferme_id] = []
    byFerme[p.ferme_id].push(p)
  }

  return (
    <div className="space-y-5 mb-6">
      {Object.entries(byFerme).map(([fermeId, fps]) => {
        const ferme = fermes.find(f => f.id === parseInt(fermeId))
        const totalSurface = fps.reduce((s, p) => s + (p.surface_ha || 1), 0)

        return (
          <div key={fermeId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header ferme */}
            <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-5 py-3.5 flex items-center justify-between">
              <span className="text-white font-bold text-sm">{ferme?.nom || 'Ferme'}</span>
              <span className="text-emerald-200 text-xs">{fps.length} parcelle{fps.length > 1 ? 's' : ''} · {totalSurface.toFixed(1)} ha total</span>
            </div>

            {/* Plan visuel */}
            <div className="p-4">
              {/* Grille de rectangles */}
              <div className="flex flex-wrap gap-2 mb-4">
                {fps.map(p => {
                  const meta = VARIETE_MAP[p.variete] || { fill: 'bg-slate-100', border: 'border-slate-300', emoji: '🌿' }
                  const opacity = STATUT_FILL[p.statut] || 'opacity-100'
                  // Taille proportionnelle à la surface (min 80px, max 200px)
                  const surface = p.surface_ha || 1
                  const ratio = surface / Math.max(totalSurface, 1)
                  const w = Math.max(80, Math.min(200, Math.round(ratio * 500)))
                  const h = Math.max(64, Math.min(120, Math.round(ratio * 300)))

                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-xl border-2 ${meta.fill} ${meta.border} ${opacity} cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center justify-center gap-1 p-2`}
                      style={{ width: `${w}px`, height: `${h}px` }}
                      onClick={() => onEdit(p)}
                      onMouseEnter={() => setTooltip(p)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="text-xl leading-none">{meta.emoji}</span>
                      <span className="text-xs font-bold text-slate-700 text-center leading-tight truncate w-full px-1">{p.nom}</span>
                      {p.surface_ha > 0 && (
                        <span className="text-[10px] text-slate-500">{p.surface_ha} ha</span>
                      )}
                      {p.statut === 'repos' && (
                        <span className="absolute top-1 right-1 text-[9px] bg-slate-200 text-slate-500 px-1 rounded">repos</span>
                      )}
                      {p.statut === 'replantation' && (
                        <span className="absolute top-1 right-1 text-[9px] bg-orange-200 text-orange-600 px-1 rounded">🌱</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-50">
                {Array.from(new Set(fps.map(p => p.variete))).map(v => {
                  const meta = VARIETE_MAP[v] || { fill: '', border: '', emoji: '🌿' }
                  const count = fps.filter(p => p.variete === v).length
                  return (
                    <div key={v} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{meta.emoji}</span>
                      <span className="capitalize font-medium text-slate-600">{v}</span>
                      <span className="text-slate-400">({count})</span>
                    </div>
                  )
                })}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                  <span className="text-[10px]">Cliquer pour modifier</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
