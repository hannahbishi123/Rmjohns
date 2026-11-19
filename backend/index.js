import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import fs, { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { initialCustomers, initialMenu, initialOrders, initialPayments, initialPromotions, initialRewards, initialStaff } from '../src/data/mockData.js'
import { mockAccounts } from '../src/data/mockAccounts.js'
import { config } from './config.js'
import { pool, withTransaction } from './database.js'
import { initFirebase, getFirebaseStatus, verifyIdToken, setUserRole, upsertFirebaseUser } from './firebase.js'
import {
  syncFullSnapshot,
  syncMenuItem,
  deleteMenuItem,
  syncCustomer,
  deleteCustomer,
  syncStaff,
  deleteStaff,
  syncOrder,
  deleteOrder,
  syncPayment,
  deletePayment,
  syncReward,
  deleteReward,
  syncPromotion,
  deletePromotion,
  syncNotification,
  deleteNotification,
  syncAttendanceEvent,
  deleteAttendanceEvent,
  syncUserAccount,
  syncUserAccountByEmail,
  syncRecord,
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
import { sendPasswordResetOtp, isSmtpConfigured, verifySmtpConnection } from './mailer.js'

const app = express()
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')

// Local static uploads for menu pictures
const uploadsDir = path.join(projectRoot, 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(path.join(uploadsDir, 'menu'), { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))
const profileSeed = {
  name: 'Admin Demo Account',
  firstName: 'Admin',
  middleName: 'Demo',
  lastName: 'Account',
  email: 'admin@rmjohns.com',
  phone: '+63 917 555 0101',
}
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

app.use(express.json({ limit: '10mb' }))

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
    const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    if (isLocalDevOrigin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
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

// ── Authentication & Role Verification Middlewares ─────────────────────────────
async function authenticateToken(req) {
  const idToken = extractBearerToken(req) || req.body?.idToken
  if (!idToken) {
    return { error: 'Authentication required. A valid Firebase ID token must be provided.', status: 401 }
  }
  const decoded = await verifyIdToken(idToken)
  if (!decoded) {
    return { error: 'The provided ID token is invalid or expired.', status: 401 }
  }

  // Cross-reference with MySQL database as the source of truth for user role
  const email = decoded.email?.toLowerCase()
  let dbRole = decoded.role || null
  if (email) {
    try {
      const [accounts] = await pool.execute(
        'SELECT role, username, email FROM user_accounts WHERE email = ? LIMIT 1',
        [email],
      )
      if (accounts[0]?.role) {
        dbRole = accounts[0].role
      }
    } catch {
      // Retain decoded.role if database query is temporarily unavailable
    }
  }

  return { user: { ...decoded, role: dbRole || decoded.role || 'Customer' } }
}

async function requireAdminAuth(req, res, next) {
  const authResult = await authenticateToken(req)
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error })
  }
  if (authResult.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden. Administrator privileges required.' })
  }
  req.user = authResult.user
  next()
}

async function requireStaffOrAdminAuth(req, res, next) {
  const authResult = await authenticateToken(req)
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error })
  }
  if (!['Admin', 'Staff'].includes(authResult.user.role)) {
    return res.status(403).json({ error: 'Forbidden. Staff or Administrator privileges required.' })
  }
  req.user = authResult.user
  next()
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
    if (process.env.SEED_DEMO_TRANSACTIONS === 'true' && orderCount[0].count === 0) {
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
    if (process.env.SEED_DEMO_TRANSACTIONS === 'true' && paymentCount[0].count === 0) {
      for (const payment of initialPayments) {
        await connection.execute(
          `INSERT INTO payments (payment_number, order_number, method, amount, amount_paid, status, reference)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [payment.id, payment.orderId, payment.method, payment.amount, payment.amount, payment.status, payment.reference],
        )
      }
    }

    const [loyaltyCount] = await connection.execute('SELECT COUNT(*) AS count FROM loyalty_transactions')
    if (process.env.SEED_DEMO_TRANSACTIONS === 'true' && loyaltyCount[0].count === 0) {
      for (const entry of loyaltySeed) {
        await connection.execute(
          'INSERT INTO loyalty_transactions (transaction_id, detail, points_delta, date_label) VALUES (?, ?, ?, ?)',
          [entry.id, entry.detail, entry.delta, entry.date],
        )
      }
    }

    const [notificationCount] = await connection.execute('SELECT COUNT(*) AS count FROM notifications')
    if (process.env.SEED_DEMO_TRANSACTIONS === 'true' && notificationCount[0].count === 0) {
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

    const seedPassword = process.env.SEED_ACCOUNT_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD
    const [accountCount] = await connection.execute('SELECT COUNT(*) AS count FROM user_accounts')
    if (accountCount[0].count === 0 && seedPassword) {
      const passwordHash = await bcrypt.hash(seedPassword, 10)
      for (const account of mockAccounts) {
        const [[customer]] = await connection.execute('SELECT customer_id FROM customers WHERE email = ? LIMIT 1', [account.email])
        await connection.execute(
          `INSERT INTO user_accounts (username, email, password_hash, role, customer_id)
           VALUES (?, ?, ?, ?, ?)`,
          [account.username, account.email, passwordHash, account.role, customer?.customer_id || null],
        )
      }
    }

    // Ensure the dedicated Default Admin account exists in MySQL user_accounts
    const defaultAdminEmail    = (process.env.DEFAULT_ADMIN_EMAIL || 'manager@rmjohns.com').trim().toLowerCase()
    const defaultAdminUsername = (process.env.DEFAULT_ADMIN_USERNAME || 'manager').trim().toLowerCase()
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || seedPassword
    if (defaultAdminPassword) {
      const [existingAdmin] = await connection.execute(
        'SELECT account_id FROM user_accounts WHERE email = ? OR username = ? LIMIT 1',
        [defaultAdminEmail, defaultAdminUsername],
      )
      if (existingAdmin.length === 0) {
        const adminHash = await bcrypt.hash(defaultAdminPassword, 10)
        await connection.execute(
          `INSERT INTO user_accounts (username, email, password_hash, role, contact)
           VALUES (?, ?, ?, 'Admin', ?)`,
          [defaultAdminUsername, defaultAdminEmail, adminHash, '+63 917 555 0142'],
        )
      }
    }
  })
}

async function ensureDefaultAdminInFirebase() {
  const defaultAdminEmail    = (process.env.DEFAULT_ADMIN_EMAIL || 'manager@rmjohns.com').trim().toLowerCase()
  const defaultAdminUsername = (process.env.DEFAULT_ADMIN_USERNAME || 'manager').trim().toLowerCase()
  const defaultAdminName     = (process.env.DEFAULT_ADMIN_NAME || 'Maureen Santos').trim()
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD
  const seedPassword         = process.env.SEED_ACCOUNT_PASSWORD || defaultAdminPassword

  const accountsToProvision = [
    ...(defaultAdminPassword ? [{
      username: defaultAdminUsername,
      email:    defaultAdminEmail,
      name:     defaultAdminName,
      role:     'Admin',
      phone:    '+63 917 555 0142',
      secret:   defaultAdminPassword,
    }] : []),
    ...mockAccounts
      .filter((a) => a.email !== defaultAdminEmail && Boolean(seedPassword))
      .map((a) => ({
        username: a.username,
        email:    a.email,
        name:     a.name || a.username,
        role:     a.role,
        phone:    '+63 917 555 0142',
        secret:   seedPassword,
      })),
  ]

  for (const account of accountsToProvision) {
    const fbUser = await upsertFirebaseUser(account.email, account.secret, account.name)
    if (!fbUser) continue

    await setUserRole(fbUser.uid, account.role)

    await pool.execute(
      `UPDATE user_accounts SET firebase_uid = ? WHERE email = ? AND (firebase_uid IS NULL OR firebase_uid != ?)`,
      [fbUser.uid, account.email, fbUser.uid],
    ).catch(() => {})

    await syncUserAccount(fbUser.uid, {
      uid:       fbUser.uid,
      username:  account.username,
      email:     account.email,
      name:      account.name,
      phone:     account.phone,
      role:      account.role,
      title:     account.role === 'Admin' ? 'Manager' : account.role,
      status:    'Active',
      updatedAt: new Date().toISOString(),
    })
    console.log(`[firebase] Auth & Firestore user provisioned: ${account.email} (${account.role})`)
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
    rows(`SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
                 approval_status AS approvalStatus, rejection_reason AS rejectionReason, approved_by AS approvedBy,
                 approved_at AS approvedAt, rfid_status AS rfidStatus,
                 employee_id AS employeeId, first_name AS firstName, middle_name AS middleName, last_name AS lastName,
                 birthdate, gender, email, address, position, date_hired AS dateHired,
                 COALESCE(employment_status, 'Active') AS employmentStatus, account_id AS accountId
          FROM staff ORDER BY staff_id`),
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
    rows('SELECT name, first_name AS firstName, middle_name AS middleName, last_name AS lastName, email, phone, loyalty_points AS points FROM app_profiles WHERE profile_id = 1'),
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

async function deleteMissing(connection, table, column, ids, preserveIfEmpty = false, entityType = null) {
  let toDelete = []
  if (!ids.length) {
    if (preserveIfEmpty) {
      // Safety guard: prevent accidental bulk wipe of master tables
      return
    }
    if (entityType) {
      const [rows] = await connection.execute(`SELECT \`${column}\` AS id FROM \`${table}\``)
      toDelete = rows.map((r) => r.id)
    }
    await connection.execute(`DELETE FROM \`${table}\``)
  } else {
    const placeholders = ids.map(() => '?').join(', ')
    if (entityType) {
      const [rows] = await connection.execute(
        `SELECT \`${column}\` AS id FROM \`${table}\` WHERE \`${column}\` NOT IN (${placeholders})`,
        ids,
      )
      toDelete = rows.map((r) => r.id)
    }
    await connection.execute(`DELETE FROM \`${table}\` WHERE \`${column}\` NOT IN (${placeholders})`, ids)
  }

  // Dual cloud deletion sync
  if (entityType && toDelete.length > 0) {
    for (const delId of toDelete) {
      syncRecord(entityType, delId, null, 'delete').catch(() => {})
    }
  }
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

    const pFirst = state.profile.firstName || (state.profile.name ? state.profile.name.split(' ')[0] : 'Admin')
    const pLast = state.profile.lastName || (state.profile.name ? state.profile.name.split(' ').slice(1).join(' ') : 'Account')
    const pMiddle = state.profile.middleName || ''
    const pFullName = [pFirst, pMiddle, pLast].filter(Boolean).join(' ') || state.profile.name || 'Admin Demo Account'

    await connection.execute(
      `INSERT INTO app_profiles (profile_id, name, first_name, middle_name, last_name, email, phone, loyalty_points)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), first_name=VALUES(first_name), middle_name=VALUES(middle_name), last_name=VALUES(last_name), email=VALUES(email), phone=VALUES(phone), loyalty_points=VALUES(loyalty_points)`,
      [pFullName, pFirst, pMiddle, pLast, state.profile.email, state.profile.phone || '', Number(state.points) || 0],
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

    await deleteMissing(connection, 'payments', 'payment_number', payments.map((item) => item.id), false, 'payments')
    await deleteMissing(connection, 'loyalty_transactions', 'transaction_id', loyaltyHistory.map((item) => toInt(item.id)).filter(Boolean), false, 'loyalty_transactions')
    await deleteMissing(connection, 'notifications', 'notification_id', notifications.map((item) => item.id), false, 'notifications')
    await deleteMissing(connection, 'attendance_events', 'event_id', scanEvents.map((item) => toInt(item.id ?? item.event_id)).filter(Boolean), false, 'attendance_events')
    await deleteMissing(connection, 'rewards', 'reward_id', rewards.map((item) => item.id), false, 'rewards')
    await deleteMissing(connection, 'promotions', 'promotion_id', promotions.map((item) => item.id), false, 'promotions')
    await deleteMissing(connection, 'orders', 'order_number', orders.map((item) => item.id), false, 'orders')
    await deleteMissing(connection, 'menu_items', 'menu_item_id', menu.map((item) => item.id), true, 'menu_items')
    await deleteMissing(connection, 'staff', 'staff_id', staff.map((item) => item.id), true, 'staff')
    await deleteMissing(connection, 'customers', 'customer_id', customers.map((item) => item.id), true, 'customers')
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
// Requires a verified Administrator token. Never trusts client-supplied role claims.
app.post('/api/auth/set-role', requireAdminAuth, async (req, res) => {
  try {
    const { uid, role } = req.body || {}
    if (!uid || typeof uid !== 'string' || !supportedAccountRoles.includes(role)) {
      return res.status(400).json({
        error: `A valid uid string and supported role (${supportedAccountRoles.join(', ')}) are required.`,
      })
    }

    // Set role custom claim in Firebase Auth
    await setUserRole(uid, role)

    // Also update MySQL user_accounts if an account is linked to this firebase_uid
    await pool.execute(
      'UPDATE user_accounts SET role = ? WHERE firebase_uid = ?',
      [role, uid],
    ).catch(() => {})

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
// GET /api/sync/status — returns queue stats + Firebase & Firestore connection state
app.get('/api/sync/status', async (_req, res) => {
  try {
    const firebase = getFirebaseStatus()
    const stats = await getSyncQueueStats()
    const totalPending = stats ? (stats.pending + stats.retrying) : 0
    const mode = firebase.ready
      ? (totalPending > 0 ? 'syncing' : 'live')
      : 'local'
    res.json({
      mode,                      // 'live' | 'local' | 'syncing' | 'error'
      firebase: {
        connected: firebase.ready,
        databaseURL: firebase.databaseURL,
        firestore: firebase.firestore,
      },
      firestore: {
        connected: firebase.firestore,
      },
      mysql: { connected: true, database: config.database.name },
      queue: stats || { pending: 0, retrying: 0, synced: 0, failed: 0 },
    })
  } catch (error) {
    const firebase = getFirebaseStatus()
    res.json({
      mode: 'error',
      firebase: { connected: firebase.ready, databaseURL: firebase.databaseURL, firestore: firebase.firestore },
      firestore: { connected: firebase.firestore },
      mysql: { connected: false, database: config.database.name },
      queue: { pending: 0, retrying: 0, synced: 0, failed: 0 },
      error: error.message,
    })
  }
})

// POST /api/sync/flush — manually trigger the retry queue (admin use)
app.post('/api/sync/flush', requireAdminAuth, async (_req, res) => {
  try {
    const count = await flushSyncQueue()
    res.json({ ok: true, flushed: count })
  } catch (error) {
    sendError(res, error, 'flush sync queue')
  }
})

// POST /api/sync/initial — push ALL current MySQL data to Firebase
// Requires Admin authentication.
app.post('/api/sync/initial', requireAdminAuth, async (_req, res) => {
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

// POST /api/menu-items/upload-image — save uploaded menu picture locally in /public/uploads/menu/
app.post('/api/menu-items/upload-image', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { itemId, dataUrl } = req.body || {}
    if (!dataUrl) {
      return res.status(400).json({ error: 'Image data is required.' })
    }

    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Expected data URL.' })
    }

    const rawExt = matches[1].toLowerCase()
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image exceeds maximum size of 5 MB.' })
    }

    const menuUploadsDir = path.join(projectRoot, 'public', 'uploads', 'menu')
    if (!fs.existsSync(menuUploadsDir)) {
      fs.mkdirSync(menuUploadsDir, { recursive: true })
    }

    const safeItemId = String(itemId || 'item').replace(/[^a-zA-Z0-9_-]/g, '')
    const safeFilename = `menu_${safeItemId}_${Date.now()}.${ext}`
    const targetPath = path.join(menuUploadsDir, safeFilename)

    fs.writeFileSync(targetPath, buffer)
    const imageUrl = `/uploads/menu/${safeFilename}`

    res.json({ ok: true, imageUrl })
  } catch (error) {
    sendError(res, error, 'upload menu image')
  }
})

// POST /api/menu-items/delete-image — remove unused local menu image file
app.post('/api/menu-items/delete-image', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body || {}
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/menu/')) {
      const filename = path.basename(imageUrl)
      const filePath = path.join(projectRoot, 'public', 'uploads', 'menu', filename)
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath) } catch {}
      }
    }
    res.json({ ok: true })
  } catch {
    res.json({ ok: true })
  }
})

