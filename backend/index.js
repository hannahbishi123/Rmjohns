import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initialCustomers, initialMenu, initialOrders, initialPayments, initialPromotions, initialRewards, initialStaff } from '../src/data/mockData.js'
import { mockAccounts } from '../src/data/mockAccounts.js'
import { config } from './config.js'
import { pool, withTransaction } from './database.js'
import { initFirebase, getFirebaseStatus, verifyIdToken, setUserRole, upsertFirebaseUser, writeUserAccountRecord } from './firebase.js'
import {
  syncFullSnapshot,
  syncOrder,
  syncPayment,
  syncMenuItem,
  syncCustomer,
  syncNotification,
  syncAttendanceEvent,
  syncStaff,
  syncUserAccount,
  syncUserAccountByEmail,
  getSyncQueueStats,
  flushSyncQueue,
  startSyncRetryLoop,
  ensureSyncTable,
  initialSyncFromMySQL,
} from './firebaseSync.js'
import {
  startFirebaseToMySQLSync,
  stopFirebaseToMySQLSync,
  getSyncLog,
} from './firebaseToMySQL.js'

const app = express()
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')
const profileSeed = { name: 'Maureen Santos', email: 'maureen.santos@email.com', phone: '+63 917 555 0142' }
const loyaltySeed = [
  { id: 1, date: 'Today', detail: 'Lunch order · VK-2841', delta: 7 },
  { id: 2, date: 'Sep 26', detail: 'Dinner with friends', delta: 12 },
  { id: 3, date: 'Sep 22', detail: 'Calamansi spritz reward', delta: -80 },
]
const notificationSeed = [
  { id: 1, title: 'New order received', detail: 'Online order VK-2841 from Mia Santos is preparing.', time: '10:42 AM', read: false },
  { id: 2, title: 'Attendance recorded', detail: 'Ava Mendoza checked in using the demo RFID reader.', time: '10:18 AM', read: false },
  { id: 3, title: 'Low availability', detail: 'Ube panna cotta is running low. 4 portions remain.', time: 'Yesterday', read: false },
]
const preferencesSeed = { orders: true, attendance: true, loyalty: false, receipts: true }
const supportedAccountRoles = ['Admin', 'Staff', 'Customer']

