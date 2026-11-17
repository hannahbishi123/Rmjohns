/**
 * firebaseSync.js — Reliable Dual Synchronization Engine
 *
 * Synchronizes operational business data across three destinations:
 *   1. XAMPP MySQL (`eateries_db`) — Primary local store & ACID source of truth
 *   2. Firebase Realtime Database (`eateries/...`) — Real-time live client listeners
 *   3. Firebase Cloud Firestore (corresponding collections) — Document store & cloud sync
 *
 * Rules & Guarantees:
 *   - MySQL write is committed FIRST. Firebase/Firestore writes never block or delay MySQL.
 *   - Dual tracking in `firebase_sync_queue`: separate tracking for 'rtdb' and 'firestore'.
 *   - A successful RTDB write does NOT mark Firestore as synced; both are tracked independently.
 *   - Deterministic document keys prevent duplicates across all three destinations.
 *   - Firestore writes use { merge: true } so existing live fields are safely preserved.
 *   - Automatic self-healing ensures schema columns exist on startup.
 */

import { pool } from './database.js'
import {
  firebaseReady,
  getFirebaseStatus,
  getFirestoreDb,
  getRealtimeDb,
  writeFirestoreUserRecord,
} from './firebase.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Background retry interval (30 seconds)
const RETRY_INTERVAL = 30_000
// Maximum retry attempts before marking queue row as 'failed'
const MAX_ATTEMPTS = 5

// ── Self-healing table & column creation ───────────────────────────────────────

/**
 * Ensure `firebase_sync_queue` table and all sync tracking columns exist.
 * Runs on backend startup so migrations are automatic and non-destructive.
 */
