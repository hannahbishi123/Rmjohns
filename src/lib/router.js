/**
 * URL Routing & Session Persistence Helpers for RMJohn's Kitchen & Bar (Web System)
 * Maps internal role + page state to clean browser URLs and persists active
 * dashboard state across browser refreshes and direct URL navigation.
 */

export const SESSION_ACTIVE_KEY = 'auth_session_active'
export const SESSION_STATE_KEY  = 'rmjohns_session_state'

export const ROLE_HOME = {
  Admin:    'Overview',
  Staff:    'Staff Dashboard',
  Customer: 'Home',
}

export const PROTECTED_PAGES = {
  Overview:          ['Admin'],
  Sales:             ['Admin'],
  POS:               ['Admin'],
  Customers:         ['Admin'],
  Staff:             ['Admin'],
  Monitoring:        ['Admin'],
  Reports:           ['Admin'],
  Settings:          ['Admin'],
  Billing:           ['Admin'],
  Payments:          ['Admin'],
  Orders:            ['Admin', 'Staff'],
  Kitchen:           ['Admin', 'Staff'],
  'Staff Dashboard': ['Staff'],
  Attendance:        ['Staff'],
  Home:              ['Customer'],
  Cart:              ['Customer'],
  Checkout:          ['Customer'],
  'My orders':       ['Customer'],
  Loyalty:           ['Admin', 'Customer'],
  Menu:              ['Admin', 'Staff', 'Customer'],
  Notifications:     ['Admin', 'Staff', 'Customer'],
  Profile:           ['Admin', 'Staff', 'Customer'],
}

const PAGE_TO_SLUG = {
  Overview:          'dashboard',
  'Staff Dashboard': 'dashboard',
  Home:              'home',
  Menu:              'menu',
  Orders:            'orders',
  Kitchen:           'kitchen',
  POS:               'pos',
  Sales:             'sales',
  Customers:         'customers',
  Staff:             'staff',
  Monitoring:        'monitoring',
  Loyalty:           'loyalty',
  Reports:           'reports',
  Notifications:     'notifications',
  Settings:          'settings',
  Billing:           'billing',
  Payments:          'payments',
  Profile:           'profile',
  Attendance:        'attendance',
  Cart:              'cart',
  Checkout:          'checkout',
  'My orders':       'my-orders',
}

const SLUG_TO_PAGE = {
  overview:          'Overview',
  'staff-dashboard': 'Staff Dashboard',
  home:              'Home',
  menu:              'Menu',
  orders:            'Orders',
  kitchen:           'Kitchen',
  pos:               'POS',
  sales:             'Sales',
  customers:         'Customers',
  staff:             'Staff',
  monitoring:        'Monitoring',
  loyalty:           'Loyalty',
  reports:           'Reports',
  notifications:     'Notifications',
  settings:          'Settings',
  billing:           'Billing',
  payments:          'Payments',
  profile:           'Profile',
  attendance:        'Attendance',
  cart:              'Cart',
  checkout:          'Checkout',
  'my-orders':       'My orders',
}

/**
 * Convert a (page, role) pair into a canonical URL pathname.
 */
export function getPathForPage(page, role) {
  if (!page || page === 'Landing') return '/'
  if (page === 'Login') return '/login'

  const rolePrefix = (role || 'Customer').toLowerCase()
  const slug = PAGE_TO_SLUG[page] || page.toLowerCase().replace(/\s+/g, '-')
  return `/${rolePrefix}/${slug}`
}

/**
 * Parse a browser URL pathname into { requestedRole, requestedPage }.
 * Returns null values when the path is '/' or unrecognized.
 */
export function parsePageFromPath(pathname, fallbackRole = null) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/'
  if (clean === '/') return { requestedRole: null, requestedPage: 'Landing' }
  if (clean === '/login') return { requestedRole: null, requestedPage: 'Login' }

  const parts = clean.split('/').filter(Boolean).map((p) => p.toLowerCase())

  // Format: /:role/:slug (e.g. /admin/dashboard, /staff/kitchen, /customer/cart)
  if (parts.length >= 2 && ['admin', 'staff', 'customer'].includes(parts[0])) {
    const rolePrefix = parts[0]
    const slug = parts[1]
    const matchedRole =
      rolePrefix === 'admin' ? 'Admin' : rolePrefix === 'staff' ? 'Staff' : 'Customer'

    if (slug === 'dashboard') {
      return {
        requestedRole: matchedRole,
        requestedPage: ROLE_HOME[matchedRole],
      }
    }

    const page = SLUG_TO_PAGE[slug]
    if (page) {
      return { requestedRole: matchedRole, requestedPage: page }
    }
  }

  // Format: /:role or /:slug (e.g. /admin, /staff, /customer, /orders, /menu)
  if (parts.length === 1) {
    const single = parts[0]
    if (single === 'admin')    return { requestedRole: 'Admin',    requestedPage: 'Overview' }
    if (single === 'staff')    return { requestedRole: 'Staff',    requestedPage: 'Staff Dashboard' }
    if (single === 'customer') return { requestedRole: 'Customer', requestedPage: 'Home' }
    if (single === 'dashboard') {
      const r = fallbackRole || 'Admin'
      return { requestedRole: r, requestedPage: ROLE_HOME[r] || 'Overview' }
    }
    if (SLUG_TO_PAGE[single]) {
      return { requestedRole: null, requestedPage: SLUG_TO_PAGE[single] }
    }
  }

  return { requestedRole: null, requestedPage: null }
}

/**
 * Check if a given page is permitted for a given role.
 */
export function isPageAllowedForRole(page, role) {
  if (!page || !role) return false
  const allowed = PROTECTED_PAGES[page]
  if (!allowed) return false
  return allowed.includes(role)
}

/**
 * Read persisted session state from localStorage.
 */
export function readPersistedSession() {
  try {
    const active = localStorage.getItem(SESSION_ACTIVE_KEY) === 'true'
    if (!active) return null
    const raw = localStorage.getItem(SESSION_STATE_KEY)
    if (!raw) return { active: true, role: null, page: null, profile: null, authSource: 'firebase' }
    const parsed = JSON.parse(raw)
    return {
      active:     true,
      role:       parsed.role || null,
      page:       parsed.page || null,
      profile:    parsed.profile || null,
      authSource: parsed.authSource || 'firebase',
    }
  } catch {
    return null
  }
}

/**
 * Write active session state (role, current page, profile, authSource) to localStorage.
 */
export function writePersistedSession({ role, page, profile, authSource }) {
  try {
    localStorage.setItem(SESSION_ACTIVE_KEY, 'true')
    const existingRaw = localStorage.getItem(SESSION_STATE_KEY)
    const existing = existingRaw ? JSON.parse(existingRaw) : {}
    const nextState = {
      role:       role       ?? existing.role       ?? 'Customer',
      page:       (page && !['Landing', 'Login'].includes(page)) ? page : (existing.page || ROLE_HOME[role || existing.role || 'Customer']),
      profile:    profile    ?? existing.profile    ?? null,
      authSource: authSource ?? existing.authSource ?? 'firebase',
      updatedAt:  new Date().toISOString(),
    }
    localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(nextState))
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Clear persisted session state on explicit logout or invalid session.
 */
export function clearPersistedSession() {
  try {
    localStorage.removeItem(SESSION_ACTIVE_KEY)
    localStorage.removeItem(SESSION_STATE_KEY)
  } catch {
    // Ignore
  }
}
