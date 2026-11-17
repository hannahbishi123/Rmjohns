import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '../context/AppContext'
import './StaffProfilePage.css'

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

export default function StaffProfilePage() {
  const { profile = {}, setProfile, notify } = useApp()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: profile.name || 'staff',
    email: profile.email || 'staff@rmjohns.com',
    phone: profile.phone || '+63 917 555 0102',
    role: 'Staff',
  })

  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Keep form data in sync if profile updates externally
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: profile.name || 'staff',
      email: profile.email || 'staff@rmjohns.com',
      phone: profile.phone || '+63 917 555 0102',
      role: 'Staff',
    }))
  }, [profile.name, profile.email, profile.phone])

  // Hide generic AppShell page-heading while on Staff Profile
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('staff-profile-content')
    return () => {
      if (container) container.classList.remove('staff-profile-content')
    }
  }, [])

  function handleRefresh() {
    setFormData({
      name: profile.name || 'staff',
      email: profile.email || 'staff@rmjohns.com',
      phone: profile.phone || '+63 917 555 0102',
      role: 'Staff',
    })
    setIsEditing(false)
    notify?.('Profile details refreshed from system', { icon: 'success', title: 'Refreshed' })
  }

  function handleEditToggle() {
    setIsEditing((prev) => !prev)
  }

  function handleCancel() {
    setFormData({
      name: profile.name || 'staff',
      email: profile.email || 'staff@rmjohns.com',
      phone: profile.phone || '+63 917 555 0102',
      role: 'Staff',
    })
    setIsEditing(false)
  }

  function handleSave(e) {
    if (e) e.preventDefault()

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      Swal.fire({
        icon: 'warning',
        title: 'Full Name Required',
        text: 'Please provide a valid full name before saving.',
        confirmButtonColor: '#1B3B2B',
        background: '#F9F9F6',
        color: '#1B3B2B',
      })
      return
    }

    const updatedProfile = {
      ...profile,
      name: trimmedName,
      phone: formData.phone.trim(),
    }

    // Persist to context (which automatically pushes to MySQL snapshot and Firebase)
    setProfile(updatedProfile)
    setIsEditing(false)

    // SweetAlert Centered Notification
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
  }

  const initialLetter = (formData.name || profile.name || 'S')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div className="staff-profile-mgmt">
      {/* ══════════════ 1. TOP KITCHEN-STYLE HERO BANNER ══════════════ */}
      <header className="staff-profile-banner">
        {/* Decorative curved waves art */}
        <svg
          className="staff-profile-banner-art"
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

        {/* Decorative botanical leaves cluster */}
        <svg
          className="staff-profile-banner-leaves"
          viewBox="0 0 220 130"
          fill="none"
          aria-hidden="true"
        >
          <path d="M110 128 C118 82 146 46 186 22 C178 70 152 108 110 128 Z" fill="#5D9E31" />
          <path d="M114 124 Q148 72 182 26" stroke="#B7E048" strokeWidth="2" strokeLinecap="round" />
          <path d="M68 132 C80 92 112 64 156 54 C136 96 104 122 68 132 Z" fill="#77B83F" />
          <path d="M72 128 Q112 90 152 56" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M36 128 C52 106 78 92 108 92 C90 116 64 128 36 128 Z" fill="#498425" />
        </svg>

        <div className="staff-profile-banner-left">
          <span className="staff-profile-date">{dynamicDate}</span>
          <h1>My Profile</h1>
          <p>Your account, your details.</p>
        </div>

        <button
          type="button"
          className="staff-profile-banner-refresh-btn"
          onClick={handleRefresh}
          aria-label="Refresh profile details"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Refresh</span>
        </button>
      </header>

      {/* ══════════════ 2. PROFILE INFORMATION CARD ══════════════ */}
      <section className="staff-profile-card" aria-label="Staff Profile Information">
        {/* Profile Header Block */}
        <div className="staff-profile-header">
          <div className="staff-profile-avatar-circle" aria-hidden="true">
            {initialLetter}
          </div>
          <div className="staff-profile-meta">
            <h2 className="staff-profile-name">{formData.name || profile.name || 'staff'}</h2>
            <div className="staff-profile-badge">
              <span className="staff-profile-badge-dot" aria-hidden="true" />
              <span>Staff Account</span>
            </div>
            <span className="staff-profile-since">Member since September 2026</span>
          </div>
        </div>

        <div className="staff-profile-divider" aria-hidden="true" />

        {/* Personal Information Section Header */}
        <div className="staff-profile-section-header">
          <div className="staff-profile-section-title-wrap">
            <svg
              className="staff-profile-sprig-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22v-8" />
              <path d="M9 14c-3-3-4-8 0-11 5 0 8 4 6 9" />
              <path d="M15 14c3-3 4-8 0-11-5 0-8 4-6 9" />
            </svg>
            <div>
              <h2>Personal Information</h2>
              <p>Manage your account details.</p>
            </div>
          </div>

          <div className="staff-profile-actions-header">
            {isEditing && (
              <button
                type="button"
                className="staff-profile-cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="staff-profile-edit-btn"
              onClick={handleEditToggle}
              aria-label={isEditing ? 'Cancel editing' : 'Edit personal information'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{isEditing ? 'Editing' : 'Edit'}</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} noValidate>
          {/* Two-Column Information Grid */}
          <div className="staff-profile-grid">
            {/* 1. Full Name */}
            <div className="staff-profile-field-group">
              <label htmlFor="staff-full-name">Full Name</label>
              <div className={`staff-profile-input-wrap${isEditing ? ' is-editing' : ' readonly-field'}`}>
                <svg
                  className="staff-profile-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="staff-full-name"
                  type="text"
                  className="staff-profile-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your full name"
                  maxLength={80}
                  required
                />
              </div>
            </div>

            {/* 2. Email Address (read-only) */}
            <div className="staff-profile-field-group">
              <label htmlFor="staff-email-addr">Email Address</label>
              <div className="staff-profile-input-wrap readonly-field">
                <svg
                  className="staff-profile-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="staff-email-addr"
                  type="email"
                  className="staff-profile-input"
                  value={formData.email}
                  readOnly
                  disabled
                  title="Email cannot be changed directly"
                />
              </div>
            </div>

            {/* 3. Phone Number */}
            <div className="staff-profile-field-group">
              <label htmlFor="staff-phone-num">Phone Number</label>
              <div className={`staff-profile-input-wrap${isEditing ? ' is-editing' : ' readonly-field'}`}>
                <svg
                  className="staff-profile-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  id="staff-phone-num"
                  type="tel"
                  className="staff-profile-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="+63 917 555 0102"
                  maxLength={20}
                />
              </div>
            </div>

            {/* 4. Account Role (read-only soft green tint) */}
            <div className="staff-profile-field-group">
              <label htmlFor="staff-role-badge">Account Role</label>
              <div className="staff-profile-input-wrap role-field">
                <svg
                  className="staff-profile-input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span id="staff-role-badge" className="staff-profile-role-text">
                  Staff
                </span>
              </div>
            </div>
          </div>

          {/* Centered Save Changes Button */}
          <div className="staff-profile-submit-row">
            <button
              type="submit"
              className="staff-profile-save-btn"
              disabled={isEditing ? !formData.name.trim() : false}
              onClick={!isEditing ? handleEditToggle : undefined}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>Save Changes</span>
            </button>
            {isEditing && (
              <button
                type="button"
                className="staff-profile-bottom-cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
