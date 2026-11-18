import { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../lib/api'
import { RmjSwal } from '../lib/swal'
import './ForgotPasswordModal.css'

export default function ForgotPasswordModal({ onClose, onSwitchToRegister, notify }) {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [simulated, setSimulated] = useState(false)

  // Resend OTP countdown (45 seconds)
  const [countdown, setCountdown] = useState(0)
  const otpInputRef = useRef(null)

  useEffect(() => {
    let timer = null
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [countdown])

  // Focus OTP input when transitioning to Step 2
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [step])

  // ── Step 1: Request OTP via email ──────────────────────────────────────────
  async function handleSendOtp(e) {
    if (e) e.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setError('Please enter your email address.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      setLoading(true)
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      })

      setSimulated(Boolean(data.simulated))
      setStep(2)
      setCountdown(45)
      if (notify) {
        notify('Verification code has been sent to your email.', {
          icon: 'success',
          title: 'Code Sent',
          timer: 3500,
        })
      }
    } catch (err) {
      setError(err.message || 'Could not send verification code. Please check your email and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault()
    setError('')
    const cleanOtp = otp.trim().replace(/\D/g, '')

    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.')
      return
    }

    try {
      setLoading(true)
      await apiRequest('/api/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      })

      setStep(3)
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Set New Password ──────────────────────────────────────────────
  async function handleResetPassword(e) {
    if (e) e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please retype carefully.')
      return
    }

    try {
      setLoading(true)
      const res = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim().replace(/\D/g, ''),
          newPassword,
        }),
      })

      RmjSwal.fire({
        icon: 'success',
        title: 'Password Reset Complete!',
        text: res.message || 'Your password has been successfully updated. You can now log in with your new credentials.',
        confirmButtonText: 'Back to Login',
      }).then(() => {
        if (onClose) onClose()
      })
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rmj-forgot-modal">
      {/* Header */}
      <div className="rmj-forgot-header">
        <div className="rmj-forgot-icon-badge" aria-hidden="true">
          {step === 1 && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          )}
          {step === 2 && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          )}
          {step === 3 && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          )}
        </div>

        <h2 className="rmj-forgot-title">
          {step === 1 && 'Reset Your Password'}
          {step === 2 && 'Enter Verification Code'}
          {step === 3 && 'Create New Password'}
        </h2>

        <p className="rmj-forgot-subtitle">
          {step === 1 && 'Enter your registered email address and we will send you a 6-digit verification code.'}
          {step === 2 && (
            <>
              We sent a 6-digit OTP code to <strong>{email}</strong>. Enter it below to confirm your identity.
            </>
          )}
          {step === 3 && 'Your identity has been verified. Choose a strong new password to secure your account.'}
        </p>
      </div>

      {/* Progress Pills */}
      <div className="rmj-forgot-steps" aria-label={`Step ${step} of 3`}>
        <div className={`rmj-forgot-step-pill ${step === 1 ? 'is-active' : 'is-done'}`} />
        <div className={`rmj-forgot-step-pill ${step === 2 ? 'is-active' : step > 2 ? 'is-done' : ''}`} />
        <div className={`rmj-forgot-step-pill ${step === 3 ? 'is-active' : ''}`} />
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="rmj-forgot-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Simulation Notice if Gmail SMTP credentials are not yet configured */}
      {simulated && step >= 2 && (
        <div className="rmj-forgot-sim-notice" style={{ marginBottom: '14px' }}>
          <strong>ℹ️ Development Note:</strong> SMTP is currently in development fallback mode. The OTP code is logged directly to the server terminal.
        </div>
      )}

      {/* ── STEP 1: Email Form ────────────────────────────────────────────── */}
      {step === 1 && (
        <form className="rmj-forgot-form" onSubmit={handleSendOtp} noValidate>
          <div className="rmj-forgot-field">
            <label className="rmj-forgot-label" htmlFor="rmj-reset-email">Email Address</label>
            <div className="rmj-forgot-input-wrap">
              <span className="rmj-forgot-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input
                id="rmj-reset-email"
                type="email"
                className="rmj-forgot-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="rmj-forgot-btn-submit"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <span className="rmj-forgot-spinner" />
                Sending verification code...
              </>
            ) : (
              'Send Verification Code →'
            )}
          </button>
        </form>
      )}

      {/* ── STEP 2: OTP Verification Form ─────────────────────────────────── */}
      {step === 2 && (
        <form className="rmj-forgot-form" onSubmit={handleVerifyOtp} noValidate>
          <div className="rmj-forgot-field">
            <label className="rmj-forgot-label" htmlFor="rmj-reset-otp">6-Digit Verification Code</label>
            <input
              ref={otpInputRef}
              id="rmj-reset-otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="rmj-forgot-input rmj-otp-input"
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(val)
              }}
              disabled={loading}
              autoComplete="one-time-code"
            />
          </div>

          <div className="rmj-forgot-resend-row">
            <button
              type="button"
              className="rmj-forgot-link-btn"
              disabled={countdown > 0 || loading}
              onClick={handleSendOtp}
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
            </button>
            <button
              type="button"
              className="rmj-forgot-link-btn"
              onClick={() => {
                setStep(1)
                setOtp('')
                setError('')
              }}
              disabled={loading}
            >
              Change email
            </button>
          </div>

          <button
            type="submit"
            className="rmj-forgot-btn-submit"
            disabled={loading || otp.trim().length !== 6}
          >
            {loading ? (
              <>
                <span className="rmj-forgot-spinner" />
                Verifying code...
              </>
            ) : (
              'Verify Code →'
            )}
          </button>
        </form>
      )}

      {/* ── STEP 3: Set New Password Form ─────────────────────────────────── */}
      {step === 3 && (
        <form className="rmj-forgot-form" onSubmit={handleResetPassword} noValidate>
          <div className="rmj-forgot-field">
            <label className="rmj-forgot-label" htmlFor="rmj-new-password">New Password</label>
            <div className="rmj-forgot-input-wrap">
              <span className="rmj-forgot-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input
                id="rmj-new-password"
                type={showPassword ? 'text' : 'password'}
                className="rmj-forgot-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                disabled={loading}
                required
              />
              <button
                type="button"
                className="rmj-forgot-toggle-pwd"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="rmj-forgot-field">
            <label className="rmj-forgot-label" htmlFor="rmj-confirm-password">Confirm New Password</label>
            <div className="rmj-forgot-input-wrap">
              <span className="rmj-forgot-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </span>
              <input
                id="rmj-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                className="rmj-forgot-input"
                placeholder="Retype your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="rmj-forgot-toggle-pwd"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="rmj-forgot-btn-submit"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? (
              <>
                <span className="rmj-forgot-spinner" />
                Resetting password...
              </>
            ) : (
              'Reset Password & Sign In'
            )}
          </button>
        </form>
      )}

      {/* Footer / Back link */}
      <div className="rmj-forgot-footer">
        Remember your password?
        <button type="button" onClick={onClose}>
          Sign in
        </button>
      </div>
    </div>
  )
}
