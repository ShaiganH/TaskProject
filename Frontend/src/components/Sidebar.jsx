import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Clock, Tag, ScrollText,
  Download, LogOut, Shield, User, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Avatar } from './UI'

const NAV_MAIN = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',      icon: CheckSquare,      label: 'My tasks'  },
  { to: '/due-soon',   icon: Clock,            label: 'Due soon'  },
]
const NAV_WORKSPACE = [
  { to: '/categories', icon: Tag,        label: 'Categories' },
  { to: '/audit-log',  icon: ScrollText, label: 'Audit log'  },
  { to: '/export',     icon: Download,   label: 'Export / Import' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const link = ({ isActive }) =>
    `nav-item ${isActive ? 'active sidebar-link-active' : ''}`

  return (
    <aside className="w-52 min-w-[208px] bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6">
        <span className="text-base font-semibold tracking-tight text-gray-900">
          Task<span className="text-brand-400">Flow</span>
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin">
        <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Main</p>
        <div className="space-y-0.5 mb-4">
          {NAV_MAIN.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={link}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Workspace</p>
        <div className="space-y-0.5 mb-4">
          {NAV_WORKSPACE.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={link}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          {user?.role === 'Admin' && (
            <NavLink to="/admin" className={link}>
              <Shield size={15} />
              Admin panel
            </NavLink>
          )}
        </div>
      </nav>

      {/* User row */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-0.5">
        <NavLink to="/profile" className={link}>
          <div className="flex items-center gap-3 px-1 pt-3 pb-1">
          <Avatar initials={user?.avatar || '??'} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user?.firstName}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.designation || 'Team member'}</p>
          </div>
        </div>
        </NavLink>
        <button onClick={handleLogout} className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50">
          <LogOut size={15} />
          Sign out
        </button>
        
      </div>
    </aside>
  )
}
