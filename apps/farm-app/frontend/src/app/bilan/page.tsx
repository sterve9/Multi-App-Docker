'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { BarChart2, TrendingUp, TrendingDown, Leaf, Syringe, Package, Download } from 'lucide-react'

interface Ferme { id: number; nom: string }
interface DepenseItem { stock_nom: string; categorie: string; cout_total: number }
interface Bilan {
  ferme: Ferme
  annee: number
  total_recolte_kg: number
  total_recolte_valeur: number
  total_couts: number
  marge_brute: number
  nb_recoltes: number
  nb_traitements: number
  top_depenses: DepenseItem[]
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

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
      const r = await api.get(`/bilan/${selectedFerme}?annee=${selectedAnnee}`)
      setBilan(r.data)
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

        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bilan de saison</h1>
            <p className="text-slate-400 text-sm mt-0.5">Coûts, récoltes et marge brute</p>
          </div>
          {bilan && (
            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              {downloadingPdf ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {downloadingPdf ? 'Génération...' : 'PDF'}
            </button>
          )}
        </div>

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

              {/* Total dépenses */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade-in-up" style={{ animationDelay: '80ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-red-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">{bilan.nb_traitements} traitements</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{fmt(bilan.total_couts)} TND</div>
                <div className="text-xs text-slate-400 mt-1">Total des dépenses</div>
              </div>

              {/* Marge brute */}
              <div className={`rounded-2xl shadow-sm border p-6 fade-in-up ${bilan.marge_brute >= 0 ? 'bg-gradient-to-br from-emerald-600 to-green-700 border-emerald-500' : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400'}`} style={{ animationDelay: '160ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {bilan.marge_brute >= 0
                      ? <TrendingUp size={20} className="text-white" />
                      : <TrendingDown size={20} className="text-white" />}
                  </div>
                  <span className="text-xs font-semibold text-white/80 bg-white/20 px-2.5 py-1 rounded-lg">
                    {bilan.annee}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{fmt(bilan.marge_brute)} TND</div>
                <div className="text-xs text-white/70 mt-1">Marge brute</div>
              </div>
            </div>

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
          </>
        )}
      </main>
    </div>
  )
}
