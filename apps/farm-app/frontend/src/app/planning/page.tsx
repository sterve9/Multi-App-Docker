'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { CalendarDays, CheckCircle, Clock, Settings, X, TriangleAlert, Droplets, ChevronRight } from 'lucide-react'

interface ProduitSession {
  stock_id: number; nom: string; unite: string | null; dose_unite: string
  dose_par_vanne: number; qte_deduite: number
  quantite_actuelle: number; semaines_restantes: number | null
  en_alerte: boolean
}
interface SessionPlanifiee {
  date: string; jour_semaine: string
  produits: ProduitSession[]
  session_id: number | null; statut: string | null
}
interface PlanningFerme {
  ferme_id: number; ferme_nom: string
  nb_vannes: number; jours_irrigation: string
  sessions: SessionPlanifiee[]
}
interface Ferme { id: number; nom: string; nb_vannes: number; jours_irrigation: string }
interface Stock { id: number; nom: string; unite: string | null; dose_par_vanne: number; dose_unite: string }

const UNITES = ['kg', 'L', 'g', 'mL', 'T', 'sacs']

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

function groupByWeek(sessions: SessionPlanifiee[]) {
  const weeks: { label: string; sessions: SessionPlanifiee[] }[] = []
  let currentWeek: SessionPlanifiee[] = []
  let weekLabel = ''

  for (const s of sessions) {
    const d = new Date(s.date)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const label = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    if (label !== weekLabel) {
      if (currentWeek.length > 0) weeks.push({ label: `Semaine du ${weekLabel}`, sessions: currentWeek })
      weekLabel = label
      currentWeek = []
    }
    currentWeek.push(s)
  }
  if (currentWeek.length > 0) weeks.push({ label: `Semaine du ${weekLabel}`, sessions: currentWeek })
  return weeks
}