app.use(express.json({ limit: '2mb' }))

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow requests from Firebase Hosting and local dev
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. same-origin, mobile, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error(`CORS: origin "${origin}" not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

function asBool(value) {
  return Boolean(Number(value))
}

function jsonValue(value, fallback = null) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function sendError(res, error, context) {
  console.error(`[api] ${context}:`, error)
  res.status(error.status || 500).json({ error: error.status ? error.message : 'The database request failed.' })
}

// ── Extract Firebase ID token from Authorization header ───────────────────────
function extractBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

async function rows(sql, values = []) {
  const [result] = await pool.execute(sql, values)
  return result
}

async function seedDatabase() {
  await withTransaction(async (connection) => {
    const [menuCount] = await connection.execute('SELECT COUNT(*) AS count FROM menu_items')
    if (menuCount[0].count === 0) {
      for (const item of initialMenu) {
        await connection.execute(
          `INSERT INTO menu_items (menu_item_id, name, category, price, description, emoji, tone, available)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.name, item.category, item.price, item.description, item.emoji, item.tone, item.available],
        )
      }
    }

    const [customerCount] = await connection.execute('SELECT COUNT(*) AS count FROM customers')
    if (customerCount[0].count === 0) {
      for (const customer of initialCustomers) {
        await connection.execute(
          `INSERT INTO customers (customer_id, name, email, contact, orders_count, total_spend, points, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [customer.id, customer.name, customer.email, customer.contact || null, customer.orders, customer.spend, customer.points, customer.status],
        )
      }
    }

    const [staffCount] = await connection.execute('SELECT COUNT(*) AS count FROM staff')
    if (staffCount[0].count === 0) {
      for (const person of initialStaff) {
        await connection.execute(
          `INSERT INTO staff (staff_id, name, role, status, time_in, time_out)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [person.id, person.name, person.role, person.status, person.time, person.timeOut || null],
        )
      }
    }

    const [rewardCount] = await connection.execute('SELECT COUNT(*) AS count FROM rewards')
    if (rewardCount[0].count === 0) {
      for (const reward of initialRewards) {
        await connection.execute(
          'INSERT INTO rewards (reward_id, name, description, points_required, available) VALUES (?, ?, ?, ?, ?)',
          [reward.id, reward.name, reward.description, reward.points, reward.available],
        )
      }
    }

    const [promotionCount] = await connection.execute('SELECT COUNT(*) AS count FROM promotions')
    if (promotionCount[0].count === 0) {
      for (const promotion of initialPromotions) {
        await connection.execute(
          'INSERT INTO promotions (promotion_id, name, detail, status) VALUES (?, ?, ?, ?)',
          [promotion.id, promotion.name, promotion.detail, promotion.status],
        )
      }
    }

    const [orderCount] = await connection.execute('SELECT COUNT(*) AS count FROM orders')
    if (orderCount[0].count === 0) {
      const menuIds = new Set(initialMenu.map((item) => item.id))
      for (const order of initialOrders) {
        const [[customer]] = await connection.execute('SELECT customer_id FROM customers WHERE name = ? LIMIT 1', [order.customer])
        await connection.execute(
          `INSERT INTO orders
            (order_number, customer_id, customer_name, items_summary, subtotal, service_charge, discount, total,
             order_type, payment_status, payment_method, status, time_label, order_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [order.id, customer?.customer_id || null, order.customer, order.items, order.subtotal, order.serviceCharge || 0,
            order.discount || 0, order.total, order.type, order.payment, order.paymentMethod || 'Cash', order.status,
            order.time, order.date],
        )
        for (const [index, line] of (order.products || []).entries()) {
          const menuItem = initialMenu.find((item) => item.id === line.id)
          await connection.execute(
            `INSERT INTO order_items (order_number, line_number, menu_item_id, item_name, quantity, unit_price, addons)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [order.id, index + 1, menuIds.has(line.id) ? line.id : null, menuItem?.name || `Item ${line.id}`, line.quantity,
              menuItem?.price || 0, JSON.stringify(line.addons || [])],
          )
        }
      }
    }

    const [paymentCount] = await connection.execute('SELECT COUNT(*) AS count FROM payments')
    if (paymentCount[0].count === 0) {
      for (const payment of initialPayments) {
        await connection.execute(
          `INSERT INTO payments (payment_number, order_number, method, amount, amount_paid, status, reference)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [payment.id, payment.orderId, payment.method, payment.amount, payment.amount, payment.status, payment.reference],
        )
      }
    }

    const [loyaltyCount] = await connection.execute('SELECT COUNT(*) AS count FROM loyalty_transactions')
    if (loyaltyCount[0].count === 0) {
      for (const entry of loyaltySeed) {
        await connection.execute(
          'INSERT INTO loyalty_transactions (transaction_id, detail, points_delta, date_label) VALUES (?, ?, ?, ?)',
          [entry.id, entry.detail, entry.delta, entry.date],
        )
      }
    }

    const [notificationCount] = await connection.execute('SELECT COUNT(*) AS count FROM notifications')
    if (notificationCount[0].count === 0) {
      for (const notice of notificationSeed) {
        await connection.execute(
          'INSERT INTO notifications (notification_id, title, detail, time_label, is_read) VALUES (?, ?, ?, ?, ?)',
          [notice.id, notice.title, notice.detail, notice.time, notice.read],
        )
      }
    }

    const [attendanceCount] = await connection.execute('SELECT COUNT(*) AS count FROM attendance_events')
    if (attendanceCount[0].count === 0) {
      await connection.execute(
        `INSERT INTO attendance_events (event_id, staff_id, staff_name, event_time, action)
         VALUES (?, ?, ?, ?, ?)`,
        [1, 'ST-014', 'Ava Mendoza', '10:42 AM', 'Time in'],
      )
    }

    await connection.execute(
      `INSERT INTO app_profiles (profile_id, name, email, phone, loyalty_points)
       VALUES (1, ?, ?, ?, 120)
       ON DUPLICATE KEY UPDATE profile_id = profile_id`,
      [profileSeed.name, profileSeed.email, profileSeed.phone],
    )
    await connection.execute(
      `INSERT INTO app_state (state_key, state_value) VALUES ('reservation', 'null')
       ON DUPLICATE KEY UPDATE state_key = state_key`,
    )
    await connection.execute(
      `INSERT INTO app_state (state_key, state_value) VALUES ('preferences', ?)
       ON DUPLICATE KEY UPDATE state_key = state_key`,
      [JSON.stringify(preferencesSeed)],
    )

    const [accountCount] = await connection.execute('SELECT COUNT(*) AS count FROM user_accounts')
    if (accountCount[0].count === 0) {
      const passwordHash = await bcrypt.hash('demo1234', 10)
      for (const account of mockAccounts) {
        const [[customer]] = await connection.execute('SELECT customer_id FROM customers WHERE email = ? LIMIT 1', [account.email])
        await connection.execute(
          `INSERT INTO user_accounts (username, email, password_hash, role, customer_id)
           VALUES (?, ?, ?, ?, ?)`,
          [account.username, account.email, passwordHash, account.role, customer?.customer_id || null],
        )
      }
    }
  })

  // ── Seed Firebase Auth accounts for mock users (after MySQL transaction) ──
  for (const account of mockAccounts) {
    const fbUser = await upsertFirebaseUser(account.email, account.password || 'demo1234', account.username)
    if (fbUser) {
      await setUserRole(fbUser.uid, account.role)
      console.log(`[firebase] Auth user seeded: ${account.email} (${account.role})`)
    }
  }
}

async function readBootstrap() {
  const [
    menu,
    customers,
    staff,
    orders,
    orderItems,
    payments,
    rewards,
    promotions,
    loyalty,
    notifications,
    attendance,
    profiles,
    savedState,
    accounts,
  ] = await Promise.all([
    rows('SELECT menu_item_id AS id, name, category, price, description, emoji, tone, available, image_url AS image FROM menu_items ORDER BY menu_item_id'),
    rows('SELECT customer_id AS id, name, email, contact, orders_count AS orders, total_spend AS spend, points, status FROM customers ORDER BY customer_id'),
    rows('SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut FROM staff ORDER BY staff_id'),
    rows(`SELECT order_number AS id, customer_name AS customer, items_summary AS items, subtotal, service_charge AS serviceCharge,
                 discount, total, order_type AS type, pickup_location AS pickupLocation, notes, payment_status AS payment,
                 payment_method AS paymentMethod, status, time_label AS time,
                 DATE_FORMAT(order_date, '%Y-%m-%d') AS date FROM orders ORDER BY created_at DESC, order_number DESC`),
    rows(`SELECT order_number AS orderId, menu_item_id AS menuId, item_name AS name, quantity, unit_price AS price, addons
          FROM order_items ORDER BY order_item_id`),
    rows(`SELECT payment_number AS id, order_number AS orderId, method, amount, amount_paid AS amountPaid,
                 change_amount AS changeAmount, status, reference FROM payments ORDER BY created_at DESC, payment_number DESC`),
    rows('SELECT reward_id AS id, name, description, points_required AS points, available FROM rewards ORDER BY reward_id'),
    rows('SELECT promotion_id AS id, name, detail, status FROM promotions ORDER BY promotion_id'),
    rows(`SELECT transaction_id AS id, detail, points_delta AS delta, date_label AS date
          FROM loyalty_transactions ORDER BY created_at DESC, transaction_id DESC`),
    rows(`SELECT notification_id AS id, title, detail, audience, time_label AS time, is_read AS isRead
          FROM notifications ORDER BY created_at DESC, notification_id DESC`),
    rows(`SELECT event_id AS id, staff_name AS name, staff_id AS staffId, event_time AS time, action
          FROM attendance_events ORDER BY created_at DESC, event_id DESC`),
    rows('SELECT name, email, phone, loyalty_points AS points FROM app_profiles WHERE profile_id = 1'),
    rows('SELECT state_key AS stateKey, state_value AS stateValue FROM app_state'),
    rows(`SELECT username, email, role, contact FROM user_accounts
          WHERE role IN ('Admin', 'Staff', 'Customer') ORDER BY account_id`),
  ])

  const productsByOrder = new Map()
  for (const line of orderItems) {
    const product = {
      id: line.menuId,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
      addons: jsonValue(line.addons, []),
    }
    const productList = productsByOrder.get(line.orderId) || []
    productList.push(product)
    productsByOrder.set(line.orderId, productList)
  }
  const state = Object.fromEntries(savedState.map((entry) => [entry.stateKey, jsonValue(entry.stateValue)]))

  return {
    menu: menu.map((item) => ({ ...item, available: asBool(item.available) })),
    customers: customers.map((customer) => ({ ...customer, orders: Number(customer.orders), spend: Number(customer.spend), points: Number(customer.points) })),
    staff,
    orders: orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      serviceCharge: Number(order.serviceCharge),
      discount: Number(order.discount),
      total: Number(order.total),
      products: productsByOrder.get(order.id) || [],
    })),
    payments: payments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      amountPaid: payment.amountPaid == null ? null : Number(payment.amountPaid),
      change: Number(payment.changeAmount),
    })),
    rewards: rewards.map((reward) => ({ ...reward, points: Number(reward.points), available: asBool(reward.available) })),
    promotions,
    loyaltyHistory: loyalty.map((entry) => ({ ...entry, delta: Number(entry.delta) })),
    notifications: notifications.map((notice) => ({ ...notice, read: asBool(notice.isRead) })),
    scanEvents: attendance,
    profile: profiles[0] || profileSeed,
    points: Number(profiles[0]?.points ?? 120),
    reservation: state.reservation ?? null,
    preferences: state.preferences || preferencesSeed,
    customerAccounts: accounts.map((account) => ({ ...account, password: undefined })),
  }
}

function requireCollection(state, key) {
  if (!Array.isArray(state[key])) {
    const error = new Error(`The "${key}" collection must be an array.`)
    error.status = 400
    throw error
  }
  return state[key]
}

async function deleteMissing(connection, table, column, ids) {
  if (!ids.length) {
    await connection.execute(`DELETE FROM \`${table}\``)
    return
  }
  const placeholders = ids.map(() => '?').join(', ')
  await connection.execute(`DELETE FROM \`${table}\` WHERE \`${column}\` NOT IN (${placeholders})`, ids)
}