// POST /api/menu-items/update — update a single menu item (image URL, name, price, etc.)
// Requires Staff or Administrator authentication.
app.post('/api/menu-items/update', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id, updates } = req.body || {}
    if (!id || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'id and updates object are required.' })
    }
    // Enforce Staff permissions in backend/API
    if (req.user?.role === 'Staff') {
      const restrictedFields = ['name', 'category', 'price', 'description', 'image', 'imageUrl', 'emoji', 'tone'];
      const attempted = restrictedFields.filter((key) => updates[key] !== undefined);
      if (attempted.length > 0) {
        return res.status(403).json({
          error: 'Forbidden: Staff members are only allowed to modify item availability and stock. Restricted fields: ' + attempted.join(', ') + '.',
        });
      }
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
// Requires Staff or Administrator authentication.
app.post('/api/menu-items/add', requireStaffOrAdminAuth, async (req, res) => {
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

// POST /api/menu-items/delete — delete menu item and sync to cloud destinations
app.post('/api/menu-items/delete', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Item id is required.' })
    await pool.execute('DELETE FROM menu_items WHERE menu_item_id = ?', [id])
    await deleteMenuItem(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete menu item')
  }
})

// POST /api/orders/delete — delete order and sync to cloud destinations
app.post('/api/orders/delete', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Order id/number is required.' })
    await pool.execute('DELETE FROM orders WHERE order_number = ?', [id])
    await pool.execute('DELETE FROM order_items WHERE order_number = ?', [id])
    await deleteOrder(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete order')
  }
})

// POST /api/customers/delete — delete customer and sync to cloud destinations
app.post('/api/customers/delete', async (req, res) => {
  try {
    const { id, customer_id } = req.body || {}
    const targetId = id || customer_id
    if (!targetId) return res.status(400).json({ error: 'Customer id is required.' })

    const [custRows] = await pool.execute('SELECT * FROM customers WHERE customer_id = ? LIMIT 1', [targetId])
    const customer = custRows[0]

    await pool.execute('DELETE FROM customers WHERE customer_id = ?', [targetId])
    if (customer) {
      await pool.execute(
        'DELETE FROM user_accounts WHERE customer_id = ? OR email = ? OR contact = ?',
        [targetId, customer.email, customer.contact]
      ).catch(() => {})
    }
    await deleteCustomer(targetId)
    console.log(`[customers/delete] Customer ${targetId} and user account deleted.`)
    res.json({ ok: true, id: targetId, message: 'Customer and user account successfully deleted.' })
  } catch (error) {
    sendError(res, error, 'delete customer')
  }
})

// POST /api/accounts/delete — Admin permanently deletes any registered user account
app.post('/api/accounts/delete', async (req, res) => {
  try {
    const { account_id, email, username } = req.body || {}
    if (!account_id && !email && !username) {
      return res.status(400).json({ error: 'account_id, email, or username is required.' })
    }

    const [accRows] = await pool.execute(
      'SELECT * FROM user_accounts WHERE account_id = ? OR email = ? OR username = ? LIMIT 1',
      [account_id || null, email || null, username || null]
    )
    const acc = accRows[0]
    if (acc) {
      await pool.execute('DELETE FROM user_accounts WHERE account_id = ?', [acc.account_id])
      if (acc.customer_id) {
        await pool.execute('DELETE FROM customers WHERE customer_id = ?', [acc.customer_id]).catch(() => {})
        await deleteCustomer(acc.customer_id).catch(() => {})
      }
      await pool.execute('DELETE FROM staff WHERE name = ? OR contact = ?', [acc.username, acc.contact]).catch(() => {})
    }

    res.json({ ok: true, message: 'User account permanently deleted.' })
  } catch (error) {
    sendError(res, error, 'delete user account')
  }
})

// POST /api/staff/delete — delete staff and sync to cloud destinations
app.post('/api/staff/delete', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Staff id is required.' })

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [id])
    const member = staffRows[0]

    await pool.execute('DELETE FROM staff WHERE staff_id = ?', [id])
    if (member) {
      await pool.execute(
        'DELETE FROM user_accounts WHERE contact = ? OR email = ? OR username = ?',
        [member.contact, member.contact, member.name]
      ).catch(() => {})
    }
    await deleteStaff(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete staff')
  }
})

