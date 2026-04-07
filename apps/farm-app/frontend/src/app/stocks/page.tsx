'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, X, Package, TriangleAlert, ArrowDown, ArrowUp, History, CheckCircle } from 'lucide-react'

interface Ferme { id: number; nom: string; nb_vannes: number; jours_irrigation: string }
interface Stock {
  id: number; ferme_id: number; nom: string; categorie: string
  quantite: number; unite: string | null
  seuil_alerte: number; cout_unitaire: number; dose_par_vanne: number; notes: string | null
  alerte_active?: boolean
}

const CATEGORIES = ['pesticide', 'engrais', 'matériel', 'autre']
const CAT_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  pesticide:  { bg: 'bg-red-50',     text: 'text-red-600',     icon: '🧪' },
  engrais:    { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🌱' },
  'matériel': { bg: 'bg-blue-50',    text: 'text-blue-600',    icon: '🔧' },
  autre:      { bg: 'bg-slate-50',   text: 'text-slate-500',   icon: '📦' },
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

type ModalMode = 'stock' | 'mouvement'
type AchatMode = 'sacs' | 'direct'

export default function StocksPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [selectedFerme, setSelectedFerme] = useState<number | ''>('')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [showForm, setShowForm] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('stock')
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; visible: boolean; exiting: boolean }>({ msg: '', visible: false, exiting: false })
  const [form, setForm] = useState({ nom: '', categorie: 'pesticide', quantite: '0', unite: '', seuil_alerte: '0', cout_unitaire: '0', notes: '' })
  const [mvtForm, setMvtForm] = useState({ type_mouvement: 'entree', quantite: '1', cout_unitaire: '0', notes: '' })
  const [achatMode, setAchatMode] = useState<AchatMode>('sacs')
  const [achatForm, setAchatForm] = useState({ nb_unites: '1', poids_par_unite: '25', prix_par_unite: '0' })

  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ msg: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadData = useCallback(async () => {
    const url = selectedFerme ? `/stocks/?ferme_id=${selectedFerme}` : '/stocks/'
    const r = await api.get(url)
    setStocks(r.data)
  }, [selectedFerme])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    api.get('/fermes/').then(r => {
      setFermes(r.data)
      if (r.data.length > 0) setSelectedFerme(r.data[0].id)
    })
  }, [router])

  useEffect(() => { if (selectedFerme !== '') loadData() }, [selectedFerme, loadData])

  const openAdd = () => {
    setForm({ nom: '', categorie: 'pesticide', quantite: '0', unite: '', seuil_alerte: '0', cout_unitaire: '0', notes: '' })
    setEditId(null); setFormError(null); setModalMode('stock'); setShowForm(true)
  }
  const openEdit = (s: Stock) => {
    setForm({ nom: s.nom, categorie: s.categorie, quantite: s.quantite.toString(), unite: s.unite || '', seuil_alerte: s.seuil_alerte.toString(), cout_unitaire: (s.cout_unitaire || 0).toString(), notes: s.notes || '' })
    setEditId(s.id); setFormError(null); setModalMode('stock'); setShowForm(true)
  }
  const openMouvement = (s: Stock) => {
    setSelectedStockId(s.id)
    setMvtForm({ type_mouvement: 'entree', quantite: '1', cout_unitaire: (s.cout_unitaire || 0).toString(), notes: '' })
    setAchatMode('sacs')
    setAchatForm({ nb_unites: '1', poids_par_unite: '25', prix_par_unite: (s.cout_unitaire || 0).toString() })
    setFormError(null); setModalMode('mouvement'); setShowForm(true)
  }

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setFormError(null)
    try {
      const payload = {
        ...form,
        ferme_id: selectedFerme,
        quantite: parseFloat(form.quantite),
        seuil_alerte: parseFloat(form.seuil_alerte),
        cout_unitaire: parseFloat(form.cout_unitaire) || 0,
        unite: form.unite || null,
        notes: form.notes || null,
      }
      if (editId) await api.put(`/stocks/${editId}`, { quantite: payload.quantite, seuil_alerte: payload.seuil_alerte, cout_unitaire: parseFloat(form.cout_unitaire) || 0, notes: payload.notes })
      else await api.post('/stocks/', payload)
      setShowForm(false); loadData()
      showToast(editId ? 'Stock mis à jour' : 'Stock créé avec succès')
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally { setSubmitting(false) }
  }

  const handleSubmitMouvement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setFormError(null)
    try {
      let quantite: number
      let cout_unitaire: number
      if (mvtForm.type_mouvement === 'entree' && achatMode === 'sacs') {
        const nb = parseFloat(achatForm.nb_unites) || 0
        const poids = parseFloat(achatForm.poids_par_unite) || 0
        quantite = nb * poids
        cout_unitaire = parseFloat(achatForm.prix_par_unite) || 0
      } else {
        quantite = parseFloat(mvtForm.quantite)
        cout_unitaire = parseFloat(mvtForm.cout_unitaire) || 0
      }
      await api.post('/mouvements/', {
        stock_id: selectedStockId,
        type_mouvement: mvtForm.type_mouvement,
        quantite,
        cout_unitaire,
        notes: mvtForm.notes || null,
      })
      setShowForm(false); loadData()
      showToast(mvtForm.type_mouvement === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée')
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce stock ?')) return
    await api.delete(`/stocks/${id}`); loadData()
  }

  const isAlert = (s: Stock) => s.alerte_active || (s.seuil_alerte > 0 && s.quantite <= s.seuil_alerte)

  let filtered = stocks
  if (filterCategorie) filtered = filtered.filter(s => s.categorie === filterCategorie)
  if (showAlertsOnly) filtered = filtered.filter(isAlert)
  const alertCount = stocks.filter(isAlert).length

  const selectedFermeName = fermes.find(f => f.id === selectedFerme)?.nom || ''
  const selectedStock = stocks.find(s => s.id === selectedStockId)
  const selectedFermeData = fermes.find(f => f.id === selectedFerme)
  const nbVannes = selectedFermeData?.nb_vannes || 1
  const joursIrrigation = selectedFermeData?.jours_irrigation || ''
  const sessionsParSemaine = joursIrrigation ? joursIrrigation.split(',').filter(Boolean).length : 1

  const getSemainesRestantes = (s: Stock) => {
    if (!s.dose_par_vanne || s.dose_par_vanne <= 0 || sessionsParSemaine <= 0) return null
    const conso = s.dose_par_vanne * nbVannes * sessionsParSemaine
    return conso > 0 ? Math.floor(s.quantite / conso) : null
  }

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Stocks</h1>
              <p className="text-slate-400 text-sm mt-0.5">{stocks.length} article{stocks.length !== 1 ? 's' : ''} · {selectedFermeName}</p>
            </div>
            {alertCount > 0 && (
              <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-red-100 alert-pulse">
                <TriangleAlert size={13} /> {alertCount} alerte{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow active:scale-95">
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-5 flex-wrap fade-in-up" style={{ animationDelay: '60ms' }}>
          {/* Sélecteur ferme */}
          <select
            value={selectedFerme}
            onChange={e => setSelectedFerme(Number(e.target.value))}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
          >
            {fermes.map(f => <option key={f.id} value={f.id}>🏡 {f.nom}</option>)}
          </select>
          <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_CONFIG[c]?.icon} {c}</option>)}
          </select>
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition border ${showAlertsOnly ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <TriangleAlert size={14} /> Alertes seulement
          </button>
        </div>

        {/* Grille stocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s, i) => {
            const alert = isAlert(s)
            const cfg = CAT_CONFIG[s.categorie] || CAT_CONFIG.autre
            const pct = s.seuil_alerte > 0 ? Math.min((s.quantite / (s.seuil_alerte * 3)) * 100, 100) : 100
            const semaines = getSemainesRestantes(s)
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden card-hover fade-in-up ${alert ? 'border-red-200' : 'border-slate-100'}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`h-1 w-full ${alert ? 'bg-red-400' : 'bg-emerald-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg`}>{cfg.icon}</div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{s.nom}</h3>
                        <span className={`text-xs font-semibold capitalize ${cfg.text}`}>{s.categorie}</span>
                      </div>
                    </div>
                    {alert && (
                      <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                        <TriangleAlert size={16} className="relative text-red-500" />
                      </span>
                    )}
                  </div>

                  <div className={`text-3xl font-bold tabular-nums mb-1 ${alert ? 'text-red-600' : 'text-slate-800'}`}>
                    {s.quantite.toLocaleString()}
                    <span className="text-sm font-normal text-slate-400 ml-1">{s.unite || 'unités'}</span>
                  </div>

                  {s.seuil_alerte > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${alert ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Seuil : {s.seuil_alerte} {s.unite || ''}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.cout_unitaire > 0 && (
                      <span className="text-xs text-slate-400">Prix : <span className="font-semibold text-slate-600">{s.cout_unitaire.toLocaleString('fr-TN')} TND</span></span>
                    )}
                    {s.dose_par_vanne > 0 && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg font-semibold">
                        💧 {s.dose_par_vanne} {s.unite || 'u'}/vanne
                      </span>
                    )}
                    {semaines !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${semaines < 2 ? 'bg-red-50 text-red-600' : semaines < 4 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        ~{semaines} sem. restantes
                      </span>
                    )}
                  </div>
                  {s.notes && <p className="text-xs text-slate-400 italic mt-2 line-clamp-1">{s.notes}</p>}

                  <div className="flex gap-1 mt-4 pt-3 border-t border-slate-50">
                    <button onClick={() => openMouvement(s)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition" title="Entrée / Sortie">
                      <History size={13} /> Mouvement
                    </button>
                    <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 py-1.5 rounded-lg transition">
                      <Pencil size={13} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition">
                      <Trash2 size={13} /> Suppr.
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

      {/* Modal stock ou mouvement */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                {modalMode === 'mouvement' && selectedStock ? (
                  <>
                    <h2 className="text-base font-bold text-slate-800">Mouvement de stock</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedStock.nom}</p>
                  </>
                ) : (
                  <h2 className="text-base font-bold text-slate-800">{editId ? 'Modifier le stock' : 'Nouveau stock'}</h2>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>

            {formError && (
              <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
            )}

            {/* Formulaire stock */}
            {modalMode === 'stock' && (
              <form onSubmit={handleSubmitStock} className="p-6 space-y-4">
                {!editId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom *</label>
                    <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required className={INPUT} placeholder="Ammonitre, Sulfate de potassium..." />
                  </div>
                )}
                {!editId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Catégorie *</label>
                      <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className={INPUT}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_CONFIG[c]?.icon} {c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unité</label>
                      <input value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className={INPUT} placeholder="kg, L, sacs..." />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prix d&apos;achat / unité (TND)</label>
                  <input type="number" step="0.01" value={form.cout_unitaire} onChange={e => setForm({...form, cout_unitaire: e.target.value})} className={INPUT} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={INPUT} placeholder="Fournisseur, référence..." />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95">
                    {submitting ? 'Enregistrement...' : editId ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            )}

            {/* Formulaire mouvement */}
            {modalMode === 'mouvement' && (
              <form onSubmit={handleSubmitMouvement} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['entree', 'sortie'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMvtForm({...mvtForm, type_mouvement: t})}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition ${mvtForm.type_mouvement === t
                        ? t === 'entree' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-600'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {t === 'entree' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                      {t === 'entree' ? 'Entrée' : 'Sortie'}
                    </button>
                  ))}
                </div>

                {/* Mode achat (entrée uniquement) */}
                {mvtForm.type_mouvement === 'entree' && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['sacs', 'direct'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setAchatMode(m)}
                        className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${achatMode === m ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {m === 'sacs' ? '🛒 Achat fournisseur' : '↕ Utilisation directe'}
                      </button>
                    ))}
                  </div>
                )}

                {mvtForm.type_mouvement === 'entree' && achatMode === 'sacs' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nb sacs / bidons *</label>
                        <input type="number" step="1" min="1" value={achatForm.nb_unites} onChange={e => setAchatForm({...achatForm, nb_unites: e.target.value})} required className={INPUT} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Poids / vol. par unité *</label>
                        <input type="number" step="0.1" min="0.1" value={achatForm.poids_par_unite} onChange={e => setAchatForm({...achatForm, poids_par_unite: e.target.value})} required className={INPUT} placeholder="25 kg" />
                      </div>
                    </div>
                    {achatForm.nb_unites && achatForm.poids_par_unite && (
                      <div className="bg-emerald-50 rounded-xl px-4 py-3 text-sm text-emerald-700">
                        Total ajouté au stock : <span className="font-bold">{(parseFloat(achatForm.nb_unites) * parseFloat(achatForm.poids_par_unite)).toLocaleString()} {selectedStock?.unite || 'kg'}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prix par sac/bidon (TND)</label>
                      <input type="number" step="0.01" value={achatForm.prix_par_unite} onChange={e => setAchatForm({...achatForm, prix_par_unite: e.target.value})} className={INPUT} placeholder="0" />
                    </div>
                    {achatForm.prix_par_unite && parseFloat(achatForm.prix_par_unite) > 0 && (
                      <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                        Coût total : <span className="font-bold text-slate-800">{(parseFloat(achatForm.nb_unites || '0') * parseFloat(achatForm.prix_par_unite)).toLocaleString('fr-TN')} TND</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantité *</label>
                      <input type="number" step="0.01" min="0.01" value={mvtForm.quantite} onChange={e => setMvtForm({...mvtForm, quantite: e.target.value})} required className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Coût unitaire (TND)</label>
                      <input type="number" step="0.01" value={mvtForm.cout_unitaire} onChange={e => setMvtForm({...mvtForm, cout_unitaire: e.target.value})} className={INPUT} placeholder="0" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                  <input value={mvtForm.notes} onChange={e => setMvtForm({...mvtForm, notes: e.target.value})} className={INPUT} placeholder="Livraison, utilisation parcelle B..." />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                  <button type="submit" disabled={submitting} className={`flex-1 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95 ${mvtForm.type_mouvement === 'entree' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                    {submitting ? 'Enregistrement...' : mvtForm.type_mouvement === 'entree' ? '+ Enregistrer entrée' : '− Enregistrer sortie'}
                  </button>
                </div>
              </form>
            )}
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
