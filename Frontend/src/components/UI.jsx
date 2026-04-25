import { X } from 'lucide-react'

// ─── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ initials, size = 'md', color = 'blue' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
  const colors = {
    blue:   'bg-brand-50 text-brand-800',
    green:  'bg-green-50 text-green-800',
    purple: 'bg-purple-50 text-purple-800',
    amber:  'bg-amber-50 text-amber-800',
    red:    'bg-red-50 text-red-700',
  }
  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────
export function Badge({ children, className = '' }) {
  return <span className={`badge ${className}`}>{children}</span>
}

// ─── Status dot ───────────────────────────────────────────────────────────
export function StatusDot({ status }) {
  const map = {
    Todo:       'bg-gray-400',
    InProgress: 'bg-blue-500',
    OnHold:     'bg-amber-500',
    Completed:  'bg-green-500',
    Cancelled:  'bg-red-400',
  }
  return <span className={`status-dot ${map[status] || 'bg-gray-400'}`} />
}

// ─── Spinner ──────────────────────────────────────────────────────────────
export function Spinner({ className = '' }) {
  return (
    <div className={`w-5 h-5 border-2 border-brand-200 border-t-brand-400 rounded-full animate-spin ${className}`} />
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box w-full ${widths[size]} page-enter`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
      {action}
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex gap-2 ml-auto">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
            Confirm
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  )
}

// ─── Section header ───────────────────────────────────────────────────────
export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {action}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────
export function StatCard({onClick, active, label, value, sub, valueColor = 'text-gray-900', icon: Icon, iconBg = 'bg-gray-100' }) {
  return (
    <div onClick= {onClick} className={`stat-card card cursor-pointer transition ${
  active ? 'ring-2 ring-brand-400 bg-brand-50' : 'hover:shadow hover:bg-gray-100'
}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">{label}</p>
          <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
          {sub && <p className={`text-xs mt-1 ${valueColor === 'text-gray-900' ? 'text-gray-400' : valueColor}`}>{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon size={18} className="text-gray-500" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Priority selector ────────────────────────────────────────────────────
export function PrioritySelector({ value, onChange }) {
  const opts = [
    { key: 'Low',      label: 'Low',      cls: 'hover:bg-gray-100', selCls: 'bg-gray-100 text-gray-700 border-gray-300 font-medium' },
    { key: 'Medium',   label: 'Medium',   cls: 'hover:bg-blue-50',  selCls: 'bg-blue-50 text-blue-700 border-blue-200 font-medium' },
    { key: 'High',     label: 'High',     cls: 'hover:bg-amber-50', selCls: 'bg-amber-50 text-amber-700 border-amber-200 font-medium' },
    { key: 'Critical', label: 'Critical', cls: 'hover:bg-red-50',   selCls: 'bg-red-50 text-red-700 border-red-200 font-medium' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button key={o.key} type="button"
          className={`flex-1 text-center py-1.5 text-xs rounded-lg border transition-all ${value === o.key ? o.selCls : 'border-gray-200 text-gray-500 ' + o.cls}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