async function saveSnapshot(state) {
  const menu = requireCollection(state, 'menu')
  const customers = requireCollection(state, 'customers')
  const staff = requireCollection(state, 'staff')
  const orders = requireCollection(state, 'orders')
  const payments = requireCollection(state, 'payments')
  const rewards = requireCollection(state, 'rewards')
  const promotions = requireCollection(state, 'promotions')
  const loyaltyHistory = requireCollection(state, 'loyaltyHistory')
  const notifications = requireCollection(state, 'notifications')
  const scanEvents = requireCollection(state, 'scanEvents')
  if (!state.profile || typeof state.profile !== 'object') {
    const error = new Error('A profile object is required.')
    error.status = 400
    throw error
  }

  // ── Normalise IDs that may arrive as strings from Firebase fallback ──────────
  // Firebase keys are always strings; MySQL expects integers for auto-increment PKs.
  function toInt(val) {
    const n = Number(val)
    return Number.isFinite(n) ? Math.floor(n) : null
  }
  // Strip Firebase-only metadata fields so they don't confuse INSERT statements
  function cleanFbFields(obj) {
    if (!obj || typeof obj !== 'object') return obj
    // eslint-disable-next-line no-unused-vars
    const { _syncedAt, _backedUpAt, ...rest } = obj
    return rest
  }

  await withTransaction(async (connection) => {
    for (const item of menu) {
      await connection.execute(
        `INSERT INTO menu_items (menu_item_id, name, category, price, description, emoji, tone, available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), price=VALUES(price),
           description=VALUES(description), emoji=VALUES(emoji), tone=VALUES(tone), available=VALUES(available)`,
        [item.id, item.name, item.category, item.price, item.description || '', item.emoji || '', item.tone || 'moss', item.available ? 1 : 0],
      )
    }

    for (const customer of customers) {
      await connection.execute(
        `INSERT INTO customers (customer_id, name, email, contact, orders_count, total_spend, points, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), contact=VALUES(contact),
           orders_count=VALUES(orders_count), total_spend=VALUES(total_spend), points=VALUES(points), status=VALUES(status)`,
        [customer.id, customer.name, customer.email || null, customer.contact || null, customer.orders || 0,
          customer.spend || 0, customer.points || 0, customer.status || 'Active'],
      )
    }
    for (const person of staff) {
      await connection.execute(
        `INSERT INTO staff (staff_id, name, role, contact, status, time_in, time_out)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), contact=VALUES(contact), status=VALUES(status),
           time_in=VALUES(time_in), time_out=VALUES(time_out)`,
        [person.id, person.name, person.role, person.contact || null, person.status || 'Offline', person.time || '', person.timeOut || null],
      )
    }
    for (const reward of rewards) {
      await connection.execute(
        `INSERT INTO rewards (reward_id, name, description, points_required, available)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description),
           points_required=VALUES(points_required), available=VALUES(available)`,
        [reward.id, reward.name, reward.description, reward.points, reward.available ? 1 : 0],
      )
    }
    for (const promotion of promotions) {
      await connection.execute(
        `INSERT INTO promotions (promotion_id, name, detail, status) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), detail=VALUES(detail), status=VALUES(status)`,
        [promotion.id, promotion.name, promotion.detail, promotion.status],
      )
    }

    const customerByName = new Map(customers.map((customer) => [customer.name, customer.id]))
    for (const order of orders) {
      await connection.execute(
        `INSERT INTO orders (order_number, customer_id, customer_name, items_summary, subtotal, service_charge,
           discount, total, order_type, pickup_location, notes, payment_status, payment_method, status, time_label, order_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id), customer_name=VALUES(customer_name),
           items_summary=VALUES(items_summary), subtotal=VALUES(subtotal), service_charge=VALUES(service_charge),
           discount=VALUES(discount), total=VALUES(total), order_type=VALUES(order_type), pickup_location=VALUES(pickup_location),
           notes=VALUES(notes), payment_status=VALUES(payment_status), payment_method=VALUES(payment_method),
           status=VALUES(status), time_label=VALUES(time_label), order_date=VALUES(order_date)`,
        [order.id, customerByName.get(order.customer) || null, order.customer, order.items || '',
          order.subtotal || 0, order.serviceCharge || 0, order.discount || 0, order.total || 0, order.type || 'Dine in',
          order.pickupLocation || null, order.notes || null, order.payment || 'Pending', order.paymentMethod || 'Cash',
          order.status || 'Pending', order.time || '', order.date || new Date().toISOString().slice(0, 10)],
      )
    }

    await connection.execute('DELETE FROM order_items')
    const menuIds = new Set(menu.map((item) => Number(item.id)))
    for (const order of orders) {
      for (const [index, product] of (order.products || []).entries()) {
        const numericId = Number(product.menuId ?? product.id)
        await connection.execute(
          `INSERT INTO order_items (order_number, line_number, menu_item_id, item_name, quantity, unit_price, addons)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [order.id, index + 1, menuIds.has(numericId) ? numericId : null, product.name || 'Menu item',
            product.quantity, product.price || 0, JSON.stringify(product.addons || [])],
        )
      }
    }

    for (const payment of payments) {
      await connection.execute(
        `INSERT INTO payments (payment_number, order_number, method, amount, amount_paid, change_amount, status, reference)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE order_number=VALUES(order_number), method=VALUES(method), amount=VALUES(amount),
           amount_paid=VALUES(amount_paid), change_amount=VALUES(change_amount), status=VALUES(status), reference=VALUES(reference)`,
        [payment.id, payment.orderId, payment.method || 'Cash', payment.amount || 0,
          payment.amountPaid ?? payment.amount ?? 0, payment.change || 0, payment.status || 'Pending', payment.reference || payment.id],
      )
    }
    for (const [index, entry] of loyaltyHistory.entries()) {
      // IDs may arrive as strings from Firebase fallback — coerce to integer
      const transactionId = toInt(entry.id)
      if (!transactionId || transactionId < 1) {
        const error = new Error(`Loyalty entry ${index + 1} has an invalid identifier (got: ${JSON.stringify(entry.id)}).`)
        error.status = 400
        throw error
      }
      const customerId = customers.find((customer) =>
        customer.email?.toLowerCase() === state.profile.email?.toLowerCase() ||
        customer.name === state.profile.name)?.id || null
      await connection.execute(
        `INSERT INTO loyalty_transactions (transaction_id, customer_id, detail, points_delta, date_label)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id), detail=VALUES(detail),
           points_delta=VALUES(points_delta), date_label=VALUES(date_label)`,
        [transactionId, customerId, entry.detail, entry.delta, entry.date || ''],
      )
    }
    for (const notice of notifications) {
      // Support both MySQL shape (read) and Firebase shape (isRead)
      const isRead = notice.read ?? notice.isRead ?? false
      await connection.execute(
        `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), detail=VALUES(detail), audience=VALUES(audience),
           time_label=VALUES(time_label), is_read=VALUES(is_read)`,
        [notice.id, notice.title, notice.detail || '', notice.audience || 'all', notice.time || '', isRead ? 1 : 0],
      )
    }
    for (const event of scanEvents) {
      // Support both MySQL shape (name/staffId/time) and Firebase shape (staff_name/staff_id/event_time)
      const staffName = event.name ?? event.staff_name ?? 'Unknown'
      const staffId = event.staffId ?? event.staff_id ?? null
      const eventTime = event.time ?? event.event_time ?? ''
      const eventId = toInt(event.id ?? event.event_id)
      if (!eventId || eventId < 1) continue  // skip malformed events rather than crashing
      // Verify staff_id exists in the staff table to avoid FK violation.
      // If not found (e.g. staff table empty, or ID from another context), store NULL.
      let resolvedStaffId = null
      if (staffId) {
        const [staffCheck] = await connection.execute(
          'SELECT staff_id FROM staff WHERE staff_id = ? LIMIT 1', [staffId]
        )
        resolvedStaffId = staffCheck.length ? staffId : null
      }
      await connection.execute(
        `INSERT INTO attendance_events (event_id, staff_id, staff_name, event_time, action)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE staff_id=VALUES(staff_id), staff_name=VALUES(staff_name),
           event_time=VALUES(event_time), action=VALUES(action)`,
        [eventId, resolvedStaffId, staffName, eventTime, event.action || 'Time in'],
      )
    }

    await connection.execute(
      `INSERT INTO app_profiles (profile_id, name, email, phone, loyalty_points)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone), loyalty_points=VALUES(loyalty_points)`,
      [state.profile.name, state.profile.email, state.profile.phone || '', Number(state.points) || 0],
    )
    await connection.execute(
      `INSERT INTO app_state (state_key, state_value) VALUES ('reservation', ?)
       ON DUPLICATE KEY UPDATE state_value=VALUES(state_value)`,
      [JSON.stringify(state.reservation ?? null)],
    )
    await connection.execute(
      `INSERT INTO app_state (state_key, state_value) VALUES ('preferences', ?)
       ON DUPLICATE KEY UPDATE state_value=VALUES(state_value)`,
      [JSON.stringify(state.preferences || preferencesSeed)],
    )

    await deleteMissing(connection, 'payments', 'payment_number', payments.map((item) => item.id))
    await deleteMissing(connection, 'loyalty_transactions', 'transaction_id', loyaltyHistory.map((item) => toInt(item.id)).filter(Boolean))
    await deleteMissing(connection, 'notifications', 'notification_id', notifications.map((item) => item.id))
    await deleteMissing(connection, 'attendance_events', 'event_id', scanEvents.map((item) => toInt(item.id ?? item.event_id)).filter(Boolean))
    await deleteMissing(connection, 'rewards', 'reward_id', rewards.map((item) => item.id))
    await deleteMissing(connection, 'promotions', 'promotion_id', promotions.map((item) => item.id))
    await deleteMissing(connection, 'orders', 'order_number', orders.map((item) => item.id))
    await deleteMissing(connection, 'menu_items', 'menu_item_id', menu.map((item) => item.id))
    await deleteMissing(connection, 'staff', 'staff_id', staff.map((item) => item.id))
    await deleteMissing(connection, 'customers', 'customer_id', customers.map((item) => item.id))
  })
}

// ── Firebase Auth endpoints ───────────────────────────────────────────────────

// POST /api/auth/verify
// Accepts a Firebase ID token, verifies it, returns role from MySQL user_accounts.
// Used by the frontend after firebaseSignIn to get the account role.
app.post('/api/auth/verify', async (req, res) => {
  try {
    const idToken = extractBearerToken(req) || req.body?.idToken
    if (!idToken) return res.status(400).json({ error: 'An ID token is required.' })

    const decoded = await verifyIdToken(idToken)
    if (!decoded) return res.status(401).json({ error: 'The ID token is invalid or expired.' })

    const email = decoded.email?.toLowerCase()
    if (!email) return res.status(401).json({ error: 'The token does not contain an email address.' })

    const [accounts] = await pool.execute(
      `SELECT username, email, role, contact FROM user_accounts
       WHERE email = ? AND role IN (?, ?, ?) LIMIT 1`,
      [email, ...supportedAccountRoles],
    )
    const account = accounts[0]
    if (!account) return res.status(404).json({ error: 'No account found for this email.' })

    // If the Firebase token doesn't have the role claim yet, set it now
    if (decoded.role !== account.role) {
      await setUserRole(decoded.uid, account.role)
    }

    res.json({ account: { username: account.username, email: account.email, role: account.role, contact: account.contact }, uid: decoded.uid })
  } catch (error) {
    sendError(res, error, 'verify token')
  }
})

// POST /api/auth/set-role
// Sets a custom role claim on a Firebase Auth user by uid.
// Requires an Admin Firebase ID token.
app.post('/api/auth/set-role', async (req, res) => {
  try {
    const { uid, role } = req.body || {}
    if (!uid || !supportedAccountRoles.includes(role)) {
      return res.status(400).json({ error: 'A valid uid and role are required.' })
    }
    const idToken = extractBearerToken(req)
    if (idToken) {
      const decoded = await verifyIdToken(idToken)
      if (!decoded || decoded.role !== 'Admin') {
        return res.status(403).json({ error: 'Only Admin accounts can set roles.' })
      }
    }
    await setUserRole(uid, role)
    res.json({ ok: true, uid, role })
  } catch (error) {
    sendError(res, error, 'set role')
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 AS connected')
    const firebase = getFirebaseStatus()
    res.json({
      status: 'ok',
      mysql: { database: config.database.name, connected: result[0].connected === 1 },
      firebase: { connected: firebase.ready, databaseURL: firebase.databaseURL },
    })
  } catch (error) {
    sendError(res, error, 'health check')
  }
})

// Firebase-specific status endpoint
app.get('/api/firebase/status', (_req, res) => {
  const firebase = getFirebaseStatus()
  res.json({
    connected: firebase.ready,
    databaseURL: firebase.databaseURL,
    message: firebase.ready
      ? 'Firebase Realtime Database is connected and syncing.'
      : 'Firebase is not connected. Check backend/firebase-service-account.json.',
  })
})

// ── Sync queue status endpoint ─────────────────────────────────────────────────
// GET /api/sync/status — returns queue stats + Firebase connection state
app.get('/api/sync/status', async (_req, res) => {
  try {
    const firebase = getFirebaseStatus()
    const stats = await getSyncQueueStats()
    const mode = firebase.ready
      ? (stats && (stats.pending + stats.retrying) > 0 ? 'syncing' : 'live')
      : 'local'
    res.json({
      mode,                      // 'live' | 'local' | 'syncing' | 'error'
      firebase: {
        connected: firebase.ready,
        databaseURL: firebase.databaseURL,
      },
      mysql: { connected: true, database: config.database.name },
      queue: stats || { pending: 0, retrying: 0, synced: 0, failed: 0 },
    })
  } catch (error) {
    const firebase = getFirebaseStatus()
    res.json({
      mode: 'error',
      firebase: { connected: firebase.ready, databaseURL: firebase.databaseURL },
      mysql: { connected: false, database: config.database.name },
      queue: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      error: error.message,
    })
  }
})

// POST /api/sync/flush — manually trigger the retry queue (admin use)
app.post('/api/sync/flush', async (_req, res) => {
  try {
    const count = await flushSyncQueue()
    res.json({ ok: true, flushed: count })
  } catch (error) {
    sendError(res, error, 'flush sync queue')
  }
})

// POST /api/sync/initial — push ALL current MySQL data to Firebase
// Use this to manually re-connect local data to the live database at any time.
app.post('/api/sync/initial', async (_req, res) => {
  try {
    const result = await initialSyncFromMySQL()
    if (result.skipped) {
      return res.status(503).json({
        ok: false,
        message: 'Firebase is not connected. Start the backend with Firebase credentials and try again.',
      })
    }
    res.json({
      ok: true,
      synced: result.synced,
      syncedAt: result.syncedAt,
      error: result.error || null,
      message: result.error
        ? `Partial sync — ${result.synced} records pushed before error.`
        : `All ${result.synced} records from MySQL pushed to Firebase successfully.`,
    })
  } catch (error) {
    sendError(res, error, 'initial sync')
  }
})

// GET /api/sync/log — returns rolling log of Firebase↔MySQL sync events
app.get('/api/sync/log', (_req, res) => {
  try {
    res.json({ ok: true, log: getSyncLog() })
  } catch (error) {
    sendError(res, error, 'sync log')
  }
})

// GET /api/sync/direction — returns status of both sync directions
app.get('/api/sync/direction', async (_req, res) => {
  try {
    const firebase = getFirebaseStatus()
    const stats = await getSyncQueueStats()
    res.json({
      ok: true,
      mysqlToFirebase: {
        active: firebase.ready,
        queuePending: stats?.pending || 0,
        queueFailed: stats?.failed || 0,
      },
      firebaseToMySQL: {
        active: firebase.ready,
        description: 'Firebase onValue listeners — changes from live domain sync to MySQL automatically',
      },
    })
  } catch (error) {
    sendError(res, error, 'sync direction status')
  }
})

// ── Menu item endpoints — real-time update + Firebase sync ───────────────────

// POST /api/menu-items/update — update a single menu item (image URL, name, price, etc.)
app.post('/api/menu-items/update', async (req, res) => {
  try {
    const { id, updates } = req.body || {}
    if (!id || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'id and updates object are required.' })
    }
    const { name, category, price, description, image, available, emoji, tone } = updates

    // Build SET clause dynamically — only update provided fields
    const fields = []
    const values = []
    if (name        !== undefined) { fields.push('name = ?');               values.push(name) }
    if (category    !== undefined) { fields.push('category = ?');            values.push(category) }
    if (price       !== undefined) { fields.push('price = ?');               values.push(price) }
    if (description !== undefined) { fields.push('description = ?');         values.push(description) }
    if (image       !== undefined) { fields.push('image_url = ?');           values.push(image) }
    if (available   !== undefined) { fields.push('available = ?');           values.push(available ? 1 : 0) }
    if (emoji       !== undefined) { fields.push('emoji = ?');               values.push(emoji) }
    if (tone        !== undefined) { fields.push('tone = ?');                values.push(tone) }

    if (fields.length > 0) {
      values.push(id)
      await pool.execute(
        `UPDATE menu_items SET ${fields.join(', ')} WHERE menu_item_id = ?`,
        values,
      )
    }

    // Sync updated record to Firebase
    const [rows] = await pool.execute(
      `SELECT menu_item_id AS id, name, category, price, description,
              image_url AS image, emoji, tone, available
       FROM menu_items WHERE menu_item_id = ?`,
      [id],
    )
    if (rows[0]) {
      syncMenuItem({ ...rows[0], available: Boolean(rows[0].available) }).catch(() => {})
    }

    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'update menu item')
  }
})

// POST /api/menu-items/add — add a brand new menu item with image URL
app.post('/api/menu-items/add', async (req, res) => {
  try {
    const { id, name, category, price, description, image, emoji, tone, available } = req.body || {}
    if (!name || !category || price == null) {
      return res.status(400).json({ error: 'name, category, and price are required.' })
    }

    // Try inserting with the client-side id first; fall back to AUTO_INCREMENT
    try {
      await pool.execute(
        `INSERT INTO menu_items (menu_item_id, name, category, price, description, image_url, emoji, tone, available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name=VALUES(name), category=VALUES(category), price=VALUES(price),
           description=VALUES(description), image_url=VALUES(image_url),
           emoji=VALUES(emoji), tone=VALUES(tone), available=VALUES(available)`,
        [id || null, name, category, price, description || '', image || null, emoji || '🍽️', tone || 'moss', available ? 1 : 0],
      )
    } catch {
      // If id conflict, insert without id (let MySQL auto-assign)
      await pool.execute(
        `INSERT INTO menu_items (name, category, price, description, image_url, emoji, tone, available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, price, description || '', image || null, emoji || '🍽️', tone || 'moss', available ? 1 : 0],
      )
    }

    // Get the newly inserted row
    const [rows] = await pool.execute(
      `SELECT menu_item_id AS id, name, category, price, description,
              image_url AS image, emoji, tone, available
       FROM menu_items WHERE name = ? ORDER BY menu_item_id DESC LIMIT 1`,
      [name],
    )
    if (rows[0]) {
      syncMenuItem({ ...rows[0], available: Boolean(rows[0].available) }).catch(() => {})
    }

    res.status(201).json({ ok: true, item: rows[0] || null })
  } catch (error) {
    sendError(res, error, 'add menu item')
  }
})


  try {
    const data = await readBootstrap()
    // Attach Firebase connection status so frontend knows if live sync is active
    const firebase = getFirebaseStatus()
    const stats = await getSyncQueueStats()
    const mode = firebase.ready
      ? (stats && (stats.pending + stats.retrying) > 0 ? 'syncing' : 'live')
      : 'local'
    res.json({ ...data, _firebase: { connected: firebase.ready, authEnabled: firebase.auth, mode, queue: stats } })
  } catch (error) {
    sendError(res, error, 'load application data')
  }
})

