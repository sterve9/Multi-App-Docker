'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, MapPin, Syringe, Apple, Package, LogOut, Leaf } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parcelles', label: 'Parcelles', icon: MapPin },
  { href: '/traitements', label: 'Traitements', icon: Syringe },
  { href: '/recoltes', label: 'Récoltes', icon: Apple },
  { href: '/stocks', label: 'Stocks', icon: Package },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = () => {
    localStorage.removeItem('farm_token')
    router.push('/login')
  }

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
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                    : 'text-white/50 hover:text-white/90 hover:bg-white/8'
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                {label}
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
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-all',
                active ? 'text-emerald-400 font-semibold' : 'text-white/40'
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
