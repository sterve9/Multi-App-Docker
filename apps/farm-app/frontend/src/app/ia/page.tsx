'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import api from '@/lib/api'
import { Sparkles, Send, Bot, User, CheckCircle } from 'lucide-react'

interface Ferme { id: number; nom: string }
interface Message { role: 'user' | 'assistant'; content: string }
interface ToastState { message: string; visible: boolean; exiting: boolean }

const WELCOME: Message = {
  role: 'assistant',
  content: 'Bonjour ! Je suis votre assistant agronomique. Sélectionnez une ferme puis posez-moi une question — sur vos stocks, vos récoltes, vos traitements, ou demandez-moi d\'analyser la situation.',
}

export default function IAPage() {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [fermes, setFermes] = useState<Ferme[]>([])
  const [selectedFerme, setSelectedFerme] = useState<number | ''>('')
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false, exiting: false })

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true, exiting: false })
    setTimeout(() => {
      setToast(t => ({ ...t, exiting: true }))
      setTimeout(() => setToast({ message: '', visible: false, exiting: false }), 280)
    }, 4000)
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const sendMessage = async () => {
    if (!input.trim() || !selectedFerme || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const r = await api.post('/ai/chat', {
        ferme_id: selectedFerme,
        messages: newMessages,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Vérifiez que la clé API Anthropic est configurée.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const analyserFerme = async () => {
    if (!selectedFerme || analysing) return
    setAnalysing(true)
    try {
      const r = await api.post(`/ai/analyse/${selectedFerme}`)
      const n = r.data.nb_recommandations
      const msg = `J'ai analysé votre ferme et généré ${n} recommandation${n > 1 ? 's' : ''} :\n\n${r.data.recommandations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n\n')}\n\nVous pouvez les consulter et les gérer dans la section **Recommandations**.`
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      showToast(`${n} recommandation${n > 1 ? 's' : ''} générée${n > 1 ? 's' : ''} — voir dans Recommandations`)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Impossible de générer l\'analyse. Vérifiez que la clé API Anthropic est configurée.',
      }])
    } finally {
      setAnalysing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const fermeName = fermes.find(f => f.id === selectedFerme)?.nom

  return (
    <div className="md:ml-64 min-h-screen pb-24 md:pb-0 flex flex-col">
      <Navbar />

      <div className="flex flex-col flex-1 h-[calc(100vh-0px)] md:h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Assistant IA</h1>
              {fermeName && <p className="text-xs text-slate-400">{fermeName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFerme}
              onChange={e => setSelectedFerme(Number(e.target.value))}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            >
              {selectedFerme === '' && <option value="" disabled>Sélectionner une ferme</option>}
              {fermes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            <button
              onClick={analyserFerme}
              disabled={!selectedFerme || analysing}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              {analysing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {analysing ? 'Analyse...' : 'Analyser'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={15} className="text-emerald-600" />
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 md:px-8 pb-5 pt-3 border-t border-slate-100 bg-white">
          {!selectedFerme && (
            <p className="text-xs text-slate-400 text-center mb-2">Sélectionnez une ferme pour commencer</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!selectedFerme || loading}
              placeholder={selectedFerme ? 'Posez une question sur votre ferme... (Entrée pour envoyer)' : 'Sélectionnez une ferme d\'abord'}
              rows={1}
              className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !selectedFerme || loading}
              className="w-11 h-11 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-slate-300 text-center mt-2">Shift+Entrée pour saut de ligne</p>
        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}>
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium whitespace-nowrap">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === 'assistant'

  // Rendre le texte avec support markdown basique (gras, listes numérotées)
  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Gras **text**
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} className={line === '' ? 'mt-2' : 'leading-relaxed'} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
      })
  }

  if (isAI) {
    return (
      <div className="flex items-start gap-3 max-w-2xl">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={15} className="text-emerald-600" />
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700">
          {formatContent(msg.content)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 justify-end max-w-2xl ml-auto">
      <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-slate-800">
        {formatContent(msg.content)}
      </div>
      <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
        <User size={15} className="text-slate-500" />
      </div>
    </div>
  )
}
