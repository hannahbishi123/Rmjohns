import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useField, useForm, FieldError, fieldClass, rules } from '../../lib/validation'

export default function LoginPage() {
  const { signIn, notify, setDialog } = useApp()
  const [loading, setLoading]     = useState(false)
  const [shake,   setShake]       = useState(false)
  const submitRef = useRef(null)

  // ── Live-validated fields ─────────────────────────────────────
  const identifier = useField('', (v) => {
    if (!v.trim()) return 'Email or username is required.'
    if (v.length > 254) return 'Too long — max 254 characters.'
    const validEmail    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    const validUsername = /^[a-z0-9._-]{3,40}$/i.test(v.trim())
    if (!validEmail && !validUsername)
      return 'Enter a valid email (you@example.com) or username (3–40 chars).'
    return null
  })

  const password = useField('', rules.passwordLogin)
  const form     = useForm({ identifier, password })

  async function submit(e) {
    e.preventDefault()
    form.touchAll()

    if (!form.isValid) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    setLoading(true)
    try {
      const result = await signIn(identifier.value.trim().toLowerCase(), password.value)
      const role   = result?.account?.role || 'account'
      notify(`Welcome back! Signed in as ${role}.`, { icon: 'success', title: 'Signed in', timer: 2000 })
    } catch (err) {
      notify(err.message || 'Sign-in failed. Check your credentials and try again.', {
        icon: 'error', title: 'Sign-in failed', timer: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="role-login-page single-login-page">
      <header className="role-login-header">
        <a className="brand" href="/" aria-label="RMJohn's home">
          <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="brand-logo" />
          <span className="brand-copy"><strong>RMJohn&apos;s</strong><small>EATERY</small></span>
        </a>
        <span className="login-prototype-label">INTEGRATED EATERIES SYSTEM</span>
      </header>

      <div className="role-login-content">
        {/* ── Brand panel ── */}
        <section className="role-login-brand-panel">
          <div className="role-login-brand-wrap">
            <img src="/rmjohns-logo.jpg" alt="RMJohns logo"
              className="brand-logo role-login-symbol-logo" />
            <div className="brand-copy brand-copy-large">
              <strong>RMJohn&apos;s</strong>
              <small>EATERY</small>
            </div>
            <span className="eyebrow">RMJOHN&apos;S EXPERIENCE</span>
            <h1>Welcome back.</h1>
            <p>Sign in to continue to your eateries system.</p>
          </div>
          <div className="login-demo-note">
            Your account credentials are verified securely in the cloud.
          </div>
        </section>

        {/* ── Login form ── */}
        <form
          ref={submitRef}
          className={`panel role-login-form${shake ? ' v-shake' : ''}`}
          onSubmit={submit}
          noValidate
        >
          <div className="eyebrow">ACCOUNT SIGN IN</div>
          <h2>Login</h2>

          {/* Email / username */}
          <label>
            Email or username
            <input
              type="text"
              name="identifier"
              autoComplete="username"
              maxLength={254}
              placeholder="Enter your email or username"
              required
              disabled={loading}
              value={identifier.value}
              onChange={identifier.onChange}
              onBlur={identifier.onBlur}
              className={fieldClass(identifier)}
              aria-describedby="id-err"
            />
            <FieldError field={identifier} label="Email or username" />
          </label>

          {/* Password */}
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              maxLength={64}
              placeholder="Enter your password"
              required
              disabled={loading}
              value={password.value}
              onChange={password.onChange}
              onBlur={password.onBlur}
              className={fieldClass(password)}
            />
            <FieldError field={password} label="Password" />
          </label>

          <div className="login-form-links">
            <button type="button" className="text-button" disabled={loading}
              onClick={() => setDialog({ type: 'account', mode: 'forgot' })}>
              Forgot password?
            </button>
            <button type="button" className="text-button" disabled={loading}
              onClick={() => setDialog({ type: 'account', mode: 'register' })}>
              Sign up
            </button>
          </div>

          <button
            className="button button-dark complete-button"
            disabled={loading}
          >
            {loading ? 'Signing in\u2026' : 'Sign in'} <span>→</span>
          </button>

          <p className="secure-note">
            Credentials are verified against your account in the cloud.
          </p>
        </form>
      </div>

      <footer className="role-login-footer">
        RMJOHN&apos;S EATERY · EATERIES SYSTEM
      </footer>
    </main>
  )
}
