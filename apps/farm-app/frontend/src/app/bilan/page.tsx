'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { BarChart2, TrendingUp, TrendingDown, Leaf, Syringe, Package, Download, ArrowUp, ArrowDown, Minus, FileSpreadsheet, Wallet } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

interface Ferme { id: number; nom: string }
interface DepenseItem { stock_nom: string; categorie: string; cout_total: number }
interface DepenseDiverseItem { categorie: string; total: number }
interface Bilan {
  ferme: Ferme
  annee: number
  total_recolte_kg: number
  total_recolte_valeur: number
  total_couts: number
  total_depenses_diverses: number
  marge_brute: number
  marge_nette: number
  nb_recoltes: number
  nb_traitements: number
  top_depenses: DepenseItem[]
  depenses_diverses: DepenseDiverseItem[]
}
interface VarieteComp {
  variete: string
  annee_n: number
  annee_n1: number
  valeur_n: number
  valeur_n1: number
  evolution_pct: number
}
interface Comparaison {
  annee_n: number
  annee_n1: number
  par_variete: VarieteComp[]
  total_n: number
  total_n1: number
  total_evolution_pct: number
}

const VARIETE_LABEL: Record<string, string> = {
  citron: '🍋 Citron',
  orange: '🟠 Orange',
  clementine: '🍊 Clémentine',
  mixte: '🌿 Mixte',
}

const ANNEES = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

function fmt(n: number) {
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 0 })
}