// POST /api/admin/staff-requests/delete — Admin permanently deletes a staff registration request & user account
app.post('/api/admin/staff-requests/delete', async (req, res) => {
  try {
    const { staff_id, staffId, id } = req.body || {}
    const targetId = staff_id || staffId || id
    if (!targetId) return res.status(400).json({ error: 'staff_id is required.' })

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetId])
    const member = staffRows[0]

    await pool.execute('DELETE FROM staff WHERE staff_id = ?', [targetId])
    if (member) {
      await pool.execute(
        'DELETE FROM user_accounts WHERE contact = ? OR email = ? OR username = ?',
        [member.contact, member.contact, member.name]
      ).catch(() => {})
    }
    await deleteStaff(targetId)

    console.log(`[staff/delete] Staff request ${targetId} permanently deleted.`)
    res.json({ ok: true, message: 'Staff registration and account permanently deleted.', id: targetId })
  } catch (error) {
    sendError(res, error, 'delete staff request')
  }
})

// ── IoT & RFID Staff Attendance System ────────────────────────────────────────
let iotLastSeen = null
let iotLastScan = null
let iotLastUnknownCard = null
// POST /api/profile/update — updates admin profile details
app.post('/api/profile/update', async (req, res) => {
  try {
    const { firstName, middleName, lastName, phone, email } = req.body || {}
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'First name is required.' })
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ error: 'Last name is required.' })
    }

    const cleanFirst = firstName.trim()
    const cleanMiddle = (middleName || '').trim()
    const cleanLast = lastName.trim()
    const cleanPhone = (phone || '').trim()
    const fullName = [cleanFirst, cleanMiddle, cleanLast].filter(Boolean).join(' ')

    await pool.execute(
      `UPDATE app_profiles 
       SET first_name = ?, middle_name = ?, last_name = ?, name = ?, phone = ?
       WHERE profile_id = 1`,
      [cleanFirst, cleanMiddle, cleanLast, fullName, cleanPhone]
    )

    if (cleanPhone) {
      await pool.execute(
        `UPDATE user_accounts SET contact = ? WHERE role = 'Admin' AND email = 'admin@rmjohns.com'`,
        [cleanPhone]
      ).catch(() => {})
    }

    const [rows] = await pool.execute(
      `SELECT name, first_name AS firstName, middle_name AS middleName, last_name AS lastName, email, phone, loyalty_points AS points FROM app_profiles WHERE profile_id = 1`
    )
    const updatedProfile = rows[0] || {
      name: fullName,
      firstName: cleanFirst,
      middleName: cleanMiddle,
      lastName: cleanLast,
      email: email || 'admin@rmjohns.com',
      phone: cleanPhone,
    }

    // Sync to Firebase RTDB if available
    try {
      const fbStatus = getFirebaseStatus()
      if (fbStatus.ready && fbStatus.rtdb) {
        await fbStatus.rtdb.ref('eateries/profile').update({
          ...updatedProfile,
          _syncedAt: new Date().toISOString(),
        })
      }
    } catch (fbErr) {
      console.warn('[Profile Update] Firebase RTDB sync notice:', fbErr.message)
    }

    res.json({ ok: true, profile: updatedProfile })
  } catch (error) {
    sendError(res, error, 'update profile')
  }
})

let activeEnrollment = null // { staff_id, staff_name, role, started_at }

// POST /api/staff/assign-rfid — Assign an RFID card UID to a staff member
app.post('/api/staff/assign-rfid', async (req, res) => {
  try {
    const { staff_id, rfid_uid } = req.body || {}
    if (!staff_id || !rfid_uid) {
      return res.status(400).json({ error: 'staff_id and rfid_uid are required.' })
    }
    const cleanUid = String(rfid_uid).trim().toUpperCase()
    const rawClean = cleanUid.replace(/[^A-Z0-9]/g, '')

    // Check duplicate UID across other staff
    const [dupes] = await pool.execute(
      `SELECT staff_id, name FROM staff 
       WHERE (UPPER(rfid_uid) = ? OR REPLACE(UPPER(rfid_uid), ':', '') = ? OR REPLACE(UPPER(rfid_uid), '-', '') = ?)
         AND staff_id != ? LIMIT 1`,
      [cleanUid, rawClean, rawClean, staff_id]
    )
    if (dupes.length > 0) {
      return res.status(409).json({ error: `RFID card [${cleanUid}] is already assigned to ${dupes[0].name}.` })
    }

    await pool.execute('UPDATE staff SET rfid_uid = ?, rfid_status = "ACTIVE" WHERE staff_id = ?', [cleanUid, staff_id])

    if (iotLastUnknownCard && iotLastUnknownCard.uid === cleanUid) {
      iotLastUnknownCard = null
    }

    const [updated] = await pool.execute(
      'SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid, approval_status AS approvalStatus, rfid_status AS rfidStatus FROM staff WHERE staff_id = ?',
      [staff_id]
    )
    if (updated[0]) {
      syncStaff(updated[0]).catch(() => {})
    }
    console.log(`[staff/assign-rfid] Assigned RFID ${cleanUid} to staff ${staff_id}`)
    res.json({ ok: true, staff: updated[0] })
  } catch (error) {
    sendError(res, error, 'assign rfid to staff')
  }
})

// GET /api/iot/status — Check if physical ESP32 reader is connected / online
app.get('/api/iot/status', (req, res) => {
  const isOnline = Boolean(iotLastSeen && (Date.now() - new Date(iotLastSeen).getTime()) < 120000)
  if (activeEnrollment && (Date.now() - activeEnrollment.started_at > 180000)) {
    activeEnrollment = null
  }
  res.json({
    online: isOnline,
    lastSeen: iotLastSeen,
    lastScan: iotLastScan,
    lastUnknownCard: iotLastUnknownCard,
    device: 'ESP32-RC522-ATTENDANCE',
    enrollment: activeEnrollment,
    isEnrollmentActive: Boolean(activeEnrollment)
  })
})

// POST /api/iot/heartbeat — ESP32 reader ping
app.post('/api/iot/heartbeat', (req, res) => {
  iotLastSeen = new Date().toISOString()
  if (activeEnrollment && (Date.now() - activeEnrollment.started_at > 180000)) {
    activeEnrollment = null
  }
  res.json({
    ok: true,
    serverTime: iotLastSeen,
    enrollment: activeEnrollment,
    enrollment_active: Boolean(activeEnrollment),
    staff_name: activeEnrollment ? activeEnrollment.staff_name : ''
  })
})

// ── RFID Enrollment Endpoints ──────────────────────────────────────────────────

// POST /api/iot/enrollment/start — Admin begins enrollment mode for approved staff
app.post('/api/iot/enrollment/start', async (req, res) => {
  try {
    const { staff_id, staffId } = req.body || {}
    const targetStaffId = staff_id || staffId
    if (!targetStaffId) return res.status(400).json({ error: 'staff_id is required.' })

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetStaffId])
    const staffMember = staffRows[0]
    if (!staffMember) return res.status(404).json({ error: 'Staff member not found.' })
    if (staffMember.approval_status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved staff members can enroll an RFID card.' })
    }

    activeEnrollment = {
      staff_id: staffMember.staff_id,
      staff_name: staffMember.name,
      role: staffMember.role,
      started_at: Date.now()
    }

    await pool.execute(
      `UPDATE staff SET rfid_status = 'PENDING_ENROLLMENT' WHERE staff_id = ?`,
      [targetStaffId]
    )

    console.log(`[iot/enrollment] Enrollment mode started for ${staffMember.name} (${targetStaffId})`)
    res.json({
      ok: true,
      enrollment: activeEnrollment,
      session: {
        staffId: staffMember.staff_id,
        staffName: staffMember.name,
        role: staffMember.role,
        startedAt: activeEnrollment.started_at
      },
      message: `Enrollment session started. ESP32 is now READY TO SCAN for ${staffMember.name}.`
    })
  } catch (error) {
    sendError(res, error, 'start rfid enrollment session')
  }
})

// POST /api/iot/enrollment/cancel — Cancel active enrollment mode
app.post('/api/iot/enrollment/cancel', (req, res) => {
  activeEnrollment = null
  console.log('[iot/enrollment] Enrollment session cancelled.')
  res.json({ ok: true, message: 'Enrollment session cancelled.' })
})

// GET /api/iot/enrollment/status — Poll current enrollment status
app.get('/api/iot/enrollment/status', (req, res) => {
  if (activeEnrollment && (Date.now() - activeEnrollment.started_at > 180000)) {
    activeEnrollment = null
  }
  res.json({
    active: Boolean(activeEnrollment),
    enrollment: activeEnrollment
  })
})

