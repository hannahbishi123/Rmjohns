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
  'Point of Sale': ['Staff', 'Admin'],
  Home: ['Customer'], Cart: ['Customer'], Checkout: ['Customer'],
  'My orders': ['Customer'], Loyalty: ['Admin', 'Customer'],
  Menu: ['Admin', 'Staff', 'Customer'],
  POS: ['Admin', 'Staff'],
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
    POS: role === 'Staff' ? 'Quick and easy ordering.' : 'A faster way to serve the next guest.',
    'Point of Sale': 'Quick and easy ordering.',
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

// ── Admin Sidebar Custom SVG Icons (Reference Design) ─────────────────────────
const adminNavIcons = {
  Overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 3 10.5V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.5L12 3.2Z" />
    </svg>
  ),
  Menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5a2 2 0 0 1 2 2H10a2 2 0 0 1 2-2Z" />
      <path d="M4 15a8 8 0 0 1 16 0H4Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M4 15a8 8 0 0 1 16 0" />
      <line x1="2" y1="18" x2="22" y2="18" />
    </svg>
  ),
  Orders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
      <path d="M2.5 4h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.4-1.1L21.5 7H6" />
    </svg>
  ),
  Sales: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="13" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="6" width="3.5" height="14" rx="1" />
      <rect x="16.5" y="10" width="3.5" height="10" rx="1" />
    </svg>
  ),
  Staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="16.5" cy="9" r="2.5" opacity="0.85" />
      <path d="M3 19c0-3 2.7-5.2 6-5.2s6 2.2 6 5.2H3Z" />
      <path d="M15.5 19c0-2.1-1-3.9-2.5-4.8.9-.3 1.9-.5 3-.5 2.8 0 5 1.8 5 4.3V19h-5.5Z" opacity="0.85" />
    </svg>
  ),
  Loyalty: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.8-4.6 6.6-.9L12 2.5Z" />
    </svg>
  ),
  Settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  Notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z" />
    </svg>
  ),
  Kitchen: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c1.5 3.5 4 5.5 4 9a4 4 0 1 1-8 0c0-3.5 2.5-5.5 4-9Z" />
      <path d="M5 20h14" />
    </svg>
  ),
  POS: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="11" y2="12" />
      <line x1="14" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  ),
  Customers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Monitoring: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  ),
  Reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
}

// Primary ordered Admin navigation matching the reference image + all existing Admin modules
const ADMIN_NAV_ITEMS = [
  { page: 'Overview',      label: 'Dashboard',        hasChevron: false },
  { page: 'Menu',          label: 'Menu Management',  hasChevron: true  },
  { page: 'Orders',        label: 'Order Management', hasChevron: true  },
  { page: 'Sales',         label: 'Sales Reports',    hasChevron: false },
  { page: 'Staff',         label: 'Staff Monitoring', hasChevron: false },
  { page: 'Loyalty',       label: 'Loyalty Program',  hasChevron: false },
  { page: 'Kitchen',       label: 'Kitchen Queue',    hasChevron: false },
  { page: 'POS',           label: 'Point of Sale',    hasChevron: false },
  { page: 'Customers',     label: 'Customers',        hasChevron: false },
  { page: 'Monitoring',    label: 'RFID Attendance',  hasChevron: false },
  { page: 'Reports',       label: 'Analytics',        hasChevron: false },
  { page: 'Settings',      label: 'Settings',         hasChevron: false },
  { page: 'Notifications', label: 'Notifications',    hasChevron: false },
]

// Staff Sidebar Custom SVG Icons (Matching Reference Design)
const staffNavIcons = {
  'Staff Dashboard': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 3 10.5V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.5L12 3.2Z" />
    </svg>
  ),
  Kitchen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 14v6h12v-6" />
      <path d="M4 10.5a3.8 3.8 0 0 1 7.6-1.2A3.8 3.8 0 0 1 19.8 10.5C20.5 11.5 20 12.8 19 14H5c-1-1.2-1.5-2.5-.9-3.5Z" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
  Orders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
      <path d="M2.5 4h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h9.6a1.5 1.5 0 0 0 1.4-1.1L21.5 7H6" />
    </svg>
  ),
  Attendance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  Menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  'Point of Sale': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
    </svg>
  ),
  POS: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
    </svg>
  ),
  Notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

