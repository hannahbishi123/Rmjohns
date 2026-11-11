import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useField, useForm, FieldError, fieldClass, rules, compose } from '../lib/validation'

export default function ProfilePage() {
  const { role, notify, logout, setDialog, profile, setProfile, setCheckoutInfo } = useApp()

  // ── Live-validated fields ─────────────────────────────────────
  const name  = useField(profile.name,  rules.name('Full name'))
  const email = useField(profile.email, rules.email)
  const phone = useField(profile.phone || '', rules.phone)
  const form  = useForm({ name, email })   // phone is optional — not in isValid gate

  // Sync to profile changes (e.g. after logout/login)
  useEffect(() => {
    name.setValue(profile.name  || '')
    email.setValue(profile.email || '')
    phone.setValue(profile.phone || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.email, profile.phone])

  function save(e) {
    e.preventDefault()
    form.touchAll()
    // Also touch phone so its error shows if filled incorrectly
    phone.forceTouch()

    if (!form.isValid) return
    if (phone.value && phone.error) return

    const updatedProfile = {
      ...profile,
      name:  name.value.trim(),
      email: email.value.trim().toLowerCase(),
      phone: phone.value.trim(),
    }
    setProfile(updatedProfile)
    setCheckoutInfo((current) => ({ ...current, customer: updatedProfile.name }))
    notify('Profile changes saved locally', { icon: 'success', title: 'Saved' })
  }

  const initials = profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="profile-layout">
      <form className="panel profile-card" onSubmit={save} noValidate>
        <header className="profile-header">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <h2>{name.value || profile.name}</h2>
          <span className="role-chip">{role} · Demo account</span>
          <p>Member since September 2026</p>
          <button
            type="button"
            className="text-button account-signout"
            onClick={(e) => { e.stopPropagation(); logout() }}
          >
            Sign out
          </button>
        </header>

        <section className="profile-details" aria-labelledby="profile-information-heading">
          <div className="panel-heading">
            <div>
              <h2 id="profile-information-heading">Personal information</h2>
              <p>Your account details</p>
            </div>
          </div>

          <div className="profile-fields">
            {/* Full name */}
            <label>
              Full name
              <input
                value={name.value}
                onChange={name.onChange}
                onBlur={name.onBlur}
                className={fieldClass(name)}
                minLength={2}
                maxLength={80}
                placeholder="Your full name"
                required
              />
              <FieldError field={name} label="Full name" />
            </label>

            {/* Email */}
            <label>
              Email address
              <input
                type="email"
                value={email.value}
                onChange={email.onChange}
                onBlur={email.onBlur}
                className={fieldClass(email)}
                maxLength={254}
                placeholder="you@example.com"
                required
              />
              <FieldError field={email} label="Email address" />
            </label>

            {/* Phone — optional */}
            <label>
              Phone number
              <input
                type="tel"
                value={phone.value}
                onChange={phone.onChange}
                onBlur={phone.onBlur}
                className={fieldClass(phone)}
                maxLength={16}
                placeholder="+63 917 555 0142"
              />
              <FieldError field={phone} label="Phone number" />
            </label>

            {/* Role — read only */}
            <label>
              Account role
              <input value={role} readOnly />
            </label>
          </div>

          <button
            className="button button-dark"
            disabled={name.touched && !!name.error || email.touched && !!email.error}
          >
            Save changes
          </button>

          <div className="account-links">
            <button type="button" className="text-button"
              onClick={() => setDialog({ type: 'account', mode: 'register' })}>
              Create customer account
            </button>
            <button type="button" className="text-button"
              onClick={() => setDialog({ type: 'account', mode: 'forgot' })}>
              Forgot password?
            </button>
            <button type="button" className="text-button" onClick={logout}>
              Other role sign-in
            </button>
          </div>

          <p className="secure-note">
            Demo profile · changes exist only in this browser session
          </p>
        </section>
      </form>
    </div>
  )
}