// ── Admin Staff Management Endpoints ──────────────────────────────────────────

// POST /api/admin/staff/create — Admin manually creates a new staff account
app.post('/api/admin/staff/create', async (req, res) => {
  try {
    const {
      first_name,
      firstName,
      middle_name,
      middleName,
      last_name,
      lastName,
      birthdate,
      gender,
      contact_number,
      contact,
      phone,
      email,
      address,
      home_address,
      employee_id,
      employeeId,
      position,
      date_hired,
      dateHired,
      employment_status,
      employmentStatus,
      username,
      password,
      account_status,
      accountStatus
    } = req.body || {}

    const fn = (first_name || firstName || '').trim()
    const mn = (middle_name || middleName || '').trim()
    const ln = (last_name || lastName || '').trim()
    const userEmail = (email || '').trim().toLowerCase()
    const userContact = (contact_number || contact || phone || '').trim()
    const userPosition = position || 'Staff'
    const userPassword = (password || '').trim()

    // 1. Validate required fields
    if (!fn || !ln || !userEmail || !userContact || !userPosition || !userPassword) {
      return res.status(400).json({
        error: 'First Name, Last Name, Email, Contact Number, Position, and Password are required.'
      })
    }

    // Validate password rules
    if (userPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }
    if (userPassword.length > 64) {
      return res.status(400).json({ error: 'Password must be 64 characters or fewer.' })
    }
    if (!/[A-Z]/.test(userPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A–Z).' })
    }
    if (!/[a-z]/.test(userPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a–z).' })
    }
    if (!/[0-9]/.test(userPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number (0–9).' })
    }
    if (!/[^A-Za-z0-9]/.test(userPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character (e.g. !@#$%).' })
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }

    // 3. Validate contact number
    const cleanPhone = userContact.replace(/\D/g, '')
    if (cleanPhone.length < 7) {
      return res.status(400).json({ error: 'Contact number must contain at least 7 digits.' })
    }

    // 4. Employee ID: Ensure unique or auto-generate
    let finalEmpId = (employee_id || employeeId || '').trim()
    if (!finalEmpId) {
      finalEmpId = `EMP-${Date.now().toString().slice(-4)}`
    }
    const [empDupes] = await pool.execute('SELECT staff_id FROM staff WHERE employee_id = ? LIMIT 1', [finalEmpId])
    if (empDupes.length > 0) {
      return res.status(409).json({ error: `Employee ID "${finalEmpId}" is already assigned to another staff member.` })
    }

    // 5. Check duplicate Email across staff and user_accounts
    const [emailDupesStaff] = await pool.execute(
      'SELECT staff_id FROM staff WHERE LOWER(email) = ? OR LOWER(contact) = ? LIMIT 1',
      [userEmail, userEmail]
    )
    const [emailDupesAccount] = await pool.execute(
      'SELECT account_id FROM user_accounts WHERE LOWER(email) = ? LIMIT 1',
      [userEmail]
    )
    if (emailDupesStaff.length > 0 || emailDupesAccount.length > 0) {
      return res.status(409).json({ error: `Email address "${userEmail}" is already registered in the system.` })
    }

    // 6. Check duplicate Username
    const finalUsername = (username || userEmail).trim()
    const [usernameDupes] = await pool.execute(
      'SELECT account_id FROM user_accounts WHERE LOWER(username) = ? LIMIT 1',
      [finalUsername.toLowerCase()]
    )
    if (usernameDupes.length > 0) {
      return res.status(409).json({ error: `Username "${finalUsername}" is already taken.` })
    }

    // 7. Security: Hash password using bcrypt
    const passwordHash = await bcrypt.hash(userPassword, 10)

    // 8. Staff metadata
    const fullName = [fn, mn, ln].filter(Boolean).join(' ')
    const staffId = `STAFF-${Date.now()}`
    const finalEmploymentStatus = (employment_status || employmentStatus || 'Active') === 'Inactive' ? 'Inactive' : 'Active'
    const finalAccountStatus = (account_status || accountStatus || 'Active') === 'Inactive' ? 'Inactive' : 'Active'
    const finalDateHired = date_hired || dateHired || new Date().toISOString().slice(0, 10)
    const finalAddress = (address || home_address || '').trim()

    // 9. Insert into user_accounts
    // IMPORTANT: Position is an employment designation, NOT an authorization role.
    // Authorization role is STRICTLY 'Staff'. Manager position NEVER grants Admin privileges.
    const [accountResult] = await pool.execute(
      `INSERT INTO user_accounts 
        (username, email, password_hash, role, contact, position, employee_id, staff_id, approval_status, approved_by, approved_at, account_status)
       VALUES (?, ?, ?, 'Staff', ?, ?, ?, ?, 'APPROVED', 'Admin', NOW(), ?)`,
      [finalUsername, userEmail, passwordHash, userContact, userPosition, finalEmpId, staffId, finalAccountStatus]
    )
    const newAccountId = accountResult.insertId

    // 10. Insert into staff table
    await pool.execute(
      `INSERT INTO staff
        (staff_id, name, role, contact, status, approval_status, approved_by, approved_at, rfid_status,
         employee_id, account_id, first_name, middle_name, last_name, birthdate, gender, email, address,
         position, date_hired, employment_status)
       VALUES (?, ?, 'Staff', ?, 'Offline', 'APPROVED', 'Admin', NOW(), 'INACTIVE',
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staffId,
        fullName,
        userContact,
        finalEmpId,
        newAccountId,
        fn,
        mn || null,
        ln,
        birthdate || null,
        gender || null,
        userEmail,
        finalAddress || null,
        userPosition,
        finalDateHired,
        finalEmploymentStatus
      ]
    )

    // 11. Optional Firebase User Creation
    try {
      await upsertFirebaseUser(userEmail, userPassword, fullName, 'Staff')
    } catch (fbErr) {
      console.warn('[admin/staff/create] Firebase Auth upsert notice:', fbErr.message)
    }

    // 12. Create Notification
    const notifId = 'NOTIF-' + Date.now()
    const notifDetail = `New staff account created: ${fullName} (${userPosition}, Employee ID: ${finalEmpId}).`
    await pool.execute(
      `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
       VALUES (?, ?, ?, 'all', 'Just now', 0)`,
      [notifId, 'Staff Account Created', notifDetail]
    ).catch(() => {})

    syncNotification({
      id: notifId,
      title: 'Staff Account Created',
      detail: notifDetail,
      audience: 'all',
      time: 'Just now',
      isRead: false
    }).catch(() => {})

    // 13. Fetch created staff record
    const [createdRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
              approval_status AS approvalStatus, rejection_reason AS rejectionReason, approved_by AS approvedBy,
              approved_at AS approvedAt, rfid_status AS rfidStatus,
              employee_id AS employeeId, first_name AS firstName, middle_name AS middleName, last_name AS lastName,
              birthdate, gender, email, address, position, date_hired AS dateHired,
              employment_status AS employmentStatus, account_id AS accountId
       FROM staff WHERE staff_id = ?`,
      [staffId]
    )

    const createdStaff = createdRows[0]
    if (createdStaff) {
      syncStaff(createdStaff).catch(() => {})
    }

    console.log(`[admin/staff/create] Successfully created staff ${fullName} (${finalEmpId})`)
    res.json({
      ok: true,
      message: `Staff account for ${fullName} successfully created.`,
      staff: createdStaff
    })
  } catch (error) {
    sendError(res, error, 'admin create staff')
  }
})

// POST /api/admin/staff/update — Admin edits staff personal & employment details
app.post('/api/admin/staff/update', async (req, res) => {
  try {
    const {
      staff_id,
      staffId,
      first_name,
      firstName,
      middle_name,
      middleName,
      last_name,
      lastName,
      birthdate,
      gender,
      contact_number,
      contact,
      phone,
      email,
      address,
      home_address,
      position,
      date_hired,
      dateHired,
      employment_status,
      employmentStatus
    } = req.body || {}

    const targetStaffId = staff_id || staffId
    if (!targetStaffId) return res.status(400).json({ error: 'staff_id is required.' })

    const [existing] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetStaffId])
    if (existing.length === 0) return res.status(404).json({ error: 'Staff member not found.' })

    const cur = existing[0]
    const fn = first_name !== undefined ? first_name : (firstName !== undefined ? firstName : cur.first_name)
    const mn = middle_name !== undefined ? middle_name : (middleName !== undefined ? middleName : cur.middle_name)
    const ln = last_name !== undefined ? last_name : (lastName !== undefined ? lastName : cur.last_name)
    const fullName = [fn, mn, ln].filter(Boolean).join(' ') || cur.name
    const userContact = (contact_number || contact || phone || cur.contact || '').trim()
    const userEmail = (email || cur.email || '').trim().toLowerCase()
    const finalPosition = position || cur.position || cur.role
    const finalEmpStatus = (employment_status || employmentStatus || cur.employment_status || 'Active') === 'Inactive' ? 'Inactive' : 'Active'
    const finalBirthdate = birthdate !== undefined ? birthdate : cur.birthdate
    const finalGender = gender !== undefined ? gender : cur.gender
    const finalAddress = (address || home_address || cur.address || '').trim()
    const finalDateHired = date_hired || dateHired || cur.date_hired

    await pool.execute(
      `UPDATE staff SET
        name = ?,
        first_name = ?,
        middle_name = ?,
        last_name = ?,
        birthdate = ?,
        gender = ?,
        contact = ?,
        email = ?,
        address = ?,
        position = ?,
        date_hired = ?,
        employment_status = ?,
        updated_at = NOW()
       WHERE staff_id = ?`,
      [
        fullName,
        fn || null,
        mn || null,
        ln || null,
        finalBirthdate || null,
        finalGender || null,
        userContact,
        userEmail,
        finalAddress || null,
        finalPosition,
        finalDateHired || null,
        finalEmpStatus,
        targetStaffId
      ]
    )

    // Synchronize to user_accounts
    await pool.execute(
      `UPDATE user_accounts SET
        contact = ?,
        email = ?,
        position = ?,
        account_status = ?,
        updated_at = NOW()
       WHERE staff_id = ? OR email = ? OR contact = ?`,
      [userContact, userEmail, finalPosition, finalEmpStatus, targetStaffId, cur.email || cur.contact, cur.contact]
    ).catch(() => {})

    const [updatedRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
              approval_status AS approvalStatus, rejection_reason AS rejectionReason, approved_by AS approvedBy,
              approved_at AS approvedAt, rfid_status AS rfidStatus,
              employee_id AS employeeId, first_name AS firstName, middle_name AS middleName, last_name AS lastName,
              birthdate, gender, email, address, position, date_hired AS dateHired,
              employment_status AS employmentStatus, account_id AS accountId
       FROM staff WHERE staff_id = ?`,
      [targetStaffId]
    )
    if (updatedRows[0]) {
      syncStaff(updatedRows[0]).catch(() => {})
    }

    console.log(`[admin/staff/update] Updated staff ${targetStaffId} (${fullName})`)
    res.json({ ok: true, message: 'Staff information updated successfully.', staff: updatedRows[0] })
  } catch (error) {
    sendError(res, error, 'admin update staff')
  }
})

// POST /api/admin/staff/status — Admin activates or deactivates staff accounts
app.post('/api/admin/staff/status', async (req, res) => {
  try {
    const { staff_id, staffId, status, employment_status, employmentStatus } = req.body || {}
    const targetStaffId = staff_id || staffId
    const newStatus = status || employment_status || employmentStatus
    if (!targetStaffId || !newStatus) {
      return res.status(400).json({ error: 'staff_id and status (Active/Inactive) are required.' })
    }
    const cleanStatus = newStatus === 'Active' ? 'Active' : 'Inactive'

    await pool.execute(
      `UPDATE staff SET employment_status = ?, updated_at = NOW() WHERE staff_id = ?`,
      [cleanStatus, targetStaffId]
    )
    await pool.execute(
      `UPDATE user_accounts SET account_status = ?, updated_at = NOW() WHERE staff_id = ?`,
      [cleanStatus, targetStaffId]
    ).catch(() => {})

    const [updatedRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
              approval_status AS approvalStatus, rfid_status AS rfidStatus,
              employee_id AS employeeId, first_name AS firstName, last_name AS lastName,
              position, employment_status AS employmentStatus
       FROM staff WHERE staff_id = ?`,
      [targetStaffId]
    )
    if (updatedRows[0]) {
      syncStaff(updatedRows[0]).catch(() => {})
    }

    res.json({ ok: true, message: `Staff status updated to ${cleanStatus}.`, staff: updatedRows[0] })
  } catch (error) {
    sendError(res, error, 'admin toggle staff status')
  }
})

// POST /api/admin/staff/deactivate-rfid — Admin deactivates staff RFID card
app.post('/api/admin/staff/deactivate-rfid', async (req, res) => {
  try {
    const { staff_id, staffId } = req.body || {}
    const targetStaffId = staff_id || staffId
    if (!targetStaffId) return res.status(400).json({ error: 'staff_id is required.' })

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetStaffId])
    const member = staffRows[0]
    if (!member) return res.status(404).json({ error: 'Staff member not found.' })

    // Update assignment history
    await pool.execute(
      `UPDATE rfid_card_assignments
       SET card_status = 'Deactivated', deactivated_at = NOW()
       WHERE staff_id = ? AND card_status = 'Active'`,
      [targetStaffId]
    )

    await pool.execute(
      `UPDATE staff SET rfid_uid = NULL, rfid_status = 'INACTIVE', updated_at = NOW() WHERE staff_id = ?`,
      [targetStaffId]
    )
    await pool.execute(
      `UPDATE user_accounts SET rfid_uid = NULL, rfid_status = 'INACTIVE', updated_at = NOW() WHERE staff_id = ?`,
      [targetStaffId]
    ).catch(() => {})

    const [updatedRows] = await pool.execute(
      `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
              approval_status AS approvalStatus, rfid_status AS rfidStatus,
              employee_id AS employeeId, position, employment_status AS employmentStatus
       FROM staff WHERE staff_id = ?`,
      [targetStaffId]
    )
    if (updatedRows[0]) {
      syncStaff(updatedRows[0]).catch(() => {})
    }

    console.log(`[admin/staff/deactivate-rfid] RFID deactivated for staff ${targetStaffId} (${member.name})`)
    res.json({ ok: true, message: `RFID card for ${member.name} has been deactivated.`, staff: updatedRows[0] })
  } catch (error) {
    sendError(res, error, 'admin deactivate rfid card')
  }
})

