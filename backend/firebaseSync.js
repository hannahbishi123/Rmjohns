/**
 * firebaseSync.js — Hybrid MySQL + Firebase sync engine
 *
 * Architecture:
 *   1. Every write goes to MySQL first (source of truth).
 *   2. This module then pushes the same record to Firebase Realtime DB.
 *   3. If Firebase is unavailable, the record is queued in `firebase_sync_queue`.
 *   4. A background retry loop processes the queue every RETRY_INTERVAL ms.
 *   5. Sync status (pending / synced / failed) is tracked per record in MySQL.
 *
 * Rules:
 *   - Firebase failure NEVER blocks or delays a MySQL response.
 *   - Duplicate records are prevented by using MySQL primary keys as Firebase keys.
 *   - Keys containing characters illegal in Firebase paths are sanitised.
 */

import { pool } from './database.js'
import { firebaseReady, getFirebaseStatus } from './firebase.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Retry the queue every 30 seconds when Firebase is reachable
const RETRY_INTERVAL = 30_000
// Maximum sync attempts before marking a record as 'failed'
const MAX_ATTEMPTS = 5

// ── Self-healing table creation ───────────────────────────────────────────────

/**
 * Ensure the firebase_sync_queue table exists.
 * Called on startup so the system works even if the migration SQL has not
 * been run yet in phpMyAdmin.
 */
export async function ensureSyncTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`firebase_sync_queue\` (
        \`queue_id\`    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
        \`entity_type\` VARCHAR(64)      NOT NULL,
        \`entity_id\`   VARCHAR(64)      NOT NULL,
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
    console.log('[sync] firebase_sync_queue table ready.')
  } catch (error) {
    console.error('[sync] Could not create firebase_sync_queue:', error.message)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sanitise a string so it can be used as a Firebase Realtime DB key. */
function toFirebaseKey(raw) {
  return String(raw).replace(/[.#$[\]/]/g, '_')
}

/** Get the firebase-admin database instance (lazy — only after initFirebase). */
function getDb() {
  try {
    const admin = require('firebase-admin')
    return admin.apps.length ? admin.database() : null
  } catch {
    return null
  }
}

/** ISO timestamp helper. */
function now() {
  return new Date().toISOString()
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

/**
 * Enqueue a record for Firebase sync.
 * If the entity already has a pending/retrying entry it is replaced (upsert).
 *
 * @param {string} entityType  - e.g. 'order', 'menu_item', 'payment'
 * @param {string|number} entityId - MySQL primary key
 * @param {object} payload     - the full record to write to Firebase
 * @param {'upsert'|'delete'} operation
 */
export async function enqueue(entityType, entityId, payload, operation = 'upsert') {
  try {
    const key = toFirebaseKey(entityId)
    // Replace existing pending/retrying entry for the same entity (avoids pile-up)
    await pool.execute(
      `INSERT INTO firebase_sync_queue
         (entity_type, entity_id, operation, payload, status, attempt)
       VALUES (?, ?, ?, ?, 'pending', 0)
       ON DUPLICATE KEY UPDATE
         operation = VALUES(operation),
         payload   = VALUES(payload),
         status    = 'pending',
         attempt   = 0,
         last_error = NULL`,
      [entityType, key, operation, JSON.stringify(payload)],
    )
  } catch (error) {
    // Queue insert failure is logged but never thrown — MySQL data is already safe
    console.error(`[sync] enqueue(${entityType}/${entityId}) failed:`, error.message)
  }
}

/**
 * Mark a queued record as synced.
 */
async function markSynced(queueId) {
  await pool.execute(
    `UPDATE firebase_sync_queue
     SET status = 'synced', synced_at = NOW(), last_error = NULL
     WHERE queue_id = ?`,
    [queueId],
  )
}

/**
 * Increment attempt counter; mark as 'failed' if max attempts reached.
 */
async function markFailed(queueId, errorMessage, attempt) {
  const nextStatus = attempt >= MAX_ATTEMPTS ? 'failed' : 'retrying'
  await pool.execute(
    `UPDATE firebase_sync_queue
     SET status = ?, attempt = ?, last_error = ?
     WHERE queue_id = ?`,
    [nextStatus, attempt, String(errorMessage).slice(0, 1000), queueId],
  )
}

// ── Core sync function ────────────────────────────────────────────────────────

/**
 * Push a single item directly to Firebase (bypasses the queue).
 * Returns true on success, false on failure.
 *
 * Firebase path:  eateries/<entityType>/<entityKey>
 *
 * @param {string} entityType
 * @param {string|number} entityId
 * @param {object} payload
 * @param {'upsert'|'delete'} operation
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

// ── Primary write-through helper ──────────────────────────────────────────────

/**
 * Write a record to Firebase immediately.
 * If Firebase is down, queue it for later retry.
 * Also updates the per-row sync status columns on supported tables.
 *
 * Call this AFTER a successful MySQL write — never before.
 *
 * @param {string} entityType   - matches Firebase path segment + table hint
 * @param {string|number} entityId
 * @param {object} payload      - the serialised record
 * @param {'upsert'|'delete'} operation
 * @param {string|null} mysqlTable - if provided, updates firebase_sync_status on that table
 * @param {string|null} mysqlPkColumn - primary key column name for the table update
 */
export async function syncRecord(entityType, entityId, payload, operation = 'upsert', mysqlTable = null, mysqlPkColumn = null) {
  const synced = await pushToFirebase(entityType, entityId, payload, operation)

  if (mysqlTable && mysqlPkColumn) {
    try {
      if (synced) {
        await pool.execute(
          `UPDATE \`${mysqlTable}\`
           SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
           WHERE \`${mysqlPkColumn}\` = ?`,
          [entityId],
        )
      } else {
        await pool.execute(
          `UPDATE \`${mysqlTable}\`
           SET firebase_sync_status = 'pending'
           WHERE \`${mysqlPkColumn}\` = ?`,
          [entityId],
        )
      }
    } catch {
      // Table may not have the sync columns yet (migration not run) — silent
    }
  }

  if (!synced) {
    await enqueue(entityType, entityId, payload, operation)
  }
}