export default function PlanningPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [selectedFerme, setSelectedFerme] = useState<number | ''>('')
  const [planning, setPlanning] = useState<PlanningFerme | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [configForm, setConfigForm] = useState({ nb_vannes: '1', jours: [] as string[] })
  const [dosesForm, setDosesForm] = useState<Record<number, string>>({})
  const [doseUnitesForm, setDoseUnitesForm] = useState<Record<number, string>>({})
  const [savingConfig, setSavingConfig] = useState(false)
  const [toast, setToast] = useState<{ msg: string; visible: boolean; exiting: boolean }>({ msg: '', visible: false, exiting: false })

  const showToast = useCallback((msg: string) => {
    setToast({ msg, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ msg: '', visible: false, exiting: false }), 280)
    }, 3000)
  }, [])

  const loadPlanning = useCallback(async (fermeId: number) => {
    setLoading(true)
    try {
      const r = await api.get(`/fermes/${fermeId}/planning?nb_semaines=3`)
      setPlanning(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    api.get('/fermes/').then(r => {
      setFermes(r.data)
      if (r.data.length > 0) setSelectedFerme(r.data[0].id)
    })
  }, [router])

  useEffect(() => {
    if (selectedFerme) loadPlanning(selectedFerme as number)
  }, [selectedFerme, loadPlanning])

  const openConfig = async () => {
    if (!selectedFerme) return
    const ferme = fermes.find(f => f.id === selectedFerme)
    if (!ferme) return
    const joursActuels = ferme.jours_irrigation ? ferme.jours_irrigation.split(',').map(j => j.trim()).filter(Boolean) : []
    setConfigForm({ nb_vannes: (ferme.nb_vannes || 1).toString(), jours: joursActuels })
    const r = await api.get(`/stocks/?ferme_id=${selectedFerme}`)
    setStocks(r.data)
    const doses: Record<number, string> = {}
    const unites: Record<number, string> = {}
    for (const s of r.data) {
      doses[s.id] = (s.dose_par_vanne || 0).toString()
      unites[s.id] = s.dose_unite || 'kg'
    }
    setDosesForm(doses)
    setDoseUnitesForm(unites)
    setShowConfig(true)
  }

  const saveConfig = async () => {
    if (!selectedFerme) return
    setSavingConfig(true)
    try {
      await api.put(`/fermes/${selectedFerme}/config`, {
        nb_vannes: parseInt(configForm.nb_vannes) || 1,
        jours_irrigation: configForm.jours.join(','),
      })
      // Sauvegarder les doses + unités par vanne pour chaque stock
      await Promise.all(
        stocks.map(s => api.put(`/stocks/${s.id}`, {
          dose_par_vanne: parseFloat(dosesForm[s.id] || '0') || 0,
          dose_unite: doseUnitesForm[s.id] || 'kg',
        }))
      )
      // Recharger les fermes pour avoir les nouvelles valeurs
      const r = await api.get('/fermes/')
      setFermes(r.data)
      setShowConfig(false)
      loadPlanning(selectedFerme as number)
      showToast('Configuration enregistrée')
    } finally { setSavingConfig(false) }
  }

  const confirmerSession = async (session: SessionPlanifiee) => {
    if (!selectedFerme) return
    const key = session.date
    setConfirming(key)
    try {
      let sessionId = session.session_id
      if (!sessionId) {
        const r = await api.post('/sessions/', { ferme_id: selectedFerme, date: session.date })
        sessionId = r.data.id
      }
      const r = await api.put(`/sessions/${sessionId}/confirmer`)
      const { mouvements_crees, alertes_declenchees } = r.data
      let msg = `Session confirmée · ${mouvements_crees} déduction${mouvements_crees > 1 ? 's' : ''}`
      if (alertes_declenchees > 0) msg += ` · ⚠️ ${alertes_declenchees} alerte${alertes_declenchees > 1 ? 's' : ''} N8N`
      showToast(msg)
      loadPlanning(selectedFerme as number)
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur')
    } finally { setConfirming(null) }
  }

  const weeks = planning ? groupByWeek(planning.sessions) : []
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Planning fertilisation</h1>
            <p className="text-slate-400 text-sm mt-0.5">Déductions stock automatiques à chaque session</p>
          </div>
          {selectedFerme && (
            <button onClick={openConfig} className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-medium transition">
              <Settings size={15} /> Configurer
            </button>
          )}
        </div>

        {/* Sélecteur ferme */}
        <div className="flex items-center gap-3 mb-6 fade-in-up" style={{ animationDelay: '60ms' }}>
          <select
            value={selectedFerme}
            onChange={e => setSelectedFerme(Number(e.target.value))}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          >
            {fermes.map(f => <option key={f.id} value={f.id}>🏡 {f.nom}</option>)}
          </select>
          {planning && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Droplets size={14} className="text-blue-400" />
              <span>{planning.nb_vannes} vanne{planning.nb_vannes > 1 ? 's' : ''}</span>
              {planning.jours_irrigation && <span className="text-slate-300">·</span>}
              {planning.jours_irrigation && (
                <span className="capitalize">{planning.jours_irrigation.split(',').map(j => j.trim()).join(' + ')}</span>
              )}
            </div>
          )}
        </div>

        {/* État vide — pas de config */}
        {planning && !planning.jours_irrigation && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center fade-in-up">
            <CalendarDays size={32} className="mx-auto mb-3 text-blue-300" />
            <p className="text-slate-600 font-medium mb-1">Aucun jour de fertilisation configuré</p>
            <p className="text-slate-400 text-sm mb-4">Configure les jours et les doses par produit pour activer le planning automatique.</p>
            <button onClick={openConfig} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
              <Settings size={14} className="inline mr-2" />Configurer maintenant
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-40 skeleton rounded-2xl" />)}
          </div>
        )}

        {/* Semaines */}
        {!loading && planning?.jours_irrigation && (
          <div className="space-y-6">
            {weeks.map((week, wi) => (
              <div key={wi} className="fade-in-up" style={{ animationDelay: `${wi * 80}ms` }}>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{week.label}</h2>
                <div className="space-y-3">
                  {week.sessions.map((session, si) => {
                    const isToday = session.date === today
                    const isEffectuee = session.statut === 'effectuee'
                    const hasAlerte = session.produits.some(p => p.en_alerte)
                    const isConfirming = confirming === session.date

                    return (
                      <div
                        key={session.date}
                        className={`bg-white rounded-2xl shadow-sm border overflow-hidden fade-in-up ${isEffectuee ? 'border-emerald-100' : hasAlerte ? 'border-red-100' : 'border-slate-100'}`}
                        style={{ animationDelay: `${si * 40}ms` }}
                      >
                        {/* Header session */}
                        <div className={`px-5 py-3 flex items-center justify-between ${isEffectuee ? 'bg-emerald-50' : isToday ? 'bg-blue-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEffectuee ? 'bg-emerald-100' : isToday ? 'bg-blue-100' : 'bg-white border border-slate-200'}`}>
                              {isEffectuee
                                ? <CheckCircle size={16} className="text-emerald-600" />
                                : <Clock size={16} className={isToday ? 'text-blue-500' : 'text-slate-400'} />
                              }
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">
                                {session.jour_semaine} {new Date(session.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                {isToday && <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">Aujourd'hui</span>}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {isEffectuee ? 'Session confirmée' : 'Session planifiée'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasAlerte && !isEffectuee && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
                                <TriangleAlert size={12} /> Alerte stock
                              </span>
                            )}
                            {!isEffectuee && (
                              <button
                                onClick={() => confirmerSession(session)}
                                disabled={!!isConfirming}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95"
                              >
                                {isConfirming
                                  ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Déduction...</span>
                                  : <><CheckCircle size={13} /> Confirmer</>
                                }
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Produits */}
                        {session.produits.length > 0 && (
                          <div className="px-5 py-4">
                            <div className="space-y-2.5">
                              {session.produits.map(p => (
                                <div key={p.stock_id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.en_alerte ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    <span className="font-medium text-slate-700 truncate">{p.nom}</span>
                                    <span className="text-slate-400 text-xs shrink-0">
                                      {p.dose_par_vanne} {p.dose_unite}/vanne × {planning.nb_vannes}
                                    </span>
                                    <ChevronRight size={12} className="text-slate-300 shrink-0" />
                                    <span className="font-bold text-slate-800 shrink-0">{p.qte_deduite} {p.dose_unite}</span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3 shrink-0">
                                    <span className={`text-xs ${p.en_alerte ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                      Stock: {p.quantite_actuelle.toLocaleString()} {p.unite || p.dose_unite}
                                    </span>
                                    {p.semaines_restantes !== null && p.semaines_restantes > 0 && (
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                                        p.semaines_restantes < 2 ? 'bg-red-50 text-red-600' :
                                        p.semaines_restantes < 4 ? 'bg-amber-50 text-amber-600' :
                                        'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        ~{p.semaines_restantes} sem.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.produits.length === 0 && !isEffectuee && (
                          <div className="px-5 py-4 text-xs text-slate-400 italic">
                            Aucun produit avec dose configurée — utilise "Configurer" pour définir les doses.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal config ferme */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-enter max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">⚙️ Configurer la fertilisation</h2>
                <p className="text-xs text-slate-400 mt-0.5">{fermes.find(f => f.id === selectedFerme)?.nom}</p>
              </div>
              <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Nombre de vannes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de vannes</label>
                <input
                  type="number" min="1" max="50"
                  value={configForm.nb_vannes}
                  onChange={e => setConfigForm({ ...configForm, nb_vannes: e.target.value })}
                  className={INPUT}
                />
              </div>

              {/* Jours d'irrigation */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Jours d'irrigation</label>
                <div className="grid grid-cols-4 gap-2">
                  {JOURS.map(j => {
                    const active = configForm.jours.includes(j)
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setConfigForm(prev => ({
                          ...prev,
                          jours: active ? prev.jours.filter(x => x !== j) : [...prev.jours, j]
                        }))}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize border-2 transition ${
                          active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {j.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Doses par produit */}
              {stocks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dose par vanne</label>
                  <p className="text-xs text-slate-400 mb-2">Laisse à 0 les produits non utilisés cette saison</p>
                  <div className="space-y-2">
                    {stocks.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-slate-700 font-medium truncate">{s.nom}</span>
                        <input
                          type="number" step="0.1" min="0"
                          value={dosesForm[s.id] || '0'}
                          onChange={e => setDosesForm(prev => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-20 border border-slate-200 bg-slate-50 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition"
                        />
                        <select
                          value={doseUnitesForm[s.id] || 'kg'}
                          onChange={e => setDoseUnitesForm(prev => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-16 border border-slate-200 bg-slate-50 rounded-xl px-1 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                        >
                          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stocks.length === 0 && (
                <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400">
                  Aucun produit en stock pour cette ferme — crée des stocks d'abord.
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-slate-100 shrink-0">
              <button type="button" onClick={() => setShowConfig(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
              <button onClick={saveConfig} disabled={savingConfig} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95">
                {savingConfig ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
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
