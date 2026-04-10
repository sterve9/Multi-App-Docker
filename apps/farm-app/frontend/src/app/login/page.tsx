'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, Eye, EyeOff, TrendingUp, Package, Sparkles } from 'lucide-react'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('farm_token', data.access_token)
      router.push('/')
    } catch {
      setError('Identifiant ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-[#052e13] via-[#0a4520] to-[#0f5c2a] px-16 py-12 relative overflow-hidden">

        {/* Texture circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-emerald-400/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-green-300/8 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
            <Leaf size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Farm Manager</div>
            <div className="text-emerald-400/60 text-xs">by SterveAI Systems</div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gérez votre ferme<br />
            avec l'intelligence<br />
            <span className="text-emerald-400">artificielle.</span>
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            Stocks, récoltes, traitements, alertes automatiques — tout en un seul endroit.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 mt-10">
            {[
              { icon: TrendingUp, text: 'Bilan saison avec comparaison N-1' },
              { icon: Package, text: 'Alertes stocks et prédiction de rupture' },
              { icon: Sparkles, text: 'Assistant IA agronomique intégré' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-emerald-400" />
                </div>
                <span className="text-white/60 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-white/20 text-xs">© 2026 SterveAI Systems</p>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Leaf size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-base">Farm Manager</div>
              <div className="text-slate-400 text-xs">by SterveAI Systems</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Connexion</h1>
            <p className="text-slate-400 text-sm mt-1">Accédez à votre espace de gestion</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Identifiant
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                placeholder="patron"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 pr-11 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-sm hover:shadow-md text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-slate-300 text-xs mt-8">
            Farm Manager · Gestion agrumicole intelligente
          </p>
        </div>
      </div>
    </div>
  )
}