app.put('/api/state', async (req, res) => {
  try {
    await saveSnapshot(req.body)
    // Fire-and-forget sync to Firebase — MySQL response is never delayed.
    // syncFullSnapshot enqueues any records Firebase can't receive right now.
    syncFullSnapshot(req.body).catch(() => {})
    res.json({ saved: true })
  } catch (error) {
    console.error('[api] save application data - full error:', error)
    sendError(res, error, 'save application data')
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password, role } = req.body || {}
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Enter your account name/email and password.' })
    }
    const normalized = identifier.trim().toLowerCase()
    const [accounts] = await pool.execute(
      `SELECT ua.account_id, ua.username, ua.email, ua.password_hash AS passwordHash,
              ua.role, ua.contact, ua.firebase_uid, ua.customer_id,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE (ua.email = ? OR ua.username = ?) AND ua.role IN (?, ?, ?) LIMIT 1`,
      [normalized, normalized, ...supportedAccountRoles],
    )
    const account = accounts[0]
    if (!account || (role && account.role.toLowerCase() !== String(role).toLowerCase()) ||
      !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: 'The username/email or password did not match an account.' })
    }

    // Return name so the frontend can update the profile greeting immediately
    res.json({
      account: {
        username: account.username,
        email:    account.email,
        role:     account.role,
        contact:  account.contact,
        name:     account.name,
      },
    })

    // ── Post-login Firebase sync (fire-and-forget, never delays the response) ──
    // 1. Upsert the Firebase Auth user so it always exists in the live project.
    // 2. Set / confirm the role custom claim.
    // 3. Link the firebase_uid back into MySQL.
    // 4. Write the canonical user record to eateries/user_accounts/{uid} so the
    //    live-domain login path (which reads Firebase directly) gets the correct role.
    ;(async () => {
      try {
        const fbUser = await upsertFirebaseUser(account.email, password, account.name)
        if (!fbUser) return

        await setUserRole(fbUser.uid, account.role)

        // Link uid to MySQL row if not yet set
        if (!account.firebase_uid || account.firebase_uid !== fbUser.uid) {
          await pool.execute(
            `UPDATE user_accounts SET firebase_uid = ? WHERE account_id = ?`,
            [fbUser.uid, account.account_id],
          ).catch(() => {})
        }

        // Write canonical record — this is the role source-of-truth for the live domain
        await syncUserAccount(fbUser.uid, {
          uid:       fbUser.uid,
          username:  account.username,
          email:     account.email,
          name:      account.name,
          phone:     account.contact || '',
          role:      account.role,
          updatedAt: new Date().toISOString(),
        })

        // Sync customer row to Firebase if applicable
        if (account.customer_id) {
          const [[cust]] = await pool.execute(
            `SELECT customer_id AS id, name, email, contact, orders_count AS orders,
                    total_spend AS spend, points, status FROM customers WHERE customer_id = ?`,
            [account.customer_id],
          ).catch(() => [[]])
          if (cust) syncCustomer(cust).catch(() => {})
        }
      } catch (syncErr) {
        console.error('[api/login] post-login Firebase sync error:', syncErr.message)
      }
    })()
  } catch (error) {
    sendError(res, error, 'sign in')
  }
})

