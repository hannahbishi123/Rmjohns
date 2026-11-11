import { useState } from 'react'
import { useApp } from '../context/AppContext'

const loginCopy = {
  Admin:    { icon: '◫', intro: 'Manage the menu, team, sales, and reports.' },
  Staff:    { icon: '♧', intro: 'Check the kitchen queue and staff tools.' },
  Customer: { icon: '♙', intro: 'Sign in to order food and follow your rewards.' },
}

export default function RoleLoginForm({ role }) {
  const { signIn, navigate, notify, setDialog } = useApp()
  const copy = loginCopy[role]
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim().toLowerCase()
    const password = String(form.get('password'))

    // ── Client-side validation ────────────────────────────────────────────────
    if (!email) {
      notify('Please enter your email address.', { icon: 'error', title: 'Required field' })
      return
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify('Enter a valid email address (e.g. you@example.com).', {
        icon: 'error',
        title: 'Invalid email',
      })
      return
    }
    if (!password) {
      notify('Please enter your password.', { icon: 'error', title: 'Required field' })
      return
    }
    if (password.length < 4 || password.length > 64) {
      notify('Password must be between 4 and 64 characters.', {
        icon: 'error',
        title: 'Invalid credentials',
      })
      return
    }

    // ── Sign in ───────────────────────────────────────────────────────────────
    setLoading(true)
    try {
      await signIn(email, password, role)
      notify(`Signed in as ${role.toLowerCase()}.`, {
        icon: 'success',
        title: 'Welcome back',
        timer: 2000,
      })
    } catch (err) {
      notify(err.message || 'Sign-in failed. Check your credentials and try again.', {
        icon: 'error',
        title: 'Sign-in failed',
        timer: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="role-login-page">
      <header className="role-login-header">
        <button className="brand" onClick={() => navigate('Landing')} aria-label="Return to landing">
          <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="brand-logo" />
          <span className="brand-copy"><strong>RMJohn&apos;s</strong><small>EATERY</small></span>
        </button>
        <button className="text-button" onClick={() => navigate('Landing')}>
          ← Back to roles
        </button>
      </header>

      <div className="role-login-content">
        <section className="role-login-intro">
          <span className="role-login-symbol">{copy.icon}</span>
          <span className="eyebrow">{role.toUpperCase()} ACCESS</span>
          <h1>Welcome back.</h1>
          <p>{copy.intro}</p>
          <div className="login-demo-note">
            Sign in with your registered account.
          </div>
        </section>

        <form className="panel role-login-form" onSubmit={submit}>
          <div className="eyebrow">SIGN IN</div>
          <h2>{role} login</h2>

          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="username"
              maxLength="254"
              placeholder={`${role.toLowerCase()}@rmjohns.com`}
              required
              disabled={loading}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              minLength="4"
              maxLength="64"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </label>

          {role === 'Customer' && (
            <div className="login-form-links">
              <button
                type="button"
                className="text-button"
                disabled={loading}
                onClick={() => setDialog({ type: 'account', mode: 'register' })}
              >
                Create an account
              </button>
              <button
                type="button"
                className="text-button"
                disabled={loading}
                onClick={() => setDialog({ type: 'account', mode: 'forgot' })}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button className="button button-dark complete-button" disabled={loading}>
            {loading ? 'Signing in\u2026' : `Sign in as ${role}`} <span>→</span>
          </button>

          <p className="secure-note">
            Credentials are verified against your account.
          </p>
        </form>
      </div>

      <footer className="role-login-footer">RMJOHN&apos;S EATERY · EATERIES SYSTEM</footer>
    </main>
  )
}