// GET /api/admin/staff/:staffId/rfid-history — Fetch RFID card assignment history
app.get('/api/admin/staff/:staffId/rfid-history', async (req, res) => {
  try {
    const { staffId } = req.params
    const [rows] = await pool.execute(
      `SELECT id, staff_id, rfid_uid, card_status,
              DATE_FORMAT(registered_at, '%Y-%m-%d %H:%i:%s') AS registered_at,
              registered_by,
              DATE_FORMAT(deactivated_at, '%Y-%m-%d %H:%i:%s') AS deactivated_at
       FROM rfid_card_assignments
       WHERE staff_id = ?
       ORDER BY registered_at DESC`,
      [staffId]
    )
    res.json({ ok: true, history: rows })
  } catch (error) {
    sendError(res, error, 'fetch staff rfid history')
  }
})

// ── Staff Registration & Approval Endpoints ─────────────────────────────────────

// POST /api/accounts/register-staff — Mobile app registration for staff with position
app.post('/api/accounts/register-staff', async (req, res) => {
  try {
    const { name, fullName, email, phone, contact, password, username, position } = req.body || {}
    const personName = name || fullName
    const personPhone = phone || contact
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName = typeof personName === 'string' ? personName.trim() : ''
    const normalizedUsername = typeof username === 'string' && username.trim() ? username.trim() : (normalizedEmail ? normalizedEmail.split('@')[0] : '')
    const allowedPositions = ['Manager', 'Head Chef', 'Service Crew', 'Staff']
    const requestedPosition = allowedPositions.includes(position) ? position : 'Staff'

    if (!normalizedName) return res.status(400).json({ error: 'Full name is required.' })
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: 'Valid email address is required.' })
    if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required.' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    if (password.length > 64) return res.status(400).json({ error: 'Password must be 64 characters or fewer.' })
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter (A–Z).' })
    if (!/[a-z]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one lowercase letter (a–z).' })
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one number (0–9).' })
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one special character (e.g. !@#$%).' })

    const [existing] = await pool.execute('SELECT account_id FROM user_accounts WHERE email = ?', [normalizedEmail])
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email address already exists.' })
    }

    const staffId = 'STAFF-' + Date.now()
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert into user_accounts with approval_status = 'PENDING'
    await pool.execute(
      `INSERT INTO user_accounts (username, email, password_hash, role, position, contact, approval_status, rfid_status)
       VALUES (?, ?, ?, 'Staff', ?, ?, 'PENDING', 'UNREGISTERED')`,
      [normalizedUsername, normalizedEmail, passwordHash, requestedPosition, String(personPhone || '').trim()]
    )

    // Insert into staff table with status = 'Offline', approval_status = 'PENDING', rfid_status = 'UNREGISTERED'
    await pool.execute(
      `INSERT INTO staff (staff_id, name, role, contact, status, approval_status, rfid_status)
       VALUES (?, ?, ?, ?, 'Offline', 'PENDING', 'UNREGISTERED')`,
      [staffId, normalizedName, requestedPosition, String(personPhone || normalizedEmail).trim()]
    )

    // Insert real-time Admin notification
    const notifId = 'NOTIF-' + Date.now()
    const notifDetail = `${normalizedName} requested registration as ${requestedPosition} (${normalizedEmail})`
    await pool.execute(
      `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
       VALUES (?, ?, ?, 'admin', 'Just now', 0)`,
      [notifId, 'New Staff Registration Request', notifDetail]
    )

    const notifRecord = {
      id: notifId,
      title: 'New Staff Registration Request',
      detail: notifDetail,
      audience: 'admin',
      time: 'Just now',
      isRead: false,
      read: false,
    }
    syncNotification(notifRecord).catch(() => {})

    const staffRecord = {
      id: staffId,
      staff_id: staffId,
      name: normalizedName,
      role: requestedPosition,
      position: requestedPosition,
      contact: String(personPhone || normalizedEmail).trim(),
      email: normalizedEmail,
      status: 'Offline',
      approvalStatus: 'PENDING',
      rfidStatus: 'UNREGISTERED',
    }
    syncStaff(staffRecord).catch(() => {})

    console.log(`[staff/register] New staff applicant registered: ${normalizedName} (${requestedPosition}, PENDING)`)

    res.status(201).json({
      success: true,
      staff_id: staffId,
      id: staffId,
      user: {
        id: staffId,
        name: normalizedName,
        email: normalizedEmail,
        position: requestedPosition,
        approval_status: 'PENDING',
        rfid_status: 'UNREGISTERED'
      },
      approval_status: 'PENDING',
      message: 'Staff registration submitted successfully. Please wait for Admin approval before RFID enrollment.'
    })
  } catch (error) {
    sendError(res, error, 'register staff applicant')
  }
})

