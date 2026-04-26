// src/components/Sidebar.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, List, GitCompare, Settings } from 'lucide-react'

const nav = [
  { to: '/',        icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/add',     icon: PlusCircle,      label: 'Ajouter un bien' },
  { to: '/biens',   icon: List,            label: 'Mes biens' },
  { to: '/comparer',icon: GitCompare,      label: 'Comparer' },
  { to: '/settings',icon: Settings,        label: 'Paramètres' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          Immo <span className="sidebar-logo-accent">Tracker</span>
        </div>
        <div className="sidebar-kicker">Suivi immobilier</div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                <span className="nav-link-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        Propulsé par Gemini AI
      </div>
    </aside>
  )
}