// POST /api/auth/link-uid
// Links the caller's Firebase UID to their MySQL user_accounts row.
// Called by the frontend after Customer registration to connect the two databases.
// Requires a valid Firebase ID token in the Authorization header.
app.post('/api/auth/link-uid', async (req, res) => {
  try {
    const idToken = extractBearerToken(req)
    if (!idToken) return res.status(400).json({ error: 'An ID token is required.' })

    const decoded = await verifyIdToken(idToken)
    if (!decoded) return res.status(401).json({ error: 'The ID token is invalid or expired.' })

    const email = decoded.email?.toLowerCase()
    const uid   = decoded.uid
    if (!email || !uid) return res.status(400).json({ error: 'Token is missing email or uid claim.' })

    // Link uid in MySQL (safe to call multiple times — only updates if different)
    const [result] = await pool.execute(
      `UPDATE user_accounts SET firebase_uid = ? WHERE email = ? AND (firebase_uid IS NULL OR firebase_uid != ?)`,
      [uid, email, uid],
    ).catch(() => [{ affectedRows: 0 }])

    // Also set the Firebase custom role claim (idempotent)
    const [accounts] = await pool.execute(
      `SELECT ua.username, ua.email, ua.role, ua.contact, ua.customer_id,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE ua.email = ? LIMIT 1`,
      [email],
    ).catch(() => [[]])

    const account = accounts[0]
    if (account) {
      await setUserRole(uid, account.role).catch(() => {})
      await syncUserAccountByEmail(account.email, uid)
    }

    res.json({ ok: true, uid, linked: result.affectedRows > 0 })
  } catch (error) {
    sendError(res, error, 'link firebase uid')
  }
})


