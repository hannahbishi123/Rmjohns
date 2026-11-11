/**
 * validation.js — reusable live-validation rules and useField hook
 *
 * Usage:
 *   const email = useField('', rules.email)
 *   <input value={email.value} onChange={email.onChange} onBlur={email.onBlur} />
 *   {email.touched && email.error && <span className="v-error">{email.error}</span>}
 */
import { useState, useCallback } from 'react'

// ── Validation rules ──────────────────────────────────────────────────────────
// Each rule is a function: (value) => errorString | null

export const rules = {
  required: (label = 'This field') => (v) =>
    !String(v).trim() ? `${label} is required.` : null,

  minLen: (n, label = 'This field') => (v) =>
    String(v).trim().length < n ? `${label} must be at least ${n} characters.` : null,

  maxLen: (n, label = 'This field') => (v) =>
    String(v).trim().length > n ? `${label} must be ${n} characters or fewer.` : null,

  email: (v) => {
    if (!String(v).trim()) return 'Email address is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()))
      return 'Enter a valid email address (e.g. you@example.com).'
    if (String(v).length > 254) return 'Email is too long.'
    return null
  },

  phone: (v) => {
    const val = String(v).trim()
    if (!val) return null // phone is optional — only validate if filled
    const normalized = val.replace(/[ -]/g, '')
    if (!/^(?:\+63|0)9\d{9}$/.test(normalized))
      return 'Enter a valid Philippine mobile number (e.g. +63 917 555 0142).'
    return null
  },

  password: (v) => {
    const p = String(v)
    if (!p) return 'Password is required.'
    if (p.length < 8) return 'Password must be at least 8 characters.'
    if (p.length > 64) return 'Password must be 64 characters or fewer.'
    if (!/[A-Z]/.test(p)) return 'Add at least one uppercase letter (A–Z).'
    if (!/[a-z]/.test(p)) return 'Add at least one lowercase letter (a–z).'
    if (!/[0-9]/.test(p)) return 'Add at least one number (0–9).'
    if (!/[^A-Za-z0-9]/.test(p)) return 'Add at least one special character (!@#$%…).'
    return null
  },

  passwordLogin: (v) => {
    const p = String(v)
    if (!p) return 'Password is required.'
    if (p.length < 4) return 'Password must be at least 4 characters.'
    return null
  },

  confirmPassword: (original) => (v) =>
    String(v) !== String(original)
      ? 'Passwords do not match.'
      : null,

  price: (v) => {
    const n = Number(v)
    if (!v && v !== 0) return 'Price is required.'
    if (!Number.isFinite(n) || n < 1) return 'Price must be at least ₱1.'
    if (n > 1000000) return 'Price must be ₱1,000,000 or less.'
    return null
  },

  name: (label = 'Name') => (v) => {
    const val = String(v).trim()
    if (!val) return `${label} is required.`
    if (val.length < 2) return `${label} must be at least 2 characters.`
    if (val.length > 80) return `${label} must be 80 characters or fewer.`
    return null
  },

  description: (v) => {
    const val = String(v).trim()
    if (!val) return 'Description is required.'
    if (val.length < 10) return 'Description must be at least 10 characters.'
    if (val.length > 300) return 'Description must be 300 characters or fewer.'
    return null
  },

  notes: (v) => {
    if (String(v).length > 500) return 'Notes must be 500 characters or fewer.'
    return null
  },
}

// ── Compose multiple rules into one validator ─────────────────────────────────
// First failing rule wins.
export function compose(...validators) {
  return (value) => {
    for (const validator of validators) {
      const err = validator(value)
      if (err) return err
    }
    return null
  }
}

// ── useField hook — single controlled input with live validation ───────────────
/**
 * @param {string}   initialValue
 * @param {function} validator     - (value) => errorString | null
 * @returns {{ value, error, touched, dirty, valid, onChange, onBlur, reset, forceTouch }}
 */
export function useField(initialValue = '', validator = () => null) {
  const [value,   setValue]   = useState(String(initialValue))
  const [touched, setTouched] = useState(false)

  const error = validator(value)
  const valid = !error && touched

  const onChange = useCallback((e) => {
    setValue(e.target.value)
  }, [])

  const onBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const reset = useCallback(() => {
    setValue(String(initialValue))
    setTouched(false)
  }, [initialValue])

  const forceTouch = useCallback(() => setTouched(true), [])

  return { value, error, touched, valid, onChange, onBlur, reset, forceTouch, setValue, setTouched }
}

// ── useForm — manage multiple fields together ─────────────────────────────────
/**
 * @param {object} fields  - { fieldName: useField(...) return value, ... }
 * @returns {{ isValid, touchAll }}
 */
export function useForm(fields) {
  const isValid = Object.values(fields).every((f) => !f.error)

  function touchAll() {
    Object.values(fields).forEach((f) => f.forceTouch())
  }

  return { isValid, touchAll }
}

// ── FieldError component — shows error or success indicator ───────────────────
/**
 * Renders below an input:
 *   - nothing     when untouched
 *   - red message when touched + error
 *   - green ✓     when touched + valid
 */
export function FieldError({ field, label }) {
  if (!field.touched) return null
  if (field.error) {
    return (
      <span className="v-error" role="alert">
        <span className="v-icon v-icon-error" aria-hidden="true">✕</span>
        {field.error}
      </span>
    )
  }
  return (
    <span className="v-success" aria-label={`${label || 'Field'} is valid`}>
      <span className="v-icon v-icon-success" aria-hidden="true">✓</span>
      Looks good!
    </span>
  )
}

// ── fieldClass — returns CSS class for input border state ─────────────────────
export function fieldClass(field, base = '') {
  if (!field.touched) return base
  return `${base} ${field.error ? 'v-invalid' : 'v-valid'}`.trim()
}
