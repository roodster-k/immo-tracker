// src/components/ui.jsx
import React from 'react'
import { cn, scoreBgClass, STATUS_LABELS } from '../lib/utils.js'

export function Badge({ children, className, variant = 'default', style: styleProp }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        ...getVariantStyle(variant),
        ...styleProp,
      }}
    >
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
    <span
      className={cls}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {score}/100
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`status-${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button', style: styleProp }) {
  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '8px 16px', fontSize: 14 },
    lg: { padding: '10px 20px', fontSize: 15 },
  }
  const variantStyles = {
    primary:   { background: 'var(--ink)',    color: 'var(--paper)', border: '1px solid var(--ink)' },
    secondary: { background: 'var(--paper)',  color: 'var(--ink)',   border: '1px solid var(--border)' },
    ghost:     { background: 'transparent',   color: 'var(--ink-2)', border: '1px solid transparent' },
    danger:    { background: 'var(--red-l)',  color: 'var(--red)',   border: '1px solid transparent' },
    gold:      { background: 'var(--gold)',   color: 'var(--paper)', border: '1px solid var(--gold)' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn('ui-button', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 500,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-body)',
        lineHeight: 1.2,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...styleProp,
      }}
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
        className="ui-input"
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
        className="ui-input"
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
        className="ui-input"
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

export function Card({ children, className, style, ...props }) {
  return (
    <div
      className={cn('ui-card', className)}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...props}
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
  const Icon = typeof icon === 'function' ? icon : null
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-3)' }}>
      {Icon && (
        <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 'var(--r-lg)', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
      )}
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>{title}</p>
      {desc && <p style={{ fontSize: 14, maxWidth: 420, margin: '0 auto' }}>{desc}</p>}
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