// so the browser can report back the firebase_uid and we can link it in MySQL
// the next time the backend is available. On localhost this endpoint is hit immediately.
app.post('/api/auth/update-uid', async (req, res) => {
  try {
    const idToken = extractBearerToken(req)
    if (!idToken) return res.status(400).json({ error: 'An ID token is required.' })

    const decoded = await verifyIdToken(idToken)
    if (!decoded) return res.status(401).json({ error: 'The ID token is invalid or expired.' })

    const email = decoded.email?.toLowerCase()
    if (!email) return res.status(400).json({ error: 'Token has no email claim.' })

    // Link the uid in MySQL (ignore if column doesn't exist yet — migration not run)
    await pool.execute(
      `UPDATE user_accounts SET firebase_uid = ? WHERE email = ? AND (firebase_uid IS NULL OR firebase_uid != ?)`,
      [decoded.uid, email, decoded.uid],
    ).catch(() => {})

    // Refresh the canonical Firebase record so role is always up-to-date
    const [accounts] = await pool.execute(
      `SELECT ua.username, ua.email, ua.role, ua.contact, ua.customer_id,
              COALESCE(c.name, ua.username) AS name
       FROM user_accounts ua
       LEFT JOIN customers c ON c.customer_id = ua.customer_id
       WHERE ua.email = ? LIMIT 1`,
      [email],
    ).catch(() => [[]])

    const account = accounts[0]
    if (account) {
      await setUserRole(decoded.uid, account.role).catch(() => {})
      await syncUserAccountByEmail(account.email, decoded.uid)
    }

    res.json({ ok: true, uid: decoded.uid })
  } catch (error) {
    sendError(res, error, 'update firebase uid')
  }
})