// ── Snapshot sync (full state push — replaces existing syncSnapshot) ───────────

/**
 * Sync a full application snapshot to Firebase.
 * Writes to the eateries/ tree so listeners on individual collections get updates.
 * Also writes a daily backup under backups/<YYYY-MM-DD>/.
 */
export async function syncFullSnapshot(snapshot) {
  const db = getDb()
  if (!db || !firebaseReady) {
    // Queue each collection individually so they retry independently
    const collections = ['menu', 'orders', 'customers', 'staff', 'payments', 'rewards',
      'promotions', 'notifications', 'loyaltyHistory', 'scanEvents']
    for (const col of collections) {
      const items = snapshot[col]
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const id = item.id ?? item.order_number ?? item.event_id
        if (id != null) await enqueue(col, id, item)
      }
    }
    return false
  }

  try {
    const ts = now()
    const updates = {}

    // Write each record under its stable primary key
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
        const id = item.id ?? item.order_number ?? item.event_id
        if (id == null) continue
        const key = toFirebaseKey(id)
        updates[`eateries/${entityType}/${key}`] = { ...item, _syncedAt: ts }
      }
    }

    // Profile and app-level fields
    updates['eateries/profile']   = { ...snapshot.profile, _syncedAt: ts }
    updates['eateries/points']    = snapshot.points ?? 0
    updates['eateries/syncMeta']  = { lastSyncedAt: ts, source: 'backend' }

    await db.ref().update(updates)

    // Daily backup (non-blocking)
    const dateKey = ts.slice(0, 10)
    db.ref(`backups/${dateKey}`).set({
      ...updates,
      _backedUpAt: ts,
    }).catch(() => {})

    console.log(`[sync] Full snapshot synced at ${ts}`)
    return true
  } catch (error) {
    console.error('[sync] syncFullSnapshot failed:', error.message)
    return false
  }
}

// ── Per-entity helpers (called from API routes) ───────────────────────────────

export async function syncOrder(order) {
  return syncRecord('orders', order.id ?? order.order_number, order, 'upsert', 'orders', 'order_number')
}