const STAFF_NAV_ITEMS = [
  { page: 'Staff Dashboard', label: 'Staff Dashboard' },
  { page: 'Kitchen',         label: 'Kitchen' },
  { page: 'Orders',          label: 'Orders', badgeType: 'orders' },
  { page: 'Attendance',      label: 'Attendance' },
  { page: 'Menu',            label: 'Menu' },
  { page: 'Point of Sale',   label: 'Point of Sale' },
  { page: 'Notifications',   label: 'Notifications', badgeType: 'notif' },
  { page: 'Profile',         label: 'Profile' },
]

function AdminChefCrest() {
  return (
    <svg className="adm-chef-crest" viewBox="0 0 100 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Chef Hat */}
      <path
        d="M28 42C20 40 16 32 19 24C22 17 30 15 36 18C39 10 46 6 53 7C61 8 66 13 68 18C74 16 82 19 84 26C86 33 81 40 73 42V52H28V42Z"
        stroke="#D4E157"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(212, 225, 87, 0.14)"
      />
      <path d="M28 46H73" stroke="#D4E157" strokeWidth="2.4" />
      <path d="M38 34V42M50 31V42M62 34V42" stroke="#D4E157" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      {/* Crossed Fork & Spoon */}
      <path d="M34 59L68 75" stroke="#F9F9F6" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M68 59L34 75" stroke="#F9F9F6" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="31" cy="57" rx="5" ry="3.5" transform="rotate(25 31 57)" fill="#D4E157" />
      <path d="M66 56L72 53M68 59L74 56M70 62L75 59" stroke="#D4E157" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function AppShell() {
  const {
    role, page, urlRequestedRole, navigate, logout, cartCount, orders,
    dialog, setDialog, menu, setMenu, setCart, setStaff,
    profile, payments, rewards, setRewards, promotions, setPromotions,
    refundOrder, notify, databaseSaveError,
    firebaseAuthReady, notifications = [],
  } = useApp()

  // Start open on wide screens
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  // Escape to collapse
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return
    function onDocClick(e) {
      if (!e.target.closest('.adm-profile-dropdown-wrap') && !e.target.closest('.staff-profile-dropdown-wrap')) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [profileMenuOpen])

  const dialogProps = {
    dialog, onClose: () => setDialog(null),
    menu, payments, setMenu, setStaff, setCart,
    rewards, setRewards, promotions, setPromotions,
    refundOrder, notify,
  }

  const sessionActive = localStorage.getItem('auth_session_active') === 'true'

  // Wait for Firebase Auth / session verification before rendering protected routes
  // or redirecting an active session back to Landing/Login.
  if (!firebaseAuthReady && (sessionActive || !PUBLIC_PAGES.includes(page))) {
    return (
      <main className="database-startup" role="status">
        <img src="/rmjohns-logo.jpg" alt="RMJohn's" className="brand-logo" />
        <h1>Loading RMJohn&apos;s&hellip;</h1>
        <p>Restoring your session.</p>
      </main>
    )
  }

  // Only show Landing or Login when the user is NOT in an active session
  if (!sessionActive) {
    if (page === 'Landing') return <><LandingPage />{dialog && <DialogHost {...dialogProps} />}</>
    return <><LoginPage />{dialog && <DialogHost {...dialogProps} />}</>
  }

  // If an authenticated user is on Landing or Login, render their dashboard home
  const activePage = PUBLIC_PAGES.includes(page) ? (ROLE_HOME[role] || 'Home') : page

  // Role-based route protection: block access if page is not allowed for role
  // OR if the URL explicitly requested another role's namespace (e.g. /customer/* while Admin)
  const allowedRoles = PROTECTED_PAGES[activePage]
  const roleMismatch =
    (allowedRoles && !allowedRoles.includes(role)) ||
    (urlRequestedRole && urlRequestedRole !== role)

  if (roleMismatch) {
    const homePage = ROLE_HOME[role] || 'Login'
    return (
      <>
        <AccessDenied
          role={role}
          requestedPage={urlRequestedRole ? `${urlRequestedRole} — ${activePage}` : activePage}
          onRedirect={() => navigate(homePage)}
        />
        {dialog && <DialogHost {...dialogProps} />}
      </>
    )
  }

  const title = activePage === 'Staff Dashboard'
    ? 'Your shift, at a glance.'
    : ['Overview', 'Home'].includes(activePage)
      ? `Good morning, ${profile.name.split(' ')[0]}`
      : activePage

  const initials = profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const isAdmin = role === 'Admin'
  const isStaff = role === 'Staff'
  const activeOrdersCount = orders.filter((o) => !['Completed', 'Cancelled', 'Delivered'].includes(o.status)).length || orders.length
  const unreadNotifCount = notifications.filter((n) => !n.read).length || (notifications.length > 0 ? notifications.length : 2)
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Maureen'

  return (
    <div className={`app-shell${sidebarOpen ? ' sidebar-is-open' : ' sidebar-is-closed'}${isAdmin ? ' admin-role-shell' : ''}${isStaff ? ' staff-role-shell' : ''}${isAdmin && activePage === 'Overview' ? ' admin-overview-shell' : ''}${isStaff && activePage === 'Staff Dashboard' ? ' staff-dashboard-shell' : ''}`}>

      {/* Overlay — mobile only, tap outside to close */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      {isStaff ? (
        <aside className={`sidebar staff-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} id="sidebar">
          {/* Brand / Logo Block matching Admin and Reference */}
          <div className="adm-sidebar-brand staff-sidebar-brand">
            <button
              type="button"
              className="adm-brand-btn"
              onClick={() => navigate('Staff Dashboard')}
              aria-label="rmjohns Kitchen Staff Dashboard"
            >
              <div className="adm-brand-emblem-row">
                <img src="/rmjohns-logo.jpg" alt="rmjohns logo" className="adm-brand-logo-img" />
                <AdminChefCrest />
              </div>
              <span className="adm-brand-title">rmjohns</span>
              <span className="adm-brand-subtitle">Kitchen</span>
              <span className="adm-brand-flourish" aria-hidden="true">
                <i />
                <span>◆</span>
                <i />
              </span>
            </button>
          </div>

          {/* Staff Navigation */}
          <nav className="staff-side-nav" aria-label="Staff navigation">
            {STAFF_NAV_ITEMS.map(({ page: navPage, label, badgeType }) => {
              const isActive = activePage === navPage
              return (
                <button
                  key={navPage}
                  type="button"
                  className={`staff-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => navigate(navPage)}
                >
                  <span className="staff-nav-icon">
                    {staffNavIcons[navPage] || '◫'}
                  </span>
                  <span className="staff-nav-text">{label}</span>
                  {badgeType === 'orders' && activeOrdersCount > 0 && (
                    <span className={`staff-nav-badge${isActive ? ' on-lime' : ''}`}>
                      {activeOrdersCount}
                    </span>
                  )}
                  {badgeType === 'notif' && unreadNotifCount > 0 && (
                    <span className={`staff-nav-badge${isActive ? ' on-lime' : ''}`}>
                      {unreadNotifCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Spacer */}
          <div className="sidebar-spacer" />

          {/* Staff user profile row */}
          <div
            className="staff-user-card"
            onClick={() => navigate('Profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('Profile')}
            aria-label="Staff profile"
          >
            <span className="staff-user-avatar">{initials || 'S'}</span>
            <span className="staff-user-info">
              <strong className="staff-user-name">{profile.name ? profile.name.toLowerCase() : 'staff'}</strong>
              <small className="staff-user-role">Staff</small>
            </span>
          </div>

          {/* Sign Out Button — full width, prominent Lime Green pill matching reference image */}
          <button
            type="button"
            className="staff-signout-btn"
            onClick={(e) => { e.stopPropagation(); logout() }}
          >
            <span className="staff-signout-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span>Sign Out</span>
          </button>
        </aside>
      ) : isAdmin ? (
        <aside className={`sidebar adm-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} id="sidebar">
          {/* Decorative top-left botanical leaf accent */}
          <svg className="adm-sidebar-leaf-top" viewBox="0 0 120 90" fill="none" aria-hidden="true">
            <path d="M-10 80 C20 55 55 25 95 -10 C55 5 20 25 -10 55 Z" fill="#A3B18A" fillOpacity="0.22" />
            <path d="M-5 45 C25 30 50 15 75 -5 C45 5 15 18 -5 35 Z" fill="#D4E157" fillOpacity="0.18" />
          </svg>

          {/* Brand / Logo Block */}
          <div className="adm-sidebar-brand">
            <button
              type="button"
              className="adm-brand-btn"
              onClick={() => navigate('Overview')}
              aria-label="rmjohns Kitchen Dashboard"
            >
              <div className="adm-brand-emblem-row">
                <img src="/rmjohns-logo.jpg" alt="rmjohns logo" className="adm-brand-logo-img" />
                <AdminChefCrest />
              </div>
              <span className="adm-brand-title">rmjohns</span>
              <span className="adm-brand-subtitle">Kitchen</span>
              <span className="adm-brand-flourish" aria-hidden="true">
                <i />
                <span>◆</span>
                <i />
              </span>
            </button>
          </div>

          {/* Admin Navigation Links */}
          <nav className="adm-side-nav" aria-label="Admin navigation">
            {ADMIN_NAV_ITEMS.map(({ page: navPage, label, hasChevron }) => {
              const isActive = activePage === navPage
              return (
                <button
                  key={navPage}
                  type="button"
                  className={`adm-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => navigate(navPage)}
                >
                  <span className="adm-nav-icon">
                    {adminNavIcons[navPage] || '◫'}
                  </span>
                  <span className="adm-nav-text">{label}</span>
                  {navPage === 'Notifications' && unreadNotifCount > 0 && (
                    <span className="adm-nav-badge">{unreadNotifCount}</span>
                  )}
                  {navPage === 'Orders' && orders.length > 0 && (
                    <span className="adm-nav-count-subtle">{orders.length}</span>
                  )}
                  {hasChevron && (
                    <span className="adm-nav-chevron" aria-hidden="true">›</span>
                  )}
                </button>
              )
            })}

            {/* Logout Item inside navigation flow matching reference image */}
            <button
              type="button"
              className="adm-nav-item adm-nav-logout"
              onClick={(e) => { e.stopPropagation(); logout() }}
            >
              <span className="adm-nav-icon">
                <IconLogout />
              </span>
              <span className="adm-nav-text">Logout</span>
            </button>
          </nav>

          {/* Bottom Script Quote & Botanical Garnish */}
          <div className="adm-sidebar-footer">
            <div className="adm-sidebar-motto" aria-hidden="true">
              <span>Good Food.</span>
              <span>Good Mood.</span>
              <svg className="adm-motto-swish" viewBox="0 0 140 16" fill="none">
                <path d="M12 12 Q70 2 128 10" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <svg className="adm-sidebar-leaf-bottom" viewBox="0 0 160 110" fill="none" aria-hidden="true">
              <path d="M90 115 C105 75 130 45 165 20 C145 55 130 85 115 115 Z" fill="#A3B18A" fillOpacity="0.28" />
              <path d="M60 115 C85 82 115 58 155 40 C125 70 100 95 80 115 Z" fill="#D4E157" fillOpacity="0.2" />
            </svg>
          </div>
        </aside>
      ) : (
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
                className={`nav-item${activePage === label ? ' active' : ''}`}
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
      )}

      {/* ══════════════ MAIN AREA ══════════════ */}
      <main className="main-area">
        {isStaff ? (
          <header className="topbar staff-topbar">
            {/* Hamburger button - removed on Staff subpages and never turns into an X */}
            {!['Orders', 'Attendance', 'Notifications', 'Menu', 'Point of Sale', 'POS'].includes(activePage) && (
              <button
                className="hamburger-btn staff-hamburger-btn"
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-expanded={sidebarOpen}
                aria-controls="sidebar"
              >
                <HamburgerIcon open={false} />
              </button>
            )}

            {/* Live search bar */}
            <div className="staff-search-slot">
              <SearchBar />
            </div>

            {/* Decorative botanical sprig in top header inspired by reference */}
            <div className="staff-topbar-botanical" aria-hidden="true">
              <svg viewBox="0 0 140 44" fill="none" width="130" height="40">
                <path d="M12 36 Q50 18 128 8" stroke="#4A6B49" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M42 22 C34 16 28 8 36 2 C44 2 48 10 42 22 Z" fill="#6E8F5E" fillOpacity="0.85" />
                <path d="M72 17 C68 9 64 2 73 1 C80 2 82 10 72 17 Z" fill="#89A874" fillOpacity="0.85" />
                <path d="M102 12 C98 5 96 -1 104 -2 C111 -1 112 6 102 12 Z" fill="#A3B18A" fillOpacity="0.75" />
                <path d="M54 26 C62 30 68 38 60 42 C53 42 48 35 54 26 Z" fill="#6E8F5E" fillOpacity="0.85" />
                <path d="M86 20 C94 24 100 32 92 36 C85 36 80 29 86 20 Z" fill="#89A874" fillOpacity="0.85" />
              </svg>
            </div>

            <div className="topbar-actions staff-topbar-actions">
              <div className="staff-online-pill">
                <span className="staff-online-dot" />
                <span>Online</span>
              </div>

              {/* Notifications */}
              <button
                type="button"
                className="staff-notif-btn"
                aria-label="Notifications"
                onClick={() => navigate('Notifications')}
              >
                <IconBell />
                {unreadNotifCount > 0 && <span className="staff-notif-badge">{unreadNotifCount}</span>}
              </button>

              {/* Staff Avatar + Profile Dropdown */}
              <div className="staff-profile-dropdown-wrap">
                <button
                  type="button"
                  className="staff-topbar-avatar"
                  aria-label={`Profile — ${profile.name || 'Staff'}`}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                >
                  {initials || 'S'}
                </button>

                {profileMenuOpen && (
                  <div className="adm-profile-menu staff-profile-menu" role="menu">
                    <div className="adm-profile-menu-head staff-profile-menu-head">
                      <div className="staff-profile-menu-user-row">
                        <span className="staff-profile-menu-avatar">{initials || 'S'}</span>
                        <div className="staff-profile-menu-user-meta">
                          <strong>{profile.name || 'Staff'}</strong>
                          <small>{profile.email || 'staff@rmjohns.com'}</small>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        navigate('Profile')
                      }}
                    >
                      <IconUser /> My Profile
                    </button>
                    <div className="adm-profile-menu-sep" />
                    <button
                      type="button"
                      role="menuitem"
                      className="adm-profile-menu-logout"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        logout()
                      }}
                    >
                      <IconLogout /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        ) : isAdmin ? (
          <header className="topbar adm-topbar">
            {/* Hamburger button */}
            <button
              className="hamburger-btn adm-hamburger-btn"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
            >
              <HamburgerIcon open={sidebarOpen} />
            </button>

            {/* Live search bar */}
            <div className="adm-search-slot">
              <SearchBar />
            </div>

            {/* Decorative botanical sprig in top header inspired by reference */}
            <div className="adm-topbar-botanical" aria-hidden="true">
              <svg viewBox="0 0 180 64" fill="none">
                <path d="M110 -4 C90 18 65 36 32 54" stroke="#4A6B49" strokeWidth="2" strokeLinecap="round" />
                <path d="M88 14 C68 8 48 16 38 32 C56 32 74 26 88 14 Z" fill="#6E8F5E" fillOpacity="0.85" />
                <path d="M105 6 C102 24 88 42 68 50 C68 32 82 14 105 6 Z" fill="#89A874" fillOpacity="0.85" />
                <path d="M126 0 C130 18 120 36 102 46 C98 28 108 10 126 0 Z" fill="#A3B18A" fillOpacity="0.75" />
              </svg>
            </div>

            <div className="topbar-actions adm-topbar-actions">
              <ConnectionStatus />

              {/* Notifications Bell with Lime Dot */}
              <button
                type="button"
                className="adm-notif-btn"
                aria-label="Notifications"
                onClick={() => navigate('Notifications')}
              >
                <IconBell />
                {unreadNotifCount > 0 && <span className="adm-notif-dot" />}
              </button>

              <span className="adm-topbar-divider" aria-hidden="true" />

              {/* Logged-in Admin/Manager Profile + Dropdown */}
              <div className="adm-profile-dropdown-wrap">
                <button
                  type="button"
                  className="adm-profile-trigger"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="adm-profile-avatar">
                    <img
                      src="/rmjohns-logo.jpg"
                      alt={profile.name}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <span>{initials}</span>
                  </span>
                  <span className="adm-profile-text">
                    <strong>{firstName}</strong>
                    <small>Manager</small>
                  </span>
                  <svg className={`adm-profile-chevron${profileMenuOpen ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div className="adm-profile-menu" role="menu">
                    <div className="adm-profile-menu-head">
                      <strong>{profile.name}</strong>
                      <small>{profile.email || 'admin@rmjohns.com'}</small>
                    </div>
                    <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('Profile') }}>
                      <IconUser /> My Profile
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('Billing') }}>
                      <span>▧</span> Billing &amp; Receipts
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('Payments') }}>
                      <span>⇄</span> Payment Records
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('Settings') }}>
                      <span>⚙</span> System Settings
                    </button>
                    <div className="adm-profile-menu-sep" />
                    <button type="button" role="menuitem" className="adm-profile-menu-logout" onClick={() => { setProfileMenuOpen(false); logout() }}>
                      <IconLogout /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        ) : (
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
        )}

        {databaseSaveError && (
          <div className="database-save-warning" role="alert">
            Database save failed: {databaseSaveError}. Recent changes are not persistent.
          </div>
        )}

        <div className={`page-content${isAdmin && activePage === 'Overview' ? ' adm-overview-content' : ''}${isStaff && activePage === 'Staff Dashboard' ? ' staff-dashboard-content' : ''}${isStaff && activePage === 'Orders' ? ' staff-orders-content' : ''}${isStaff && activePage === 'Attendance' ? ' staff-attendance-content' : ''}${isStaff && activePage === 'Notifications' ? ' staff-notifications-content' : ''}${isStaff && activePage === 'Menu' ? ' staff-menu-content' : ''}${isStaff && (activePage === 'Point of Sale' || activePage === 'POS') ? ' staff-pos-content' : ''}${isStaff && activePage === 'Profile' ? ' staff-profile-content' : ''}`}>
          {!(isAdmin && activePage === 'Overview') && !(isStaff && (activePage === 'Staff Dashboard' || activePage === 'Orders' || activePage === 'Attendance' || activePage === 'Notifications' || activePage === 'Menu' || activePage === 'Point of Sale' || activePage === 'POS' || activePage === 'Profile')) && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  {role === 'Customer' ? 'RMJOHN\u2019S EATERY' : 'TUESDAY \u00B7 SEPTEMBER 29, 2026'}
                </div>
                <h1>{title}</h1>
                <p className="page-subtitle">{subtitleFor(activePage, role)}</p>
              </div>
              <div className="heading-actions">
                {activePage === 'Overview' && role === 'Admin' && (
                  <button className="button button-outline" onClick={() => navigate('Reports')}>
                    ↧ <span>Export report</span>
                  </button>
                )}
                {['Menu', 'Staff'].includes(activePage) && role === 'Admin' && (
                  <button className="button button-dark"
                    onClick={() => setDialog({ type: 'add', entity: activePage === 'Menu' ? 'menu' : 'staff' })}>
                    ＋ <span>Add {activePage === 'Menu' ? 'item' : 'staff'}</span>
                  </button>
                )}
                {activePage === 'Loyalty' && role === 'Admin' && (
                  <button className="button button-dark" onClick={() => setDialog({ type: 'add-reward' })}>
                    ＋ <span>Add reward</span>
                  </button>
                )}
                {activePage === 'Home' && (
                  <button className="button button-dark" onClick={() => navigate('Menu')}>
                    Browse menu <span>↗</span>
                  </button>
                )}
                {activePage === 'Menu' && role === 'Customer' && (
                  <button className="button button-dark" onClick={() => navigate('Cart')}>
                    Cart <span>({cartCount})</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <RolePage role={role} page={activePage} />
        </div>
      </main>

      {dialog && <DialogHost {...dialogProps} />}
    </div>
  )
}
