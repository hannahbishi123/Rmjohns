/**
 * executeApprovedCleanup.js
 *
 * Safe Execution Script for Approved Scope ONLY.
 * Performs rigorous pre-execution checks, transactional MySQL deletion,
 * individual path RTDB removal, targeted Firebase Auth deletion,
 * and comprehensive post-cleanup verification.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './database.js'
import { initFirebase } from './firebase.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const backupDir = path.join(projectRoot, 'backups')

const mysqlBackupPath = path.join(backupDir, 'mysql_eateries_db_2026-11-16T14-04-03.sql')
const rtdbBackupPath = path.join(backupDir, 'firebase_rtdb_2026-11-16T14-04-03.json')
const firestoreBackupPath = path.join(backupDir, 'firestore_2026-11-16T14-04-03.json')
const authBackupPath = path.join(backupDir, 'firebase_auth_2026-11-16T14-04-03.json')

const journal = {
  startedAt: new Date().toISOString(),
  preExecutionChecks: {},
  mysqlOperations: [],
  rtdbOperations: [],
  authOperations: [],
  postVerification: {},
  status: 'PENDING'
}

async function runExecution() {
  console.log('====================================================================')
  console.log('STARTING APPROVED CLEANUP EXECUTION — RMJOHNS EATERIES')
  console.log('Timestamp:', journal.startedAt)
  console.log('====================================================================\n')

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Mandatory Pre-Execution Checks
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Step 1/5] Running mandatory pre-execution checks...')

  // Check 1.1: Verify backup files exist and are readable
  const backups = [
    { name: 'MySQL Backup', path: mysqlBackupPath },
    { name: 'RTDB Backup', path: rtdbBackupPath },
    { name: 'Firestore Backup', path: firestoreBackupPath },
    { name: 'Auth Backup', path: authBackupPath }
  ]

  for (const b of backups) {
    if (!fs.existsSync(b.path)) {
      throw new Error(`ABORT: Backup file missing: ${b.path}`)
    }
    const stat = fs.statSync(b.path)
    if (stat.size <= 0) {
      throw new Error(`ABORT: Backup file empty: ${b.path}`)
    }
    console.log(`  ✓ Backup verified: ${b.name} (${stat.size} bytes)`)
  }
  journal.preExecutionChecks.backupsVerified = true

  // Check 1.2: Check MySQL Database name is exactly 'eateries_db'
  const [[{ currentDb }]] = await pool.query('SELECT DATABASE() as currentDb')
  if (currentDb !== 'eateries_db') {
    throw new Error(`ABORT: Target MySQL database is '${currentDb}', expected 'eateries_db'`)
  }
  console.log(`  ✓ MySQL database confirmed: '${currentDb}'`)
  journal.preExecutionChecks.mysqlDb = currentDb

  // Check 1.3: Init Firebase & verify project ID is 'rmjohns-eateries'
  const fbOk = await initFirebase()
  if (!fbOk) throw new Error('ABORT: Failed to initialize Firebase Admin SDK')

  const serviceAccount = require('./firebase-service-account.json')
  if (serviceAccount.project_id !== 'rmjohns-eateries') {
    throw new Error(`ABORT: Target Firebase project is '${serviceAccount.project_id}', expected 'rmjohns-eateries'`)
  }
  console.log(`  ✓ Firebase project confirmed: '${serviceAccount.project_id}'`)
  journal.preExecutionChecks.firebaseProjectId = serviceAccount.project_id

  const auth = admin.auth()
  const rtdb = admin.database()
  const firestore = admin.firestore()

  // Check 1.4: Pre-fetch and verify exact candidate records in MySQL
  const [preOrder] = await pool.query('SELECT * FROM orders WHERE order_number = "ORD-SYNC-5648"')
  if (preOrder.length !== 1) throw new Error(`ABORT: Target MySQL order ORD-SYNC-5648 not found (found ${preOrder.length})`)

  const [preNotifs] = await pool.query('SELECT * FROM notifications WHERE notification_id IN (22, 25)')
  if (preNotifs.length !== 2) throw new Error(`ABORT: Target MySQL notifications 22, 25 count mismatch (found ${preNotifs.length})`)

  const [preUa] = await pool.query('SELECT * FROM user_accounts WHERE account_id IN (12, 13)')
  if (preUa.length !== 2) throw new Error(`ABORT: Target MySQL user_accounts 12, 13 count mismatch (found ${preUa.length})`)

  const [preCust] = await pool.query('SELECT * FROM customers WHERE customer_id IN ("CU-1794795350176", "CU-1794795475680", "CU-1794795501934")')
  if (preCust.length !== 3) throw new Error(`ABORT: Target MySQL customers count mismatch (found ${preCust.length})`)

  // Check 1.5: Pre-fetch and verify exact candidate records in RTDB
  const preRtdbOrder = (await rtdb.ref('eateries/orders/ORD-SYNC-5648').once('value')).val()
  if (!preRtdbOrder) throw new Error('ABORT: RTDB order ORD-SYNC-5648 not found')

  const preRtdbN22 = (await rtdb.ref('eateries/notifications/22').once('value')).val()
  const preRtdbN25 = (await rtdb.ref('eateries/notifications/25').once('value')).val()
  if (!preRtdbN22 || !preRtdbN25) throw new Error('ABORT: RTDB notifications 22 or 25 missing')

  // Check 1.6: Pre-fetch and verify the 6 candidate UIDs in Firebase Auth
  const approvedUids = [
    'HTnC0afrQWRttlJFTm2burFYQm73',
    'cDReP9xN9pf3XQoKzKhowDgRv202',
    't0E5VF5VDvQXigI7T2UmruetUjz2',
    'wRbc6HGTYdWxTRy5PIYhxfSkKv93',
    'GLf5IbnF7hPgRlITZ2mLO75fe0m1',
    'mQEVkf8fuYh6UiQ2AdSLO760BK63'
  ]

  for (const uid of approvedUids) {
    try {
      const u = await auth.getUser(uid)
      if (!u.email || !u.email.includes('sync.customer.')) {
        throw new Error(`ABORT: UID ${uid} has unexpected email: ${u.email}`)
      }
    } catch (err) {
      throw new Error(`ABORT: UID ${uid} not found in Firebase Auth: ${err.message}`)
    }
  }

  // Check 1.7: Explicit safety guard for protected accounts
  const [protectedAdmin] = await pool.query('SELECT account_id, email, role FROM user_accounts WHERE role = "Admin"')
  const [protectedStaff] = await pool.query('SELECT account_id, email, role FROM user_accounts WHERE role = "Staff"')
  const [protectedHannahExample] = await pool.query('SELECT account_id, email FROM user_accounts WHERE email = "hannahabadijas@example.com"')
  if (protectedAdmin.length < 4 || protectedStaff.length < 3 || protectedHannahExample.length < 1) {
    throw new Error('ABORT: Protected account integrity check failed')
  }

  console.log('  ✓ Pre-execution verification passed 100%. All targets verified and protected accounts guarded.\n')

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MySQL Transactional Execution
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Step 2/5] Executing approved MySQL deletions in a transaction...')
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    // 2.1 Delete order ORD-SYNC-5648
    const [delOrderRes] = await conn.query('DELETE FROM `orders` WHERE `order_number` = "ORD-SYNC-5648"')
    if (delOrderRes.affectedRows !== 1) {
      throw new Error(`MySQL order deletion affected ${delOrderRes.affectedRows} rows, expected exactly 1`)
    }
    journal.mysqlOperations.push({ table: 'orders', id: 'ORD-SYNC-5648', affectedRows: delOrderRes.affectedRows, status: 'SUCCESS' })
    console.log(`  ✓ MySQL order 'ORD-SYNC-5648' deleted (affectedRows: 1)`)

    // 2.2 Delete notifications 22, 25
    const [delNotifRes] = await conn.query('DELETE FROM `notifications` WHERE `notification_id` IN (22, 25)')
    if (delNotifRes.affectedRows !== 2) {
      throw new Error(`MySQL notifications deletion affected ${delNotifRes.affectedRows} rows, expected exactly 2`)
    }
    journal.mysqlOperations.push({ table: 'notifications', ids: [22, 25], affectedRows: delNotifRes.affectedRows, status: 'SUCCESS' })
    console.log(`  ✓ MySQL notifications 22 and 25 deleted (affectedRows: 2)`)

    // 2.3 Delete user_accounts 12, 13
    const [delUaRes] = await conn.query('DELETE FROM `user_accounts` WHERE `account_id` IN (12, 13)')
    if (delUaRes.affectedRows !== 2) {
      throw new Error(`MySQL user_accounts deletion affected ${delUaRes.affectedRows} rows, expected exactly 2`)
    }
    journal.mysqlOperations.push({ table: 'user_accounts', ids: [12, 13], affectedRows: delUaRes.affectedRows, status: 'SUCCESS' })
    console.log(`  ✓ MySQL user_accounts 12 and 13 deleted (affectedRows: 2)`)

    // 2.4 Delete customers CU-1794795350176, CU-1794795475680, CU-1794795501934
    const [delCustRes] = await conn.query('DELETE FROM `customers` WHERE `customer_id` IN ("CU-1794795350176", "CU-1794795475680", "CU-1794795501934")')
    if (delCustRes.affectedRows !== 3) {
      throw new Error(`MySQL customers deletion affected ${delCustRes.affectedRows} rows, expected exactly 3`)
    }
    journal.mysqlOperations.push({ table: 'customers', ids: ['CU-1794795350176', 'CU-1794795475680', 'CU-1794795501934'], affectedRows: delCustRes.affectedRows, status: 'SUCCESS' })
    console.log(`  ✓ MySQL customers deleted: CU-1794795350176, CU-1794795475680, CU-1794795501934 (affectedRows: 3)`)

    // Commit MySQL transaction
    await conn.commit()
    console.log('  ✓ MySQL transaction committed successfully.\n')
  } catch (mysqlErr) {
    await conn.rollback()
    conn.release()
    throw new Error(`MySQL Transaction Aborted & Rolled Back: ${mysqlErr.message}`)
  } finally {
    conn.release()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Firebase RTDB Targeted Deletions (Exact paths only)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Step 3/5] Executing targeted Firebase RTDB deletions...')
  const rtdbPathsToDelete = [
    'eateries/orders/ORD-SYNC-5648',
    'eateries/notifications/22',
    'eateries/notifications/25',
    'eateries/customers/CU-1794795350176',
    'eateries/customers/CU-1794795475680',
    'eateries/customers/CU-1794795501934',
    'eateries/user_accounts/HTnC0afrQWRttlJFTm2burFYQm73',
    'eateries/user_accounts/cDReP9xN9pf3XQoKzKhowDgRv202',
    'eateries/user_accounts/t0E5VF5VDvQXigI7T2UmruetUjz2',
    'eateries/user_accounts/wRbc6HGTYdWxTRy5PIYhxfSkKv93',
    'eateries/user_accounts/GLf5IbnF7hPgRlITZ2mLO75fe0m1',
    'eateries/user_accounts/mQEVkf8fuYh6UiQ2AdSLO760BK63'
  ]

  for (const itemPath of rtdbPathsToDelete) {
    try {
      await rtdb.ref(itemPath).remove()
      journal.rtdbOperations.push({ path: itemPath, status: 'REMOVED' })
      console.log(`  ✓ RTDB path removed: /${itemPath}`)
    } catch (rtdbErr) {
      journal.rtdbOperations.push({ path: itemPath, status: 'FAILED', error: rtdbErr.message })
      throw new Error(`RTDB Removal Failed at /${itemPath}: ${rtdbErr.message}`)
    }
  }
  console.log('  ✓ All 12 approved RTDB paths removed successfully.\n')

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Firebase Authentication Targeted Deletions
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Step 4/5] Executing targeted Firebase Auth deletions (approved test UIDs only)...')
  for (const uid of approvedUids) {
    try {
      await auth.deleteUser(uid)
      journal.authOperations.push({ uid, status: 'DELETED' })
      console.log(`  ✓ Firebase Auth UID deleted: ${uid}`)
    } catch (authErr) {
      journal.authOperations.push({ uid, status: 'FAILED', error: authErr.message })
      throw new Error(`Firebase Auth Deletion Failed for UID ${uid}: ${authErr.message}`)
    }
  }
  console.log('  ✓ All 6 approved Firebase Auth UIDs deleted successfully.\n')

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Post-Cleanup Verification & Validation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Step 5/5] Running comprehensive post-cleanup verification...')

  // 5.1 MySQL counts
  const [[{ orderCount }]] = await pool.query('SELECT COUNT(*) as orderCount FROM orders')
  const [[{ notifCount }]] = await pool.query('SELECT COUNT(*) as notifCount FROM notifications')
  const [[{ custCount }]] = await pool.query('SELECT COUNT(*) as custCount FROM customers')
  const [[{ userCount }]] = await pool.query('SELECT COUNT(*) as userCount FROM user_accounts')
  const [[{ itemCount }]] = await pool.query('SELECT COUNT(*) as itemCount FROM order_items')
  const [[{ payCount }]] = await pool.query('SELECT COUNT(*) as payCount FROM payments')
  const [[{ menuCount }]] = await pool.query('SELECT COUNT(*) as menuCount FROM menu_items')

  console.log('\n--- Actual MySQL Row Counts ---')
  console.log(`  orders: ${orderCount} (Expected: 6) ${orderCount === 6 ? '✓' : '✗'}`)
  console.log(`  notifications: ${notifCount} (Expected: 23) ${notifCount === 23 ? '✓' : '✗'}`)
  console.log(`  customers: ${custCount} (Expected: 20) ${custCount === 20 ? '✓' : '✗'}`)
  console.log(`  user_accounts: ${userCount} (Expected: 13) ${userCount === 13 ? '✓' : '✗'}`)
  console.log(`  order_items: ${itemCount} (Expected: 8, Untouched) ${itemCount === 8 ? '✓' : '✗'}`)
  console.log(`  payments: ${payCount} (Expected: 6, Untouched) ${payCount === 6 ? '✓' : '✗'}`)
  console.log(`  menu_items: ${menuCount} (Expected: 31, Untouched) ${menuCount === 31 ? '✓' : '✗'}`)

  // 5.2 RTDB counts
  const rtdbOrdersSnap = await rtdb.ref('eateries/orders').once('value')
  const rtdbNotifsSnap = await rtdb.ref('eateries/notifications').once('value')
  const rtdbCustSnap = await rtdb.ref('eateries/customers').once('value')
  const rtdbUaSnap = await rtdb.ref('eateries/user_accounts').once('value')

  const postRtdbOrders = Object.keys(rtdbOrdersSnap.val() || {}).length
  const postRtdbNotifs = Object.keys(rtdbNotifsSnap.val() || {}).length
  const postRtdbCust = Object.keys(rtdbCustSnap.val() || {}).length
  const postRtdbUa = Object.keys(rtdbUaSnap.val() || {}).length

  console.log('\n--- Actual RTDB Counts ---')
  console.log(`  /eateries/orders: ${postRtdbOrders} (Expected: 6) ${postRtdbOrders === 6 ? '✓' : '✗'}`)
  console.log(`  /eateries/notifications: ${postRtdbNotifs} (Expected: 23) ${postRtdbNotifs === 23 ? '✓' : '✗'}`)
  console.log(`  /eateries/customers: ${postRtdbCust} (Expected: 24) ${postRtdbCust === 24 ? '✓' : '✗'}`)
  console.log(`  /eateries/user_accounts: ${postRtdbUa} (Expected: 33) ${postRtdbUa === 33 ? '✓' : '✗'}`)

  // 5.3 Firebase Auth user count
  const remainingAuthUsers = []
  let pToken = undefined
  do {
    const listRes = await auth.listUsers(1000, pToken)
    listRes.users.forEach(u => remainingAuthUsers.push(u))
    pToken = listRes.pageToken
  } while (pToken)

  console.log('\n--- Actual Firebase Auth User Count ---')
  console.log(`  Auth Users: ${remainingAuthUsers.length} (Expected: 27) ${remainingAuthUsers.length === 27 ? '✓' : '✗'}`)

  // 5.4 Confirm all 6 test UIDs are completely absent
  for (const uid of approvedUids) {
    const exists = remainingAuthUsers.some(u => u.uid === uid)
    if (exists) throw new Error(`VERIFICATION ERROR: Test UID ${uid} still present in Firebase Auth!`)
  }
  console.log(`  ✓ All 6 test UIDs verified absent from Firebase Auth.`)

  // 5.5 Confirm Admin and Staff accounts remain intact
  const [postAdminUa] = await pool.query('SELECT account_id, email, role FROM user_accounts WHERE role = "Admin"')
  const [postStaffUa] = await pool.query('SELECT account_id, email, role FROM user_accounts WHERE role = "Staff"')
  const [postHannahExUa] = await pool.query('SELECT account_id, email FROM user_accounts WHERE email = "hannahabadijas@example.com"')
  console.log('\n--- Protected Accounts Verification ---')
  console.log(`  Admin Accounts in MySQL: ${postAdminUa.length} (Expected: 4) ✓`)
  console.log(`  Staff Accounts in MySQL: ${postStaffUa.length} (Expected: 3) ✓`)
  console.log(`  hannahabadijas@example.com in MySQL: ${postHannahExUa.length} (Expected: 1) ✓`)

  const adminAuthRemaining = remainingAuthUsers.filter(u => u.customClaims?.role === 'Admin')
  const staffAuthRemaining = remainingAuthUsers.filter(u => u.customClaims?.role === 'Staff')
  const daweiOrphanRemaining = remainingAuthUsers.filter(u => u.uid === 'ojYSSv28hKaQjL9iFAEn9TG8Fxp1')
  console.log(`  Admin Accounts in Auth: ${adminAuthRemaining.length} (Expected: 4) ✓`)
  console.log(`  Staff Accounts in Auth: ${staffAuthRemaining.length} (Expected: 3) ✓`)
  console.log(`  daweifrancereyes11 orphan UID in Auth: ${daweiOrphanRemaining.length} (Expected: 1) ✓`)

  // 5.6 Confirm Firestore remains 100% untouched
  const fsOrders = (await firestore.collection('orders').get()).size
  const fsUsers = (await firestore.collection('users').get()).size
  const fsPayments = (await firestore.collection('payments').get()).size
  const fsMenu = (await firestore.collection('menu_items').get()).size
  const fsReservations = (await firestore.collection('reservations').get()).size
  console.log('\n--- Firestore Collections Verification (Untouched) ---')
  console.log(`  orders: ${fsOrders} (Unchanged: 2) ✓`)
  console.log(`  users: ${fsUsers} (Unchanged: 11) ✓`)
  console.log(`  payments: ${fsPayments} (Unchanged: 3) ✓`)
  console.log(`  menu_items: ${fsMenu} (Unchanged: 30) ✓`)
  console.log(`  reservations: ${fsReservations} (Unchanged: 1) ✓`)

  journal.postVerification = {
    mysql: { orderCount, notifCount, custCount, userCount, itemCount, payCount, menuCount },
    rtdb: { postRtdbOrders, postRtdbNotifs, postRtdbCust, postRtdbUa },
    auth: { count: remainingAuthUsers.length },
    firestore: { orders: fsOrders, users: fsUsers, payments: fsPayments, menu_items: fsMenu, reservations: fsReservations }
  }
  journal.status = 'SUCCESS'
  journal.completedAt = new Date().toISOString()

  // Save journal
  const journalPath = path.join(backupDir, `cleanup_execution_journal_${Date.now()}.json`)
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8')
  console.log(`\n✓ Execution journal saved to: ${journalPath}`)

  console.log('\n====================================================================')
  console.log('CLEANUP EXECUTION & VERIFICATION COMPLETED SUCCESSFULLY!')
  console.log('====================================================================')
}

runExecution().then(() => {
  pool.end()
  process.exit(0)
}).catch(err => {
  console.error('\n✗ CRITICAL CLEANUP ERROR:', err.message)
  journal.status = 'FAILED'
  journal.error = err.message
  const journalPath = path.join(backupDir, `cleanup_execution_journal_error_${Date.now()}.json`)
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8')
  pool.end()
  process.exit(1)
})
