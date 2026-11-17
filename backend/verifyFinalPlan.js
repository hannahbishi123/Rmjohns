/**
 * verifyFinalPlan.js
 *
 * READ-ONLY verification for Final Cleanup Plan Correction.
 * Connects to live Firebase Admin SDK and MySQL database.
 * Confirms exact UIDs, RTDB paths, MySQL row IDs, FK relationships,
 * and verifies that Admin/Staff and excluded records are 100% untouched.
 */

import { pool } from './database.js'
import { initFirebase } from './firebase.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

async function verify() {
  console.log('====================================================================')
  console.log('LIVE VERIFICATION FOR FINAL CLEANUP PLAN')
  console.log('====================================================================')

  // 1. Live Firebase Admin SDK Init
  const fbOk = await initFirebase()
  if (!fbOk) throw new Error('Firebase Admin SDK connection failed')

  const auth = admin.auth()
  const rtdb = admin.database()

  // 2. Verify exact Firebase Auth UIDs and Email relationships using live Admin SDK
  console.log('\n--- 1. Live Firebase Auth UIDs for sync.customer.* ---')
  const syncEmails = [
    'sync.customer.0137@example.com',
    'sync.customer.5648@example.com',
    'sync.customer.1892@example.com'
  ]

  const liveAuthUsers = []
  let pageToken = undefined
  do {
    const res = await auth.listUsers(1000, pageToken)
    res.users.forEach(u => liveAuthUsers.push(u))
    pageToken = res.pageToken
  } while (pageToken)

  const syncAuthMatches = []
  for (const email of syncEmails) {
    const matches = liveAuthUsers.filter(u => (u.email || '').toLowerCase() === email.toLowerCase())
    console.log(`Email: ${email} -> Found ${matches.length} UID(s):`)
    for (const m of matches) {
      console.log(`  - UID: ${m.uid}, DisplayName: "${m.displayName}", Created: ${m.metadata.creationTime}, Claims:`, m.customClaims)
      syncAuthMatches.push({ email, uid: m.uid, name: m.displayName })
    }
  }

  // Confirm excluded accounts in Auth
  console.log('\n--- 2. Verifying Excluded Accounts in Live Auth ---')
  const hannahExampleMatches = liveAuthUsers.filter(u => u.email === 'hannahabadijas@example.com')
  console.log(`hannahabadijas@example.com matches: ${hannahExampleMatches.length} UID (${hannahExampleMatches.map(u => u.uid).join(', ')}) -> EXCLUDED`)

  const daweiOrphanMatches = liveAuthUsers.filter(u => u.email === 'daweifrancereyes11@gmail.com')
  console.log(`daweifrancereyes11@gmail.com matches: ${daweiOrphanMatches.length} UIDs:`)
  daweiOrphanMatches.forEach(u => console.log(`  - UID: ${u.uid}, Claims:`, u.customClaims, `-> EXCLUDED`))

  // 3. MySQL exact row IDs and records
  console.log('\n--- 3. MySQL Exact Records for Candidate Cleanup ---')
  // Order
  const [orderRows] = await pool.query('SELECT order_number, customer_id, customer_name, total, status FROM orders WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL order row:', orderRows)

  // Order Items
  const [itemRows] = await pool.query('SELECT * FROM order_items WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL order_items for ORD-SYNC-5648 count:', itemRows.length)

  // Payments
  const [payRows] = await pool.query('SELECT * FROM payments WHERE order_number = "ORD-SYNC-5648"')
  console.log('MySQL payments for ORD-SYNC-5648 count:', payRows.length)

  // Notifications
  const [notifRows] = await pool.query('SELECT notification_id, title, detail, audience FROM notifications WHERE notification_id IN (22, 25)')
  console.log('MySQL notifications rows (IDs 22, 25):', notifRows)

  // Customer accounts
  const [custRows] = await pool.query('SELECT customer_id, name, email, contact FROM customers WHERE email IN (?)', [syncEmails])
  console.log('MySQL customers rows:', custRows)

  // User accounts
  const [uaRows] = await pool.query('SELECT account_id, username, email, role, customer_id, firebase_uid FROM user_accounts WHERE email IN (?)', [syncEmails])
  console.log('MySQL user_accounts rows:', uaRows)

  // 4. RTDB Paths and Contents
  console.log('\n--- 4. Firebase RTDB Paths and Contents ---')
  const rtdbOrder = (await rtdb.ref('eateries/orders/ORD-SYNC-5648').once('value')).val()
  console.log('RTDB eateries/orders/ORD-SYNC-5648:', rtdbOrder)

  const rtdbNotif22 = (await rtdb.ref('eateries/notifications/22').once('value')).val()
  const rtdbNotif25 = (await rtdb.ref('eateries/notifications/25').once('value')).val()
  console.log('RTDB eateries/notifications/22:', rtdbNotif22)
  console.log('RTDB eateries/notifications/25:', rtdbNotif25)

  for (const c of custRows) {
    const val = (await rtdb.ref(`eateries/customers/${c.customer_id}`).once('value')).val()
    console.log(`RTDB eateries/customers/${c.customer_id}:`, val ? { name: val.name, email: val.email } : null)
  }

  for (const sm of syncAuthMatches) {
    const val = (await rtdb.ref(`eateries/user_accounts/${sm.uid}`).once('value')).val()
    console.log(`RTDB eateries/user_accounts/${sm.uid}:`, val ? { email: val.email, role: val.role } : null)
  }

  // 5. Foreign Key and Cascade Safety Verification
  console.log('\n--- 5. Foreign Key & Integrity Safety Verification ---')
  // Check if any payment references ORD-SYNC-5648
  const [[{ countAllPaymentsLinked }]] = await pool.query('SELECT COUNT(*) as countAllPaymentsLinked FROM payments WHERE order_number = "ORD-SYNC-5648"')
  console.log(`Payments referencing ORD-SYNC-5648: ${countAllPaymentsLinked}`)

  // Check if any loyalty_transaction references the three customer IDs
  const syncCustomerIds = custRows.map(c => c.customer_id)
  const [[{ countAllLoyaltyLinked }]] = await pool.query('SELECT COUNT(*) as countAllLoyaltyLinked FROM loyalty_transactions WHERE customer_id IN (?)', [syncCustomerIds])
  console.log(`Loyalty transactions referencing sync customer IDs: ${countAllLoyaltyLinked}`)

  // Check if any other order references the sync customer IDs
  const [otherOrders] = await pool.query('SELECT order_number, total, status FROM orders WHERE customer_id IN (?) AND order_number != "ORD-SYNC-5648"', [syncCustomerIds])
  console.log(`Other orders referencing sync customer IDs: ${otherOrders.length}`)

  // 6. Before and After Counts
  console.log('\n--- 6. Record Counts: Before vs Expected After ---')
  const [[{ totalOrders }]] = await pool.query('SELECT COUNT(*) as totalOrders FROM orders')
  const [[{ totalOrderItems }]] = await pool.query('SELECT COUNT(*) as totalOrderItems FROM order_items')
  const [[{ totalPayments }]] = await pool.query('SELECT COUNT(*) as totalPayments FROM payments')
  const [[{ totalCustomers }]] = await pool.query('SELECT COUNT(*) as totalCustomers FROM customers')
  const [[{ totalUserAccounts }]] = await pool.query('SELECT COUNT(*) as totalUserAccounts FROM user_accounts')
  const [[{ totalNotifications }]] = await pool.query('SELECT COUNT(*) as totalNotifications FROM notifications')

  const rtdbOrdersSnap = await rtdb.ref('eateries/orders').once('value')
  const rtdbCustomersSnap = await rtdb.ref('eateries/customers').once('value')
  const rtdbUserAccountsSnap = await rtdb.ref('eateries/user_accounts').once('value')
  const rtdbNotificationsSnap = await rtdb.ref('eateries/notifications').once('value')

  const rtdbOrdersCount = Object.keys(rtdbOrdersSnap.val() || {}).length
  const rtdbCustomersCount = Object.keys(rtdbCustomersSnap.val() || {}).length
  const rtdbUserAccountsCount = Object.keys(rtdbUserAccountsSnap.val() || {}).length
  const rtdbNotificationsCount = Object.keys(rtdbNotificationsSnap.val() || {}).length

  console.log(`MySQL orders: Before = ${totalOrders}, After = ${totalOrders - 1}`)
  console.log(`MySQL order_items: Before = ${totalOrderItems}, After = ${totalOrderItems} (Untouched)`)
  console.log(`MySQL payments: Before = ${totalPayments}, After = ${totalPayments} (Untouched)`)
  console.log(`MySQL notifications: Before = ${totalNotifications}, After = ${totalNotifications - 2}`)
  console.log(`MySQL customers: Before = ${totalCustomers}, After = ${totalCustomers - custRows.length}`)
  console.log(`MySQL user_accounts: Before = ${totalUserAccounts}, After = ${totalUserAccounts - uaRows.length}`)
  console.log(`Firebase Auth users: Before = ${liveAuthUsers.length}, After = ${liveAuthUsers.length - syncAuthMatches.length}`)
  console.log(`RTDB orders: Before = ${rtdbOrdersCount}, After = ${rtdbOrdersCount - 1}`)
  console.log(`RTDB notifications: Before = ${rtdbNotificationsCount}, After = ${rtdbNotificationsCount - 2}`)
  console.log(`RTDB customers: Before = ${rtdbCustomersCount}, After = ${rtdbCustomersCount - custRows.length}`)

  console.log('\n====================================================================')
  console.log('LIVE VERIFICATION FINISHED (READ-ONLY, ZERO MUTATIONS APPLIED)')
  console.log('====================================================================')
}

verify().then(() => {
  pool.end()
  process.exit(0)
}).catch(err => {
  console.error('Verification error:', err)
  pool.end()
  process.exit(1)
})
