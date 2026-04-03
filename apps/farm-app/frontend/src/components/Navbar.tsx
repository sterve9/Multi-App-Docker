'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, MapPin, Syringe, Apple, Package, LogOut } from 'lucide-react'
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
      <aside className="hidden md:flex flex-col w-56 bg-farm-green min-h-screen p-4 fixed left-0 top-0">
        <div className="text-white text-center mb-8 mt-2">
          <div className="text-3xl">🌿</div>
          <div className="font-bold text-lg mt-1">Farm Manager</div>
          <div className="text-green-300 text-xs">Tunis</div>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                pathname === href
                  ? 'bg-white text-farm-green'
                  : 'text-green-100 hover:bg-green-700'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 text-green-300 hover:text-white text-sm mt-4"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-farm-green flex justify-around py-2 z-50">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs',
              pathname === href ? 'text-white font-bold' : 'text-green-300'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