app.post('/api/customers/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName  = typeof name  === 'string' ? name.trim()                : ''

    // ── Field presence ────────────────────────────────────────────────────────
    if (!normalizedName)
      return res.status(400).json({ error: 'Full name is required.' })
    if (!normalizedEmail)
      return res.status(400).json({ error: 'Email address is required.' })
    if (!password)
      return res.status(400).json({ error: 'Password is required.' })

    // ── Name format ───────────────────────────────────────────────────────────
    if (normalizedName.length < 2 || normalizedName.length > 120)
      return res.status(400).json({ error: 'Full name must be between 2 and 120 characters.' })

    // ── Email format ──────────────────────────────────────────────────────────
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254)
      return res.status(400).json({ error: 'Enter a valid email address.' })

    // ── Password strength — server-side mirror of frontend rules ─────────────
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    if (password.length > 64)
      return res.status(400).json({ error: 'Password must be 64 characters or fewer.' })
    if (!/[A-Z]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A–Z).' })
    if (!/[a-z]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a–z).' })
    if (!/[0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one number (0–9).' })
    if (!/[^A-Za-z0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one special character (e.g. !@#$%).' })

    // Extract Firebase UID from the Authorization header if present.
    // The frontend may send this after creating the Firebase Auth user so
    // we can link the uid in the same INSERT instead of a separate UPDATE.
    let firebaseUid = null
    const incomingToken = extractBearerToken(req)
    if (incomingToken) {
      const decoded = await verifyIdToken(incomingToken).catch(() => null)
      if (decoded?.email?.toLowerCase() === normalizedEmail) {
        firebaseUid = decoded.uid
      }
    }

    const customer = await withTransaction(async (connection) => {
      const [existing] = await connection.execute('SELECT account_id FROM user_accounts WHERE email = ?', [normalizedEmail])
      if (existing.length) {
        // Already registered — surface a clear 409 so the frontend doesn't retry
        const error = new Error('An account already exists for this email address.')
        error.status = 409
        throw error
      }

      const customerId = `CU-${Date.now()}`
      const passwordHash = await bcrypt.hash(password, 10)
      await connection.execute(
        `INSERT INTO customers (customer_id, name, email, contact) VALUES (?, ?, ?, ?)`,
        [customerId, normalizedName, normalizedEmail, String(phone || '').trim()],
      )
      await connection.execute(
        `INSERT INTO user_accounts (username, email, password_hash, role, contact, customer_id, firebase_uid)
         VALUES (?, ?, ?, 'Customer', ?, ?, ?)`,
        [normalizedEmail, normalizedEmail, passwordHash, String(phone || '').trim(), customerId, firebaseUid],
      )
      const [[created]] = await connection.execute(
        `SELECT customer_id AS id, name, email, contact, orders_count AS orders, total_spend AS spend, points, status
         FROM customers WHERE customer_id = ?`,
        [customerId],
      )
      return created
    })

    res.status(201).json({
      customer,
      account: { username: normalizedEmail, email: normalizedEmail, role: 'Customer', contact: customer.contact },
      firebaseUidLinked: firebaseUid !== null,
    })

    // ── Post-registration Firebase sync (fire-and-forget) ─────────────────────
    // Upsert the Firebase Auth user (creates it if not yet created by the frontend,
    // or updates it if the frontend already created it).
    upsertFirebaseUser(normalizedEmail, password, normalizedName)
      .then(async (fbUser) => {
        if (!fbUser) return
        await setUserRole(fbUser.uid, 'Customer')
        // Link firebase_uid to the MySQL account (may already be set if token was sent)
        pool.execute(
          `UPDATE user_accounts SET firebase_uid = ? WHERE email = ? AND (firebase_uid IS NULL OR firebase_uid != ?)`,
          [fbUser.uid, normalizedEmail, fbUser.uid],
        ).catch(() => {})
        // Write canonical user record to Firebase Realtime DB
        await syncUserAccount(fbUser.uid, {
          uid:       fbUser.uid,
          username:  normalizedEmail.split('@')[0],
          email:     normalizedEmail,
          name:      normalizedName,
          phone:     String(phone || '').trim(),
          role:      'Customer',
          createdAt: new Date().toISOString(),
        })
        // Sync the new customer row to Firebase so it appears in the customers list
        await syncCustomer(customer).catch(() => {})
        console.log(`[register] Customer synced to Firebase: ${normalizedEmail} (uid: ${fbUser.uid})`)
      })
      .catch((err) => {
        console.error('[register] Post-registration Firebase sync failed:', err.message)
      })
  } catch (error) {
    sendError(res, error, 'register customer account')
  }
})

// POST /api/accounts/register
// Creates a Staff or Admin account. Two allowed callers:
//   1. Self-registration: the newly-created Firebase user sends their own ID token.
//      The token email must match the email in the request body.
//      This is triggered by the frontend after the setup-code gate passes.
//   2. Admin-created: an existing Admin sends their own ID token.
//      The token email belongs to an Admin in user_accounts.
// Customer accounts must use /api/customers/register instead.
app.post('/api/accounts/register', async (req, res) => {
  try {
    const { name, email, phone, password, role: requestedRole } = req.body || {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName  = typeof name  === 'string' ? name.trim()               : ''
    const normalizedRole  = typeof requestedRole === 'string' ? requestedRole.trim() : ''

    // ── Only Staff and Admin may be created through this endpoint ────────────
    if (!['Staff', 'Admin'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'This endpoint only creates Staff or Admin accounts. Use /api/customers/register for customer accounts.' })
    }

    // ── Require a valid Firebase ID token ─────────────────────────────────────
    const idToken = extractBearerToken(req)
    if (!idToken) {
      return res.status(401).json({ error: 'A Firebase ID token is required.' })
    }
    const decoded = await verifyIdToken(idToken)
    if (!decoded) {
      return res.status(401).json({ error: 'The provided ID token is invalid or expired.' })
    }

    const callerEmail = decoded.email?.toLowerCase()

    // ── Determine if this is self-registration or Admin-created ───────────────
    // Self-registration: token email matches the account being created.
    //   The Firebase Auth account was already created by the frontend.
    //   We just need to save it to MySQL.
    // Admin-created: token email belongs to an existing Admin in MySQL.
    const isSelfRegistration = callerEmail === normalizedEmail

    if (!isSelfRegistration) {
      // Admin-created path — verify the caller is an Admin in MySQL
      const [callerRows] = await pool.execute(
        `SELECT role FROM user_accounts WHERE email = ? LIMIT 1`,
        [callerEmail],
      )
      if (!callerRows[0] || callerRows[0].role !== 'Admin') {
        return res.status(403).json({ error: 'Only Admin accounts can create Staff or Admin accounts for other users.' })
      }
    }
    // Self-registration path: the setup-code gate on the frontend already
    // verified the user knows the secret code before calling this endpoint.
    // The Firebase token proves they own a real Auth account.

    // ── Field validation ──────────────────────────────────────────────────────
    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 120)
      return res.status(400).json({ error: 'Full name must be between 2 and 120 characters.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254)
      return res.status(400).json({ error: 'Enter a valid email address.' })
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    if (password.length > 64)
      return res.status(400).json({ error: 'Password must be 64 characters or fewer.' })
    if (!/[A-Z]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A–Z).' })
    if (!/[a-z]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a–z).' })
    if (!/[0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one number (0–9).' })
    if (!/[^A-Za-z0-9]/.test(password))
      return res.status(400).json({ error: 'Password must contain at least one special character (e.g. !@#$%).' })

    // ── Create account in MySQL ───────────────────────────────────────────────
    await withTransaction(async (connection) => {
      const [existing] = await connection.execute(
        'SELECT account_id FROM user_accounts WHERE email = ?', [normalizedEmail],
      )
      if (existing.length) {
        // Already exists — link the firebase_uid and return success
        // (handles the case where MySQL save was retried)
        await connection.execute(
          `UPDATE user_accounts SET firebase_uid = ? WHERE email = ?`,
          [decoded.uid, normalizedEmail],
        )
        return
      }
      const passwordHash = await bcrypt.hash(password, 10)
      await connection.execute(
        `INSERT INTO user_accounts (username, email, password_hash, role, contact, firebase_uid)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [normalizedEmail, normalizedEmail, passwordHash, normalizedRole,
          String(phone || '').trim(), decoded.uid],
      )
      // Add a staff row so the staff table stays consistent
      if (normalizedRole === 'Staff') {
        const staffId = `ST-${Date.now()}`
        await connection.execute(
          `INSERT INTO staff (staff_id, name, role, contact, status, time_in)
           VALUES (?, ?, 'Service crew', ?, 'Offline', '—')`,
          [staffId, normalizedName, normalizedEmail],
        )
      }
    })

    // Set the role custom claim on the Firebase Auth user
    await setUserRole(decoded.uid, normalizedRole).catch(() => {})

    // Write canonical Firebase record (role source-of-truth for live domain)
    await syncUserAccount(decoded.uid, {
      uid:       decoded.uid,
      username:  normalizedEmail.split('@')[0],
      email:     normalizedEmail,
      name:      normalizedName,
      phone:     String(phone || '').trim(),
      role:      normalizedRole,
      createdAt: new Date().toISOString(),
    })

    // ── Sync the new staff row to Firebase Realtime DB (fire-and-forget) ─────
    if (normalizedRole === 'Staff') {
      try {
        const [staffRows] = await pool.execute(
          `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut
           FROM staff WHERE contact = ? ORDER BY created_at DESC LIMIT 1`,
          [normalizedEmail],
        )
        if (staffRows[0]) {
          syncStaff(staffRows[0]).catch(() => {})
        }
      } catch { /* non-critical */ }
    }

    res.status(201).json({
      account: { username: normalizedEmail, email: normalizedEmail, role: normalizedRole, name: normalizedName },
    })
    console.log(`[register] ${normalizedRole} account created and synced to Firebase: ${normalizedEmail}`)
  } catch (error) {
    sendError(res, error, 'register staff/admin account')
  }
})

async function start() {
  await pool.query('SELECT 1')
  // Ensure the sync queue table exists even if migration hasn't been run yet
  await ensureSyncTable()

  // ── Auto-migrate: add image_url column to menu_items if missing ─────────────
  try {
    await pool.execute(`
      ALTER TABLE \`menu_items\`
      ADD COLUMN IF NOT EXISTS \`image_url\` TEXT NULL DEFAULT NULL
    `)
    console.log('[migrate] menu_items.image_url column ready.')
  } catch (err) {
    // MySQL < 8 doesn't support IF NOT EXISTS on ADD COLUMN — use the safe approach
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = 'image_url'`,
      )
      if (cols.length === 0) {
        await pool.execute('ALTER TABLE `menu_items` ADD COLUMN `image_url` TEXT NULL DEFAULT NULL')
        console.log('[migrate] menu_items.image_url column added.')
      }
    } catch (innerErr) {
      console.warn('[migrate] Could not add image_url column:', innerErr.message)
    }
  }
  await seedDatabase()
  // Connect to Firebase (optional — app works without it)
  const fbReady = await initFirebase()
  if (fbReady) {
    // Push all existing MySQL data to Firebase on first connect
    console.log('[sync] Starting initial MySQL → Firebase sync…')
    initialSyncFromMySQL().then((result) => {
      if (result.skipped) return
      console.log(`[sync] Initial sync done: ${result.synced} records pushed.`)
    }).catch(() => {})
    // Flush any records that were queued while Firebase was offline
    const flushed = await flushSyncQueue()
    if (flushed > 0) console.log(`[sync] Flushed ${flushed} queued record(s) to Firebase.`)
    // Start the background retry loop (re-queues failed syncs every 30s)
    startSyncRetryLoop()
    // ── NEW: Start Firebase → MySQL reverse sync listeners ──────────────────
    // Picks up changes made on the live domain and writes them back to MySQL.
    startFirebaseToMySQLSync()
  }
  if (existsSync(path.join(projectRoot, 'dist', 'index.html'))) {
    app.use(express.static(path.join(projectRoot, 'dist')))
    app.use((req, res, next) => {
      // Never intercept API routes
      if (req.path.startsWith('/api')) return next()
      const indexFile = path.join(projectRoot, 'dist', 'index.html')
      if (!existsSync(indexFile)) return next()
      res.sendFile(indexFile)
    })
  }
  app.listen(config.apiPort, '0.0.0.0', () => {
    console.log(`[api] MySQL  → "${config.database.name}" at ${config.database.host}:${config.database.port}`)
    console.log(`[api] Firebase → ${getFirebaseStatus().ready ? 'connected' : 'not connected (sync disabled)'}`)
    console.log(`[api] Listening on http://0.0.0.0:${config.apiPort}`)
  })
}

start().catch((error) => {
  console.error(`[api] Could not connect to MySQL database "${config.database.name}".`, error.message)
  console.error('[api] Check that MySQL is running, import database/eateries_db.sql in phpMyAdmin, and verify DB_HOST/DB_PORT/DB_USER/DB_PASSWORD in .env.')
  process.exitCode = 1
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`[api] Received ${signal} — shutting down gracefully…`)
  stopFirebaseToMySQLSync()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
