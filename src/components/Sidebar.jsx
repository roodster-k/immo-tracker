// src/components/Sidebar.jsx
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--paper)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Immo<br />
          <span style={{ color: 'var(--gold)' }}>Tracker</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Suivi immobilier
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--r-md)',
              marginBottom: 2,
              fontSize: 14,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--paper)' : 'rgba(255,255,255,0.5)',
              background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
        Propulsé par Gemini AI
      </div>
    </aside>
  )
}