export async function ensureSyncTable() {
  try {
    // 1. Create or ensure firebase_sync_queue exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`firebase_sync_queue\` (
        \`queue_id\`    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
        \`entity_type\` VARCHAR(64)      NOT NULL,
        \`entity_id\`   VARCHAR(64)      NOT NULL,
        \`destination\` VARCHAR(32)      NOT NULL DEFAULT 'rtdb',
        \`operation\`   ENUM('upsert','delete') NOT NULL DEFAULT 'upsert',
        \`payload\`     JSON             NOT NULL,
        \`status\`      ENUM('pending','retrying','synced','failed') NOT NULL DEFAULT 'pending',
        \`attempt\`     TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`last_error\`  TEXT             DEFAULT NULL,
        \`created_at\`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`synced_at\`   TIMESTAMP        NULL DEFAULT NULL,
        PRIMARY KEY (\`queue_id\`),
        KEY \`idx_sync_status\`  (\`status\`),
        KEY \`idx_sync_entity\`  (\`entity_type\`, \`entity_id\`),
        KEY \`idx_sync_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 2. Ensure destination column exists for legacy installations
    await pool.execute(`
      ALTER TABLE \`firebase_sync_queue\`
      ADD COLUMN IF NOT EXISTS \`destination\` VARCHAR(32) NOT NULL DEFAULT 'rtdb'
    `).catch(() => {})

    // 3. Ensure unique index on (entity_type, entity_id, destination)
    await pool.execute(`
      ALTER TABLE \`firebase_sync_queue\`
      ADD UNIQUE KEY IF NOT EXISTS \`uq_sync_entity_dest\` (\`entity_type\`, \`entity_id\`, \`destination\`)
    `).catch(() => {})

    // 4. Ensure firestore_sync_status and firestore_synced_at exist on all operational tables
    const operationalTables = [
      'orders',
      'menu_items',
      'customers',
      'staff',
      'payments',
      'rewards',
      'promotions',
      'notifications',
      'loyalty_transactions',
      'attendance_events',
      'user_accounts',
    ]

    for (const table of operationalTables) {
      await pool.execute(`
        ALTER TABLE \`${table}\`
        ADD COLUMN IF NOT EXISTS \`firestore_sync_status\` ENUM('pending','synced','failed') DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS \`firestore_synced_at\` TIMESTAMP NULL DEFAULT NULL
      `).catch(() => {})
    }

    console.log('[sync] Sync tables and tracking columns verified successfully.')
  } catch (error) {
    console.error('[sync] ensureSyncTable error:', error.message)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sanitise string for Firebase Realtime Database path segment. */
export function toFirebaseKey(raw) {
  return String(raw).replace(/[.#$[\]/]/g, '_')
}

/** Get Realtime Database instance. */
function getDb() {
  const rtdb = getRealtimeDb()
  if (rtdb) return rtdb
  try {
    const admin = require('firebase-admin')
    return admin.apps.length ? admin.database() : null
  } catch {
    return null
  }
}

/** Get Cloud Firestore instance. */
function getFirestore() {
  const fs = getFirestoreDb()
  if (fs) return fs
  try {
    const admin = require('firebase-admin')
    return admin.apps.length ? admin.firestore() : null
  } catch {
    return null
  }
}

/** ISO timestamp helper. */
function now() {
  return new Date().toISOString()
}

// ── Firestore Collection Mapping & Document Normalization ────────────────────

/**
 * Maps entity type to the canonical Cloud Firestore collection name.
 */
export function toFirestoreCollection(entityType) {
  switch (entityType) {
    case 'menu':
    case 'menu_items':
      return 'menu_items'
    case 'customers':
      return 'customers'
    case 'orders':
      return 'orders'
    case 'order_items':
      return 'order_items'
    case 'payments':
      return 'payments'
    case 'rewards':
    case 'loyalty_rewards':
      return 'loyalty_rewards'
    case 'loyaltyHistory':
    case 'loyalty_transactions':
      return 'loyalty_transactions'
    case 'promotions':
      return 'promotions'
    case 'notifications':
      return 'notifications'
    case 'staff':
      return 'staff'
    case 'attendance':
    case 'attendance_events':
    case 'scanEvents':
      return 'attendance'
    case 'users':
    case 'user_accounts':
      return 'users'
    case 'settings':
    case 'preferences':
      return 'settings'
    default:
      return entityType
  }
}

/**
 * Formats a record into clean, strongly typed Firestore document structure.
 */
export function formatFirestoreDocument(entityType, entityId, payload) {
  if (!payload || typeof payload !== 'object') {
    return { id: String(entityId), updatedAt: now() }
  }

  const id = String(entityId)

  switch (entityType) {
    case 'menu_items':
    case 'menu': {
      const isAvailable = payload.available !== undefined
        ? Boolean(payload.available)
        : (payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : true)
      return {
        id,
        name: payload.name || '',
        category: payload.category || 'OTHER',
        price: Number(payload.price || 0),
        description: payload.description || '',
        emoji: payload.emoji || '🍽️',
        tone: payload.tone || 'moss',
        isAvailable,
        available: isAvailable,
        imageUrl: payload.image || payload.image_url || payload.imageUrl || null,
        updatedAt: now(),
      }
    }

    case 'customers': {
      return {
        id,
        customerId: id,
        name: payload.name || '',
        email: payload.email || '',
        contact: payload.contact || payload.phone || '',
        phone: payload.contact || payload.phone || '',
        ordersCount: Number(payload.orders ?? payload.orders_count ?? 0),
        totalSpend: Number(payload.spend ?? payload.total_spend ?? 0),
        points: Number(payload.points ?? 0),
        status: payload.status || 'Active',
        updatedAt: now(),
      }
    }

    case 'orders': {
      let items = []
      if (Array.isArray(payload.items)) {
        items = payload.items.map((it) => ({
          menuItemId: String(it.menuItemId || it.menuId || it.id || ''),
          name: it.name || '',
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
          addon: it.addon || (Array.isArray(it.addons) ? it.addons.join(', ') : 'None'),
          totalPrice: Number(it.totalPrice || (it.price * (it.quantity || 1)) || 0),
          emoji: it.emoji || '🍽️',
          description: it.description || '',
          category: it.category || '',
          imageUrl: it.image || it.image_url || it.imageUrl || null,
        }))
      } else if (payload.products && typeof payload.products === 'object') {
        items = Object.values(payload.products).map((it) => ({
          menuItemId: String(it.menuId || it.menuItemId || it.id || ''),
          name: it.name || '',
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
          addon: Array.isArray(it.addons) ? it.addons.join(', ') : (it.addon || 'None'),
          totalPrice: Number(it.totalPrice || (it.price * (it.quantity || 1)) || 0),
          emoji: it.emoji || '🍽️',
        }))
      }

      return {
        id,
        orderNumber: id,
        customerId: String(payload.customer_id || payload.customerId || ''),
        customerName: payload.customer || payload.customerName || payload.customer_name || '',
        orderType: payload.type || payload.orderType || payload.order_type || 'Pickup',
        status: (payload.status || 'pending').toLowerCase(),
        statusLabel: payload.statusLabel || payload.status || 'Pending',
        items,
        subtotal: Number(payload.subtotal || 0),
        serviceCharge: Number(payload.serviceCharge ?? payload.service_charge ?? 0),
        discount: Number(payload.discount || 0),
        total: Number(payload.total || 0),
        paymentMethod: payload.paymentMethod || payload.payment_method || 'Cash',
        notes: payload.notes || '',
        time: payload.time || payload.time_label || '',
        date: payload.date || payload.order_date || '',
        createdAt: payload.createdAt || now(),
        updatedAt: now(),
      }
    }

    case 'order_items': {
      return {
        id,
        orderNumber: String(payload.order_number || payload.orderNumber || ''),
        menuItemId: String(payload.menu_item_id || payload.menuId || payload.menuItemId || ''),
        name: payload.name || payload.item_name || '',
        quantity: Number(payload.quantity || 1),
        price: Number(payload.price || payload.unit_price || 0),
        addon: payload.addon || (Array.isArray(payload.addons) ? payload.addons.join(', ') : 'None'),
        totalPrice: Number(payload.totalPrice || (payload.price * (payload.quantity || 1)) || 0),
        updatedAt: now(),
      }
    }

    case 'payments': {
      const ref = payload.reference || payload.id || payload.payment_number || id
      return {
        id,
        reference: String(ref),
        orderId: String(payload.orderId || payload.order_number || payload.order_id || ''),
        amount: Number(payload.amount || 0),
        amountTendered: Number(payload.amountPaid ?? payload.amount_paid ?? payload.amountTendered ?? payload.amount ?? 0),
        change: Number(payload.changeAmount ?? payload.change_amount ?? payload.change ?? 0),
        paymentMethod: payload.method || payload.paymentMethod || 'Cash',
        customerName: payload.customerName || payload.customer || '',
        status: (payload.status || 'paid').toLowerCase(),
        timestamp: payload.timestamp || now(),
        updatedAt: now(),
      }
    }

    case 'rewards':
    case 'loyalty_rewards': {
      const isAvailable = payload.available !== undefined
        ? Boolean(payload.available)
        : (payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : true)
      return {
        id,
        name: payload.name || '',
        description: payload.description || '',
        pointsRequired: Number(payload.points ?? payload.points_required ?? payload.pointsRequired ?? 0),
        isAvailable,
        available: isAvailable,
        updatedAt: now(),
      }
    }

    case 'loyalty_transactions':
    case 'loyaltyHistory': {
      const delta = Number(payload.delta ?? payload.points_delta ?? 0)
      return {
        id,
        customerId: String(payload.customer_id || payload.customerId || ''),
        detail: payload.detail || '',
        delta,
        pointsDelta: delta,
        date: payload.date || payload.date_label || '',
        updatedAt: now(),
      }
    }

    case 'promotions': {
      return {
        id,
        name: payload.name || '',
        detail: payload.detail || '',
        status: (payload.status || 'active').toLowerCase(),
        updatedAt: now(),
      }
    }

    case 'notifications': {
      const isRead = Boolean(payload.isRead ?? payload.read ?? payload.is_read ?? false)
      return {
        id,
        title: payload.title || '',
        detail: payload.detail || '',
        audience: payload.audience || 'All',
        time: payload.time || payload.time_label || '',
        isRead,
        read: isRead,
        updatedAt: now(),
      }
    }

    case 'staff': {
      return {
        id,
        name: payload.name || '',
        position: payload.position || payload.role || '',
        role: payload.role || payload.position || '',
        contact: payload.contact || '',
        email: payload.email || '',
        attendanceStatus: payload.attendanceStatus || (payload.status === 'On Duty' ? 'present' : (payload.status === 'Break' ? 'onBreak' : 'offDuty')),
        timeIn: payload.time || payload.time_in || payload.timeIn || '',
        timeOut: payload.timeOut || payload.time_out || '',
        updatedAt: now(),
      }
    }

    case 'attendance_events':
    case 'attendance':
    case 'scanEvents': {
      return {
        id,
        action: payload.action || 'Time In',
        staffId: String(payload.staffId || payload.staff_id || ''),
        staffName: payload.staffName || payload.name || payload.staff_name || '',
        time: payload.time || payload.event_time || '',
        updatedAt: now(),
      }
    }

    case 'user_accounts':
    case 'users': {
      const normalizedRole = String(payload.role || 'Customer').toLowerCase() === 'admin'
        ? 'admin'
        : String(payload.role || 'Customer').toLowerCase()
      return {
        id,
        uid: id,
        username: payload.username || (payload.email ? payload.email.split('@')[0] : ''),
        name: payload.name || payload.username || '',
        email: payload.email || '',
        phone: payload.phone || payload.contact || '',
        role: normalizedRole,
        title: normalizedRole === 'admin' ? 'Manager' : (payload.role || 'Customer'),
        status: payload.status || 'Active',
        updatedAt: now(),
      }
    }

    case 'settings':
    case 'preferences': {
      return {
        orderUpdatesPref: Boolean(payload.orders ?? payload.orderUpdatesPref),
        attendanceAlertsPref: Boolean(payload.attendance ?? payload.attendanceAlertsPref),
        loyaltyUpdatesPref: Boolean(payload.loyalty ?? payload.loyaltyUpdatesPref),
        receiptCopiesPref: Boolean(payload.receipts ?? payload.receiptCopiesPref),
        updatedAt: now(),
      }
    }

    default:
      return { id, ...payload, updatedAt: now() }
  }
}

// ── Queue Management ──────────────────────────────────────────────────────────

/**
 * Enqueue a record for offline or background retry.
 * Tracks 'rtdb' and 'firestore' separately.
 */
export async function enqueue(entityType, entityId, payload, operation = 'upsert', destination = 'rtdb') {
  try {
    const key = toFirebaseKey(entityId)
    await pool.execute(
      `INSERT INTO firebase_sync_queue
         (entity_type, entity_id, destination, operation, payload, status, attempt)
       VALUES (?, ?, ?, ?, ?, 'pending', 0)
       ON DUPLICATE KEY UPDATE
         operation = VALUES(operation),
         payload   = VALUES(payload),
         status    = 'pending',
         attempt   = 0,
         last_error = NULL`,
      [entityType, key, destination, operation, JSON.stringify(payload)],
    )
  } catch (error) {
    console.error(`[sync] enqueue(${destination}/${entityType}/${entityId}) failed:`, error.message)
  }
}

/** Mark a queued record as synced. */
async function markSynced(queueId) {
  await pool.execute(
    `UPDATE firebase_sync_queue
     SET status = 'synced', synced_at = NOW(), last_error = NULL
     WHERE queue_id = ?`,
    [queueId],
  )
}

/** Increment attempt counter; mark as 'failed' if max attempts reached. */
async function markFailed(queueId, errorMessage, attempt) {
  const nextStatus = attempt >= MAX_ATTEMPTS ? 'failed' : 'retrying'
  await pool.execute(
    `UPDATE firebase_sync_queue
     SET status = ?, attempt = ?, last_error = ?
     WHERE queue_id = ?`,
    [nextStatus, attempt, String(errorMessage).slice(0, 1000), queueId],
  )
}

// ── Low-Level Push Functions ──────────────────────────────────────────────────

/**
 * Push directly to Firebase Realtime Database.
 * Path: eateries/<entityType>/<key>
 */
export async function pushToFirebase(entityType, entityId, payload, operation = 'upsert') {
  const db = getDb()
  if (!db || !firebaseReady) return false
  try {
    const key = toFirebaseKey(entityId)
    const path = `eateries/${entityType}/${key}`
    if (operation === 'delete') {
      await db.ref(path).remove()
    } else {
      await db.ref(path).set({ ...payload, _syncedAt: now() })
    }
    return true
  } catch (error) {
    console.error(`[sync] pushToFirebase(${entityType}/${entityId}) failed:`, error.message)
    return false
  }
}

/**
 * Push directly to Firebase Cloud Firestore.
 * Collection: toFirestoreCollection(entityType)
 * Document ID: entityId
 */
export async function pushToFirestore(entityType, entityId, payload, operation = 'upsert') {
  const firestore = getFirestore()
  if (!firestore || !firebaseReady) return false
  try {
    const colName = toFirestoreCollection(entityType)
    const docId = String(entityId)
    const docRef = firestore.collection(colName).doc(docId)

    if (operation === 'delete') {
      await docRef.delete()
      console.log(`[firestore] Deleted ${colName}/${docId}`)
      return true
    }

    const docData = formatFirestoreDocument(entityType, entityId, payload)
    await docRef.set(docData, { merge: true })

    // If order has items, also synchronize individual order_items documents
    if (colName === 'orders' && docData.items && Array.isArray(docData.items)) {
      for (let idx = 0; idx < docData.items.length; idx++) {
        const it = docData.items[idx]
        const lineId = `${docId}_${idx + 1}`
        await firestore.collection('order_items').doc(lineId).set({
          id: lineId,
          orderNumber: docId,
          menuItemId: it.menuItemId || '',
          name: it.name || '',
          quantity: it.quantity || 1,
          price: it.price || 0,
          addon: it.addon || 'None',
          totalPrice: it.totalPrice || 0,
          updatedAt: now(),
        }, { merge: true }).catch(() => {})
      }
    }

    return true
  } catch (error) {
    console.error(`[firestore] pushToFirestore(${entityType}/${entityId}) failed:`, error.message)
    return false
  }
}

// ── Primary Dual Write-Through Engine ──────────────────────────────────────────

/**
 * Synchronize a record to both Firebase Realtime Database and Cloud Firestore.
 * Updates MySQL tracking columns (`firebase_sync_status`, `firestore_sync_status`).
 * If either destination fails, only the failed destination is queued for retry.
 */
export async function syncRecord(
  entityType,
  entityId,
  payload,
  operation = 'upsert',
  mysqlTable = null,
  mysqlPkColumn = null,
) {
  // Concurrently push to both cloud destinations
  const [rtdbOk, firestoreOk] = await Promise.all([
    pushToFirebase(entityType, entityId, payload, operation),
    pushToFirestore(entityType, entityId, payload, operation),
  ])

  // Update MySQL status columns if table provided
  if (mysqlTable && mysqlPkColumn) {
    try {
      const rtdbStatus = rtdbOk ? 'synced' : 'pending'
      const firestoreStatus = firestoreOk ? 'synced' : 'pending'
      await pool.execute(
        `UPDATE \`${mysqlTable}\`
         SET firebase_sync_status = ?,
             firebase_synced_at = IF(? = 'synced', NOW(), firebase_synced_at),
             firestore_sync_status = ?,
             firestore_synced_at = IF(? = 'synced', NOW(), firestore_synced_at)
         WHERE \`${mysqlPkColumn}\` = ?`,
        [rtdbStatus, rtdbStatus, firestoreStatus, firestoreStatus, entityId],
      )
    } catch {
      // Table may not have columns yet — silent
    }
  }

  // Queue failed destination(s) independently
  if (!rtdbOk) {
    await enqueue(entityType, entityId, payload, operation, 'rtdb')
  }
  if (!firestoreOk) {
    await enqueue(entityType, entityId, payload, operation, 'firestore')
  }

  return { rtdb: rtdbOk, firestore: firestoreOk }
}

// ── Full Snapshot Sync (PUT /api/state) ────────────────────────────────────────

/**
 * Sync a full application state snapshot to both RTDB and Cloud Firestore.
 */
export async function syncFullSnapshot(snapshot) {
  const db = getDb()
  const firestore = getFirestore()
  const ts = now()

  // 1. RTDB Sync
  let rtdbOk = false
  if (db && firebaseReady) {
    try {
      const updates = {}
      for (const [col, entityType] of [
        ['menu',           'menu_items'],
        ['orders',         'orders'],
        ['customers',      'customers'],
        ['staff',          'staff'],
        ['payments',       'payments'],
        ['rewards',        'rewards'],
        ['promotions',     'promotions'],
        ['notifications',  'notifications'],
        ['loyaltyHistory', 'loyalty_transactions'],
        ['scanEvents',     'attendance_events'],
      ]) {
        const items = snapshot[col]
        if (!Array.isArray(items)) continue
        for (const item of items) {
          const id = item.id ?? item.order_number ?? item.event_id ?? item.payment_number ?? item.customer_id
          if (id == null) continue
          const key = toFirebaseKey(id)
          updates[`eateries/${entityType}/${key}`] = { ...item, _syncedAt: ts }
        }
      }
      updates['eateries/profile']     = { ...snapshot.profile, _syncedAt: ts }
      updates['eateries/points']      = snapshot.points ?? 0
      updates['eateries/preferences'] = { ...snapshot.preferences, _syncedAt: ts }
      updates['eateries/syncMeta']    = { lastSyncedAt: ts, source: 'backend' }

      await db.ref().update(updates)
      rtdbOk = true
    } catch (err) {
      console.error('[sync] RTDB snapshot failed:', err.message)
    }
  }

  // 2. Cloud Firestore Sync (chunked batch commits)
  let firestoreOk = false
  if (firestore && firebaseReady) {
    try {
      let batch = firestore.batch()
      let ops = 0

      async function commitAndReset() {
        if (ops > 0) {
          await batch.commit()
          batch = firestore.batch()
          ops = 0
        }
      }

      for (const [col, entityType] of [
        ['menu',           'menu_items'],
        ['orders',         'orders'],
        ['customers',      'customers'],
        ['staff',          'staff'],
        ['payments',       'payments'],
        ['rewards',        'rewards'],
        ['promotions',     'promotions'],
        ['notifications',  'notifications'],
        ['loyaltyHistory', 'loyalty_transactions'],
        ['scanEvents',     'attendance_events'],
      ]) {
        const items = snapshot[col]
        if (!Array.isArray(items)) continue
        const colName = toFirestoreCollection(entityType)
        for (const item of items) {
          const id = item.id ?? item.order_number ?? item.event_id ?? item.payment_number ?? item.customer_id
          if (id == null) continue
          const docData = formatFirestoreDocument(entityType, id, item)
          const docRef = firestore.collection(colName).doc(String(id))
          batch.set(docRef, docData, { merge: true })
          ops++

          // For orders, also chunk write individual line items
          if (colName === 'orders' && docData.items && Array.isArray(docData.items)) {
            for (let idx = 0; idx < docData.items.length; idx++) {
              const it = docData.items[idx]
              const lineRef = firestore.collection('order_items').doc(`${id}_${idx + 1}`)
              batch.set(lineRef, {
                id: `${id}_${idx + 1}`,
                orderNumber: String(id),
                menuItemId: it.menuItemId || '',
                name: it.name || '',
                quantity: it.quantity || 1,
                price: it.price || 0,
                addon: it.addon || 'None',
                totalPrice: it.totalPrice || 0,
                updatedAt: ts,
              }, { merge: true })
              ops++
            }
          }

          if (ops >= 300) {
            await commitAndReset()
          }
        }
      }

      // App preferences in settings collection
      if (snapshot.preferences) {
        const prefData = formatFirestoreDocument('settings', 'app_preferences', snapshot.preferences)
        batch.set(firestore.collection('settings').doc('app_preferences'), prefData, { merge: true })
        ops++
      }

      await commitAndReset()
      firestoreOk = true
      console.log(`[sync] Firestore snapshot synced successfully at ${ts}`)
    } catch (err) {
      console.error('[sync] Firestore snapshot failed:', err.message)
    }
  }

  // Queue any destination that failed
  if (!rtdbOk || !firestoreOk) {
    const collections = [
      'menu', 'orders', 'customers', 'staff', 'payments',
      'rewards', 'promotions', 'notifications', 'loyaltyHistory', 'scanEvents',
    ]
    for (const col of collections) {
      const items = snapshot[col]
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const id = item.id ?? item.order_number ?? item.event_id
        if (id != null) {
          if (!rtdbOk) await enqueue(col, id, item, 'upsert', 'rtdb')
          if (!firestoreOk) await enqueue(col, id, item, 'upsert', 'firestore')
        }
      }
    }
  }

  return { rtdb: rtdbOk, firestore: firestoreOk }
}

// ── Per-Entity Helper Functions (CRUD Operations) ─────────────────────────────

export async function syncOrder(order) {
  return syncRecord('orders', order.id ?? order.order_number, order, 'upsert', 'orders', 'order_number')
}

export async function deleteOrder(orderNumber) {
  return syncRecord('orders', orderNumber, null, 'delete', 'orders', 'order_number')
}

export async function syncPayment(payment) {
  return syncRecord('payments', payment.id ?? payment.payment_number ?? payment.reference, payment, 'upsert', 'payments', 'payment_number')
}

export async function deletePayment(paymentNumber) {
  return syncRecord('payments', paymentNumber, null, 'delete', 'payments', 'payment_number')
}

export async function syncMenuItem(item) {
  return syncRecord('menu_items', item.id ?? item.menu_item_id, item, 'upsert', 'menu_items', 'menu_item_id')
}

export async function deleteMenuItem(menuItemId) {
  return syncRecord('menu_items', menuItemId, null, 'delete', 'menu_items', 'menu_item_id')
}

export async function syncCustomer(customer) {
  return syncRecord('customers', customer.id ?? customer.customer_id, customer, 'upsert', 'customers', 'customer_id')
}

export async function deleteCustomer(customerId) {
  return syncRecord('customers', customerId, null, 'delete', 'customers', 'customer_id')
}

export async function syncNotification(notification) {
  return syncRecord('notifications', notification.id ?? notification.notification_id, notification, 'upsert', 'notifications', 'notification_id')
}

export async function deleteNotification(notificationId) {
  return syncRecord('notifications', notificationId, null, 'delete', 'notifications', 'notification_id')
}

export async function syncAttendanceEvent(event) {
  return syncRecord('attendance_events', event.id ?? event.event_id, event, 'upsert', 'attendance_events', 'event_id')
}

export async function deleteAttendanceEvent(eventId) {
  return syncRecord('attendance_events', eventId, null, 'delete', 'attendance_events', 'event_id')
}

export async function syncStaff(person) {
  return syncRecord('staff', person.id ?? person.staff_id, person, 'upsert', 'staff', 'staff_id')
}

export async function deleteStaff(staffId) {
  return syncRecord('staff', staffId, null, 'delete', 'staff', 'staff_id')
}

export async function syncReward(reward) {
  return syncRecord('rewards', reward.id ?? reward.reward_id, reward, 'upsert', 'rewards', 'reward_id')
}

export async function deleteReward(rewardId) {
  return syncRecord('rewards', rewardId, null, 'delete', 'rewards', 'reward_id')
}

export async function syncPromotion(promo) {
  return syncRecord('promotions', promo.id ?? promo.promotion_id, promo, 'upsert', 'promotions', 'promotion_id')
}

export async function deletePromotion(promoId) {
  return syncRecord('promotions', promoId, null, 'delete', 'promotions', 'promotion_id')
}

export async function syncLoyaltyTransaction(tx) {
  return syncRecord('loyalty_transactions', tx.id ?? tx.transaction_id, tx, 'upsert', 'loyalty_transactions', 'transaction_id')
}

/**
 * Synchronize a user account record to both RTDB (eateries/user_accounts/{uid})
 * and Cloud Firestore (users/{uid}).
 */
export async function syncUserAccount(uid, accountData) {
  if (!uid) return false
  const [rtdbOk, firestoreOk] = await Promise.all([
    pushToFirebase('user_accounts', uid, accountData, 'upsert'),
    pushToFirestore('users', uid, accountData, 'upsert'),
  ])
  if (!rtdbOk) await enqueue('user_accounts', uid, accountData, 'upsert', 'rtdb')
  if (!firestoreOk) await enqueue('users', uid, accountData, 'upsert', 'firestore')
  return { rtdb: rtdbOk, firestore: firestoreOk }
}

/**
 * Pull a full MySQL user_accounts row and push it to both RTDB and Firestore.
 */
export async function syncUserAccountByEmail(email, uid) {
  if (!email || !uid) return false
  try {
    const [rows] = await pool.execute(
      `SELECT ua.username, ua.email, ua.role, ua.contact, ua.customer_id,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE ua.email = ? LIMIT 1`,
      [email],
    )
    const account = rows[0]
    if (!account) return false
    const record = {
      uid,
      username:  account.username,
      email:     account.email,
      name:      account.name,
      phone:     account.contact || '',
      role:      account.role,
      updatedAt: now(),
    }
    return await syncUserAccount(uid, record)
  } catch (error) {
    console.error(`[sync] syncUserAccountByEmail(${email}) failed:`, error.message)
    return false
  }
}

// ── Background Retry Queue Loop ───────────────────────────────────────────────

let retryTimer = null

/**
 * Flushes pending/retrying rows from firebase_sync_queue.
 * Processes 'rtdb' and 'firestore' rows independently.
 */
export async function flushSyncQueue() {
  if (!firebaseReady) return 0

  let processed = 0
  try {
    const [rows] = await pool.execute(
      `SELECT queue_id, entity_type, entity_id, destination, operation, payload, attempt
       FROM firebase_sync_queue
       WHERE status IN ('pending', 'retrying')
       ORDER BY created_at ASC
       LIMIT 100`,
    )

    for (const row of rows) {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      const isFirestore = row.destination === 'firestore'
      const ok = isFirestore
        ? await pushToFirestore(row.entity_type, row.entity_id, payload, row.operation)
        : await pushToFirebase(row.entity_type, row.entity_id, payload, row.operation)

      if (ok) {
        await markSynced(row.queue_id)
        processed++

        const tableMap = {
          orders: ['orders', 'order_number'],
          payments: ['payments', 'payment_number'],
          menu_items: ['menu_items', 'menu_item_id'],
          customers: ['customers', 'customer_id'],
          notifications: ['notifications', 'notification_id'],
          attendance_events: ['attendance_events', 'event_id'],
          staff: ['staff', 'staff_id'],
          rewards: ['rewards', 'reward_id'],
          promotions: ['promotions', 'promotion_id'],
          loyalty_transactions: ['loyalty_transactions', 'transaction_id'],
        }
        const mapping = tableMap[row.entity_type]
        if (mapping) {
          const colPrefix = isFirestore ? 'firestore' : 'firebase'
          pool.execute(
            `UPDATE \`${mapping[0]}\`
             SET ${colPrefix}_sync_status = 'synced', ${colPrefix}_synced_at = NOW()
             WHERE \`${mapping[1]}\` = ?`,
            [row.entity_id],
          ).catch(() => {})
        }
      } else {
        await markFailed(row.queue_id, `${row.destination} push failed`, row.attempt + 1)
      }
    }
  } catch (error) {
    console.error('[sync] flushSyncQueue error:', error.message)
  }

  return processed
}

/** Start background retry loop. */
export function startSyncRetryLoop() {
  if (retryTimer) return
  retryTimer = setInterval(async () => {
    if (!getFirebaseStatus().ready) return
    const count = await flushSyncQueue()
    if (count > 0) {
      console.log(`[sync] Retry loop flushed ${count} pending record(s) to cloud destinations.`)
    }
  }, RETRY_INTERVAL)
  console.log(`[sync] Retry loop started (interval: ${RETRY_INTERVAL / 1000}s)`)
}

/** Stop background retry loop. */
export function stopSyncRetryLoop() {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}

// ── Initial Full Sync: MySQL → RTDB + Firestore ───────────────────────────────

/**
 * Pushes ALL current MySQL records to both Firebase Realtime Database
 * and Firebase Cloud Firestore.
 */
export async function initialSyncFromMySQL() {
  const db = getDb()
  const firestore = getFirestore()

  if ((!db && !firestore) || !firebaseReady) {
    console.warn('[sync] initialSyncFromMySQL: Firebase not ready — skipping.')
    return { synced: 0, skipped: true }
  }

  const ts = now()
  const rtdbUpdates = {}
  let synced = 0

  let firestoreBatch = firestore ? firestore.batch() : null
  let firestoreOps = 0

  async function flushFirestoreBatch() {
    if (firestoreBatch && firestoreOps > 0) {
      await firestoreBatch.commit()
      firestoreBatch = firestore.batch()
      firestoreOps = 0
    }
  }

  try {
    // 1. menu_items
    const [menuRows] = await pool.execute(
      `SELECT menu_item_id AS id, name, category, price, description,
              image_url AS image, emoji, tone, available
       FROM menu_items ORDER BY menu_item_id`,
    )
    for (const row of menuRows) {
      const formatted = { ...row, available: Boolean(row.available), _syncedAt: ts }
      rtdbUpdates[`eateries/menu_items/${toFirebaseKey(row.id)}`] = formatted
      if (firestoreBatch) {
        const docRef = firestore.collection('menu_items').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('menu_items', row.id, formatted), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 2. orders
    const [orderRows] = await pool.execute(
      `SELECT order_number AS id, customer_id, customer_name AS customer,
              items_summary AS items, subtotal, service_charge AS serviceCharge,
              discount, total, order_type AS type, pickup_location AS pickupLocation,
              notes, payment_status AS payment, payment_method AS paymentMethod,
              status, time_label AS time, DATE_FORMAT(order_date,'%Y-%m-%d') AS date
       FROM orders ORDER BY created_at DESC LIMIT 500`,
    )

    // 3. order_items
    const [itemRows] = await pool.execute(
      `SELECT order_number, line_number, menu_item_id AS menuId,
              item_name AS name, quantity, unit_price AS price, addons
       FROM order_items ORDER BY order_number, line_number`,
    )
    const productsByOrder = {}
    for (const row of itemRows) {
      const key = toFirebaseKey(row.order_number)
      if (!productsByOrder[key]) productsByOrder[key] = {}
      productsByOrder[key][`line_${row.line_number}`] = {
        menuId: row.menuId,
        name: row.name,
        quantity: row.quantity,
        price: Number(row.price),
        addons: row.addons ?? [],
      }

      if (firestoreBatch) {
        const lineId = `${row.order_number}_${row.line_number}`
        const lineRef = firestore.collection('order_items').doc(lineId)
        firestoreBatch.set(lineRef, {
          id: lineId,
          orderNumber: String(row.order_number),
          menuItemId: String(row.menuId || ''),
          name: row.name,
          quantity: Number(row.quantity),
          price: Number(row.price),
          addon: Array.isArray(row.addons) ? row.addons.join(', ') : 'None',
          totalPrice: Number(row.price) * Number(row.quantity),
          updatedAt: ts,
        }, { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
    }

    for (const row of orderRows) {
      const key = toFirebaseKey(row.id)
      const orderData = {
        ...row,
        products: productsByOrder[key] || {},
        _syncedAt: ts,
      }
      rtdbUpdates[`eateries/orders/${key}`] = orderData
      if (firestoreBatch) {
        const docRef = firestore.collection('orders').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('orders', row.id, orderData), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 4. payments
    const [paymentRows] = await pool.execute(
      `SELECT payment_number AS id, order_number AS orderId, method,
              amount, amount_paid AS amountPaid, change_amount AS changeAmount,
              status, reference FROM payments ORDER BY created_at DESC LIMIT 500`,
    )
    for (const row of paymentRows) {
      const key = toFirebaseKey(row.reference || row.id)
      rtdbUpdates[`eateries/payments/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('payments').doc(key)
        firestoreBatch.set(docRef, formatFirestoreDocument('payments', key, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 5. customers
    const [customerRows] = await pool.execute(
      `SELECT customer_id AS id, name, email, contact,
              orders_count AS orders, total_spend AS spend, points, status
       FROM customers ORDER BY customer_id`,
    )
    for (const row of customerRows) {
      const key = toFirebaseKey(row.id)
      rtdbUpdates[`eateries/customers/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('customers').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('customers', row.id, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 6. staff
    const [staffRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status,
              time_in AS time, time_out AS timeOut FROM staff ORDER BY staff_id`,
    )
    for (const row of staffRows) {
      const key = toFirebaseKey(row.id)
      const email = (row.contact && row.contact.includes('@')) ? row.contact : ''
      const staffRecord = { ...row, email, _syncedAt: ts }
      rtdbUpdates[`eateries/staff/${key}`] = staffRecord
      if (firestoreBatch) {
        const docRef = firestore.collection('staff').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('staff', row.id, staffRecord), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 7. rewards
    const [rewardRows] = await pool.execute(
      `SELECT reward_id AS id, name, description, points_required AS points,
              available FROM rewards ORDER BY reward_id`,
    )
    for (const row of rewardRows) {
      const key = toFirebaseKey(row.id)
      const formatted = { ...row, available: Boolean(row.available), _syncedAt: ts }
      rtdbUpdates[`eateries/rewards/${key}`] = formatted
      if (firestoreBatch) {
        const docRef = firestore.collection('loyalty_rewards').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('loyalty_rewards', row.id, formatted), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 8. promotions
    const [promoRows] = await pool.execute(
      `SELECT promotion_id AS id, name, detail, status FROM promotions ORDER BY promotion_id`,
    )
    for (const row of promoRows) {
      const key = toFirebaseKey(row.id)
      rtdbUpdates[`eateries/promotions/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('promotions').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('promotions', row.id, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 9. notifications
    const [notifRows] = await pool.execute(
      `SELECT notification_id AS id, title, detail, audience, time_label AS time,
              is_read AS isRead FROM notifications ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of notifRows) {
      const key = toFirebaseKey(row.id)
      rtdbUpdates[`eateries/notifications/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('notifications').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('notifications', row.id, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 10. loyalty_transactions
    const [loyaltyRows] = await pool.execute(
      `SELECT transaction_id AS id, customer_id, detail,
              points_delta AS delta, date_label AS date
       FROM loyalty_transactions ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of loyaltyRows) {
      const key = toFirebaseKey(row.id)
      rtdbUpdates[`eateries/loyalty_transactions/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('loyalty_transactions').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('loyalty_transactions', row.id, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 11. attendance_events
    const [attendRows] = await pool.execute(
      `SELECT event_id AS id, staff_id AS staffId, staff_name AS name,
              event_time AS time, action
       FROM attendance_events ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of attendRows) {
      const key = toFirebaseKey(row.id)
      rtdbUpdates[`eateries/attendance_events/${key}`] = { ...row, _syncedAt: ts }
      if (firestoreBatch) {
        const docRef = firestore.collection('attendance').doc(String(row.id))
        firestoreBatch.set(docRef, formatFirestoreDocument('attendance', row.id, row), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 12. app_profiles & preferences
    const [profileRows] = await pool.execute(
      `SELECT name, email, phone, loyalty_points AS points
       FROM app_profiles WHERE profile_id = 1`,
    )
    if (profileRows[0]) {
      rtdbUpdates['eateries/profile'] = { ...profileRows[0], _syncedAt: ts }
      synced++
    }

    // 13. user_accounts
    const [accountRows] = await pool.execute(
      `SELECT ua.firebase_uid AS uid, ua.username, ua.email, ua.role, ua.contact,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE ua.firebase_uid IS NOT NULL AND ua.firebase_uid != ''
       ORDER BY ua.account_id`,
    )
    for (const row of accountRows) {
      const key = toFirebaseKey(row.uid)
      const userRecord = {
        uid:       row.uid,
        username:  row.username,
        email:     row.email,
        name:      row.name,
        phone:     row.contact || '',
        role:      row.role,
        _syncedAt: ts,
      }
      rtdbUpdates[`eateries/user_accounts/${key}`] = userRecord
      if (firestoreBatch) {
        const docRef = firestore.collection('users').doc(String(row.uid))
        firestoreBatch.set(docRef, formatFirestoreDocument('users', row.uid, userRecord), { merge: true })
        firestoreOps++
        if (firestoreOps >= 300) await flushFirestoreBatch()
      }
      synced++
    }

    // 14. Commit RTDB updates
    if (db) {
      rtdbUpdates['eateries/syncMeta'] = {
        lastSyncedAt: ts,
        recordCount: synced,
        source: 'initialSyncFromMySQL',
      }
      await db.ref().update(rtdbUpdates)
    }

    // 15. Commit remaining Firestore batch
    if (firestoreBatch) {
      await flushFirestoreBatch()
    }

    // 16. Update MySQL status columns for all synced tables
    const syncStatusTables = [
      'orders',
      'menu_items',
      'customers',
      'staff',
      'payments',
      'rewards',
      'promotions',
      'notifications',
      'attendance_events',
      'loyalty_transactions',
      'user_accounts',
    ]

    for (const tbl of syncStatusTables) {
      await pool.execute(
        `UPDATE \`${tbl}\`
         SET firebase_sync_status = 'synced',
             firebase_synced_at = NOW(),
             firestore_sync_status = 'synced',
             firestore_synced_at = NOW()`,
      ).catch(() => {})
    }

    console.log(`[sync] Initial dual sync complete — ${synced} records pushed to RTDB + Firestore at ${ts}`)
    return { synced, skipped: false, syncedAt: ts }

  } catch (error) {
    console.error('[sync] initialSyncFromMySQL failed:', error.message)
    return { synced, skipped: false, error: error.message }
  }
}

// ── Queue Statistics Summary ──────────────────────────────────────────────────

/**
 * Returns breakdown of pending, retrying, synced, and failed items
 * across RTDB, Firestore, and total.
 */
export async function getSyncQueueStats() {
  try {
    const [rows] = await pool.execute(
      `SELECT destination, status, COUNT(*) AS count
       FROM firebase_sync_queue
       GROUP BY destination, status`,
    )
    const result = {
      pending: 0,
      retrying: 0,
      synced: 0,
      failed: 0,
      rtdb: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      firestore: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      total: { pending: 0, retrying: 0, synced: 0, failed: 0 },
    }
    for (const row of rows) {
      const dest = row.destination === 'firestore' ? 'firestore' : 'rtdb'
      const cnt = Number(row.count)
      if (result[dest]) result[dest][row.status] = cnt
      result.total[row.status] = (result.total[row.status] || 0) + cnt
      result[row.status] = (result[row.status] || 0) + cnt
    }
    return result
  } catch {
    return {
      pending: 0, retrying: 0, synced: 0, failed: 0,
      rtdb: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      firestore: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      total: { pending: 0, retrying: 0, synced: 0, failed: 0 },
    }
  }
}