export async function syncPayment(payment) {
  return syncRecord('payments', payment.id ?? payment.payment_number, payment, 'upsert', 'payments', 'payment_number')
}

export async function syncMenuItem(item) {
  return syncRecord('menu_items', item.id ?? item.menu_item_id, item, 'upsert', 'menu_items', 'menu_item_id')
}

export async function syncCustomer(customer) {
  return syncRecord('customers', customer.id ?? customer.customer_id, customer, 'upsert', 'customers', 'customer_id')
}

export async function syncNotification(notification) {
  return syncRecord('notifications', notification.id ?? notification.notification_id, notification, 'upsert', 'notifications', 'notification_id')
}

export async function syncAttendanceEvent(event) {
  return syncRecord('attendance_events', event.id ?? event.event_id, event, 'upsert', 'attendance_events', 'event_id')
}

export async function syncStaff(person) {
  return syncRecord('staff', person.id ?? person.staff_id, person, 'upsert', 'staff', 'staff_id')
}

/**
 * Sync a user account record to Firebase Realtime DB.
 * Writes to eateries/user_accounts/{uid} — the role source-of-truth for the
 * live domain login path.  Safe to call for Customer, Staff, and Admin roles.
 *
 * @param {string} uid          - Firebase Auth UID
 * @param {object} accountData  - { uid, username, email, name, phone, role, ... }
 */
export async function syncUserAccount(uid, accountData) {
  if (!uid) return false
  // user_accounts in Firebase are keyed by uid, not a MySQL integer PK,
  // so we bypass the MySQL sync-status columns (they don't exist on this path).
  return pushToFirebase('user_accounts', uid, accountData, 'upsert')
}

/**
 * Pull a full MySQL user_accounts row and push it to Firebase.
 * Convenience wrapper for /api/auth/login and /api/auth/link-uid.
 *
 * @param {string} email
 * @param {string} uid   - Firebase Auth UID
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
    return pushToFirebase('user_accounts', uid, {
      uid,
      username:  account.username,
      email:     account.email,
      name:      account.name,
      phone:     account.contact || '',
      role:      account.role,
      updatedAt: now(),
    }, 'upsert')
  } catch (error) {
    console.error(`[sync] syncUserAccountByEmail(${email}) failed:`, error.message)
    return false
  }
}

// ── Retry loop ────────────────────────────────────────────────────────────────

let retryTimer = null

/**
 * Process pending/retrying rows in firebase_sync_queue.
 * Called by the retry loop and on startup once Firebase connects.
 */
export async function flushSyncQueue() {
  if (!firebaseReady) return 0

  let processed = 0
  try {
    const [rows] = await pool.execute(
      `SELECT queue_id, entity_type, entity_id, operation, payload, attempt
       FROM firebase_sync_queue
       WHERE status IN ('pending', 'retrying')
       ORDER BY created_at ASC
       LIMIT 100`,
    )

    for (const row of rows) {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      const ok = await pushToFirebase(row.entity_type, row.entity_id, payload, row.operation)

      if (ok) {
        await markSynced(row.queue_id)
        processed++
        // Also update the per-row sync status on the original table
        const tableMap = {
          orders: ['orders', 'order_number'],
          payments: ['payments', 'payment_number'],
          menu_items: ['menu_items', 'menu_item_id'],
          customers: ['customers', 'customer_id'],
          notifications: ['notifications', 'notification_id'],
          attendance_events: ['attendance_events', 'event_id'],
          staff: ['staff', 'staff_id'],
        }
        const mapping = tableMap[row.entity_type]
        if (mapping) {
          pool.execute(
            `UPDATE \`${mapping[0]}\`
             SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
             WHERE \`${mapping[1]}\` = ?`,
            [row.entity_id],
          ).catch(() => {})
        }
      } else {
        await markFailed(row.queue_id, 'Firebase push failed', row.attempt + 1)
      }
    }
  } catch (error) {
    console.error('[sync] flushSyncQueue error:', error.message)
  }

  return processed
}

/**
 * Start the background retry loop.
 * Call once after initFirebase() in index.js.
 */
