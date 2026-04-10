import { LucideIcon } from 'lucide-react'

interface Stat {
  label: string
  value: string | number
  color?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate'
}

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  gradient?: string   // ex: "from-emerald-700 to-green-600"
  stats?: Stat[]
  action?: React.ReactNode
}

const COLOR_MAP = {
  emerald: 'text-emerald-100 bg-emerald-500/20',
  amber:   'text-amber-100   bg-amber-500/20',
  red:     'text-red-100     bg-red-500/20',
  blue:    'text-blue-100    bg-blue-500/20',
  slate:   'text-slate-200   bg-white/10',
}

export default function PageHeader({ icon: Icon, title, subtitle, gradient = 'from-emerald-700 to-green-600', stats, action }: PageHeaderProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl px-6 py-5 mb-6 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Icon size={22} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
            {subtitle && <p className="text-white/60 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {stats.map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${COLOR_MAP[s.color || 'slate']}`}>
              <span className="font-bold">{s.value}</span>
              <span className="opacity-70 text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