// GET /api/admin/staff-requests — Retrieve registration requests for Admin Dashboard
app.get('/api/admin/staff-requests', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.staff_id AS id, s.name, s.role AS position, s.contact, s.status,
              COALESCE(u.email, s.contact) AS email,
              u.username,
              s.approval_status AS approvalStatus, s.rejection_reason AS rejectionReason,
              s.approved_by AS approvedBy, s.approved_at AS approvedAt,
              s.rfid_status AS rfidStatus, s.rfid_uid AS rfidUid,
              s.created_at AS createdAt
       FROM staff s
       LEFT JOIN (
         SELECT contact, username, MAX(email) AS email 
         FROM user_accounts 
         GROUP BY contact, username
       ) u ON (u.contact = s.contact OR u.username = s.name)
       GROUP BY s.staff_id
       ORDER BY (CASE WHEN s.approval_status = 'PENDING' THEN 0 ELSE 1 END), s.created_at DESC`
    )
    res.json({ ok: true, requests: rows })
  } catch (error) {
    sendError(res, error, 'fetch staff registration requests')
  }
})

// POST /api/admin/staff-requests/approve — Admin ACCEPT action
app.post('/api/admin/staff-requests/approve', async (req, res) => {
  try {
    const { staff_id, staffId, admin_id, adminId, admin_name, adminName } = req.body || {}
    const targetStaffId = staff_id || staffId
    if (!targetStaffId) return res.status(400).json({ error: 'staff_id is required.' })

    const approver = admin_name || adminName || admin_id || adminId || 'Admin'
    await pool.execute(
      `UPDATE staff 
       SET approval_status = 'APPROVED', approved_by = ?, approved_at = NOW(), rejection_reason = NULL, rfid_status = 'PENDING_ENROLLMENT'
       WHERE staff_id = ?`,
      [approver, targetStaffId]
    )

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetStaffId])
    const staffMember = staffRows[0]
    if (staffMember) {
      await pool.execute(
        `UPDATE user_accounts 
         SET approval_status = 'APPROVED', approved_by = ?, approved_at = NOW(), rejection_reason = NULL, rfid_status = 'PENDING_ENROLLMENT'
         WHERE contact = ? OR email = ? OR username = ?`,
        [approver, staffMember.contact, staffMember.contact, staffMember.name]
      ).catch(() => {})

      // Send real-time notification
      const notifId = 'NOTIF-' + Date.now()
      const notifDetail = `Staff registration for ${staffMember.name} (${staffMember.role}) has been APPROVED. Eligible for RFID enrollment.`
      await pool.execute(
        `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
         VALUES (?, ?, ?, 'all', 'Just now', 0)`,
        [notifId, 'Staff Registration Approved', notifDetail]
      )

      const notifRecord = {
        id: notifId,
        title: 'Staff Registration Approved',
        detail: notifDetail,
        audience: 'all',
        time: 'Just now',
        isRead: false,
      }
      syncNotification(notifRecord).catch(() => {})

      const updatedStaffRecord = {
        id: staffMember.staff_id,
        staff_id: staffMember.staff_id,
        name: staffMember.name,
        role: staffMember.role,
        position: staffMember.role,
        contact: staffMember.contact,
        status: staffMember.status,
        approvalStatus: 'APPROVED',
        approvedBy: approver,
        approvedAt: new Date().toISOString(),
        rfidStatus: 'PENDING_ENROLLMENT',
        rfidUid: staffMember.rfid_uid || null
      }
      syncStaff(updatedStaffRecord).catch(() => {})
    }

    console.log(`[staff/approve] Staff ${targetStaffId} approved by ${approver}`)
    res.json({ ok: true, message: 'Staff registration approved. RFID enrollment unlocked.', staff: staffMember })
  } catch (error) {
    sendError(res, error, 'approve staff registration')
  }
})

// POST /api/admin/staff-requests/reject — Admin REJECT action with required reason
app.post('/api/admin/staff-requests/reject', async (req, res) => {
  try {
    const { staff_id, staffId, rejection_reason, rejectionReason, reason, admin_id, adminId, admin_name, adminName } = req.body || {}
    const targetStaffId = staff_id || staffId
    if (!targetStaffId) return res.status(400).json({ error: 'staff_id is required.' })
    const cleanReason = String(rejection_reason || rejectionReason || reason || '').trim()
    if (!cleanReason) {
      return res.status(400).json({ error: 'A rejection reason is required.' })
    }

    const approver = admin_name || adminName || admin_id || adminId || 'Admin'

    await pool.execute(
      `UPDATE staff 
       SET approval_status = 'REJECTED', rejection_reason = ?, approved_by = ?, approved_at = NOW(), rfid_status = 'INACTIVE'
       WHERE staff_id = ?`,
      [cleanReason, approver, targetStaffId]
    )

    const [staffRows] = await pool.execute('SELECT * FROM staff WHERE staff_id = ? LIMIT 1', [targetStaffId])
    const staffMember = staffRows[0]
    if (staffMember) {
      await pool.execute(
        `UPDATE user_accounts 
         SET approval_status = 'REJECTED', rejection_reason = ?, approved_by = ?, approved_at = NOW(), rfid_status = 'INACTIVE'
         WHERE contact = ? OR email = ? OR username = ?`,
        [cleanReason, approver, staffMember.contact, staffMember.contact, staffMember.name]
      ).catch(() => {})

      // Send rejection notification
      const notifId = 'NOTIF-' + Date.now()
      const notifDetail = `Staff registration for ${staffMember.name} was rejected: "${cleanReason}"`
      await pool.execute(
        `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
         VALUES (?, ?, ?, 'all', 'Just now', 0)`,
        [notifId, 'Staff Registration Rejected', notifDetail]
      )

      const notifRecord = {
        id: notifId,
        title: 'Staff Registration Rejected',
        detail: notifDetail,
        audience: 'all',
        time: 'Just now',
        isRead: false,
      }
      syncNotification(notifRecord).catch(() => {})

      const updatedStaffRecord = {
        id: staffMember.staff_id,
        staff_id: staffMember.staff_id,
        name: staffMember.name,
        role: staffMember.role,
        position: staffMember.role,
        contact: staffMember.contact,
        status: staffMember.status,
        approvalStatus: 'REJECTED',
        rejectionReason: cleanReason,
        approvedBy: approver,
        approvedAt: new Date().toISOString(),
        rfidStatus: 'INACTIVE',
      }
      syncStaff(updatedStaffRecord).catch(() => {})
    }

    console.log(`[staff/reject] Staff ${targetStaffId} rejected by ${approver}. Reason: ${cleanReason}`)
    res.json({ ok: true, message: 'Staff registration rejected with reason saved.', reason: cleanReason, staff: staffMember })
  } catch (error) {
    sendError(res, error, 'reject staff registration')
  }
})

// POST /api/iot/rfid-scan — Physical RFID scan from ESP32 (Handles Attendance & Enrollment)
app.post('/api/iot/rfid-scan', async (req, res) => {
  try {
    const { rfid_uid, uid, rfidUid, device_id, deviceId } = req.body || {}
    const incomingUid = rfid_uid || uid || rfidUid
    if (!incomingUid) {
      return res.status(400).json({ success: false, message: 'rfid_uid is required' })
    }
    const cleanUid = String(incomingUid).trim().toUpperCase()
    const rawClean = cleanUid.replace(/[^A-Z0-9]/g, '')
    iotLastSeen = new Date().toISOString()

    // ── CHECK IF ENROLLMENT SESSION IS ACTIVE ──
    if (activeEnrollment && (Date.now() - activeEnrollment.started_at <= 180000)) {
      // 1. Check duplicate card UID across other staff members (staff table and assignments table)
      const [dupes] = await pool.execute(
        `SELECT staff_id, name FROM staff 
         WHERE (UPPER(rfid_uid) = ? 
            OR REPLACE(UPPER(rfid_uid), ':', '') = ? 
            OR REPLACE(UPPER(rfid_uid), '-', '') = ?)
           AND staff_id != ? LIMIT 1`,
        [cleanUid, rawClean, rawClean, activeEnrollment.staff_id]
      )
      if (dupes.length > 0) {
        console.warn(`[iot/rfid] Duplicate card attempt: ${cleanUid} is already assigned to ${dupes[0].name}`)
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: `Card already assigned to ${dupes[0].name}`,
          staff_name: dupes[0].name
        })
      }

      const [assignedOther] = await pool.execute(
        `SELECT r.staff_id, s.name 
         FROM rfid_card_assignments r
         LEFT JOIN staff s ON s.staff_id = r.staff_id
         WHERE (UPPER(r.rfid_uid) = ? OR REPLACE(UPPER(r.rfid_uid), ':', '') = ?)
           AND r.card_status = 'Active' AND r.staff_id != ? LIMIT 1`,
        [cleanUid, rawClean, activeEnrollment.staff_id]
      )
      if (assignedOther.length > 0) {
        console.warn(`[iot/rfid] Duplicate card in assignments: ${cleanUid} active for ${assignedOther[0].name}`)
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: `Card already assigned to ${assignedOther[0].name || assignedOther[0].staff_id}`,
          staff_name: assignedOther[0].name
        })
      }

      // 2. Archive previous active card assignment for this staff member as 'Replaced'
      const targetStaffId = activeEnrollment.staff_id
      const targetStaffName = activeEnrollment.staff_name

      await pool.execute(
        `UPDATE rfid_card_assignments
         SET card_status = 'Replaced', deactivated_at = NOW()
         WHERE staff_id = ? AND card_status = 'Active'`,
        [targetStaffId]
      )

      // 3. Insert new active card assignment record for audit history
      await pool.execute(
        `INSERT INTO rfid_card_assignments (staff_id, rfid_uid, card_status, registered_at, registered_by)
         VALUES (?, ?, 'Active', NOW(), 'Admin')`,
        [targetStaffId, cleanUid]
      )

      // 4. Link card to enrolling staff member in staff table
      await pool.execute(
        `UPDATE staff SET rfid_uid = ?, rfid_status = 'ACTIVE', updated_at = NOW() WHERE staff_id = ?`,
        [cleanUid, targetStaffId]
      )

      // Also link to user_accounts if matching staff_id or contact/email/username
      await pool.execute(
        `UPDATE user_accounts SET rfid_uid = ?, rfid_status = 'ACTIVE', updated_at = NOW()
         WHERE staff_id = ? OR contact = ? OR email = ? OR username = ?`,
        [cleanUid, targetStaffId, targetStaffName, targetStaffName, targetStaffName]
      ).catch(() => {})

      // 5. Persistent notification
      const notifId = 'NOTIF-' + Date.now()
      const notifDetail = `RFID card [${cleanUid}] successfully registered to ${targetStaffName}.`
      await pool.execute(
        `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
         VALUES (?, ?, ?, 'all', 'Just now', 0)`,
        [notifId, 'RFID Registration Successful', notifDetail]
      )
      syncNotification({
        id: notifId,
        title: 'RFID Registration Successful',
        detail: notifDetail,
        audience: 'all',
        time: 'Just now',
        isRead: false
      }).catch(() => {})

      const [updatedRows] = await pool.execute(
        `SELECT staff_id AS id, name, role, contact, status, time_in AS time, time_out AS timeOut, rfid_uid AS rfidUid,
                approval_status AS approvalStatus, rfid_status AS rfidStatus,
                employee_id AS employeeId, first_name AS firstName, last_name AS lastName,
                position, employment_status AS employmentStatus
         FROM staff WHERE staff_id = ?`,
        [targetStaffId]
      )
      if (updatedRows[0]) {
        syncStaff(updatedRows[0]).catch(() => {})
      }

      console.log(`[iot/rfid] ENROLLMENT SUCCESS: Card ${cleanUid} assigned to ${targetStaffName} (${targetStaffId})`)
      activeEnrollment = null

      return res.json({
        success: true,
        is_enrollment: true,
        action: 'Enrollment',
        staff_id: targetStaffId,
        staff_name: targetStaffName,
        rfid_uid: cleanUid,
        message: 'REGISTRATION SUCCESSFUL'
      })
    }

    // ── NORMAL ATTENDANCE SCAN ──
    const [staffRows] = await pool.execute(
      `SELECT staff_id, name, role, contact, status, time_in, time_out, rfid_uid,
              approval_status, rfid_status, COALESCE(employment_status, 'Active') AS employment_status, email
       FROM staff 
       WHERE UPPER(rfid_uid) = ? 
          OR REPLACE(UPPER(rfid_uid), ':', '') = ? 
          OR REPLACE(UPPER(rfid_uid), '-', '') = ? 
       LIMIT 1`,
      [cleanUid, rawClean, rawClean]
    )

    if (staffRows.length === 0) {
      iotLastUnknownCard = { uid: cleanUid, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
      console.log(`[iot/rfid] Unknown card scanned: ${cleanUid} (Device: ${device_id || 'unknown'})`)
      return res.status(404).json({
        success: false,
        status: 'unregistered',
        message: `RFID card [${cleanUid}] is not registered to any staff member.`,
        rfid_uid: cleanUid
      })
    }

    const staffMember = staffRows[0]

    // Strict 5-point verification for staff RFID attendance:
    // 1. Staff account exists (verified above: staffMember exists)
    // 2. Staff approval status must be APPROVED
    if (staffMember.approval_status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: `Account is ${staffMember.approval_status} - Attendance Denied`,
        staff_name: staffMember.name
      })
    }

    // 3. Staff employment status must be Active
    if (staffMember.employment_status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Staff Employment Status is Inactive - Attendance Denied',
        staff_name: staffMember.name
      })
    }

    // 4. Staff RFID card status must be ACTIVE
    if (staffMember.rfid_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'RFID Card is Inactive or Deactivated - Attendance Denied',
        staff_name: staffMember.name
      })
    }

    // 5. Staff account in user_accounts must also be active
    const [userAccRows] = await pool.execute(
      `SELECT account_id, account_status FROM user_accounts 
       WHERE staff_id = ? OR email = ? OR contact = ? LIMIT 1`,
      [staffMember.staff_id, staffMember.email || staffMember.contact, staffMember.contact]
    )
    if (userAccRows[0] && userAccRows[0].account_status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Staff Account is Inactive - Attendance Denied',
        staff_name: staffMember.name
      })
    }

    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    // 2. Toggle Time In / Time Out: If currently Present -> Time Out (Offline), otherwise -> Time In (Present)
    const isClockingIn = staffMember.status !== 'Present'
    const action = isClockingIn ? 'Time in' : 'Time out'
    const newStatus = isClockingIn ? 'Present' : 'Offline'
    const timeInVal = isClockingIn ? timeStr : (staffMember.time_in || timeStr)
    const timeOutVal = isClockingIn ? '—' : timeStr

    // 3. Update staff record in MySQL
    await pool.execute(
      'UPDATE staff SET status = ?, time_in = ?, time_out = ?, updated_at = NOW() WHERE staff_id = ?',
      [newStatus, timeInVal, timeOutVal, staffMember.staff_id]
    )

    // 4. Insert scan event into attendance_events table
    const [eventResult] = await pool.execute(
      'INSERT INTO attendance_events (staff_id, staff_name, event_time, action) VALUES (?, ?, ?, ?)',
      [staffMember.staff_id, staffMember.name, timeStr, action]
    )
    const eventId = eventResult.insertId

    const attendanceEventRecord = {
      id: eventId,
      event_id: eventId,
      staff_id: staffMember.staff_id,
      staffId: staffMember.staff_id,
      name: staffMember.name,
      staff_name: staffMember.name,
      time: timeStr,
      event_time: timeStr,
      action: action
    }

    const updatedStaffRecord = {
      id: staffMember.staff_id,
      staff_id: staffMember.staff_id,
      name: staffMember.name,
      role: staffMember.role,
      contact: staffMember.contact,
      status: newStatus,
      time: timeInVal,
      time_in: timeInVal,
      timeOut: timeOutVal,
      time_out: timeOutVal,
      rfid_uid: cleanUid,
      approvalStatus: staffMember.approval_status,
      rfidStatus: staffMember.rfid_status
    }

    // 5. Realtime sync to Firebase Realtime Database
    syncAttendanceEvent(attendanceEventRecord).catch((err) => console.warn('[iot/rfid] syncAttendanceEvent warn:', err.message))
    syncStaff(updatedStaffRecord).catch((err) => console.warn('[iot/rfid] syncStaff warn:', err.message))

    iotLastScan = {
      staff_name: staffMember.name,
      action,
      time: timeStr,
      rfid_uid: cleanUid
    }

    console.log(`[iot/rfid] SUCCESS: ${staffMember.name} (${staffMember.role}) -> ${action} at ${timeStr}`)

    return res.json({
      success: true,
      staff_id: staffMember.staff_id,
      staff_name: staffMember.name,
      role: staffMember.role,
      action,
      status: newStatus,
      time: timeStr,
      message: `${staffMember.name} successfully clocked ${action.toLowerCase()} at ${timeStr}.`
    })
  } catch (error) {
    sendError(res, error, 'process rfid attendance scan')
  }
})

// POST /api/rewards/delete — delete reward and sync to cloud destinations
app.post('/api/rewards/delete', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Reward id is required.' })
    await pool.execute('DELETE FROM rewards WHERE reward_id = ?', [id])
    await deleteReward(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete reward')
  }
})

// POST /api/promotions/delete — delete promotion and sync to cloud destinations
app.post('/api/promotions/delete', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Promotion id is required.' })
    await pool.execute('DELETE FROM promotions WHERE promotion_id = ?', [id])
    await deletePromotion(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete promotion')
  }
})

// POST /api/notifications/delete — delete notification and sync to cloud destinations
app.post('/api/notifications/delete', requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Notification id is required.' })
    await pool.execute('DELETE FROM notifications WHERE notification_id = ?', [id])
    await deleteNotification(id)
    res.json({ ok: true, id })
  } catch (error) {
    sendError(res, error, 'delete notification')
  }
})

// ── Application state endpoints ───────────────────────────────────────────────

app.get('/api/bootstrap', async (_req, res) => {
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

app.put('/api/state', requireStaffOrAdminAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'A valid JSON state payload object is required.' })
    }
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
              ua.position, ua.approval_status, ua.rejection_reason, ua.rfid_status,
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

    // Return account details so the mobile app or web frontend gets approval status immediately
    res.json({
      account: {
        username: account.username,
        email:    account.email,
        role:     account.role,
        position: account.position || account.role,
        contact:  account.contact,
        name:     account.name,
        approval_status: account.approval_status || 'APPROVED',
        rejection_reason: account.rejection_reason || null,
        rfid_status: account.rfid_status || 'INACTIVE',
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

// ── Password Reset OTP Store & Endpoints ─────────────────────────────────────
const passwordResetStore = new Map() // email -> { otpCode, expiresAt, username, attempts }

// Clean up expired OTPs periodically (every 5 mins)
setInterval(() => {
  const now = Date.now()
  for (const [email, entry] of passwordResetStore.entries()) {
    if (now > entry.expiresAt) passwordResetStore.delete(email)
  }
}, 5 * 60 * 1000)

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please enter your registered email address.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }

    // Check if account exists in MySQL
    let user = null
    try {
      const [rows] = await pool.execute(
        `SELECT account_id, username, email, role FROM user_accounts WHERE LOWER(email) = ? LIMIT 1`,
        [normalizedEmail],
      )
      if (rows && rows.length > 0) user = rows[0]
    } catch (dbErr) {
      console.warn('[forgot-password] MySQL lookup note:', dbErr.message)
    }

    // Check mockAccounts fallback if not found in MySQL
    if (!user) {
      const mock = (mockAccounts || []).find((a) => a.email && a.email.toLowerCase() === normalizedEmail)
      if (mock) {
        user = { username: mock.username || mock.name || 'User', email: normalizedEmail, role: mock.role }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' })
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

    passwordResetStore.set(normalizedEmail, {
      otpCode,
      expiresAt,
      username: user.username || 'User',
      attempts: 0,
    })

    // Send email via mailer
    const mailResult = await sendPasswordResetOtp({
      toEmail: normalizedEmail,
      otpCode,
      username: user.username || 'User',
    })

    res.json({
      success: true,
      message: 'Password reset code has been sent to your email.',
      simulated: Boolean(mailResult?.simulated),
    })
  } catch (err) {
    console.error('[forgot-password] Error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to send password reset code. Please try again.' })
  }
})

// POST /api/auth/verify-reset-otp
app.post('/api/auth/verify-reset-otp', (req, res) => {
  try {
    const { email, otp } = req.body || {}
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required.' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const cleanOtp = String(otp).trim()
    const record = passwordResetStore.get(normalizedEmail)

    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'The verification code has expired. Please request a new code.' })
    }

    if (record.attempts >= 5) {
      passwordResetStore.delete(normalizedEmail)
      return res.status(429).json({ error: 'Too many invalid attempts. Please request a new code.' })
    }

    if (record.otpCode !== cleanOtp) {
      record.attempts += 1
      return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' })
    }

    res.json({ success: true, message: 'Verification code verified successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' })
  }
})

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {}
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const cleanOtp = String(otp).trim()
    const record = passwordResetStore.get(normalizedEmail)

    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'The verification code has expired. Please request a new code.' })
    }

    if (record.otpCode !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid verification code.' })
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' })
    }

    // Hash the new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update in MySQL database
    try {
      await pool.execute(
        `UPDATE user_accounts SET password_hash = ? WHERE LOWER(email) = ?`,
        [passwordHash, normalizedEmail],
      )
      console.log(`[reset-password] Password updated in MySQL for ${normalizedEmail}`)
    } catch (dbErr) {
      console.warn('[reset-password] MySQL update note:', dbErr.message)
    }

    // Update in Firebase Auth if available
    try {
      const adminModule = await import('firebase-admin')
      const admin = adminModule.default || adminModule
      if (admin && admin.apps && admin.apps.length) {
        const fbUser = await admin.auth().getUserByEmail(normalizedEmail).catch(() => null)
        if (fbUser) {
          await admin.auth().updateUser(fbUser.uid, { password: newPassword })
          console.log(`[reset-password] Password updated in Firebase Auth for UID: ${fbUser.uid}`)
        }
      }
    } catch (fbErr) {
      console.warn('[reset-password] Firebase update note:', fbErr.message)
    }

    // Clean up OTP record
    passwordResetStore.delete(normalizedEmail)

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    })
  } catch (err) {
    console.error('[reset-password] Error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to update password.' })
  }
})

// GET /api/mail/status
app.get('/api/mail/status', (req, res) => {
  res.json({
    configured: isSmtpConfigured(),
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    user: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{3})(.*)(@.*)/, '$1***$3') : null,
  })
})

app.post('/api/customers/register', async (req, res) => {
  try {
    const { name, email, phone, password, username } = req.body || {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName  = typeof name  === 'string' ? name.trim()                : ''
    const normalizedUsername = (typeof username === 'string' && username.trim()) ? username.trim() : normalizedEmail

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
        [normalizedUsername, normalizedEmail, passwordHash, String(phone || '').trim(), customerId, firebaseUid],
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

    // ── SECURITY: Only existing authorized Administrators may create Admin or Staff accounts ──
    const [callerRows] = await pool.execute(
      `SELECT role FROM user_accounts WHERE email = ? LIMIT 1`,
      [callerEmail],
    )
    const callerRole = callerRows[0]?.role || decoded.role
    if (callerRole !== 'Admin') {
      return res.status(403).json({ error: 'Only authorized Administrator accounts can create Staff or Admin accounts.' })
    }

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

// Serve production build if present
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

// Start Express API listener immediately so localhost:3001 is instantly available
const server = app.listen(config.apiPort, '0.0.0.0', () => {
  console.log(`[api] Listening on http://0.0.0.0:${config.apiPort}`)
})

