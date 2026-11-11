import Swal from 'sweetalert2'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { initialCustomers, initialMenu, initialOrders, initialPayments, initialPromotions, initialRewards, initialStaff } from '../data/mockData'
import { apiRequest } from '../lib/api'
import { firebaseSignIn, firebaseSignOut, firebaseRegister, onAuthChange, firebaseListen, firebaseListenConnection, firebaseGet, firebaseUpdate, auth } from '../lib/firebase'

const AppContext = createContext(null)
const initialPreferences = { orders: true, attendance: true, loyalty: false, receipts: true }

export function AppProvider({ children }) {
  const initialRole = 'Customer'
  const roleLandingPage = { Admin: 'Overview', Staff: 'Staff Dashboard', Customer: 'Home' }
  const [role, setRole] = useState(initialRole)
  const [page, setPage] = useState('Landing')
  const [menu, setMenu] = useState(initialMenu)
  const [orders, setOrders] = useState(initialOrders)
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [dialog, setDialog] = useState(null)
  const [points, setPoints] = useState(120)
  const [loyaltyHistory, setLoyaltyHistory] = useState([
    { id: 1, date: 'Today', detail: 'Lunch order · VK-2841', delta: 7 },
    { id: 2, date: 'Sep 26', detail: 'Dinner with friends', delta: 12 },
    { id: 3, date: 'Sep 22', detail: 'Calamansi spritz reward', delta: -80 },
  ])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [orderFilter, setOrderFilter] = useState('All')
  const [staff, setStaff] = useState(initialStaff)
  const [deviceConnected, setDeviceConnected] = useState(true)
  const [scanEvents, setScanEvents] = useState([{ id: 1, name: 'Ava Mendoza', staffId: 'ST-014', time: '10:42 AM', action: 'Time in' }])
  const [scanSequence, setScanSequence] = useState(0)
  const [customers, setCustomers] = useState(initialCustomers)
  const [customerAccounts, setCustomerAccounts] = useState([])
  const [payments, setPayments] = useState(initialPayments)
  const [rewards, setRewards] = useState(initialRewards)
  const [promotions, setPromotions] = useState(initialPromotions)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New order received', detail: 'Online order VK-2841 from Mia Santos is preparing.', time: '10:42 AM', read: false },
    { id: 2, title: 'Attendance recorded', detail: 'Ava Mendoza checked in using the demo RFID reader.', time: '10:18 AM', read: false },
    { id: 3, title: 'Low availability', detail: 'Ube panna cotta is running low. 4 portions remain.', time: 'Yesterday', read: false },
  ])
  const [checkoutInfo, setCheckoutInfo] = useState({ customer: 'Maureen Santos', orderType: 'Pickup', pickupLocation: 'RM John’s Eatery • Main Branch', notes: '' })
  const [reservation, setReservation] = useState(null)
  const [profile, setProfile] = useState({ name: 'Maureen Santos', email: 'maureen.santos@email.com', phone: '+63 917 555 0142' })
  const [databaseReady, setDatabaseReady] = useState(false)
  const [databaseError, setDatabaseError] = useState('')
  const [databaseSaveError, setDatabaseSaveError] = useState('')
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false)
  const [firebaseConnected, setFirebaseConnected] = useState(false)
  const saveQueue = useRef(Promise.resolve())
  const saveErrorShown = useRef(false)

  useEffect(() => {
    let active = true

    // ── Bootstrap: try MySQL backend first, fall back to Firebase ─────────────
    // On Firebase Hosting the backend isn't available, so we fall back to
    // reading the live snapshot that was last synced from XAMPP.
    async function bootstrap() {
      // 1. Try the MySQL-backed API
      try {
        const data = await apiRequest('/api/bootstrap')
        // Guard: if the response is missing required arrays (e.g. backend returned
        // an unexpected shape), treat it as a failure and fall through to Firebase.
        if (!Array.isArray(data.menu) || !Array.isArray(data.orders)) {
          throw new Error('Bootstrap response missing required data arrays.')
        }
        if (!active) return
        setMenu(data.menu)
        setOrders(data.orders)
        setCustomers(data.customers || [])
        setStaff(data.staff || [])
        setPayments(data.payments || [])
        setRewards(data.rewards || [])
        setPromotions(data.promotions || [])
        setPreferences(data.preferences || initialPreferences)
        setLoyaltyHistory(data.loyaltyHistory || [])
        setNotifications(data.notifications || [])
        setScanEvents(data.scanEvents || [])
        setProfile(data.profile || { name: 'Maureen Santos', email: 'maureen.santos@email.com', phone: '' })
        setPoints(data.points ?? 0)
        setReservation(data.reservation ?? null)
        setCustomerAccounts(data.customerAccounts || [])
        setDatabaseError('')
        setDatabaseReady(true)
        return
      } catch (apiError) {
        // API unreachable (404, HTML response, network error, etc.) — try Firebase fallback
        console.warn('[bootstrap] MySQL API unavailable:', apiError.message, '— trying Firebase…')
      }

      // 2. Fall back to Firebase Realtime Database (live cloud data)
      try {
        // Only read paths that are publicly readable without auth.
        // Auth-protected paths (orders, customers, staff, etc.) are loaded
        // after the user signs in via the live Firebase listeners.
        const [fbMenu, fbRewards, fbPromotions, fbProfile, fbPoints] = await Promise.all([
          firebaseGet('eateries/menu_items'),
          firebaseGet('eateries/rewards'),
          firebaseGet('eateries/promotions'),
          firebaseGet('eateries/profile'),
          firebaseGet('eateries/points'),
        ])

        const toArr = (obj) => obj && typeof obj === 'object' ? Object.values(obj) : []

        if (!active) return

        if (fbMenu)       setMenu(toArr(fbMenu).map(item => ({ ...item, available: Boolean(item.available) })))
        if (fbRewards)    setRewards(toArr(fbRewards).map(r => ({ ...r, available: Boolean(r.available) })))
        if (fbPromotions) setPromotions(toArr(fbPromotions))
        if (fbProfile)    setProfile(fbProfile)
        if (fbPoints != null) setPoints(Number(fbPoints))

        setDatabaseError('')
        setDatabaseReady(true)
        console.log('[bootstrap] Loaded public data from Firebase. Auth-protected data will load after sign-in.')
      } catch (fbError) {
        // Firebase read failed — still proceed with built-in mock data
        console.error('[bootstrap] Firebase fallback failed:', fbError.message, '— using built-in demo data')
        if (active) {
          setDatabaseError('')
          setDatabaseReady(true)
        }
      }
    }

    bootstrap()
    return () => { active = false }
  }, [])

  // ── Firebase Auth session restore ─────────────────────────────────────────
  // SECURITY: Only restore a session if the user explicitly signed in during
  // THIS browser session (tracked via localStorage flag 'auth_session_active').
  // This prevents auto-login when:
  //   - Opening a new tab
  //   - Opening a new browser window
  //   - Typing the URL directly
  //   - Refreshing after logging out
  // The flag is set by signIn() and cleared by logout().
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseAuthReady(true)

      if (!user) return // No Firebase session at all — stay on Landing/Login

      // Only restore session if the user explicitly signed in this session
      const sessionActive = localStorage.getItem('auth_session_active') === 'true'
      if (!sessionActive) {
        // Firebase has a remembered token but the user hasn't signed in during
        // this browser session. Sign them out of Firebase silently so they see
        // the login page. This enforces: every new visit = must log in.
        await firebaseSignOut().catch(() => {})
        return
      }

      try {
        const idToken = await user.getIdToken(/* forceRefresh */ true)

        // ── Try MySQL-backed verify first ─────────────────────────────────────
        let role = null
        try {
          const { account } = await apiRequest('/api/auth/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          })
          role = account.role
        } catch {
          // Backend unavailable — read role from Firebase Realtime DB (source of truth)
          try {
            const dbRecord = await firebaseGet(`eateries/user_accounts/${user.uid}`)
            if (dbRecord?.role) role = dbRecord.role
          } catch { /* ignore */ }

          // Second fallback: JWT custom claim
          if (!role) {
            try {
              const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
              role = payload.role || null
            } catch { /* ignore */ }
          }

          // Last resort: only for the three well-known seed accounts
          if (!role) {
            const email = (user.email || '').toLowerCase()
            if (email === 'admin@rmjohns.com') role = 'Admin'
            else if (email === 'staff@rmjohns.com') role = 'Staff'
            else role = 'Customer'
          }
        }

        if (!role || !['Admin', 'Staff', 'Customer'].includes(role)) {
          firebaseSignOut().catch(() => {})
          localStorage.removeItem('auth_session_active')
          return
        }

        setRole(role)
        setPage((currentPage) => {
          if (['Landing', 'Login'].includes(currentPage)) {
            return roleLandingPage[role] || currentPage
          }
          return currentPage
        })

        // ── Update profile with the real user's name from the DB record ───────
        // This ensures the greeting shows the actual user name, not the default.
        try {
          const userRecord = await firebaseGet(`eateries/user_accounts/${user.uid}`)
          const resolvedName = userRecord?.name || user.displayName || (user.email || '').split('@')[0]
          setProfile((current) => ({
            ...current,
            name:  resolvedName,
            email: user.email || current.email,
            phone: userRecord?.phone || current.phone || '',
          }))
          setCheckoutInfo((current) => ({ ...current, customer: resolvedName }))
        } catch { /* non-critical — keep existing profile */ }

        // ── Load auth-protected Firebase data now that we have a valid user ──
        // These reads were skipped during bootstrap because they require auth.
        try {
          const toArr = (obj) => obj && typeof obj === 'object' ? Object.values(obj) : []
          const [fbOrders, fbCustomers, fbStaff, fbPayments, fbNotifications, fbLoyalty, fbAttendance] = await Promise.all([
            firebaseGet('eateries/orders'),
            firebaseGet('eateries/customers'),
            firebaseGet('eateries/staff'),
            firebaseGet('eateries/payments'),
            firebaseGet('eateries/notifications'),
            firebaseGet('eateries/loyalty_transactions'),
            firebaseGet('eateries/attendance_events'),
          ])
          if (fbOrders)       setOrders(toArr(fbOrders))
          if (fbCustomers)    setCustomers(toArr(fbCustomers))
          if (fbStaff)        setStaff(toArr(fbStaff))
          if (fbPayments)     setPayments(toArr(fbPayments))
          if (fbNotifications) setNotifications(toArr(fbNotifications).map(n => ({ ...n, read: Boolean(n.isRead ?? n.read) })))
          if (fbLoyalty)      setLoyaltyHistory(toArr(fbLoyalty))
          if (fbAttendance)   setScanEvents(toArr(fbAttendance).map(e => ({ id: e.id ?? e.event_id, name: e.staff_name ?? e.name, staffId: e.staff_id ?? e.staffId, time: e.event_time ?? e.time, action: e.action })))
        } catch {
          // Non-critical — demo data is already loaded from bootstrap
        }
      } catch {
        // Token invalid or account not found — sign out silently
        firebaseSignOut().catch(() => {})
        localStorage.removeItem('auth_session_active')
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Firebase connection state listener ────────────────────────────────────
  // Tracks whether the browser has a live Firebase Realtime DB connection.
  useEffect(() => {
    const unsub = firebaseListenConnection((connected) => {
      setFirebaseConnected(connected)
    })
    return unsub
  }, [])

  // ── Live Firebase orders listener ──────────────────────────────────────────
  // When Firebase is available, merge any order status updates that arrive
  // from other clients (e.g. kitchen marking an order as Ready) into local state.
  // We deliberately do NOT replace the full orders array — only status changes
  // are merged so that locally-pending unsaved orders are not clobbered.
  useEffect(() => {
    if (!firebaseConnected) return undefined
    const unsub = firebaseListen('eateries/orders', (firebaseOrders) => {
      if (!firebaseOrders || typeof firebaseOrders !== 'object') return
      setOrders((current) =>
        current.map((order) => {
          const fbOrder = firebaseOrders[order.id]
          if (!fbOrder) return order
          // Only apply status / payment updates from Firebase
          const changed = fbOrder.status !== order.status || fbOrder.payment !== order.payment
          if (!changed) return order
          return { ...order, status: fbOrder.status ?? order.status, payment: fbOrder.payment ?? order.payment }
        }),
      )
    })
    return unsub
  }, [firebaseConnected])

  // ── Live Firebase notifications listener ──────────────────────────────────
  // Merges new notifications pushed by the backend or other clients.
  useEffect(() => {
    if (!firebaseConnected) return undefined
    const unsub = firebaseListen('eateries/notifications', (fbNotifs) => {
      if (!fbNotifs || typeof fbNotifs !== 'object') return
      setNotifications((current) => {
        const currentIds = new Set(current.map((n) => String(n.id)))
        const incoming = Object.values(fbNotifs).filter((n) => n && !currentIds.has(String(n.id)))
        if (!incoming.length) return current
        return [...incoming.map((n) => ({ ...n, read: Boolean(n.isRead ?? n.read) })), ...current]
      })
    })
    return unsub
  }, [firebaseConnected])

  // ── Live Firebase menu availability listener ───────────────────────────────
  // Merges availability changes from Firebase so all terminals stay in sync.
  useEffect(() => {
    if (!firebaseConnected) return undefined
    const unsub = firebaseListen('eateries/menu_items', (fbMenu) => {
      if (!fbMenu || typeof fbMenu !== 'object') return
      setMenu((current) =>
        current.map((item) => {
          const fbItem = fbMenu[String(item.id)]
          if (!fbItem) return item
          if (fbItem.available === item.available) return item
          return { ...item, available: Boolean(fbItem.available) }
        }),
      )
    })
    return unsub
  }, [firebaseConnected])

  // ── Live Firebase staff status listener ───────────────────────────────────
  useEffect(() => {
    if (!firebaseConnected) return undefined
    const unsub = firebaseListen('eateries/staff', (fbStaff) => {
      if (!fbStaff || typeof fbStaff !== 'object') return
      setStaff((current) =>
        current.map((person) => {
          const fb = fbStaff[person.id]
          if (!fb) return person
          if (fb.status === person.status) return person
          return { ...person, status: fb.status }
        }),
      )
    })
    return unsub
  }, [firebaseConnected])

  // ── Live Firebase attendance events listener ───────────────────────────────
  useEffect(() => {
    if (!firebaseConnected) return undefined
    const unsub = firebaseListen('eateries/attendance_events', (fbEvents) => {
      if (!fbEvents || typeof fbEvents !== 'object') return
      setScanEvents((current) => {
        const currentIds = new Set(current.map((e) => String(e.id)))
        const incoming = Object.values(fbEvents).filter((e) => e && !currentIds.has(String(e.id ?? e.event_id)))
        if (!incoming.length) return current
        return [...incoming.map((e) => ({ id: e.id ?? e.event_id, name: e.staff_name ?? e.name, staffId: e.staff_id ?? e.staffId, time: e.event_time ?? e.time, action: e.action })), ...current]
      })
    })
    return unsub
  }, [firebaseConnected])

  // ── Auto-save snapshot to MySQL + Firebase (debounced) ────────────────────
  // Strategy:
  //   1. Always write directly to Firebase Realtime DB from the browser (works
  //      on phone / Firebase Hosting with no local backend).
  //   2. Also try the MySQL backend (PUT /api/state). If it's running (XAMPP),
  //      the backend does its own Firebase sync too — that's fine, writes are
  //      idempotent. If the backend is unreachable, we swallow that error
  //      silently because Firebase already has the data.
  //   3. Only show the "Changes were not saved" error if BOTH paths fail.
  useEffect(() => {
    if (!databaseReady) return undefined
    const snapshot = {
      menu,
      orders,
      customers,
      staff,
      payments,
      rewards,
      promotions,
      preferences,
      loyaltyHistory,
      notifications,
      scanEvents,
      profile,
      points,
      reservation,
    }

    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        const ts = new Date().toISOString()

        // ── Path A: write to Firebase directly from the browser ──────────────
        // Mirrors the backend's syncFullSnapshot — one atomic multi-path update.
        // Only runs when a Firebase Auth user is signed in (required by DB rules).
        async function saveToFirebase() {
          // Skip silently if no authenticated user — DB rules will reject anyway
          if (!auth.currentUser) return
          const updates = {}
          const toKey = (id) => String(id).replace(/[.#$[\]/]/g, '_')

          const collectionMap = [
            [menu,           'menu_items'],
            [orders,         'orders'],
            [customers,      'customers'],
            [staff,          'staff'],
            [payments,       'payments'],
            [rewards,        'rewards'],
            [promotions,     'promotions'],
            [notifications,  'notifications'],
            [loyaltyHistory, 'loyalty_transactions'],
            [scanEvents,     'attendance_events'],
          ]
          for (const [items, entityType] of collectionMap) {
            if (!Array.isArray(items)) continue
            for (const item of items) {
              const id = item.id ?? item.order_number ?? item.event_id
              if (id == null) continue
              updates[`eateries/${entityType}/${toKey(id)}`] = { ...item, _syncedAt: ts }
            }
          }
          updates['eateries/profile']  = { ...profile,  _syncedAt: ts }
          updates['eateries/points']   = points ?? 0
          updates['eateries/syncMeta'] = { lastSyncedAt: ts, source: 'browser' }

          // Single atomic round-trip to Firebase Realtime DB
          await firebaseUpdate(updates)
        }

        // ── Path B: write to MySQL backend (fire-and-forget on failure) ──────
        async function saveToMySQL() {
          await apiRequest('/api/state', { method: 'PUT', body: JSON.stringify(snapshot) })
        }

        // Run both in parallel — report error only if Firebase also fails
        const [fbResult] = await Promise.allSettled([saveToFirebase(), saveToMySQL()])

        if (fbResult.status === 'fulfilled') {
          // Firebase saved — the data is safe, clear any previous error
          setDatabaseSaveError('')
          saveErrorShown.current = false
        } else {
          // Both paths failed
          const errorMsg = fbResult.reason?.message || 'Could not save changes.'
          setDatabaseSaveError(errorMsg)
          if (!saveErrorShown.current) {
            saveErrorShown.current = true
            Swal.fire({
              icon: 'error',
              title: 'Changes were not saved',
              text: errorMsg,
              confirmButtonText: 'Okay',
              confirmButtonColor: '#1B3B2B',
              customClass: { popup: 'app-swal-confirm' },
            })
          }
        }
      })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [databaseReady, menu, orders, customers, staff, payments, rewards, promotions, preferences, loyaltyHistory, notifications, scanEvents, profile, points, reservation])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const filteredMenu = useMemo(() => menu.filter((item) => (
    (category === 'All' || item.category === category) &&
    item.name.toLowerCase().includes(query.toLowerCase())
  )), [menu, category, query])
  const filteredOrders = orders.filter((order) => orderFilter === 'All' || order.status === orderFilter)
  const categories = ['All', ...new Set(menu.map((item) => item.category))]

  function notify(message, options = {}) {
    const { icon = 'success', title = 'Success', text = message, timer = 2200, showConfirmButton = false } = options
    Swal.fire({
      icon,
      title: title || message,
      text,
      toast: true,
      position: 'top',
      timer,
      showConfirmButton,
      timerProgressBar: true,
      customClass: { popup: 'app-swal-toast' },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
  }

  function confirmAction({ title, text, confirmButtonText = 'Continue', cancelButtonText = 'Cancel', icon = 'warning' } = {}) {
    return Swal.fire({
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: '#1B3B2B',
      cancelButtonColor: '#C0503D',
      reverseButtons: true,
      customClass: { popup: 'app-swal-confirm' },
      zIndex: 99999,
    })
  }

  function showError(message, title = 'Something went wrong') {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Okay',
      confirmButtonColor: '#1B3B2B',
      customClass: { popup: 'app-swal-confirm' },
    })
  }

  function addNotification(title, detail, audience = 'all') {
    setNotifications((current) => [{ id: current.length + 1, title, detail, audience, time: 'Just now', read: false }, ...current])
  }

  function navigate(nextPage) {
    setPage(nextPage)
    setQuery('')
  }

  function setSearchQuery(value) {
    setQuery(String(value).slice(0, 120))
  }

  // loginAs sets the role, navigates to the role's home page, and optionally
  // updates the profile with the real signed-in user's name and email.
  function loginAs(nextRole, accountInfo = null) {
    if (!Object.hasOwn(roleLandingPage, nextRole)) throw new Error('This account role is not available.')
    setRole(nextRole)
    setPage(roleLandingPage[nextRole])
    if (accountInfo?.name || accountInfo?.email) {
      setProfile((current) => ({
        ...current,
        name:  accountInfo.name  || current.name,
        email: accountInfo.email || current.email,
        phone: accountInfo.phone || current.phone || '',
      }))
      // Also update checkout info so orders show the correct customer name
      if (accountInfo.name) {
        setCheckoutInfo((current) => ({ ...current, customer: accountInfo.name }))
      }
    }
  }

  async function signIn(identifier, password, expectedRole) {
    // ── Primary path: MySQL-backed login ─────────────────────────────────────
    try {
      const { account } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, role: expectedRole }),
      })

      // Also sign into Firebase Auth so the browser has a valid session.
      // This is required for saveToFirebase (checks auth.currentUser before writing).
      const usernameEmailMap = {
        admin:   'admin@rmjohns.com',
        staff:   'staff@rmjohns.com',
        maureen: 'maureen.santos@email.com',
      }
      const emailForFirebase = account.email ||
        (identifier.includes('@') ? identifier : (usernameEmailMap[identifier.toLowerCase()] || `${identifier}@rmjohns.com`))
      try {
        await firebaseSignIn(emailForFirebase, password)
      } catch {
        console.warn('[signIn] Firebase Auth sign-in failed for', emailForFirebase, '— MySQL session active, Firebase direct-write disabled.')
      }

      // Mark this browser session as intentionally authenticated
      localStorage.setItem('auth_session_active', 'true')
      loginAs(account.role, { name: account.name || account.username, email: account.email })

      // ── Fire-and-forget: notify the backend of the Firebase UID ─────────────
      // This ensures firebase_uid is linked in MySQL even if the post-login
      // Firebase sync in the backend runs slightly later.
      try {
        const currentUser = auth.currentUser
        if (currentUser) {
          const idToken = await currentUser.getIdToken()
          apiRequest('/api/auth/update-uid', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          }).catch(() => {})
        }
      } catch {
        // Non-critical — the backend login endpoint already handles this
      }

      return { account }
    } catch (apiError) {
      // API unreachable (Firebase Hosting, no local backend) — fall back to Firebase Auth
      const isNetworkOrNotFound =
        apiError.message?.includes('Failed to fetch') ||
        apiError.message?.includes('NetworkError') ||
        apiError.message?.includes('fetch') ||
        apiError.message?.includes('404') ||
        apiError.message?.includes('unavailable') ||
        apiError.message?.includes('HTML response')
      if (!isNetworkOrNotFound) throw apiError  // wrong password, etc. — surface to user
    }

    // ── Fallback: Firebase Auth direct sign-in ────────────────────────────────
    // Used on Firebase Hosting where there is no local MySQL backend.
    // Map well-known usernames to their real email addresses.
    const usernameEmailMap = {
      admin:   'admin@rmjohns.com',
      staff:   'staff@rmjohns.com',
      maureen: 'maureen.santos@email.com',
    }
    const emailToTry = identifier.includes('@')
      ? identifier
      : (usernameEmailMap[identifier.toLowerCase()] || `${identifier}@rmjohns.com`)
    let fbUser
    try {
      fbUser = await firebaseSignIn(emailToTry, password)
    } catch (fbError) {
      const msg = fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/user-not-found'
        ? 'Incorrect email or password. Try again.'
        : fbError.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : 'Sign in failed. Check your credentials and try again.'
      throw new Error(msg, { cause: fbError })
    }

    // ── SECURITY: Resolve role from Firebase Realtime DB (source of truth) ───
    // Never trust an email address pattern to determine admin/staff access.
    // The role is read from eateries/user_accounts/{uid} — the same record
    // written at registration time. A customer cannot manipulate this from
    // the browser because the Firebase DB rules only allow authenticated
    // users to read their own record, and only backend/Admin can write it.
    let role = null

    // 1. Try Realtime DB user record (most authoritative)
    try {
      const dbRecord = await firebaseGet(`eateries/user_accounts/${fbUser.uid}`)
      if (dbRecord?.role) role = dbRecord.role
    } catch { /* ignore — fall through to JWT claim */ }

    // 2. Try JWT custom claim (set by Admin SDK at registration)
    if (!role) {
      try {
        const idToken = await fbUser.getIdToken(true)
        const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.role) role = payload.role
      } catch { /* ignore decode errors */ }
    }

    // 3. Only as a last resort for the three well-known seed accounts:
    //    map their canonical emails. For ALL other accounts default to Customer
    //    so an unknown account never gets elevated access.
    if (!role) {
      const knownAdmins = ['admin@rmjohns.com']
      const knownStaff  = ['staff@rmjohns.com']
      if (knownAdmins.includes(emailToTry)) role = 'Admin'
      else if (knownStaff.includes(emailToTry)) role = 'Staff'
      else role = 'Customer'
    }

    // Validate — if role is not one of the three supported values, refuse login
    if (!['Admin', 'Staff', 'Customer'].includes(role)) {
      await firebaseSignOut().catch(() => {})
      throw new Error('Your account does not have a recognized role. Contact the system administrator.')
    }

    // Mark this browser session as intentionally authenticated
    localStorage.setItem('auth_session_active', 'true')
    // Pull the best name we have: DB record → Firebase displayName → email prefix
    const dbRecord = await firebaseGet(`eateries/user_accounts/${fbUser.uid}`).catch(() => null)
    const resolvedName = dbRecord?.name || fbUser.displayName || emailToTry.split('@')[0]
    const account = { username: emailToTry.split('@')[0], email: emailToTry, role, name: resolvedName }
    loginAs(account.role, { name: resolvedName, email: emailToTry })

    // ── Notify the MySQL backend about the Firebase UID (fire-and-forget) ────
    // When the backend (XAMPP) is running, this links the uid column in MySQL
    // and refreshes the eateries/user_accounts/{uid} record with the canonical role.
    // On the live domain where there is no backend, this silently no-ops.
    try {
      const idToken = await fbUser.getIdToken()
      await apiRequest('/api/auth/update-uid', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      })
    } catch {
      // Backend not available — acceptable; Firebase record already written above
    }

    return { account }
  }

  async function logout() {
    const result = await confirmAction({
      title: 'Log out?',
      text: 'You will return to the login screen.',
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Stay here',
    })
    if (!result.isConfirmed) return

    // Clear the intentional-session flag so auto-restore is blocked on next load
    localStorage.removeItem('auth_session_active')

    // Sign out of Firebase Auth — this invalidates the token in the browser
    await firebaseSignOut().catch(() => {})

    // Reset all local auth state
    setRole('Customer')
    setPage('Login')
    setCart([])
    notify('Logged out successfully', { icon: 'success', title: 'Signed out' })
  }

  function addToCart(product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      return found
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }]
    })
    notify(`${product.name} added to order`)
  }

  function changeQuantity(id, delta) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0))
  }

  function clearCart() {
    setCart([])
    notify('Cart cleared')
  }

  function placeOrder() {
    if (!cart.length) return notify('Add an item to get started')
    const serviceCharge = Math.round(cartTotal * 0.05)
    const orderTotal = cartTotal + serviceCharge
    const id = `VK-${2838 + orders.length}`
    const summary = cart.map((item) => `${item.quantity} × ${item.name}`).join(', ')
    const paymentStatus = paymentMethod === 'Cash' ? 'Pending' : 'Paid'
    const order = { id, customer: checkoutInfo.customer || 'Walk-in guest', items: summary, products: cart.map(({ id: productId, menuId, quantity, addons, name, price }) => ({ id: menuId ?? productId, quantity, addons, name, price })), subtotal: cartTotal, serviceCharge, discount: 0, total: orderTotal, type: checkoutInfo.orderType, pickupLocation: checkoutInfo.pickupLocation || 'RM John’s Eatery • Main Branch', notes: checkoutInfo.notes, payment: paymentStatus, paymentMethod, status: 'Pending', time: 'Just now', date: '2026-09-29' }
    setOrders((current) => [order, ...current])
    setPayments((current) => [{ id: `PAY-${String(current.length + 1).padStart(5, '0')}`, orderId: id, method: paymentMethod, amount: orderTotal, status: paymentStatus, reference: `VD-${String(current.length + 1).padStart(6, '0')}` }, ...current])
    const earned = Math.floor(cartTotal / 100)
    setPoints((current) => current + earned)
    setLoyaltyHistory((current) => [{ id: current.length + 1, date: 'Today', detail: `Order · ${id}`, delta: earned }, ...current])
    setCustomers((current) => current.map((customer) => customer.name === order.customer ? { ...customer, orders: customer.orders + 1, spend: customer.spend + orderTotal, points: customer.points + earned } : customer))
    addNotification('Order confirmed', `${id} is now ${paymentStatus === 'Paid' ? 'paid' : 'awaiting payment'}.`)
    setDialog({ type: 'confirmation', id, total: orderTotal, customer: order.customer, orderType: order.type, pickupLocation: order.pickupLocation, paymentMethod, items: cart.map((item) => ({ ...item })) })
    setCart([])
  }

  function completeSale({ discount = 0, amountTendered = 0 } = {}) {
    if (!cart.length) {
      notify('Add items before completing the sale')
      return false
    }
    const serviceCharge = Math.round(cartTotal * 0.05)
    const discountAmount = Math.round(cartTotal * Math.min(Math.max(discount, 0), 100) / 100)
    const saleTotal = Math.max(0, cartTotal + serviceCharge - discountAmount)
    if (paymentMethod === 'Cash' && amountTendered < saleTotal) {
      notify('Amount tendered must cover the total')
      return false
    }
    const orderId = `VK-${2838 + orders.length}`
    const receipt = { id: `RC-${String(orders.length + 1).padStart(6, '0')}`, orderId, total: saleTotal, subtotal: cartTotal, serviceCharge, discount: discountAmount, amountPaid: paymentMethod === 'Cash' ? amountTendered : saleTotal, change: Math.max(0, amountTendered - saleTotal), items: [...cart], payment: paymentMethod, customer: 'Walk-in guest', servedBy: profile.name, time: 'Just now' }
    const order = { id: orderId, customer: 'Walk-in guest', items: cart.map((item) => `${item.quantity} × ${item.name}`).join(', '), products: cart.map(({ id, menuId, quantity, addons, name, price }) => ({ id: menuId ?? id, quantity, addons, name, price })), subtotal: cartTotal, serviceCharge, discount: discountAmount, total: saleTotal, type: 'Dine in', payment: 'Paid', paymentMethod, status: 'Completed', time: 'Just now', date: '2026-09-29' }
    setOrders((current) => [order, ...current])
    setPayments((current) => [{ id: `PAY-${String(current.length + 1).padStart(5, '0')}`, orderId, method: paymentMethod, amount: saleTotal, amountPaid: receipt.amountPaid, change: receipt.change, status: 'Paid', reference: receipt.id }, ...current])
    const earned = Math.floor(cartTotal / 100)
    setPoints((current) => current + earned)
    setLoyaltyHistory((current) => [{ id: current.length + 1, date: 'Today', detail: `POS sale · ${orderId}`, delta: earned }, ...current])
    setDialog({ type: 'receipt', receipt })
    setCart([])
    return true
  }

  function cancelSale() {
    if (!cart.length) return notify('There is no active transaction to cancel')
    const id = `VK-${2838 + orders.length}`
    setOrders((current) => [{ id, customer: 'Walk-in guest', items: cart.map((item) => `${item.quantity} × ${item.name}`).join(', '), products: cart.map(({ id: productId, quantity }) => ({ id: productId, quantity })), subtotal: cartTotal, total: cartTotal, type: 'Dine in', payment: 'Cancelled', paymentMethod, status: 'Cancelled', time: 'Just now', date: '2026-09-29' }, ...current])
    setPayments((current) => [{ id: `PAY-${String(current.length + 1).padStart(5, '0')}`, orderId: id, method: paymentMethod, amount: cartTotal, status: 'Cancelled', reference: `VD-CANCEL-${current.length + 1}` }, ...current])
    setCart([])
    notify(`Transaction ${id} cancelled`)
  }

  function recordPayment(orderId, method, amount, status = 'Paid', amountPaid = amount) {
    const order = orders.find((entry) => entry.id === orderId)
    if (!order) return notify('Choose an order before recording payment')
    const reference = `VD-${String(payments.length + 1).padStart(6, '0')}`
    setPayments((current) => [{ id: `PAY-${String(current.length + 1).padStart(5, '0')}`, orderId, method, amount, amountPaid, change: Math.max(0, amountPaid - amount), status, reference }, ...current])
    setOrders((current) => current.map((entry) => entry.id === orderId ? { ...entry, payment: status, paymentMethod: method } : entry))
    addNotification(`Payment ${status.toLowerCase()}`, `${orderId} · ${method} · ${reference}`)
    notify(`Payment ${status.toLowerCase()} · ${reference}`)
    return reference
  }

  function refundOrder(orderId) {
    const payment = payments.find((entry) => entry.orderId === orderId && entry.status === 'Paid')
    if (!payment) return notify('Only paid orders can be refunded')
    setPayments((current) => current.map((entry) => entry.id === payment.id ? { ...entry, status: 'Refunded' } : entry))
    setOrders((current) => current.map((entry) => entry.id === orderId ? { ...entry, payment: 'Refunded', status: 'Cancelled' } : entry))
    addNotification('Refund recorded', `${orderId} · ${payment.reference}`)
    notify(`Refund recorded for ${orderId}`)
  }

  function updateOrder(id, status) {
    const order = orders.find((entry) => entry.id === id)
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order))
    if (status === 'Ready' && order?.status !== 'Ready' && order?.type !== 'Dine in') {
      const location = order?.pickupLocation || 'RM John’s Eatery • Main Branch'
      addNotification('Order ready for pickup', `${id} is ready for pickup at ${location}.`, 'customer')
    } else {
      addNotification('Order status updated', `${id} moved to ${status.toLowerCase()}.`)
    }
    notify(`${id} moved to ${status.toLowerCase()}`)
  }

  function updateMenuItem(id, updates) {
    // 1. Update local React state immediately (instant UI feedback)
    setMenu((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...updates } : item)

      // 2. Persist full merged item to Firebase RTDB so domain sees the change
      const merged = next.find((item) => item.id === id)
      if (merged) {
        const key = String(id)
        firebaseUpdate({
          [`eateries/menu_items/${key}`]: { ...merged, _syncedAt: new Date().toISOString() },
        }).catch((err) => console.warn('[menu] Firebase RTDB write failed:', err.message))
      }

      return next
    })

    // 3. Persist to MySQL via backend API (when localhost backend is running)
    apiRequest('/api/menu-items/update', {
      method: 'POST',
      body: JSON.stringify({ id, updates }),
    }).catch(() => { /* backend offline — Firebase write above is sufficient */ })
  }

  function addMenuItem(newItem) {
    // 1. Update local state and write all items to Firebase
    setMenu((current) => {
      const withNew = [...current, newItem]

      // 2. Write the new item to Firebase RTDB immediately
      const key = String(newItem.id)
      firebaseUpdate({
        [`eateries/menu_items/${key}`]: { ...newItem, _syncedAt: new Date().toISOString() },
      }).catch((err) => console.warn('[menu] Firebase add failed:', err.message))

      return withNew
    })

    // 3. Persist to MySQL via backend
    apiRequest('/api/menu-items/add', {
      method: 'POST',
      body: JSON.stringify(newItem),
    }).catch(() => {})
  }

  function recordStaffScan(staffId, action) {
    const staffMember = staff.find((person) => person.id === staffId)
    if (!staffMember) return
    if (!deviceConnected) return notify('RFID reader is offline in demo mode')
    const time = ['11:04 AM', '11:18 AM', '11:32 AM', '11:45 AM'][scanSequence % 4]
    setScanSequence((current) => current + 1)
    setStaff((current) => current.map((person) => person.id === staffId ? { ...person, status: action === 'Time in' ? 'Present' : 'Offline', ...(action === 'Time in' ? { time, timeOut: '—' } : { timeOut: time }) } : person))
    setScanEvents((current) => [{ id: current.length + 1, name: staffMember.name, staffId, time, action }, ...current])
    addNotification('Staff attendance recorded', `${staffMember.name} · ${action} · ${time}`)
    notify(`${staffMember.name} ${action.toLowerCase()} recorded`)
  }

  function reorder(order) {
    const products = order.products?.map((line) => {
      const base = menu.find((item) => item.id === line.id)
      return base ? { ...base, id: line.addons?.length ? `reorder-${line.id}-${line.addons.join('-')}` : base.id, menuId: line.id, name: line.name || base.name, price: line.price || base.price, addons: line.addons || [], quantity: line.quantity } : null
    }).filter(Boolean)
    if (!products?.length) return notify('Items for this older demo order are unavailable to reorder')
    setCart((current) => products.reduce((next, product) => {
      const found = next.find((item) => item.id === product.id)
      return found ? next.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + product.quantity } : item) : [...next, product]
    }, current))
    navigate('Cart')
    notify(`${order.id} added to your cart`)
  }

  function addCustomer(customer) {
    setCustomers((current) => [...current, { ...customer, id: `CU-${String(1043 + current.length - initialCustomers.length).padStart(4, '0')}`, orders: 0, spend: 0, points: 0, status: 'Active' }])
  }

  // ── Universal account registration ────────────────────────────────────────
  // ARCHITECTURE:
  //   Customer:
  //     1. Save to MySQL via /api/customers/register (no token needed)
  //     2. Create Firebase Auth user
  //     3. Link firebase_uid to MySQL via /api/auth/link-uid (token required)
  //     4. Write account + customer records to Firebase Realtime DB
  //   Staff / Admin:
  //     1. Create Firebase Auth user (token needed for /api/accounts/register)
  //     2. Save to MySQL via /api/accounts/register (token in header)
  //     3. Write account + staff records to Firebase Realtime DB
  //   On live domain (no backend), steps 1/2/3 that call MySQL are skipped
  //   gracefully and only Firebase is used.
  async function registerAccount({ name, email, phone, password, role: accountRole }) {
    const validRoles = ['Customer', 'Staff', 'Admin']
    const normalizedRole = validRoles.find((r) => r.toLowerCase() === String(accountRole).toLowerCase()) || 'Customer'
    const normalizedEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const cleanPhone = (phone || '').trim()

    const ts = new Date().toISOString()
    const customerId = `CU-${Date.now()}`

    // ── CUSTOMER FLOW ─────────────────────────────────────────────────────────
    if (normalizedRole === 'Customer') {
      // STEP 1: Save to MySQL (no token needed)
      let mysqlSaved = false
      try {
        await apiRequest('/api/customers/register', {
          method: 'POST',
          body: JSON.stringify({ name: cleanName, email: normalizedEmail, phone: cleanPhone, password }),
        })
        mysqlSaved = true
        console.log('[register] Customer saved to MySQL')
      } catch (mysqlErr) {
        const isNetworkError =
          mysqlErr.message?.includes('fetch') ||
          mysqlErr.message?.includes('NetworkError') ||
          mysqlErr.message?.includes('HTML response') ||
          mysqlErr.message?.includes('404')
        if (!isNetworkError) throw mysqlErr // validation or duplicate — surface to user
        console.warn('[register] MySQL backend unreachable — will use Firebase only')
      }

      // STEP 2: Create Firebase Auth user
      let fbUser
      try {
        fbUser = await firebaseRegister(normalizedEmail, password)
      } catch (fbError) {
        if (fbError.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Try signing in instead.')
        }
        throw new Error(fbError.message || 'Could not create account. Check your details and try again.')
      }

      const uid = fbUser.uid

      // STEP 3: Link firebase_uid to the MySQL account (now that we have it)
      if (mysqlSaved) {
        try {
          const idToken = await fbUser.getIdToken()
          await apiRequest('/api/auth/link-uid', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          })
          console.log('[register] Firebase UID linked to MySQL account')
        } catch {
          // Non-critical — uid can be linked later on first sign-in
          console.warn('[register] UID link to MySQL failed (non-critical)')
        }
      }

      // STEP 4: Write to Firebase Realtime DB
      try {
        await firebaseUpdate({
          [`eateries/user_accounts/${uid}`]: {
            uid,
            username: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            name: cleanName,
            phone: cleanPhone,
            role: 'Customer',
            createdAt: ts,
          },
          [`eateries/customers/${customerId}`]: {
            id: customerId, name: cleanName, email: normalizedEmail, contact: cleanPhone,
            orders: 0, spend: 0, points: 0, status: 'Active', _syncedAt: ts,
          },
        })
        console.log('[register] Customer saved to Firebase Realtime DB')
      } catch (fbDbErr) {
        console.warn('[register] Firebase DB write failed:', fbDbErr.message)
        // Non-critical if MySQL saved successfully
        if (!mysqlSaved) throw new Error('Could not save account. Check your connection and try again.')
      }

      // STEP 5: Update local React state
      const newCustomer = { id: customerId, name: cleanName, email: normalizedEmail, contact: cleanPhone, orders: 0, spend: 0, points: 0, status: 'Active' }
      setCustomers((current) => [...current, newCustomer])
      setCustomerAccounts((current) => [...current, { username: normalizedEmail.split('@')[0], email: normalizedEmail, role: 'Customer' }])
      setProfile({ name: cleanName, email: normalizedEmail, phone: cleanPhone })
      setCheckoutInfo((current) => ({ ...current, customer: cleanName }))

      localStorage.setItem('auth_session_active', 'true')
      loginAs('Customer', { name: cleanName, email: normalizedEmail })
      return { uid, role: 'Customer', email: normalizedEmail, mysqlSaved }
    }

    // ── STAFF / ADMIN FLOW ────────────────────────────────────────────────────
    // Firebase Auth user must be created first because /api/accounts/register
    // requires a valid ID token from the newly-created account (self-registration)
    // or from an existing Admin (admin-created flow).

    // STEP 1: Create Firebase Auth user
    let fbUser
    try {
      fbUser = await firebaseRegister(normalizedEmail, password)
    } catch (fbError) {
      if (fbError.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Try signing in instead.')
      }
      throw new Error(fbError.message || 'Could not create account. Check your details and try again.')
    }

    const uid = fbUser.uid

    // STEP 2: Save to MySQL with the Firebase token
    let mysqlSaved = false
    try {
      const idToken = await fbUser.getIdToken()
      await apiRequest('/api/accounts/register', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: cleanName, email: normalizedEmail, phone: cleanPhone, password, role: normalizedRole }),
      })
      mysqlSaved = true
      console.log(`[register] ${normalizedRole} saved to MySQL`)
    } catch (err) {
      const isNetworkError =
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('HTML response') ||
        err.message?.includes('404')
      if (!isNetworkError) {
        // Real validation/auth error — surface to user
        // Sign out the orphaned Firebase user before throwing
        await firebaseSignOut().catch(() => {})
        throw err
      }
      console.warn(`[register] MySQL ${normalizedRole} save failed (network):`, err.message)
    }

    // STEP 3: Write to Firebase Realtime DB
    try {
      await firebaseUpdate({
        [`eateries/user_accounts/${uid}`]: {
          uid,
          username: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          name: cleanName,
          phone: cleanPhone,
          role: normalizedRole,
          createdAt: ts,
        },
        ...(normalizedRole === 'Staff' ? {
          [`eateries/staff/${uid}`]: {
            id: uid, name: cleanName, role: 'Service crew', contact: normalizedEmail,
            status: 'Offline', time: '—', timeOut: null, _syncedAt: ts,
          },
        } : {}),
      })
      console.log(`[register] ${normalizedRole} saved to Firebase Realtime DB`)
    } catch (fbDbErr) {
      console.warn('[register] Firebase DB write failed:', fbDbErr.message)
      if (!mysqlSaved) throw new Error('Could not save account. Check your connection and try again.')
    }

    // STEP 4: Update local React state
    if (normalizedRole === 'Staff') {
      setStaff((current) => [...current, { id: uid, name: cleanName, role: 'Service crew', contact: normalizedEmail, status: 'Offline', time: '—' }])
    }

    localStorage.setItem('auth_session_active', 'true')
    loginAs(normalizedRole, { name: cleanName, email: normalizedEmail })
    return { uid, role: normalizedRole, email: normalizedEmail, mysqlSaved }
  }

  // Keep old name as alias so any existing code using it still works
  async function registerCustomerAccount({ name, email, phone, password }) {
    return registerAccount({ name, email, phone, password, role: 'Customer' })
  }

  async function redeemReward(reward) {
    if (points < reward.points) return notify('Not enough points for this reward yet', { icon: 'warning', title: 'Insufficient points' })
    const result = await confirmAction({
      title: `Redeem "${reward.name}"?`,
      text: `This will use ${reward.points} points from your balance.`,
      confirmButtonText: 'Yes, redeem',
      cancelButtonText: 'Not yet',
      icon: 'question',
    })
    if (!result.isConfirmed) return
    setPoints((current) => current - reward.points)
    setLoyaltyHistory((current) => [{ id: current.length + 1, date: 'Today', detail: `Redeemed · ${reward.name}`, delta: -reward.points }, ...current])
    notify(`${reward.name} redeemed! Enjoy your treat.`, { icon: 'success', title: 'Reward redeemed' })
  }

  const value = {
    role, setRole, page, setPage, menu, setMenu, orders, setOrders, cart, setCart,
    query, setQuery: setSearchQuery, category, setCategory, dialog, setDialog,
    points, setPoints, loyaltyHistory, paymentMethod, setPaymentMethod, orderFilter, setOrderFilter,
    staff, setStaff, deviceConnected, setDeviceConnected, scanEvents, recordStaffScan, customers, setCustomers, customerAccounts, payments, setPayments, rewards, setRewards,
    promotions, setPromotions, preferences, setPreferences,
    notifications, setNotifications, checkoutInfo, setCheckoutInfo, reservation, setReservation, profile, setProfile,
    cartCount, cartTotal, filteredMenu, filteredOrders, categories,
    databaseReady, databaseError, databaseSaveError,
    firebaseConnected, firebaseAuthReady,
    notify, confirmAction, showError, navigate, loginAs, signIn, logout, addToCart, changeQuantity, clearCart, placeOrder,
    completeSale, cancelSale, recordPayment, refundOrder, updateOrder, updateMenuItem, addMenuItem, reorder, addCustomer, registerAccount, registerCustomerAccount, addNotification, redeemReward,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
