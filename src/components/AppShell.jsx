import '../App.css'
import { useState, useEffect } from 'react'
import { navByRole } from '../data/mockData'
import { useApp } from '../context/AppContext'
import DialogHost from './DialogHost'
import ConnectionStatus from './ConnectionStatus'
import SearchBar from './SearchBar'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/login/LoginPage'
import AdminPages from '../pages/admin/AdminPages'
import StaffPages from '../pages/staff/StaffPages'
import CustomerPages from '../pages/customer/CustomerPages'

const PUBLIC_PAGES = ['Landing', 'Login']

const PROTECTED_PAGES = {
  Overview: ['Admin'], Sales: ['Admin'], POS: ['Admin'], Customers: ['Admin'],
  Staff: ['Admin'], Monitoring: ['Admin'], Reports: ['Admin'], Settings: ['Admin'],
  Billing: ['Admin'], Payments: ['Admin'],
  Orders: ['Admin', 'Staff'], Kitchen: ['Admin', 'Staff'],
  'Staff Dashboard': ['Staff'], Attendance: ['Staff'],
  Home: ['Customer'], Cart: ['Customer'], Checkout: ['Customer'],
  'My orders': ['Customer'], Loyalty: ['Customer'],
  Menu: ['Admin', 'Staff', 'Customer'],
  Notifications: ['Admin', 'Staff', 'Customer'],
  Profile: ['Admin', 'Staff', 'Customer'],
}

const ROLE_HOME = { Admin: 'Overview', Staff: 'Staff Dashboard', Customer: 'Home' }

function RolePage({ role, page }) {
  const roleRouters = { Admin: AdminPages, Staff: StaffPages, Customer: CustomerPages }
  const PageRouter = roleRouters[role]
  if (!PageRouter) throw new Error(`Unsupported account role: ${role}`)
  return <PageRouter page={page} />
}

function AccessDenied({ role, requestedPage, onRedirect }) {
  return (
    <main className="database-startup" role="alert" aria-live="assertive">
      <img src="/rmjohns-logo.jpg" alt="RMJohn's" className="brand-logo" />
      <h1>Access Denied</h1>
      <p>
        Your <strong>{role}</strong> account does not have permission to view{' '}
        <strong>{requestedPage}</strong>.
      </p>
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
        You will be redirected to your dashboard.
      </p>
      <button className="button button-dark" style={{ marginTop: '1.5rem' }} onClick={onRedirect}>
        Go to my dashboard →
      </button>
    </main>
  )
}

function subtitleFor(page, role) {
  if (['Overview', 'Staff Dashboard', 'Home'].includes(page))
    return role === 'Customer' ? 'Thoughtful food, made fresh for you.' : 'Here\u2019s what\u2019s happening today.'
  const descriptions = {
    Menu: role === 'Admin' ? 'Manage your menu, pricing and availability.' : 'Made fresh. Pick something lovely.',
    Orders: 'Keep every order moving smoothly.',
    Kitchen: 'Prepare tickets and move orders through the kitchen.',
    POS: 'A faster way to serve the next guest.',
    Sales: 'A closer look at how your business is doing.',
    Monitoring: 'Live attendance overview \u00B7 Demo device mode',
    Loyalty: 'Small gestures. Meaningful rewards.',
    Reports: 'The numbers behind a good day.',
    Notifications: 'The latest system updates.',
    Cart: 'A little something for your table.',
    'My orders': 'Your latest orders, all in one place.',
    Customers: 'Get to know your regulars.',
    Staff: 'Your people make this place.',
    Payments: 'Review payment activity and methods.',
    Billing: 'Receipts and transaction history.',
    Attendance: 'Your shift at a glance.',
    Profile: 'Your account, your details.',
    Settings: 'Manage system preferences.',
    Checkout: 'Review your order before it\u2019s placed.',
  }
  return descriptions[page] || 'Everything you need, in one place.'
}

// ── Hamburger icon — 3 bars animate to X ─────────────────────────────────────
function HamburgerIcon({ open }) {
  return (
    <span className={`hamburger-icon${open ? ' open' : ''}`} aria-hidden="true">
      <span className="hb-line hb-top" />
      <span className="hb-line hb-mid" />
      <span className="hb-line hb-bot" />
    </span>
  )
}

