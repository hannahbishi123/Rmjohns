/**
 * auditAndBackup.js
 *
 * Safe Phase 1 & Phase 2:
 * 1. Performs verified full backups of MySQL (`eateries_db`) and Firebase (`rmjohns-eateries` RTDB, Firestore, Auth).
 * 2. Audits all records, classifying them into:
 *    - Strictly Preserved: Admin/Staff accounts, baseline catalog, real client records
 *    - Test Data Candidate for Cleanup: Automated test sync customers, test orders (e.g. ORD-SYNC-*, TEST-*)
 *    - Items Requiring Manual Review
 * 3. Does NOT perform any DELETE operations. Pure dry-run & backup.
 */

import { existsSync, writeFileSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { pool } from './database.js'
import { initFirebase } from './firebase.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const backupDir = path.join(projectRoot, 'backups')

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

async function runAuditAndBackup() {
  console.log('====================================================')
  console.log(`Starting Phase 1 & 2: Safe Audit and Verified Backup`)
  console.log(`Timestamp: ${timestamp}`)
  console.log(`Backup Directory: ${backupDir}`)
  console.log('====================================================\n')

  const results = {
    timestamp,
    backups: {},
    mysqlInventory: {},
    firebaseInventory: {
      auth: [],
      rtdbCounts: {},
      firestoreCounts: {}
    },
    classification: {
      preservedAdminStaff: [],
      preservedRealCustomers: [],
      preservedBaselineCatalog: {},
      testCustomersForCleanup: [],
      testOrdersForCleanup: [],
      testPaymentsForCleanup: [],
      testNotificationsForCleanup: [],
      manualReviewNeeded: []
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. MySQL Backup via mysqldump
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[1/4] Performing full MySQL database backup...')
  const mysqlBackupPath = path.join(backupDir, `mysql_eateries_db_${timestamp}.sql`)
  const mysqldumpExe = 'C:\\xampp\\mysql\\bin\\mysqldump.exe'

  try {
    const cmd = `"${mysqldumpExe}" -u root --hex-blob --routines --triggers eateries_db > "${mysqlBackupPath}"`
    execSync(cmd, { stdio: 'inherit', shell: 'cmd.exe' })
    const stat = statSync(mysqlBackupPath)
    if (stat.size > 1000) {
      console.log(`✓ MySQL backup successful: ${mysqlBackupPath} (${stat.size} bytes)`)
      results.backups.mysql = {
        path: mysqlBackupPath,
        sizeBytes: stat.size,
        verified: true
      }
    } else {
      throw new Error(`MySQL backup file is unusually small: ${stat.size} bytes`)
    }
  } catch (err) {
    console.error(`✗ MySQL backup failed:`, err.message)
    results.backups.mysql = { error: err.message, verified: false }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MySQL Schema & Data Audit
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[2/4] Auditing MySQL `eateries_db` records...')
  const [tables] = await pool.query('SHOW TABLES')
  const tableNames = tables.map(t => Object.values(t)[0])

  for (const table of tableNames) {
    const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``)
    const [sample] = await pool.query(`SELECT * FROM \`${table}\` LIMIT 50`)
    results.mysqlInventory[table] = {
      count,
      sampleCount: sample.length
    }
    console.log(`  - Table \`${table}\`: ${count} rows`)
  }

  // Pull all user_accounts
  const [userAccounts] = await pool.query('SELECT * FROM user_accounts')
  // Pull all customers
  const [customers] = await pool.query('SELECT * FROM customers')
  // Pull all staff
  const [staff] = await pool.query('SELECT * FROM staff')
  // Pull all orders
  const [orders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC')
  // Pull all order_items
  const [orderItems] = await pool.query('SELECT * FROM order_items')
  // Pull all payments
  const [payments] = await pool.query('SELECT * FROM payments')
  // Pull all notifications
  const [notifications] = await pool.query('SELECT * FROM notifications')

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Firebase Connection & Backup (RTDB, Firestore, Auth)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[3/4] Initializing Firebase Admin and backing up Firebase data...')
  const fbOk = await initFirebase()
  if (!fbOk) {
    console.error('Failed to initialize Firebase Admin SDK. Halting Firebase backup.')
    return
  }

  const rtdb = admin.database()
  const firestore = admin.firestore()
  const auth = admin.auth()

  // 3a. Backup RTDB
  console.log('  - Backing up Realtime Database `/eateries`...')
  const rtdbSnapshot = await rtdb.ref('eateries').once('value')
  const rtdbData = rtdbSnapshot.val() || {}
  const rtdbBackupPath = path.join(backupDir, `firebase_rtdb_${timestamp}.json`)
  writeFileSync(rtdbBackupPath, JSON.stringify(rtdbData, null, 2), 'utf8')
  const rtdbStat = statSync(rtdbBackupPath)
  console.log(`  ✓ RTDB backup saved: ${rtdbBackupPath} (${rtdbStat.size} bytes)`)
  results.backups.rtdb = {
    path: rtdbBackupPath,
    sizeBytes: rtdbStat.size,
    keys: Object.keys(rtdbData),
    verified: rtdbStat.size > 0
  }
  for (const k of Object.keys(rtdbData)) {
    const childCount = rtdbData[k] && typeof rtdbData[k] === 'object' ? Object.keys(rtdbData[k]).length : 0
    results.firebaseInventory.rtdbCounts[k] = childCount
    console.log(`    * /eateries/${k}: ${childCount} items`)
  }

  // 3b. Backup Firestore Collections
  console.log('  - Backing up Firestore Collections...')
  const collections = ['users', 'orders', 'menu_items', 'payments', 'reservations', 'loyalty_transactions', 'attendance', 'notifications']
  const firestoreDump = {}
  for (const colName of collections) {
    try {
      const snap = await firestore.collection(colName).get()
      firestoreDump[colName] = {}
      snap.forEach(doc => {
        firestoreDump[colName][doc.id] = doc.data()
      })
      const count = snap.size
      results.firebaseInventory.firestoreCounts[colName] = count
      console.log(`    * Firestore \`${colName}\`: ${count} docs`)
    } catch (colErr) {
      console.warn(`    ! Firestore \`${colName}\` read warning:`, colErr.message)
      firestoreDump[colName] = {}
      results.firebaseInventory.firestoreCounts[colName] = 0
    }
  }
  const firestoreBackupPath = path.join(backupDir, `firestore_${timestamp}.json`)
  writeFileSync(firestoreBackupPath, JSON.stringify(firestoreDump, null, 2), 'utf8')
  const fsStat = statSync(firestoreBackupPath)
  console.log(`  ✓ Firestore backup saved: ${firestoreBackupPath} (${fsStat.size} bytes)`)
  results.backups.firestore = {
    path: firestoreBackupPath,
    sizeBytes: fsStat.size,
    verified: fsStat.size > 0
  }

  // 3c. Backup Firebase Auth
  console.log('  - Backing up Firebase Authentication users...')
  const authUsers = []
  let pageToken = undefined
  do {
    const listResult = await auth.listUsers(1000, pageToken)
    listResult.users.forEach(u => {
      authUsers.push({
        uid: u.uid,
        email: u.email,
        emailVerified: u.emailVerified,
        displayName: u.displayName,
        phoneNumber: u.phoneNumber,
        disabled: u.disabled,
        customClaims: u.customClaims || {},
        creationTime: u.metadata.creationTime,
        lastSignInTime: u.metadata.lastSignInTime
      })
    })
    pageToken = listResult.pageToken
  } while (pageToken)

  const authBackupPath = path.join(backupDir, `firebase_auth_${timestamp}.json`)
  writeFileSync(authBackupPath, JSON.stringify(authUsers, null, 2), 'utf8')
  const authStat = statSync(authBackupPath)
  console.log(`  ✓ Firebase Auth backup saved: ${authBackupPath} (${authStat.size} bytes, ${authUsers.length} users)`)
  results.backups.auth = {
    path: authBackupPath,
    sizeBytes: authStat.size,
    userCount: authUsers.length,
    verified: authStat.size > 0
  }
  results.firebaseInventory.auth = authUsers

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Data Classification & Dry Run Logic
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[4/4] Classifying accounts and records (Dry Run analysis)...')

  // Categorize User Accounts in MySQL & Firebase Auth
  // Identified Admin & Staff accounts (MUST NEVER BE DELETED)
  const ADMIN_STAFF_EMAILS = new Set([
    'admin@rmjohns.com',
    'manager@rmjohns.com',
    'staff@rmjohns.com',
    'daweifrancereyes11@gmail.com',
    'daweifrancereyes21@gmail.com',
    'hannahpaderog33@gmail.com',
    'hannahabadijas67@gmail.com'
  ])

  for (const ua of userAccounts) {
    const lowerEmail = (ua.email || '').toLowerCase()
    const role = (ua.role || '').toLowerCase()
    if (ADMIN_STAFF_EMAILS.has(lowerEmail) || role === 'admin' || role === 'staff') {
      results.classification.preservedAdminStaff.push({
        source: 'MySQL user_accounts',
        id: ua.id || ua.account_id || ua.user_id || ua.username || ua.email,
        email: ua.email,
        role: ua.role,
        fullName: ua.full_name || ua.name,
        reason: 'Authorized Admin or Staff account (CRITICAL: PRESERVE)'
      })
    }
  }

  for (const au of authUsers) {
    const lowerEmail = (au.email || '').toLowerCase()
    const claimsRole = (au.customClaims?.role || '').toLowerCase()
    if (ADMIN_STAFF_EMAILS.has(lowerEmail) || claimsRole === 'admin' || claimsRole === 'staff') {
      results.classification.preservedAdminStaff.push({
        source: 'Firebase Auth',
        uid: au.uid,
        email: au.email,
        customClaims: au.customClaims,
        reason: 'Authorized Admin or Staff account in Firebase (CRITICAL: PRESERVE)'
      })
    }
  }

  // Identify Test Customers vs Real Customers
  // Pattern 1: sync.customer.*@example.com (Created during sync integration tests)
  // Pattern 2: *test* in email, or manual test customer names
  for (const c of customers) {
    const email = (c.email || '').toLowerCase()
    const name = (c.name || '').toLowerCase()
    const isSyncTest = email.includes('sync.customer.') || email.includes('example.com') || email.includes('test')
    const isManualTest = name.includes('test') || name.includes('sync')

    if (isSyncTest || isManualTest) {
      results.classification.testCustomersForCleanup.push({
        source: 'MySQL customers',
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        reason: 'Automated test / sync customer artifact'
      })
    } else {
      results.classification.preservedRealCustomers.push({
        source: 'MySQL customers',
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        reason: 'Legitimate customer profile (PRESERVE)'
      })
    }
  }

  // Check Firebase Auth customers
  for (const au of authUsers) {
    const email = (au.email || '').toLowerCase()
    const isPreserved = results.classification.preservedAdminStaff.some(p => p.email?.toLowerCase() === email)
    if (isPreserved) continue

    const isTest = email.includes('sync.customer.') || email.includes('example.com') || email.includes('test')
    if (isTest) {
      results.classification.testCustomersForCleanup.push({
        source: 'Firebase Auth',
        uid: au.uid,
        email: au.email,
        displayName: au.displayName,
        reason: 'Test customer account in Firebase Auth'
      })
    } else {
      results.classification.manualReviewNeeded.push({
        source: 'Firebase Auth',
        uid: au.uid,
        email: au.email,
        displayName: au.displayName,
        customClaims: au.customClaims,
        reason: 'Customer account without explicit test marker; requires review before deletion'
      })
    }
  }

  // Categorize Orders
  for (const o of orders) {
    const orderId = (o.id || o.order_id || '').toString()
    const custName = (o.customer_name || '').toLowerCase()
    const isSyncTestOrder = orderId.startsWith('ORD-SYNC-') || orderId.startsWith('TEST-') || custName.includes('test') || custName.includes('sync')

    if (isSyncTestOrder) {
      results.classification.testOrdersForCleanup.push({
        source: 'MySQL orders',
        id: orderId,
        customerName: o.customer_name,
        total: o.total_amount || o.total,
        status: o.status,
        createdAt: o.created_at,
        reason: 'Automated test / sync order artifact'
      })
    } else {
      // Baseline orders such as VK-2838, VK-2839, VK-2840, VK-2841
      results.classification.manualReviewNeeded.push({
        source: 'MySQL orders',
        id: orderId,
        customerName: o.customer_name,
        total: o.total_amount || o.total,
        status: o.status,
        createdAt: o.created_at,
        reason: 'Baseline / standard seeded order (Recommend PRESERVING unless specifically requested)'
      })
    }
  }

  // Check RTDB orders
  if (rtdbData.orders) {
    for (const [key, ord] of Object.entries(rtdbData.orders)) {
      const custName = (ord.customerName || ord.customer_name || '').toLowerCase()
      const isTest = key.startsWith('ORD-SYNC-') || key.startsWith('TEST-') || custName.includes('test')
      if (isTest) {
        results.classification.testOrdersForCleanup.push({
          source: 'Firebase RTDB /eateries/orders',
          key,
          customerName: ord.customerName || ord.customer_name,
          total: ord.totalAmount || ord.total,
          status: ord.status,
          reason: 'Automated test order in RTDB'
        })
      }
    }
  }

  // Check Firestore orders
  if (firestoreDump.orders) {
    for (const [id, ord] of Object.entries(firestoreDump.orders)) {
      const custName = (ord.customerName || ord.customer_name || '').toLowerCase()
      const isTest = id.startsWith('ORD-SYNC-') || id.startsWith('TEST-') || custName.includes('test')
      if (isTest) {
        results.classification.testOrdersForCleanup.push({
          source: 'Firestore orders',
          id,
          customerName: ord.customerName || ord.customer_name,
          total: ord.totalAmount || ord.total,
          status: ord.status,
          reason: 'Automated test order in Firestore'
        })
      }
    }
  }

  // Check Payments
  for (const p of payments) {
    const isTestPayment = (p.order_id || '').startsWith('ORD-SYNC-') || (p.order_id || '').startsWith('TEST-')
    if (isTestPayment) {
      results.classification.testPaymentsForCleanup.push({
        source: 'MySQL payments',
        id: p.id,
        orderId: p.order_id,
        amount: p.amount,
        status: p.status,
        reason: 'Payment for automated test order'
      })
    }
  }

  // Write out full dry-run audit report
  const auditReportPath = path.join(backupDir, `audit_dry_run_report_${timestamp}.json`)
  writeFileSync(auditReportPath, JSON.stringify(results, null, 2), 'utf8')
  console.log(`\n✓ Full audit dry-run report written: ${auditReportPath}`)

  console.log('\n====================================================')
  console.log('DRY RUN SUMMARY')
  console.log('====================================================')
  console.log(`Preserved Admin & Staff Accounts: ${results.classification.preservedAdminStaff.length}`)
  console.log(`Preserved Real/Baseline Customers: ${results.classification.preservedRealCustomers.length}`)
  console.log(`Test Customers Identified for Cleanup: ${results.classification.testCustomersForCleanup.length}`)
  console.log(`Test Orders Identified for Cleanup: ${results.classification.testOrdersForCleanup.length}`)
  console.log(`Test Payments Identified for Cleanup: ${results.classification.testPaymentsForCleanup.length}`)
  console.log(`Records Requiring Manual Review / Decision: ${results.classification.manualReviewNeeded.length}`)
  console.log('====================================================\n')
  console.log('*** NO MUTATION HAS BEEN APPLIED. THIS WAS A DRY RUN ONLY. ***')
}

runAuditAndBackup().then(() => {
  pool.end()
  process.exit(0)
}).catch(err => {
  console.error('Fatal audit failure:', err)
  pool.end()
  process.exit(1)
})