async function start() {
  try {
    await pool.query('SELECT 1')
    console.log(`[api] MySQL  → "${config.database.name}" at ${config.database.host}:${config.database.port}`)

    // Ensure the sync queue table exists even if migration hasn't been run yet
    await ensureSyncTable()

    // Auto-migrate: add image_url column to menu_items if missing
    try {
      await pool.execute(`
        ALTER TABLE \`menu_items\`
        ADD COLUMN IF NOT EXISTS \`image_url\` TEXT NULL DEFAULT NULL
      `)
      console.log('[migrate] menu_items.image_url column ready.')
    } catch {
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

    // Auto-migrate: add rfid_uid column to staff if missing
    try {
      await pool.execute(`
        ALTER TABLE \`staff\`
        ADD COLUMN IF NOT EXISTS \`rfid_uid\` VARCHAR(64) NULL DEFAULT NULL AFTER \`contact\`
      `)
      console.log('[migrate] staff.rfid_uid column ready.')
    } catch {
      try {
        const [cols] = await pool.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'rfid_uid'`,
        )
        if (cols.length === 0) {
          await pool.execute('ALTER TABLE `staff` ADD COLUMN `rfid_uid` VARCHAR(64) NULL DEFAULT NULL AFTER `contact`')
          console.log('[migrate] staff.rfid_uid column added.')
        }
      } catch (innerErr) {
        console.warn('[migrate] Could not add rfid_uid column:', innerErr.message)
      }
    }

    // Auto-migrate: add approval_status, rejection_reason, rfid_status to staff
    const staffColsToAdd = [
      { name: 'approval_status', sql: "ALTER TABLE `staff` ADD COLUMN `approval_status` ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'APPROVED'" },
      { name: 'rejection_reason', sql: 'ALTER TABLE `staff` ADD COLUMN `rejection_reason` TEXT NULL' },
      { name: 'approved_by', sql: 'ALTER TABLE `staff` ADD COLUMN `approved_by` VARCHAR(64) NULL' },
      { name: 'approved_at', sql: 'ALTER TABLE `staff` ADD COLUMN `approved_at` DATETIME NULL' },
      { name: 'rfid_status', sql: "ALTER TABLE `staff` ADD COLUMN `rfid_status` ENUM('INACTIVE','PENDING_ENROLLMENT','ACTIVE','BLOCKED') DEFAULT 'INACTIVE'" },
    ]
    for (const c of staffColsToAdd) {
      try {
        const [ex] = await pool.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = ?`,
          [c.name]
        )
        if (ex.length === 0) {
          await pool.execute(c.sql)
          console.log(`[migrate] staff.${c.name} column added.`)
        }
      } catch (err) {
        console.warn(`[migrate] Notice for staff.${c.name}:`, err.message)
      }
    }

    // Auto-migrate: add position, approval_status, rejection_reason, rfid_status to user_accounts
    const userAccountColsToAdd = [
      { name: 'position', sql: 'ALTER TABLE `user_accounts` ADD COLUMN `position` VARCHAR(64) NULL DEFAULT NULL' },
      { name: 'approval_status', sql: "ALTER TABLE `user_accounts` ADD COLUMN `approval_status` ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'APPROVED'" },
      { name: 'rejection_reason', sql: 'ALTER TABLE `user_accounts` ADD COLUMN `rejection_reason` TEXT NULL' },
      { name: 'approved_by', sql: 'ALTER TABLE `user_accounts` ADD COLUMN `approved_by` VARCHAR(64) NULL' },
      { name: 'approved_at', sql: 'ALTER TABLE `user_accounts` ADD COLUMN `approved_at` DATETIME NULL' },
      { name: 'rfid_status', sql: "ALTER TABLE `user_accounts` ADD COLUMN `rfid_status` ENUM('INACTIVE','PENDING_ENROLLMENT','ACTIVE','BLOCKED') DEFAULT 'INACTIVE'" },
      { name: 'rfid_uid', sql: 'ALTER TABLE `user_accounts` ADD COLUMN `rfid_uid` VARCHAR(64) NULL DEFAULT NULL' },
    ]
    for (const c of userAccountColsToAdd) {
      try {
        const [ex] = await pool.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_accounts' AND COLUMN_NAME = ?`,
          [c.name]
        )
        if (ex.length === 0) {
          await pool.execute(c.sql)
          console.log(`[migrate] user_accounts.${c.name} column added.`)
        }
      } catch (err) {
        console.warn(`[migrate] Notice for user_accounts.${c.name}:`, err.message)
      }
    }
    await seedDatabase()
  } catch (dbErr) {
    console.warn(`[api] MySQL note: Could not connect to database "${config.database.name}" (${dbErr.message}). Operating with memory fallback.`)
  }

  // Connect to Firebase in the background (non-blocking)
  initFirebase().then(async (fbReady) => {
    if (fbReady) {
      console.log(`[api] Firebase → connected`)
      await ensureDefaultAdminInFirebase().catch((err) => {
        console.error('[firebase] Default admin provisioning warning:', err.message)
      })
      initialSyncFromMySQL().then((result) => {
        if (result?.skipped) return
        console.log(`[sync] Initial sync done: ${result?.synced || 0} records pushed.`)
      }).catch(() => {})
      const flushed = await flushSyncQueue().catch(() => 0)
      if (flushed > 0) console.log(`[sync] Flushed ${flushed} queued record(s) to Firebase.`)
      startSyncRetryLoop()
      startFirebaseToMySQLSync()
    } else {
      console.log(`[api] Firebase → not connected (sync disabled)`)
    }
  }).catch((err) => {
    console.warn('[firebase] Background Firebase init error:', err.message)
  })
}

export { app, server }

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