export default function BilanPage() {
  const router = useRouter()
  const [fermes, setFermes] = useState<Ferme[]>([])
  const [selectedFerme, setSelectedFerme] = useState<number | ''>('')
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear())
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [comparaison, setComparaison] = useState<Comparaison | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingXls, setDownloadingXls] = useState(false)

  const downloadExcel = async () => {
    if (!selectedFerme) return
    setDownloadingXls(true)
    try {
      const token = localStorage.getItem('farm_token')
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${base}/excel/bilan/${selectedFerme}?annee=${selectedAnnee}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilan_${selectedFerme}_${selectedAnnee}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de la génération du fichier Excel')
    } finally {
      setDownloadingXls(false)
    }
  }

  const downloadPdf = async () => {
    if (!selectedFerme) return
    setDownloadingPdf(true)
    try {
      const token = localStorage.getItem('farm_token')
      const base = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${base}/pdf/bilan/${selectedFerme}?annee=${selectedAnnee}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilan_${selectedFerme}_${selectedAnnee}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de la génération du PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const loadBilan = useCallback(async () => {
    if (!selectedFerme) return
    setLoading(true); setError(null)
    try {
      const [bilanRes, compRes] = await Promise.all([
        api.get(`/bilan/${selectedFerme}?annee=${selectedAnnee}`),
        api.get(`/bilan/${selectedFerme}/comparaison?annee=${selectedAnnee}`),
      ])
      setBilan(bilanRes.data)
      setComparaison(compRes.data)
    } catch {
      setError('Erreur lors du chargement du bilan')
    } finally { setLoading(false) }
  }, [selectedFerme, selectedAnnee])

  useEffect(() => {
    const token = localStorage.getItem('farm_token')
    if (!token) { router.push('/login'); return }
    api.get('/fermes/').then(r => {
      setFermes(r.data)
      if (r.data.length > 0) setSelectedFerme(r.data[0].id)
    })
  }, [router])

  useEffect(() => { if (selectedFerme) loadBilan() }, [selectedFerme, selectedAnnee, loadBilan])

  const maxDepense = bilan?.top_depenses[0]?.cout_total || 1

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="p-5 md:p-8">

        <PageHeader
          icon={BarChart2}
          title="Bilan de saison"
          subtitle={`Coûts, récoltes et marge brute · ${selectedAnnee}`}
          gradient="from-indigo-700 to-blue-600"
          stats={bilan ? [
            { label: 'kg récoltés', value: `${bilan.total_recolte_kg.toLocaleString('fr-FR')} kg`, color: 'emerald' },
            { label: 'CA récoltes', value: `${bilan.total_recolte_valeur.toLocaleString('fr-FR')} TND`, color: 'blue' },
            { label: bilan.marge_nette >= 0 ? 'marge nette' : 'déficit', value: `${bilan.marge_nette >= 0 ? '+' : ''}${bilan.marge_nette.toLocaleString('fr-FR')} TND`, color: bilan.marge_nette >= 0 ? 'emerald' : 'red' },
          ] : []}
          action={bilan ? (
            <div className="flex items-center gap-2">
              <button onClick={downloadExcel} disabled={downloadingXls} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                {downloadingXls ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={14} />}
                Excel
              </button>
              <button onClick={downloadPdf} disabled={downloadingPdf} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                {downloadingPdf ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
                PDF
              </button>
            </div>
          ) : undefined}
        />

        {/* Sélecteurs */}
        <div className="flex items-center gap-3 mb-8 flex-wrap fade-in-up" style={{ animationDelay: '60ms' }}>
          <select
            value={selectedFerme}
            onChange={e => setSelectedFerme(Number(e.target.value))}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          >
            {selectedFerme === '' && <option value="" disabled>-- Sélectionner une ferme --</option>}
            {fermes.map(f => <option key={f.id} value={f.id}>🏡 {f.nom}</option>)}
          </select>
          <select
            value={selectedAnnee}
            onChange={e => setSelectedAnnee(Number(e.target.value))}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          >
            {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 skeleton rounded-2xl" />)}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-600">{error}</div>
        )}

        {bilan && !loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {/* Valeur récoltes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Leaf size={20} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{bilan.nb_recoltes} récoltes</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{fmt(bilan.total_recolte_valeur)} TND</div>
                <div className="text-xs text-slate-400 mt-1">Valeur récoltes · {fmt(bilan.total_recolte_kg)} kg</div>
              </div>

              {/* Total dépenses stocks */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up" style={{ animationDelay: '80ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-red-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{bilan.nb_traitements} traitements</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{fmt(bilan.total_couts)} TND</div>
                <div className="text-xs text-slate-400 mt-1">Dépenses produits & stocks</div>
              </div>

              {/* Marge nette */}
              <div className={`rounded-2xl shadow-sm border p-6 fade-in-up ${bilan.marge_nette >= 0 ? 'bg-gradient-to-br from-emerald-600 to-green-700 border-emerald-500' : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400'}`} style={{ animationDelay: '160ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {bilan.marge_nette >= 0
                      ? <TrendingUp size={20} className="text-white" />
                      : <TrendingDown size={20} className="text-white" />}
                  </div>
                  <span className="text-xs font-semibold text-white/80 bg-white/20 px-2.5 py-1 rounded-lg">
                    {bilan.annee}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{fmt(bilan.marge_nette)} TND</div>
                <div className="text-xs text-white/70 mt-1">Marge nette (toutes charges)</div>
              </div>
            </div>

            {/* Dépenses diverses */}
            {(bilan.total_depenses_diverses > 0 || bilan.depenses_diverses.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 fade-in-up" style={{ animationDelay: '190ms' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Wallet size={16} className="text-orange-500" />
                    Dépenses diverses
                  </h2>
                  <span className="text-sm font-bold text-orange-700">{fmt(bilan.total_depenses_diverses)} TND</span>
                </div>
                <div className="space-y-2">
                  {bilan.depenses_diverses.map((d, i) => {
                    const pct = bilan.total_depenses_diverses > 0 ? Math.round(d.total / bilan.total_depenses_diverses * 100) : 0
                    const CAT_LABELS: Record<string, string> = { irrigation: '💧 Irrigation', construction: '🏗️ Construction', renovation: '🔨 Rénovation', alimentation: '🐕 Alimentation', main_oeuvre: "👷 Main d'œuvre", carburant: '⛽ Carburant', materiel: '🔧 Matériel', autre: '📋 Autre' }
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-36 shrink-0">{CAT_LABELS[d.categorie] || d.categorie}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-24 text-right tabular-nums">{fmt(d.total)} TND</span>
                      </div>
                    )
                  })}
                </div>
                {/* Récap total charges */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-slate-400">Produits & stocks</div>
                    <div className="text-sm font-bold text-slate-700 tabular-nums">{fmt(bilan.total_couts)} TND</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Dépenses diverses</div>
                    <div className="text-sm font-bold text-orange-700 tabular-nums">{fmt(bilan.total_depenses_diverses)} TND</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total charges</div>
                    <div className="text-sm font-bold text-red-600 tabular-nums">{fmt(bilan.total_couts + bilan.total_depenses_diverses)} TND</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top dépenses */}
            {bilan.top_depenses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <Syringe size={16} className="text-slate-400" />
                  Détail des dépenses par produit
                </h2>
                <div className="space-y-4">
                  {bilan.top_depenses.map((d, i) => {
                    const pct = Math.round((d.cout_total / maxDepense) * 100)
                    const CAT_COLORS: Record<string, string> = {
                      engrais: 'bg-emerald-500',
                      pesticide: 'bg-red-400',
                      'matériel': 'bg-blue-400',
                      autre: 'bg-slate-400',
                    }
                    const barColor = CAT_COLORS[d.categorie] || 'bg-slate-400'
                    return (
                      <div key={i} className="fade-in-up" style={{ animationDelay: `${220 + i * 60}ms` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">{d.stock_nom}</span>
                            <span className="text-xs text-slate-400 capitalize">{d.categorie}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(d.cout_total)} TND</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {bilan.top_depenses.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100 fade-in-up" style={{ animationDelay: '200ms' }}>
                <Package size={28} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-sm">Aucune dépense enregistrée pour {bilan.annee}.</p>
                <p className="text-slate-300 text-xs mt-1">Enregistre des mouvements de stock avec un coût unitaire pour voir le bilan.</p>
              </div>
            )}

            {/* Comparaison N-1 */}
            {comparaison && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6 fade-in-up" style={{ animationDelay: '250ms' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <BarChart2 size={16} className="text-slate-400" />
                    Comparaison {comparaison.annee_n} vs {comparaison.annee_n1}
                  </h2>
                  {/* Total évolution */}
                  <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                    comparaison.total_evolution_pct > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : comparaison.total_evolution_pct < 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {comparaison.total_evolution_pct > 0 ? <ArrowUp size={12} /> : comparaison.total_evolution_pct < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                    {comparaison.total_evolution_pct > 0 ? '+' : ''}{comparaison.total_evolution_pct}%
                  </span>
                </div>

                {comparaison.par_variete.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Aucune récolte enregistrée sur ces 2 années.</p>
                ) : (
                  <div className="space-y-5">
                    {comparaison.par_variete.map((v, i) => {
                      const maxKg = Math.max(v.annee_n, v.annee_n1, 1)
                      const pctN = Math.round((v.annee_n / maxKg) * 100)
                      const pctN1 = Math.round((v.annee_n1 / maxKg) * 100)
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-700">
                              {VARIETE_LABEL[v.variete] || v.variete}
                            </span>
                            <span className={`flex items-center gap-1 text-xs font-semibold ${
                              v.evolution_pct > 0 ? 'text-emerald-600' : v.evolution_pct < 0 ? 'text-red-500' : 'text-slate-400'
                            }`}>
                              {v.evolution_pct > 0 ? <ArrowUp size={11} /> : v.evolution_pct < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                              {v.evolution_pct > 0 ? '+' : ''}{v.evolution_pct}%
                            </span>
                          </div>
                          {/* Barre année N */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-slate-400 w-10 shrink-0">{comparaison.annee_n}</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pctN}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 w-20 text-right tabular-nums">{fmt(v.annee_n)} kg</span>
                          </div>
                          {/* Barre année N-1 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-10 shrink-0">{comparaison.annee_n1}</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-300 rounded-full transition-all duration-700" style={{ width: `${pctN1}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-400 w-20 text-right tabular-nums">{fmt(v.annee_n1)} kg</span>
                          </div>
                        </div>
                      )
                    })}

                    {/* Ligne total */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Total récoltes</span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800 tabular-nums">{fmt(comparaison.total_n)} kg</div>
                        <div className="text-xs text-slate-400 tabular-nums">vs {fmt(comparaison.total_n1)} kg en {comparaison.annee_n1}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
