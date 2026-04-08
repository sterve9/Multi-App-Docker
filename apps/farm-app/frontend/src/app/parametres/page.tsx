'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Users, Plus, Trash2, KeyRound, X, ShieldCheck, User, FlaskConical } from 'lucide-react'

interface UserItem {
  id: number
  username: string
  nom: string
  role: 'admin' | 'ingenieur' | 'gestionnaire'
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  ingenieur: 'Ingénieur',
  gestionnaire: 'Gestionnaire',
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-emerald-100 text-emerald-700',
  ingenieur: 'bg-blue-50 text-blue-700',
  gestionnaire: 'bg-slate-100 text-slate-500',
}

const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

export default function ParametresPage() {
  const [me, setMe] = useState<UserItem | null>(null)
  const [userList, setUserList] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  // Create user modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', nom: '', role: 'gestionnaire' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Change password modal
  const [pwdTarget, setPwdTarget] = useState<UserItem | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSubmitting, setPwdSubmitting] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [meRes, listRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/').catch(() => ({ data: [] }))
      ])
      setMe(meRes.data)
      setUserList(listRes.data)
    } catch {
      // non-admin: only /me worked
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await api.post('/users/', form)
      setShowCreate(false)
      setForm({ username: '', password: '', nom: '', role: 'gestionnaire' })
      loadAll()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (u: UserItem) => {
    if (!confirm(`Supprimer l'utilisateur "${u.username}" ?`)) return
    await api.delete(`/users/${u.id}`)
    loadAll()
  }

  const handlePwdChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwdTarget) return
    setPwdSubmitting(true)
    setPwdError(null)
    try {
      await api.put(`/users/${pwdTarget.id}/password`, { password: newPwd })
      setPwdTarget(null)
      setNewPwd('')
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || 'Erreur')
    } finally {
      setPwdSubmitting(false)
    }
  }

  const isAdmin = me?.role === 'admin'

  return (
    <div className="md:ml-64 min-h-screen bg-slate-50">
      <Navbar />
      <main className="p-4 md:p-8 pb-28 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Paramètres</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestion du compte et des utilisateurs</p>
        </div>

        {/* Mon compte */}
        {me && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-6 py-5 rounded-t-2xl">
              <h2 className="text-white font-bold text-base">Mon compte</h2>
            </div>
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                {me.role === 'admin'
                  ? <ShieldCheck size={22} className="text-emerald-600" />
                  : me.role === 'ingenieur'
                    ? <FlaskConical size={22} className="text-blue-500" />
                    : <User size={22} className="text-emerald-600" />
                }
              </div>
              <div>
                <div className="font-semibold text-slate-800">{me.nom || me.username}</div>
                <div className="text-slate-400 text-sm">@{me.username}</div>
              </div>
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${ROLE_BADGE[me.role] || 'bg-slate-100 text-slate-600'}`}>
                {ROLE_LABEL[me.role] || me.role}
              </span>
            </div>
          </div>
        )}

        {/* Gestion utilisateurs — admin only */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-white/80" />
                <h2 className="text-white font-bold text-base">Utilisateurs</h2>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                <Plus size={14} />
                Ajouter
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {userList.map(u => (
                  <div key={u.id} className="flex items-center px-6 py-4 gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      {u.role === 'admin'
                        ? <ShieldCheck size={16} className="text-emerald-600" />
                        : u.role === 'ingenieur'
                          ? <FlaskConical size={16} className="text-blue-500" />
                          : <User size={16} className="text-slate-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{u.nom || u.username}</div>
                      <div className="text-xs text-slate-400">@{u.username}</div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-500'}`}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                    <button
                      onClick={() => { setPwdTarget(u); setNewPwd(''); setPwdError(null) }}
                      className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-50"
                      title="Changer le mot de passe"
                    >
                      <KeyRound size={15} />
                    </button>
                    {me?.id !== u.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-slate-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {userList.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">Aucun utilisateur</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal créer utilisateur */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Nouvel utilisateur</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
            )}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Nom complet</label>
                <input className={INPUT} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex: Ahmed Ben Ali" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Nom d'utilisateur *</label>
                <input className={INPUT} required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ex: ahmed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Mot de passe *</label>
                <input className={INPUT} required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 caractères" minLength={6} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Rôle</label>
                <select className={INPUT} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="gestionnaire">Gestionnaire (ouvrier)</option>
                  <option value="ingenieur">Ingénieur agronome</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal changer mot de passe */}
      {pwdTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm modal-enter">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Nouveau mot de passe</h2>
              <button onClick={() => setPwdTarget(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            <p className="px-6 pt-4 text-sm text-slate-500">Compte : <span className="font-semibold text-slate-700">@{pwdTarget.username}</span></p>
            {pwdError && (
              <p className="mx-6 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{pwdError}</p>
            )}
            <form onSubmit={handlePwdChange} className="p-6 space-y-4">
              <input
                className={INPUT}
                required
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Nouveau mot de passe"
                minLength={6}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setPwdTarget(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
                <button type="submit" disabled={pwdSubmitting} className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
                  {pwdSubmitting ? 'Enregistrement...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
