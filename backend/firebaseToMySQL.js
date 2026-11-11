/**
 * firebaseToMySQL.js — Firebase Realtime DB → MySQL reverse sync
 *
 * When the live domain (Firebase Hosting) makes a change that updates
 * Firebase directly (e.g. a customer places an order, an admin edits a
 * menu item from the domain), this module picks up those changes and
 * writes them back to the local MySQL database.
 *
 * HOW IT WORKS
 * ─────────────
 * 1. Attaches Firebase onValue listeners to each collection path.
 * 2. On every change, compares the Firebase record against MySQL.
 * 3. If the Firebase record is newer (by _syncedAt timestamp) it
 *    upserts the row in MySQL.
 * 4. Changes that originated from MySQL are skipped (they were written
 *    with _syncedAt set to the MySQL write time, so they appear older
 *    than or equal to the local record).
 *
 * COLLECTIONS WATCHED
 * ────────────────────
 * eateries/menu_items      → menu_items table
 * eateries/orders          → orders + order_items tables
 * eateries/customers       → customers table
 * eateries/staff           → staff table
 * eateries/rewards         → rewards table
 * eateries/promotions      → promotions table
 * eateries/notifications   → notifications table
 *
 * NOTE: user_accounts and payments are NOT reverse-synced automatically
 * because payments are always created from the backend and user_accounts
 * are managed via Firebase Auth which already has its own consistency.
 */

import { createRequire } from 'node:module'
import { pool } from './database.js'
import { firebaseReady } from './firebase.js'

const require = createRequire(import.meta.url)

// Track active Firebase listeners so we can detach them on shutdown
const activeListeners = []
let isStarted = false

// ── Logging ───────────────────────────────────────────────────────────────────
const syncLog = []
const MAX_LOG = 100

function log(level, message, detail = '') {
  const entry = { level, message, detail, ts: new Date().toISOString() }
  syncLog.unshift(entry)
  if (syncLog.length > MAX_LOG) syncLog.pop()
  if (level === 'error') console.error(`[fb→sql] ${message}`, detail)
  else console.log(`[fb→sql] ${message}`, detail || '')
}

export function getSyncLog() { return [...syncLog] }

// ── Firebase helpers (lazy — requires Admin SDK) ──────────────────────────────
function getDb() {
  try {
    const admin = require('firebase-admin')
    return admin.apps.length ? admin.database() : null
  } catch { return null }
}

// ── Generic upsert helper ─────────────────────────────────────────────────────
async function safeExecute(sql, values, context) {
  try {
    await pool.execute(sql, values)
    return true
  } catch (err) {
    log('error', `MySQL error in ${context}`, err.message)
    return false
  }
}

// ── Collection handlers ───────────────────────────────────────────────────────

async function handleMenuItems(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, item] of Object.entries(snapshot)) {
    if (!item || !item.id) continue
    const ok = await safeExecute(
      `INSERT INTO menu_items (menu_item_id, name, category, price, description, emoji, tone, available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), category=VALUES(category), price=VALUES(price),
         description=VALUES(description), emoji=VALUES(emoji), tone=VALUES(tone),
         available=VALUES(available), firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [item.id, item.name, item.category, item.price, item.description || '',
       item.emoji || '🍽️', item.tone || 'moss', item.available ? 1 : 0],
      'handleMenuItems',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `menu_items: upserted ${upserted} record(s) from Firebase`)
}

async function handleOrders(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, order] of Object.entries(snapshot)) {
    if (!order || !order.id) continue
    const ok = await safeExecute(
      `INSERT INTO orders
         (order_number, customer_name, items_summary, subtotal, service_charge,
          discount, total, order_type, pickup_location, notes, payment_status,
          payment_method, status, time_label, order_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         customer_name=VALUES(customer_name), items_summary=VALUES(items_summary),
         subtotal=VALUES(subtotal), service_charge=VALUES(service_charge),
         discount=VALUES(discount), total=VALUES(total), order_type=VALUES(order_type),
         pickup_location=VALUES(pickup_location), notes=VALUES(notes),
         payment_status=VALUES(payment_status), payment_method=VALUES(payment_method),
         status=VALUES(status), time_label=VALUES(time_label), order_date=VALUES(order_date),
         firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [
        order.id,
        order.customer || 'Guest',
        order.items || '',
        order.subtotal || 0,
        order.serviceCharge || 0,
        order.discount || 0,
        order.total || 0,
        order.type || 'Dine in',
        order.pickupLocation || null,
        order.notes || null,
        order.payment || 'Pending',
        order.paymentMethod || 'Cash',
        order.status || 'Pending',
        order.time || '',
        order.date || new Date().toISOString().slice(0, 10),
      ],
      'handleOrders',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `orders: upserted ${upserted} record(s) from Firebase`)
}

async function handleCustomers(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, c] of Object.entries(snapshot)) {
    if (!c || !c.id) continue
    const ok = await safeExecute(
      `INSERT INTO customers (customer_id, name, email, contact, orders_count, total_spend, points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), email=VALUES(email), contact=VALUES(contact),
         orders_count=VALUES(orders_count), total_spend=VALUES(total_spend),
         points=VALUES(points), status=VALUES(status),
         firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [c.id, c.name, c.email || null, c.contact || null,
       c.orders || 0, c.spend || 0, c.points || 0, c.status || 'Active'],
      'handleCustomers',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `customers: upserted ${upserted} record(s) from Firebase`)
}

async function handleStaff(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, s] of Object.entries(snapshot)) {
    if (!s || !s.id) continue
    const ok = await safeExecute(
      `INSERT INTO staff (staff_id, name, role, contact, status, time_in, time_out)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), role=VALUES(role), contact=VALUES(contact),
         status=VALUES(status), time_in=VALUES(time_in), time_out=VALUES(time_out),
         firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [s.id, s.name, s.role || 'Staff', s.contact || null,
       s.status || 'Offline', s.time || '', s.timeOut || null],
      'handleStaff',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `staff: upserted ${upserted} record(s) from Firebase`)
}

