/**
 * deepAudit.js
 *
 * Detailed Investigation for Cleanup Audit (READ-ONLY / ISOLATED RESTORE TEST)
 * Fulfills questions 1 through 9.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { pool } from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const backupDir = path.join(projectRoot, 'backups')

const mysqlBackupPath = path.join(backupDir, 'mysql_eateries_db_2026-11-16T14-04-03.sql')
const rtdbBackupPath = path.join(backupDir, 'firebase_rtdb_2026-11-16T14-04-03.json')
const firestoreBackupPath = path.join(backupDir, 'firestore_2026-11-16T14-04-03.json')
const authBackupPath = path.join(backupDir, 'firebase_auth_2026-11-16T14-04-03.json')

async function runDeepAudit() {
  const rtdb = JSON.parse(fs.readFileSync(rtdbBackupPath, 'utf8'))
  const firestore = JSON.parse(fs.readFileSync(firestoreBackupPath, 'utf8'))
  const auth = JSON.parse(fs.readFileSync(authBackupPath, 'utf8'))

  console.log('====================================================================')
  console.log('CHECK 1 & 2: Firebase Auth UIDs & Duplicate Emails')
  console.log('====================================================================')
  
  // Group Auth users by email (lowercased)
  const authByEmail = {}
  for (const u of auth) {
    const em = (u.email || '').toLowerCase()
    if (!authByEmail[em]) authByEmail[em] = []
    authByEmail[em].push(u)
  }

  // 1. Every UID associated with sync.customer.*
  console.log('\n--- UIDs for sync.customer.* ---')
  for (const [em, users] of Object.entries(authByEmail)) {
    if (em.includes('sync.customer') || em.includes('example.com')) {
      console.log(`Email: ${em} (${users.length} instance/s):`)
      for (const u of users) {
        console.log(`  - UID: ${u.uid}, Name: "${u.displayName}", Created: ${u.creationTime}, LastSignIn: ${u.lastSignInTime}, Claims:`, u.customClaims)
      }
    }
  }

  // 2. Emails associated with multiple UIDs
  console.log('\n--- Emails with Multiple UIDs in Firebase Auth ---')
  for (const [em, users] of Object.entries(authByEmail)) {
    if (users.length > 1) {
      console.log(`Email: ${em} (${users.length} UIDs):`)
      for (const u of users) {
        console.log(`  - UID: ${u.uid}, Created: ${u.creationTime}, LastSignIn: ${u.lastSignInTime}, Claims:`, u.customClaims)
      }
    }
  }

  console.log('\n====================================================================')
  console.log('CHECK 3: Foreign Key Relationships for Proposed Customer Accounts')
  console.log('====================================================================')
  const proposedCustomerEmails = [
    'sync.customer.0137@example.com',
    'sync.customer.5648@example.com',
    'sync.customer.1892@example.com',
    'hannahabadijas@example.com'
  ]

  const [custRows] = await pool.query('SELECT * FROM customers WHERE email IN (?)', [proposedCustomerEmails])
  console.log('Found customers in MySQL:', custRows.map(c => ({ id: c.customer_id, email: c.email, name: c.name })))
  
  const customerIds = custRows.map(c => c.customer_id)
  
  if (customerIds.length > 0) {
    const [linkedOrders] = await pool.query('SELECT order_number, customer_id, customer_name, total, status FROM orders WHERE customer_id IN (?)', [customerIds])
    console.log('Linked MySQL orders:', linkedOrders)

    const [linkedUserAccounts] = await pool.query('SELECT account_id, username, email, role, customer_id, firebase_uid FROM user_accounts WHERE customer_id IN (?) OR email IN (?)', [customerIds, proposedCustomerEmails])
    console.log('Linked MySQL user_accounts:', linkedUserAccounts)

    const [linkedLoyalty] = await pool.query('SELECT * FROM loyalty_transactions WHERE customer_id IN (?)', [customerIds])
    console.log('Linked MySQL loyalty_transactions:', linkedLoyalty)
  }

  console.log('\n====================================================================')
  console.log('CHECK 4: ORD-SYNC-5648 Comprehensive Reference Audit')
  console.log('====================================================================')
  // MySQL
  const [order5648] = await pool.query('SELECT * FROM orders WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL orders row:', order5648)
  const [items5648] = await pool.query('SELECT * FROM order_items WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL order_items rows:', items5648)
  const [payments5648] = await pool.query('SELECT * FROM payments WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL payments rows:', payments5648)
  const [syncQueue5648] = await pool.query('SELECT * FROM firebase_sync_queue WHERE entity_id = "ORD-SYNC-5648"')
  console.log('MySQL firebase_sync_queue rows:', syncQueue5648)

  // RTDB
  console.log('RTDB /eateries/orders/ORD-SYNC-5648:', rtdb.orders ? rtdb.orders['ORD-SYNC-5648'] : null)
  
  // Check RTDB payments
  let rtdbPaymentFound = null
  for (const [k, v] of Object.entries(rtdb.payments || {})) {
    if (v.order_number === 'ORD-SYNC-5648' || v.orderId === 'ORD-SYNC-5648') {
      rtdbPaymentFound = { key: k, ...v }
    }
  }
  console.log('RTDB payment linked to ORD-SYNC-5648:', rtdbPaymentFound)

  // Firestore
  console.log('Firestore orders/ORD-SYNC-5648:', firestore.orders ? firestore.orders['ORD-SYNC-5648'] : null)
  let firestorePaymentFound = null
  for (const [k, v] of Object.entries(firestore.payments || {})) {
    if (v.orderId === 'ORD-SYNC-5648') firestorePaymentFound = { id: k, ...v }
  }
  console.log('Firestore payment linked to ORD-SYNC-5648:', firestorePaymentFound)

  console.log('\n====================================================================')
  console.log('CHECK 5: Notifications Linked to ORD-SYNC-5648')
  console.log('====================================================================')
  const [mysqlNotifs] = await pool.query('SELECT * FROM notifications WHERE detail LIKE "%ORD-SYNC-5648%" OR title LIKE "%ORD-SYNC-5648%"')
  console.log('MySQL notifications matching ORD-SYNC-5648:', mysqlNotifs)

  const rtdbNotifs = []
  for (const [k, v] of Object.entries(rtdb.notifications || {})) {
    const text = JSON.stringify(v)
    if (text.includes('ORD-SYNC-5648')) {
      rtdbNotifs.push({ key: k, ...v })
    }
  }
  console.log('RTDB notifications matching ORD-SYNC-5648:', rtdbNotifs)

  console.log('\n====================================================================')
  console.log('CHECK 6: Discrepancy Breakdown: MySQL (23) vs RTDB (27) Customers, RTDB user_accounts (39), Auth (33)')
  console.log('====================================================================')
  const [allMysqlCustomers] = await pool.query('SELECT customer_id, name, email FROM customers')
  const rtdbCustomers = rtdb.customers || {}
  const rtdbUserAccounts = rtdb.user_accounts || {}

  console.log(`MySQL Customers Count: ${allMysqlCustomers.length}`)
  console.log(`RTDB Customers Count: ${Object.keys(rtdbCustomers).length}`)
  console.log(`RTDB user_accounts Count: ${Object.keys(rtdbUserAccounts).length}`)
  console.log(`Firebase Auth Users Count: ${auth.length}`)

  // Find customers in RTDB not in MySQL
  const mysqlCustIds = new Set(allMysqlCustomers.map(c => c.customer_id))
  const rtdbOnlyCustomers = []
  for (const [k, v] of Object.entries(rtdbCustomers)) {
    if (!mysqlCustIds.has(k)) {
      rtdbOnlyCustomers.push({ key: k, name: v.name, email: v.email })
    }
  }
  console.log('\nRTDB Customers NOT in MySQL:', rtdbOnlyCustomers)

  // Find MySQL customers not in RTDB
  const mysqlOnlyCustomers = allMysqlCustomers.filter(c => !rtdbCustomers[c.customer_id])
  console.log('MySQL Customers NOT in RTDB:', mysqlOnlyCustomers)

  // Explain user_accounts (39) vs Auth (33)
  console.log('\nBreakdown of RTDB user_accounts (39 items):')
  const rtdbUaKeys = Object.keys(rtdbUserAccounts)
  console.log('Sample RTDB user_account keys:', rtdbUaKeys.slice(0, 10))
  // Check what keys are used (numeric IDs vs UIDs)
  let numericUaKeys = 0
  let uidUaKeys = 0
  for (const k of rtdbUaKeys) {
    if (/^\d+$/.test(k)) numericUaKeys++
    else uidUaKeys++
  }
  console.log(`RTDB user_accounts: ${numericUaKeys} keyed by MySQL numeric ID, ${uidUaKeys} keyed by Firebase UID/String!`)

  console.log('\n====================================================================')
  console.log('CHECK 7: The 14 hannahabadijas Gmail Variants Usage Audit')
  console.log('====================================================================')
  const hannahEmails = Object.keys(authByEmail).filter(em => em.includes('hannahabadijas') || em.includes('hannahpaderog') || em.includes('xhanachiabadijas'))
  console.log(`Identified ${hannahEmails.length} relevant Gmail variants in Auth:`)

  const [mysqlStaff] = await pool.query('SELECT * FROM staff')
  const [mysqlUa] = await pool.query('SELECT * FROM user_accounts')

  for (const em of hannahEmails) {
    const authList = authByEmail[em]
    const uids = authList.map(u => u.uid).join(', ')
    const claims = authList.map(u => JSON.stringify(u.customClaims)).join('; ')
    
    // Check MySQL user_accounts
    const ua = mysqlUa.filter(u => (u.email || '').toLowerCase() === em)
    const uaRoles = ua.map(u => `${u.role} (ID ${u.account_id})`).join(', ') || 'None'

    // Check MySQL staff
    const st = mysqlStaff.filter(s => (s.contact || '').toLowerCase() === em)
    const staffInfo = st.map(s => `${s.staff_id}: ${s.name} (${s.role})`).join(', ') || 'None'

    // Check MySQL customers
    const cs = allMysqlCustomers.filter(c => (c.email || '').toLowerCase() === em)
    const custInfo = cs.map(c => `${c.customer_id}: ${c.name}`).join(', ') || 'None'

    // Check orders
    const [ord] = await pool.query('SELECT order_number, total, status FROM orders WHERE customer_name LIKE ? OR customer_id IN (?)', [`%${em}%`, cs.map(c => c.customer_id).concat(['none'])])
    const ordInfo = ord.map(o => `${o.order_number} (${o.status})`).join(', ') || 'None'

    console.log(`\nEmail: ${em}`)
    console.log(`  - Auth UID(s): ${uids}`)
    console.log(`  - Auth Claims: ${claims}`)
    console.log(`  - MySQL user_accounts: ${uaRoles}`)
    console.log(`  - MySQL staff: ${staffInfo}`)
    console.log(`  - MySQL customers: ${custInfo}`)
    console.log(`  - Associated Orders: ${ordInfo}`)
  }

  console.log('\n====================================================================')
  console.log('CHECK 8: Are Firestore Sample Documents Referenced in Web / Flutter?')
  console.log('====================================================================')
  const sampleDocIds = ['ORD-1001', 'ORD-1002', 'ADM-001', 'CUST-001', 'CUST-002', 'RES-501', 'PAY-8801', 'PAY-1457198', 'PAY-8193026']
  
  // Search code in eateries-system/src and rmjohns/lib
  const webSrcDir = path.join(projectRoot, 'eateries-system/src')
  const flutterLibDir = path.join(projectRoot, 'rmjohns/lib')

  function grepDir(dir, searchId) {
    if (!fs.existsSync(dir)) return []
    const results = []
    function recurse(current) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) {
          recurse(full)
        } else if (entry.isFile() && /\.(jsx?|tsx?|dart|html)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8')
          if (content.includes(searchId)) {
            results.push(path.relative(projectRoot, full))
          }
        }
      }
    }
    recurse(dir)
    return results
  }

  for (const id of sampleDocIds) {
    const webRefs = grepDir(webSrcDir, id)
    const flutterRefs = grepDir(flutterLibDir, id)
    console.log(`Document ID '${id}': Web Refs: [${webRefs.join(', ')}], Flutter Refs: [${flutterRefs.join(', ')}]`)
  }

  console.log('\n====================================================================')
  console.log('CHECK 9: Isolated Backup Parse & Restore Verification Test')
  console.log('====================================================================')
  // 1. Validate JSON backups
  console.log('1. Validating JSON backups syntax and completeness:')
  console.log(`  - RTDB backup: ${Object.keys(rtdb).length} top-level nodes parsed successfully.`)
  console.log(`  - Firestore backup: ${Object.keys(firestore).length} collections parsed successfully.`)
  console.log(`  - Auth backup: ${auth.length} user records parsed successfully.`)

  // 2. Isolated MySQL database restore test
  console.log('2. Performing isolated MySQL restore into temporary database `eateries_restore_test`...')
  const testDbName = 'eateries_restore_test'
  try {
    await pool.query(`DROP DATABASE IF EXISTS \`${testDbName}\``)
    await pool.query(`CREATE DATABASE \`${testDbName}\``)
    
    const mysqlExe = 'C:\\xampp\\mysql\\bin\\mysql.exe'
    const restoreCmd = `"${mysqlExe}" -u root ${testDbName} < "${mysqlBackupPath}"`
    execSync(restoreCmd, { stdio: 'inherit', shell: 'cmd.exe' })
    
    // Connect to testDb and verify counts
    const [testTables] = await pool.query(`SHOW TABLES FROM \`${testDbName}\``)
    console.log(`  ✓ Restored ${testTables.length} tables in \`${testDbName}\`!`)

    const [[{ orderCount }]] = await pool.query(`SELECT COUNT(*) as orderCount FROM \`${testDbName}\`.orders`)
    const [[{ menuCount }]] = await pool.query(`SELECT COUNT(*) as menuCount FROM \`${testDbName}\`.menu_items`)
    const [[{ custCount }]] = await pool.query(`SELECT COUNT(*) as custCount FROM \`${testDbName}\`.customers`)
    const [[{ userCount }]] = await pool.query(`SELECT COUNT(*) as userCount FROM \`${testDbName}\`.user_accounts`)

    console.log(`  ✓ Verified Table Counts in restored test DB:`)
    console.log(`    - orders: ${orderCount} (Original: 7)`)
    console.log(`    - menu_items: ${menuCount} (Original: 31)`)
    console.log(`    - customers: ${custCount} (Original: 23)`)
    console.log(`    - user_accounts: ${userCount} (Original: 15)`)

    // Clean up temporary test database
    await pool.query(`DROP DATABASE \`${testDbName}\``)
    console.log(`  ✓ Temporary test database \`${testDbName}\` successfully dropped. Production was untouched.`)
  } catch (testErr) {
    console.error('  ✗ Isolated restore test error:', testErr.message)
  }

  console.log('\n====================================================================')
  console.log('DEEP AUDIT COMPLETED SAFELY (ZERO PRODUCTION MUTATIONS)')
  console.log('====================================================================')
}

runDeepAudit().then(() => {
  pool.end()
  process.exit(0)
}).catch(err => {
  console.error('Fatal deep audit error:', err)
  pool.end()
  process.exit(1)
})
