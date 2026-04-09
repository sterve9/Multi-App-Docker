'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, MapPin, Syringe, Apple, Package, LogOut, Leaf, ClipboardList, BarChart2, MoreHorizontal, X, CalendarDays, Sparkles, Settings } from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

const mainLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parcelles', label: 'Parcelles', icon: MapPin },
  { href: '/traitements', label: 'Traitements', icon: Syringe },
  { href: '/recoltes', label: 'Récoltes', icon: Apple },
  { href: '/stocks', label: 'Stocks', icon: Package },
]

const moreLinks = [
  { href: '/ia', label: 'Assistant IA', icon: Sparkles },
  { href: '/planning', label: 'Fertilisation', icon: CalendarDays },
  { href: '/recommandations', label: 'Recommandations', icon: ClipboardList },
  { href: '/bilan', label: 'Bilan saison', icon: BarChart2 },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

const allLinks = [...mainLinks, ...moreLinks]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [stocksAlerte, setStocksAlerte] = useState(0)

  const isMoreActive = moreLinks.some(l => l.href === pathname)

  const logout = () => {
    localStorage.removeItem('farm_token')
    router.push('/login')
  }

  const fetchAlerts = useCallback(async () => {
    const token = localStorage.getItem('farm_token')
    if (!token) return
    try {
      const r = await api.get('/fermes/dashboard/all')
      const total = r.data.reduce((sum: number, f: any) => sum + (f.stocks_alerte || 0), 0)
      setStocksAlerte(total)
    } catch {}
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Rafraîchir toutes les 2 minutes
    const interval = setInterval(fetchAlerts, 120000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen fixed left-0 top-0 bg-gradient-to-b from-[#071c10] to-[#0f3320] shadow-xl z-40">
        {/* Logo */}
        <div className="px-5 py-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Leaf size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Farm Manager</div>
              <div className="text-emerald-400/60 text-xs mt-0.5">Gestion agrumicole</div>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-white/8 mb-3" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {allLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const hasAlert = href === '/stocks' && stocksAlerte > 0
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                    : 'text-white/50 hover:text-white/90 hover:bg-white/8'
                )}
              >
                {active && (
                  <span className="nav-active-dot absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                )}
                <span className="relative">
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  {hasAlert && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-[#071c10]" />
                  )}
                </span>
                {label}
                {hasAlert && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {stocksAlerte}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mx-5 h-px bg-white/8 mt-3" />

        {/* Logout */}
        <div className="px-3 py-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/40 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-150"
          >
            <LogOut size={17} strokeWidth={2} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#071c10] border-t border-white/10 flex justify-around py-1.5 z-50">
        {mainLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const hasAlert = href === '/stocks' && stocksAlerte > 0
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs transition-all duration-200 active:scale-90',
                active ? 'text-emerald-400 font-semibold' : 'text-white/40'
              )}
            >
              <span className="relative">
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                {hasAlert && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-[#071c10]" />
                )}
              </span>
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
        {/* Bouton Plus */}
        <button
          onClick={() => setShowMore(true)}
          className={clsx(
            'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs transition-all duration-200 active:scale-90',
            isMoreActive ? 'text-emerald-400 font-semibold' : 'text-white/40'
          )}
        >
          <MoreHorizontal size={19} strokeWidth={2} />
          <span className="text-[10px]">Plus</span>
        </button>
      </nav>

      {/* Mobile More drawer */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0f3320] rounded-t-2xl p-5 modal-enter"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Plus</span>
              <button onClick={() => setShowMore(false)} className="text-white/40 hover:text-white/80 transition">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {moreLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      active ? 'bg-emerald-500 text-white' : 'text-white/70 hover:bg-white/10'
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300/70 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