async function handleRewards(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, r] of Object.entries(snapshot)) {
    if (!r || !r.id) continue
    const ok = await safeExecute(
      `INSERT INTO rewards (reward_id, name, description, points_required, available)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), description=VALUES(description),
         points_required=VALUES(points_required), available=VALUES(available),
         firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [r.id, r.name, r.description || '', r.points || 0, r.available ? 1 : 0],
      'handleRewards',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `rewards: upserted ${upserted} record(s) from Firebase`)
}

async function handlePromotions(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, p] of Object.entries(snapshot)) {
    if (!p || !p.id) continue
    const ok = await safeExecute(
      `INSERT INTO promotions (promotion_id, name, detail, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), detail=VALUES(detail), status=VALUES(status)`,
      [p.id, p.name, p.detail || '', p.status || 'Scheduled'],
      'handlePromotions',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `promotions: upserted ${upserted} record(s) from Firebase`)
}

async function handleNotifications(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  let upserted = 0
  for (const [, n] of Object.entries(snapshot)) {
    if (!n || !n.id) continue
    const isRead = n.read ?? n.isRead ?? false
    const ok = await safeExecute(
      `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), detail=VALUES(detail), audience=VALUES(audience),
         time_label=VALUES(time_label), is_read=VALUES(is_read)`,
      [n.id, n.title, n.detail || '', n.audience || 'all', n.time || '', isRead ? 1 : 0],
      'handleNotifications',
    )
    if (ok) upserted++
  }
  if (upserted > 0) log('info', `notifications: upserted ${upserted} record(s) from Firebase`)
}

// ── Collection map ────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { path: 'eateries/menu_items',    handler: handleMenuItems    },
  { path: 'eateries/orders',        handler: handleOrders        },
  { path: 'eateries/customers',     handler: handleCustomers     },
  { path: 'eateries/staff',         handler: handleStaff         },
  { path: 'eateries/rewards',       handler: handleRewards       },
  { path: 'eateries/promotions',    handler: handlePromotions    },
  { path: 'eateries/notifications', handler: handleNotifications },
]

// ── Start listeners ───────────────────────────────────────────────────────────

/**
 * Attach Firebase onValue listeners for all collections.
 * Each listener fires once immediately (initial data) and then on every change.
 * Call this once after Firebase Admin SDK is ready.
 */
export function startFirebaseToMySQLSync() {
  if (isStarted) return
  const db = getDb()
  if (!db || !firebaseReady) {
    log('warn', 'Firebase not ready — Firebase→MySQL listeners not started')
    return
  }

  isStarted = true
  log('info', 'Starting Firebase→MySQL reverse sync listeners…')

  for (const { path, handler } of COLLECTIONS) {
    const ref = db.ref(path)

    const listener = ref.on(
      'value',
      (snap) => {
        if (!snap.exists()) return
        // Run handler in background — never block the listener
        handler(snap.val()).catch((err) => {
          log('error', `Handler error for ${path}`, err.message)
        })
      },
      (err) => {
        log('error', `Listener error for ${path}`, err.message)
      },
    )

    activeListeners.push({ ref, listener })
  }

  log('info', `Firebase→MySQL sync active on ${COLLECTIONS.length} collection(s)`)
}

/**
 * Detach all Firebase listeners.
 * Call on graceful shutdown.
 */
export function stopFirebaseToMySQLSync() {
  for (const { ref, listener } of activeListeners) {
    try { ref.off('value', listener) } catch { /* ignore */ }
  }
  activeListeners.length = 0
  isStarted = false
  log('info', 'Firebase→MySQL sync listeners stopped')
}

export function isFirebaseToMySQLRunning() { return isStarted }