export function startSyncRetryLoop() {
  if (retryTimer) return // already running
  retryTimer = setInterval(async () => {
    if (!getFirebaseStatus().ready) return
    const count = await flushSyncQueue()
    if (count > 0) {
      console.log(`[sync] Retry loop flushed ${count} pending record(s) to Firebase.`)
    }
  }, RETRY_INTERVAL)
  console.log(`[sync] Retry loop started (interval: ${RETRY_INTERVAL / 1000}s)`)
}

/**
 * Stop the retry loop (for clean shutdown).
 */
export function stopSyncRetryLoop() {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
}

// ── Initial full sync: MySQL → Firebase ───────────────────────────────────────

/**
 * Read every table from MySQL and push it to Firebase.
 * Called once on backend startup (after Firebase connects) and via
 * POST /api/sync/initial for manual re-sync.
 *
 * This is what "connects" the local database to the live database.
 * Each record is written under its stable MySQL primary key so there
 * are no duplicates.
 */
export async function initialSyncFromMySQL() {
  const db = getDb()
  if (!db || !firebaseReady) {
    console.warn('[sync] initialSyncFromMySQL: Firebase not ready — skipping.')
    return { synced: 0, skipped: true }
  }

  const ts = now()
  const updates = {}
  let synced = 0

  try {
    // ── menu_items ────────────────────────────────────────────────────────────
    const [menuRows] = await pool.execute(
      `SELECT menu_item_id AS id, name, category, price, description,
              emoji, tone, available FROM menu_items ORDER BY menu_item_id`,
    )
    for (const row of menuRows) {
      updates[`eateries/menu_items/${toFirebaseKey(row.id)}`] = { ...row, available: Boolean(row.available), _syncedAt: ts }
      synced++
    }

    // ── orders ────────────────────────────────────────────────────────────────
    const [orderRows] = await pool.execute(
      `SELECT order_number AS id, customer_id, customer_name AS customer,
              items_summary AS items, subtotal, service_charge AS serviceCharge,
              discount, total, order_type AS type, pickup_location AS pickupLocation,
              notes, payment_status AS payment, payment_method AS paymentMethod,
              status, time_label AS time, DATE_FORMAT(order_date,'%Y-%m-%d') AS date
       FROM orders ORDER BY created_at DESC LIMIT 500`,
    )
    for (const row of orderRows) {
      updates[`eateries/orders/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── order_items (nested under each order) ─────────────────────────────────
    const [itemRows] = await pool.execute(
      `SELECT order_number, line_number, menu_item_id AS menuId,
              item_name AS name, quantity, unit_price AS price, addons
       FROM order_items ORDER BY order_number, line_number`,
    )
    // Merge products directly into the order object to avoid ancestor-path conflict
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
    }
    // Embed products into already-queued order objects
    for (const [orderKey, products] of Object.entries(productsByOrder)) {
      const orderPath = `eateries/orders/${orderKey}`
      if (updates[orderPath]) {
        updates[orderPath] = { ...updates[orderPath], products }
      }
      // If the order isn't in updates (e.g. LIMIT cut it off), skip silently
    }

    // ── payments ──────────────────────────────────────────────────────────────
    const [paymentRows] = await pool.execute(
      `SELECT payment_number AS id, order_number AS orderId, method,
              amount, amount_paid AS amountPaid, change_amount AS changeAmount,
              status, reference FROM payments ORDER BY created_at DESC LIMIT 500`,
    )
    for (const row of paymentRows) {
      updates[`eateries/payments/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── customers ─────────────────────────────────────────────────────────────
    const [customerRows] = await pool.execute(
      `SELECT customer_id AS id, name, email, contact,
              orders_count AS orders, total_spend AS spend, points, status
       FROM customers ORDER BY customer_id`,
    )
    for (const row of customerRows) {
      updates[`eateries/customers/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── staff ─────────────────────────────────────────────────────────────────
    const [staffRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status,
              time_in AS time, time_out AS timeOut FROM staff ORDER BY staff_id`,
    )
    for (const row of staffRows) {
      updates[`eateries/staff/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── rewards ───────────────────────────────────────────────────────────────
    const [rewardRows] = await pool.execute(
      `SELECT reward_id AS id, name, description, points_required AS points,
              available FROM rewards ORDER BY reward_id`,
    )
    for (const row of rewardRows) {
      updates[`eateries/rewards/${toFirebaseKey(row.id)}`] = { ...row, available: Boolean(row.available), _syncedAt: ts }
      synced++
    }

    // ── promotions ────────────────────────────────────────────────────────────
    const [promoRows] = await pool.execute(
      `SELECT promotion_id AS id, name, detail, status FROM promotions ORDER BY promotion_id`,
    )
    for (const row of promoRows) {
      updates[`eateries/promotions/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── notifications ─────────────────────────────────────────────────────────
    const [notifRows] = await pool.execute(
      `SELECT notification_id AS id, title, detail, audience, time_label AS time,
              is_read AS isRead FROM notifications ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of notifRows) {
      updates[`eateries/notifications/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── loyalty_transactions ──────────────────────────────────────────────────
    const [loyaltyRows] = await pool.execute(
      `SELECT transaction_id AS id, customer_id, detail,
              points_delta AS delta, date_label AS date
       FROM loyalty_transactions ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of loyaltyRows) {
      updates[`eateries/loyalty_transactions/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── attendance_events ─────────────────────────────────────────────────────
    const [attendRows] = await pool.execute(
      `SELECT event_id AS id, staff_id AS staffId, staff_name AS name,
              event_time AS time, action
       FROM attendance_events ORDER BY created_at DESC LIMIT 200`,
    )
    for (const row of attendRows) {
      updates[`eateries/attendance_events/${toFirebaseKey(row.id)}`] = { ...row, _syncedAt: ts }
      synced++
    }

    // ── app profile ───────────────────────────────────────────────────────────
    const [profileRows] = await pool.execute(
      `SELECT name, email, phone, loyalty_points AS points
       FROM app_profiles WHERE profile_id = 1`,
    )
    if (profileRows[0]) {
      updates['eateries/profile'] = { ...profileRows[0], _syncedAt: ts }
      synced++
    }

    // ── user_accounts (role source-of-truth for live domain) ──────────────────
    // Only push accounts that have a firebase_uid — those without haven't signed
    // in yet and have no node to write to in Firebase.
    const [accountRows] = await pool.execute(
      `SELECT ua.firebase_uid AS uid, ua.username, ua.email, ua.role, ua.contact,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE ua.firebase_uid IS NOT NULL AND ua.firebase_uid != ''
       ORDER BY ua.account_id`,
    )
    for (const row of accountRows) {
      updates[`eateries/user_accounts/${toFirebaseKey(row.uid)}`] = {
        uid:      row.uid,
        username: row.username,
        email:    row.email,
        name:     row.name,
        phone:    row.contact || '',
        role:     row.role,
        _syncedAt: ts,
      }
      synced++
    }

    // ── sync metadata ─────────────────────────────────────────────────────────
    updates['eateries/syncMeta'] = {
      lastSyncedAt: ts,
      recordCount: synced,
      source: 'initialSyncFromMySQL',
    }

    // Push everything to Firebase in one atomic multi-path update
    await db.ref().update(updates)

    // Mark all relevant rows as synced in MySQL (best-effort)
    await pool.execute(
      `UPDATE orders SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE payments SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE menu_items SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE customers SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE staff SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE notifications SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})
    await pool.execute(
      `UPDATE attendance_events SET firebase_sync_status = 'synced', firebase_synced_at = NOW()
       WHERE firebase_sync_status != 'synced'`,
    ).catch(() => {})

    console.log(`[sync] Initial sync complete — ${synced} records pushed to Firebase at ${ts}`)
    return { synced, skipped: false, syncedAt: ts }

  } catch (error) {
    console.error('[sync] initialSyncFromMySQL failed:', error.message)
    return { synced, skipped: false, error: error.message }
  }
}

// ── Sync status summary (for the /api/sync/status endpoint) ──────────────────

export async function getSyncQueueStats() {
  try {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM firebase_sync_queue
       GROUP BY status`,
    )
    const stats = { pending: 0, retrying: 0, synced: 0, failed: 0 }
    for (const row of rows) stats[row.status] = Number(row.count)
    return stats
  } catch {
    return null
  }
}