// ── SVG icons used in the sidebar ────────────────────────────────────────────
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function AppShell() {
  const {
    role, page, navigate, logout, cartCount, orders,
    dialog, setDialog, menu, setMenu, setCart, setStaff,
    profile, payments, rewards, setRewards, promotions, setPromotions,
    refundOrder, notify, databaseSaveError,
    firebaseAuthReady,
  } = useApp()

  // Start open on wide screens
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900)

  // Escape to collapse
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setSidebarOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const dialogProps = {
    dialog, onClose: () => setDialog(null),
    menu, payments, setMenu, setStaff, setCart,
    rewards, setRewards, promotions, setPromotions,
    refundOrder, notify,
  }

  if (page === 'Landing') return <><LandingPage />{dialog && <DialogHost {...dialogProps} />}</>

  if (!firebaseAuthReady) {
    return (
      <main className="database-startup" role="status">
        <img src="/rmjohns-logo.jpg" alt="RMJohn's" className="brand-logo" />
        <h1>Loading RMJohn\u2019s\u2026</h1>
        <p>Checking your session.</p>
      </main>
    )
  }

  const sessionActive = localStorage.getItem('auth_session_active') === 'true'
  if (!PUBLIC_PAGES.includes(page) && !sessionActive) {
    return <><LoginPage />{dialog && <DialogHost {...dialogProps} />}</>
  }

  const allowedRoles = PROTECTED_PAGES[page]
  if (allowedRoles && sessionActive && !allowedRoles.includes(role)) {
    const homePage = ROLE_HOME[role] || 'Login'
    return (
      <>
        <AccessDenied role={role} requestedPage={page} onRedirect={() => navigate(homePage)} />
        {dialog && <DialogHost {...dialogProps} />}
      </>
    )
  }

  if (page === 'Login') return <><LoginPage />{dialog && <DialogHost {...dialogProps} />}</>

  const title = page === 'Staff Dashboard'
    ? 'Your shift, at a glance.'
    : ['Overview', 'Home'].includes(page)
      ? `Good morning, ${profile.name.split(' ')[0]}`
      : page

  const initials = profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={`app-shell${sidebarOpen ? ' sidebar-is-open' : ' sidebar-is-closed'}`}>

      {/* Overlay — mobile only, tap outside to close */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} id="sidebar">

        {/* Brand / logo */}
        <div className="sidebar-brand">
          <button
            className="brand"
            onClick={() => navigate(navByRole[role][0][0])}
            aria-label="RMJohn's home"
          >
            <img src="/rmjohns-logo.jpg" alt="RMJohn's" className="brand-logo" />
            <span className="brand-copy">
              <strong>RMJohn&apos;s</strong>
              <small>EATERY</small>
            </span>
          </button>
        </div>

        {/* Nav section label */}
        <div className="nav-label">{role === 'Customer' ? 'YOUR ACCOUNT' : 'OPERATIONS'}</div>

        {/* Navigation */}
        <nav className="side-nav">
          {navByRole[role].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item${page === label ? ' active' : ''}`}
              onClick={() => navigate(label)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label-text">{label}</span>
              {label === 'Cart' && cartCount > 0 && (
                <span className="nav-count">{cartCount}</span>
              )}
              {label === 'Orders' && role === 'Admin' && (
                <span className="nav-count">{orders.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="sidebar-spacer" />

        {/* ── User profile row ── */}
        <div className="sidebar-user" onClick={() => navigate('Profile')} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('Profile')}>
          <span className="avatar">{initials}</span>
          <span className="user-copy">
            <strong>{profile.name}</strong>
            <small>{role}</small>
          </span>
        </div>

        {/* ── SIGN OUT BUTTON — full width, prominent, at bottom ── */}
        <button
          type="button"
          className="sidebar-signout-btn"
          onClick={(e) => { e.stopPropagation(); logout() }}
        >
          <IconLogout />
          <span>Sign out</span>
        </button>

      </aside>

      {/* ══════════════ MAIN AREA ══════════════ */}
      <main className="main-area">
        <header className="topbar">

          {/* Hamburger button */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <HamburgerIcon open={sidebarOpen} />
          </button>

          {/* Welcome text — only on wide screens */}
          <div className="topbar-welcome">
            <span className="topbar-greeting">Welcome back,</span>
            <strong className="topbar-name">{profile.name.split(' ')[0]}</strong>
          </div>

          {/* ── Live search bar ── */}
          <SearchBar />

          <div className="topbar-actions">
            <ConnectionStatus />

            {/* Notifications */}
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => navigate('Notifications')}
            >
              <IconBell />
              <i />
            </button>

            {/* Avatar / profile shortcut */}
            <button
              className="top-avatar"
              aria-label={`Profile — ${profile.name}`}
              onClick={() => navigate('Profile')}
            >
              {initials}
            </button>
          </div>
        </header>

        {databaseSaveError && (
          <div className="database-save-warning" role="alert">
            Database save failed: {databaseSaveError}. Recent changes are not persistent.
          </div>
        )}

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {role === 'Customer' ? 'RMJOHN\u2019S EATERY' : 'TUESDAY \u00B7 SEPTEMBER 29, 2026'}
              </div>
              <h1>{title}</h1>
              <p className="page-subtitle">{subtitleFor(page, role)}</p>
            </div>
            <div className="heading-actions">
              {page === 'Overview' && role === 'Admin' && (
                <button className="button button-outline" onClick={() => navigate('Reports')}>
                  ↧ <span>Export report</span>
                </button>
              )}
              {['Menu', 'Staff'].includes(page) && role === 'Admin' && (
                <button className="button button-dark"
                  onClick={() => setDialog({ type: 'add', entity: page === 'Menu' ? 'menu' : 'staff' })}>
                  ＋ <span>Add {page === 'Menu' ? 'item' : 'staff'}</span>
                </button>
              )}
              {page === 'Loyalty' && role === 'Admin' && (
                <button className="button button-dark" onClick={() => setDialog({ type: 'add-reward' })}>
                  ＋ <span>Add reward</span>
                </button>
              )}
              {page === 'Home' && (
                <button className="button button-dark" onClick={() => navigate('Menu')}>
                  Browse menu <span>↗</span>
                </button>
              )}
              {page === 'Menu' && role === 'Customer' && (
                <button className="button button-dark" onClick={() => navigate('Cart')}>
                  Cart <span>({cartCount})</span>
                </button>
              )}
            </div>
          </div>
          <RolePage role={role} page={page} />
        </div>
      </main>

      {dialog && <DialogHost {...dialogProps} />}
    </div>
  )
}
