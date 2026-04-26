// src/components/ui.jsx
import React from 'react'
import { cn, scoreBgClass, STATUS_LABELS } from '../lib/utils.js'

export function Badge({ children, className, variant = 'default' }) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium'
  const variants = {
    default: 'bg-paper-2 text-ink-2',
    gold: 'bg-gold-bg text-amber',
    green: 'bg-green-l text-green',
    blue: 'bg-blue-l text-blue',
    red: 'bg-red-l text-red',
  }
  return (
    <span className={cn(base, variants[variant], className)} style={getVariantStyle(variant)}>
      {children}
    </span>
  )
}

function getVariantStyle(variant) {
  const map = {
    default: { background: 'var(--paper-2)', color: 'var(--ink-2)' },
    gold: { background: 'var(--gold-bg)', color: 'var(--amber)' },
    green: { background: 'var(--green-l)', color: 'var(--green)' },
    blue: { background: 'var(--blue-l)', color: 'var(--blue)' },
    red: { background: 'var(--red-l)', color: 'var(--red)' },
  }
  return map[variant] || map.default
}

export function ScorePill({ score }) {
  const cls = scoreBgClass(score)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score}/100
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }
  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' },
    secondary: { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--border)' },
    ghost: { background: 'transparent', color: 'var(--ink-2)', borderColor: 'transparent' },
    danger: { background: 'var(--red-l)', color: 'var(--red)', borderColor: 'transparent' },
    gold: { background: 'var(--gold)', color: 'var(--paper)', borderColor: 'var(--gold)' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes[size], className)}
      style={variants[variant]}
    >
      {children}
    </button>
  )
}

export function Input({ label, id, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</label>}
      <input
        id={id}
        style={{
          padding: '8px 12px', borderRadius: 'var(--r-sm)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          background: 'var(--paper)', color: 'var(--ink)',
          fontFamily: 'var(--font-body)', fontSize: 14,
          outline: 'none', width: '100%',
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

export function Textarea({ label, id, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</label>}
      <textarea
        id={id}
        style={{
          padding: '10px 12px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--ink)',
          fontFamily: 'var(--font-body)', fontSize: 14,
          outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.6,
        }}
        {...props}
      />
    </div>
  )
}

export function Select({ label, id, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</label>}
      <select
        id={id}
        style={{
          padding: '8px 12px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--ink)',
          fontFamily: 'var(--font-body)', fontSize: 14,
          outline: 'none', width: '100%',
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export function Card({ children, className, style }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Spinner({ size = 18 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid var(--paper-3)',
      borderTopColor: 'var(--ink)',
      display: 'inline-block',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

export function Empty({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-3)' }}>
      {icon && <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>}
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)', marginBottom: 6 }}>{title}</p>
      {desc && <p style={{ fontSize: 14 }}>{desc}</p>}
    </div>
  )
}

export function ScoreBar({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--gold)' : 'var(--red)'
  return (
    <div style={{ background: 'var(--paper-2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  )
}
