import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '../context/AppContext'
import './ProfilePage.css'

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} \u00B7 ${monthDayYear}`
}

export default function ProfilePage() {
  const { profile = {}, setProfile, role = 'Admin', notify } = useApp()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Split profile.name into First, Middle, Last if not explicitly provided
  const parseNamesFromProfile = (prof) => {
    let fn = prof.firstName || ''
    let mn = prof.middleName || ''
    let ln = prof.lastName || ''

    if (!fn && prof.name) {
      const parts = prof.name.trim().split(/\s+/)
      if (parts.length === 1) {
        fn = parts[0]
      } else if (parts.length === 2) {
        fn = parts[0]
        ln = parts[1]
      } else if (parts.length >= 3) {
        fn = parts[0]
        mn = parts.slice(1, -1).join(' ')
        ln = parts[parts.length - 1]
      }
    }

    return {
      firstName: fn || 'Admin',
      middleName: mn || 'Demo',
      lastName: ln || 'Account',
      email: prof.email || 'admin@rmjohns.com',
      phone: prof.phone || '+63 917 555 0101',
      role: role || 'Admin',
    }
  }

  const [formData, setFormData] = useState(() => parseNamesFromProfile(profile))

  // Synchronize when profile updates from backend or bootstrap
  useEffect(() => {
    setFormData(parseNamesFromProfile(profile))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.firstName, profile.middleName, profile.lastName, profile.email, profile.phone, role])

  const dynamicDate = formatDynamicHeaderDate()

  const handleEditToggle = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(parseNamesFromProfile(profile))
    setIsEditing(false)
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()

    const cleanFirst = formData.firstName.trim()
    const cleanMiddle = formData.middleName.trim()
    const cleanLast = formData.lastName.trim()
    const cleanPhone = formData.phone.trim()

    if (!cleanFirst) {
      Swal.fire({
        icon: 'error',
        title: 'First Name Required',
        text: 'Please enter a valid First Name.',
        confirmButtonColor: '#1B3B2B',
        background: '#F9F9F6',
        color: '#1B3B2B',
      })
      return
    }

    if (!cleanLast) {
      Swal.fire({
        icon: 'error',
        title: 'Last Name Required',
        text: 'Please enter a valid Last Name.',
        confirmButtonColor: '#1B3B2B',
        background: '#F9F9F6',
        color: '#1B3B2B',
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: cleanFirst,
          middleName: cleanMiddle,
          lastName: cleanLast,
          phone: cleanPhone,
          email: formData.email,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update profile.')
      }

      const updatedProfile = {
        ...profile,
        ...(data.profile || {}),
        firstName: cleanFirst,
        middleName: cleanMiddle,
        lastName: cleanLast,
        name: [cleanFirst, cleanMiddle, cleanLast].filter(Boolean).join(' '),
        phone: cleanPhone,
      }

      setProfile(updatedProfile)
      setIsEditing(false)

      Swal.fire({
        position: 'center',
        icon: 'success',
        title: 'Profile Updated',
        text: 'Your profile changes have been saved successfully.',
        confirmButtonColor: '#1B3B2B',
        confirmButtonText: 'Done',
        background: '#F9F9F6',
        color: '#1B3B2B',
        customClass: {
          popup: 'rmj-swal-popup',
          confirmButton: 'rmj-swal-confirm-btn',
        },
      })
    } catch (err) {
      console.error('[Profile] Save failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Unable to save profile changes. Please try again.',
        confirmButtonColor: '#1B3B2B',
        background: '#F9F9F6',
        color: '#1B3B2B',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="adm-profile-container">
      {/* ══════════════ 1. TOP HERO BANNER ══════════════ */}
      <header className="adm-profile-banner">
        {/* Decorative curved waves art */}
        <svg
          className="adm-profile-banner-art"
          viewBox="0 0 960 155"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M520 0 C610 40 675 98 595 155 L960 155 L960 0 Z"
            fill="#2B603A"
            fillOpacity="0.45"
          />
          <path
            d="M645 0 C565 48 520 105 475 155 L960 155 L960 0 Z"
            fill="#13311F"
            fillOpacity="0.58"
          />
          <path
            d="M695 -10 C625 42 585 102 555 155 L745 155 C760 98 795 42 855 -10 Z"
            fill="#A3C644"
            fillOpacity="0.24"
          />
        </svg>

        {/* Botanical leaves accent on the right */}
        <svg
          className="adm-profile-banner-leaves"
          viewBox="0 0 200 130"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 110 C60 70 120 45 190 20"
            stroke="#D4E157"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M90 70 C70 50 65 25 80 10 C95 25 110 50 90 70 Z"
            fill="#C2D66D"
            fillOpacity="0.75"
          />
          <path
            d="M130 50 C120 30 125 10 145 0 C155 18 150 38 130 50 Z"
            fill="#A3B18A"
            fillOpacity="0.85"
          />
          <path
            d="M170 30 C165 15 175 0 195 -5 C198 12 190 25 170 30 Z"
            fill="#D4E157"
            fillOpacity="0.9"
          />
        </svg>

        <div className="adm-profile-banner-left">
          <span className="adm-profile-date">{dynamicDate}</span>
          <h1>Profile</h1>
          <p>Your account, your details.</p>
          <span className="adm-profile-banner-accent-bar" aria-hidden="true" />
        </div>
      </header>

      {/* ══════════════ 2. MAIN PROFILE CARD ══════════════ */}
      <div className="adm-profile-card">
        {/* Botanical Leaf Watermark: Top-Left */}
        <svg
          className="adm-profile-card-decor-tl"
          viewBox="0 0 160 140"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 40 C35 25 70 30 95 60 C80 85 45 80 0 40 Z"
            fill="#A3B18A"
            fillOpacity="0.32"
          />
          <path
            d="M10 85 C45 75 75 90 90 125 C65 135 35 120 10 85 Z"
            fill="#89A874"
            fillOpacity="0.25"
          />
          <path
            d="M15 10 C40 5 65 20 75 48 C55 60 30 45 15 10 Z"
            fill="#C2D66D"
            fillOpacity="0.28"
          />
          <path
            d="M0 0 C45 35 75 75 110 130"
            stroke="#6E8F5E"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>

        {/* Botanical Leaf Watermark: Bottom-Right */}
        <svg
          className="adm-profile-card-decor-br"
          viewBox="0 0 170 150"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M170 110 C135 125 100 120 75 90 C90 65 125 70 170 110 Z"
            fill="#A3B18A"
            fillOpacity="0.32"
          />
          <path
            d="M160 65 C125 75 95 60 80 25 C105 15 135 30 160 65 Z"
            fill="#89A874"
            fillOpacity="0.25"
          />
          <path
            d="M155 140 C130 145 105 130 95 102 C115 90 140 105 155 140 Z"
            fill="#C2D66D"
            fillOpacity="0.28"
          />
          <path
            d="M170 150 C125 115 95 75 60 20"
            stroke="#6E8F5E"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>

        {/* Top-Right Action Controls */}
        <div className="adm-profile-top-actions">
          {!isEditing ? (
            <button
              type="button"
              className="adm-profile-edit-btn"
              onClick={handleEditToggle}
              aria-label="Edit Profile"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="adm-profile-cancel-btn"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-profile-save-btn"
                onClick={handleSave}
                disabled={isSaving}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>

        {/* Centered Avatar and Admin Username */}
        <div className="adm-profile-avatar-wrap">
          <div className="adm-profile-avatar-outer-ring" aria-hidden="true">
            <div className="adm-profile-avatar-inner-circle">
              {/* White Chef's Hat Vector matching reference */}
              <svg
                viewBox="0 0 100 84"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M26 44C17 42 13 33 16 25C19 17 28 15 34 18C37 9 45 5 52 6C61 7 66 12 68 18C74 15 83 18 85 26C87 34 81 42 74 44V54H26V44Z"
                  fill="#FFFFFF"
                />
                <path
                  d="M26 47H74"
                  stroke="#1B3B2B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M37 34V43M50 31V43M63 34V43"
                  stroke="#1B3B2B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M29 54H71"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <h2 className="adm-profile-username">admin</h2>
        </div>

        {/* ══════════════ 3. PERSONAL INFORMATION SECTION ══════════════ */}
        <section className="adm-profile-section" aria-labelledby="personal-info-heading">
          <div className="adm-profile-sec-header">
            <div className="adm-profile-sec-icon" aria-hidden="true">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <div className="adm-profile-sec-titles">
              <h2 id="personal-info-heading">Personal Information</h2>
              <p>Your account details.</p>
            </div>
          </div>

          <form className="adm-profile-form" onSubmit={handleSave} noValidate>
            {/* ROW 1: First Name, Middle Name, Last Name */}
            <div className="adm-profile-grid-3">
              {/* First Name */}
              <div className="adm-profile-field-group">
                <label htmlFor="adm-first-name">First Name</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-first-name"
                    type="text"
                    className={`adm-profile-input ${isEditing ? 'is-editable' : 'is-readonly'}`}
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="First Name"
                    required
                  />
                  {!isEditing && (
                    <span className="adm-profile-lock-icon" title="Read only" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Name */}
              <div className="adm-profile-field-group">
                <label htmlFor="adm-middle-name">Middle Name</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-middle-name"
                    type="text"
                    className={`adm-profile-input ${isEditing ? 'is-editable' : 'is-readonly'}`}
                    value={formData.middleName}
                    onChange={(e) => handleFieldChange('middleName', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="Middle Name"
                  />
                  {!isEditing && (
                    <span className="adm-profile-lock-icon" title="Read only" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              {/* Last Name */}
              <div className="adm-profile-field-group">
                <label htmlFor="adm-last-name">Last Name</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-last-name"
                    type="text"
                    className={`adm-profile-input ${isEditing ? 'is-editable' : 'is-readonly'}`}
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="Last Name"
                    required
                  />
                  {!isEditing && (
                    <span className="adm-profile-lock-icon" title="Read only" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 2: Email Address, Phone Number */}
            <div className="adm-profile-grid-2">
              {/* Email Address — Always Read-Only */}
              <div className="adm-profile-field-group">
                <label htmlFor="adm-email-address">Email Address</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-email-address"
                    type="email"
                    className="adm-profile-input is-readonly"
                    value={formData.email}
                    readOnly
                    placeholder="admin@rmjohns.com"
                  />
                  <span className="adm-profile-lock-icon" title="Email address cannot be changed" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Phone Number */}
              <div className="adm-profile-field-group">
                <label htmlFor="adm-phone-number">Phone Number</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-phone-number"
                    type="tel"
                    className={`adm-profile-input ${isEditing ? 'is-editable' : 'is-readonly'}`}
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    readOnly={!isEditing}
                    placeholder="+63 917 555 0101"
                  />
                  {!isEditing && (
                    <span className="adm-profile-lock-icon" title="Read only" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 3: Account Role — Always Read-Only */}
            <div className="adm-profile-grid-1">
              <div className="adm-profile-field-group">
                <label htmlFor="adm-account-role">Account Role</label>
                <div className="adm-profile-input-wrap">
                  <input
                    id="adm-account-role"
                    type="text"
                    className="adm-profile-input is-readonly"
                    value={formData.role}
                    readOnly
                  />
                  <span className="adm-profile-lock-icon" title="Role assigned by system" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions if in editing mode */}
            {isEditing && (
              <div className="adm-profile-bottom-actions">
                <button
                  type="button"
                  className="adm-profile-cancel-btn"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-profile-save-btn"
                  disabled={isSaving}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
