/**
 * test-live-mysql-integration.js
 *
 * Real Integration Testing against local XAMPP MySQL database (`eateries_db`)
 * Uses test keys prefixed with `TEST-LIVE-*` and cleans them up after verification.
 */

import { pool } from './database.js'
import { persistVerifiedOrder, validateAndRecalculateOrder } from './orderValidator.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function runLiveIntegrationTests() {
  console.log('===============================================================')
  console.log(' LIVE MYSQL INTEGRATION TESTS: eateries_db (XAMPP Port 3306)')
  console.log('===============================================================\n')

  try {
    // 0. Clean up any previous test artifacts
    await pool.execute("DELETE FROM order_items WHERE order_number LIKE 'TEST-LIVE-%'")
    await pool.execute("DELETE FROM orders WHERE order_number LIKE 'TEST-LIVE-%'")

    // Retrieve actual live menu items from MySQL
    const [menuRows] = await pool.execute('SELECT menu_item_id, name, price, available FROM menu_items LIMIT 5')
    console.log(`[Setup] Loaded ${menuRows.length} active menu items from MySQL for live testing:`)
    menuRows.forEach(m => console.log(`  - #${m.menu_item_id}: ${m.name} (₱${m.price}, available: ${m.available})`))
    const item1 = menuRows[0] // e.g. Lechon Kawali Silog or Liempo Silog
    const item2 = menuRows[1]

    console.log('\n[1. Legitimate Order Insertion & Calculation]')
    {
      const orderId = 'TEST-LIVE-ORD-001'
      const qty1 = 2
      const qty2 = 1
      const expectedSubtotal = Math.round((Number(item1.price) * qty1 + Number(item2.price) * qty2) * 100) / 100
      const expectedServiceCharge = Math.round(expectedSubtotal * 0.05 * 100) / 100
      const expectedTotal = Math.round((expectedSubtotal + expectedServiceCharge) * 100) / 100

      const legitOrder = {
        id: orderId,
        customer: 'Live Integration Tester',
        customerId: 'GUEST',
        type: 'Dine in',
        paymentMethod: 'Cash',
        payment: 'Pending',
        status: 'Pending',
        products: [
          { id: item1.menu_item_id, name: item1.name, price: Number(item1.price), quantity: qty1 },
          { id: item2.menu_item_id, name: item2.name, price: Number(item2.price), quantity: qty2 },
        ],
        subtotal: expectedSubtotal,
        serviceCharge: expectedServiceCharge,
        discount: 0,
        total: expectedTotal,
      }

      const res = await persistVerifiedOrder(legitOrder, pool)
      assert(res.success === true, 'Legitimate order persisted successfully to live MySQL')
      assert(res.isTampered === false, 'Legitimate order is not flagged as tampered')

      // Query database directly to verify real persistence
      const [orderDb] = await pool.execute('SELECT * FROM orders WHERE order_number = ?', [orderId])
      assert(orderDb.length === 1, 'Order row exists in MySQL `orders` table')
      assert(Number(orderDb[0].total) === expectedTotal, `Verified total in MySQL is ₱${expectedTotal}`)
      assert(Number(orderDb[0].subtotal) === expectedSubtotal, `Verified subtotal in MySQL is ₱${expectedSubtotal}`)
      assert(Number(orderDb[0].service_charge) === expectedServiceCharge, `Verified service charge in MySQL is ₱${expectedServiceCharge}`)

      const [itemsDb] = await pool.execute('SELECT * FROM order_items WHERE order_number = ? ORDER BY line_number', [orderId])
      assert(itemsDb.length === 2, '2 order_items rows exist in MySQL `order_items` table')
      assert(Number(itemsDb[0].unit_price) === Number(item1.price), `Item 1 unit_price matches MySQL menu price: ₱${item1.price}`)
      assert(Number(itemsDb[1].unit_price) === Number(item2.price), `Item 2 unit_price matches MySQL menu price: ₱${item2.price}`)
    }

    console.log('\n[2. Price Tampering Detection & Safe Correction in MySQL]')
    {
      const orderId = 'TEST-LIVE-ORD-002'
      const tamperedOrder = {
        id: orderId,
        customer: 'Live Malicious Client',
        type: 'Dine in',
        paymentMethod: 'Cash',
        payment: 'Pending',
        status: 'Pending',
        products: [
          { id: item1.menu_item_id, name: item1.name, price: 1.0, quantity: 1 }, // FAKE ₱1.00
        ],
        subtotal: 1.0,
        serviceCharge: 0.05,
        total: 1.05, // FAKE ₱1.05
      }

      const res = await persistVerifiedOrder(tamperedOrder, pool)
      assert(res.success === true, 'Tampered order handled and corrected')
      assert(res.isTampered === true, 'Tampering detected by validator')

      const [orderDb] = await pool.execute('SELECT total, subtotal, status FROM orders WHERE order_number = ?', [orderId])
      const realExpectedSubtotal = Number(item1.price)
      const realExpectedTotal = Math.round((realExpectedSubtotal * 1.05) * 100) / 100

      assert(Number(orderDb[0].total) === realExpectedTotal, `MySQL stored VERIFIED total (₱${realExpectedTotal}), NOT forged ₱1.05`)
      assert(orderDb[0].status === 'Price Dispute', 'MySQL stored status as "Price Dispute"')

      const [itemsDb] = await pool.execute('SELECT unit_price FROM order_items WHERE order_number = ?', [orderId])
      assert(Number(itemsDb[0].unit_price) === Number(item1.price), `MySQL order_items unit_price is ₱${item1.price}, NOT ₱1.00`)
    }

    console.log('\n[3. Invalid & Unavailable Menu Items]')
    {
      // Non-existent menu item
      const invalidItemOrder = {
        id: 'TEST-LIVE-ORD-003',
        customer: 'Test User',
        products: [{ id: 999999, name: 'Ghost Meal', quantity: 1 }],
      }
      const resInvalid = await persistVerifiedOrder(invalidItemOrder, pool)
      assert(resInvalid.success === false, 'Order with non-existent product ID rejected')
      assert(resInvalid.reason.includes('does not exist'), 'Rejection message notes product does not exist')

      const [checkGhost] = await pool.execute('SELECT * FROM orders WHERE order_number = ?', ['TEST-LIVE-ORD-003'])
      assert(checkGhost.length === 0, 'No ghost order inserted into MySQL')
    }

    console.log('\n[4. Invalid Quantity Validation]')
    {
      const badQtyOrder = {
        id: 'TEST-LIVE-ORD-004',
        customer: 'Test User',
        products: [{ id: item1.menu_item_id, quantity: -5 }],
      }
      const resQty = await persistVerifiedOrder(badQtyOrder, pool)
      assert(resQty.success === false, 'Negative quantity order rejected')
      assert(resQty.reason.includes('Invalid quantity'), 'Rejection message explains quantity must be positive integer')

      const [checkBadQty] = await pool.execute('SELECT * FROM orders WHERE order_number = ?', ['TEST-LIVE-ORD-004'])
      assert(checkBadQty.length === 0, 'No bad quantity order inserted into MySQL')
    }

    console.log('\n[5. Duplicate Order Idempotency]')
    {
      // Re-submit TEST-LIVE-ORD-001
      const duplicateOrder = {
        id: 'TEST-LIVE-ORD-001',
        customer: 'Live Integration Tester',
        type: 'Dine in',
        paymentMethod: 'Cash',
        payment: 'Pending',
        status: 'Preparing', // Status update
        products: [
          { id: item1.menu_item_id, name: item1.name, price: Number(item1.price), quantity: 2 },
          { id: item2.menu_item_id, name: item2.name, price: Number(item2.price), quantity: 1 },
        ],
        subtotal: Math.round((Number(item1.price) * 2 + Number(item2.price) * 1) * 100) / 100,
        serviceCharge: Math.round((Number(item1.price) * 2 + Number(item2.price) * 1) * 0.05 * 100) / 100,
        total: Math.round((Number(item1.price) * 2 + Number(item2.price) * 1) * 1.05 * 100) / 100,
      }

      const resDup = await persistVerifiedOrder(duplicateOrder, pool)
      assert(resDup.success === true, 'Duplicate order submission processed idempotently')

      const [itemsDb] = await pool.execute('SELECT * FROM order_items WHERE order_number = ?', ['TEST-LIVE-ORD-001'])
      assert(itemsDb.length === 2, 'order_items count remains exactly 2 (no duplicate line items created)')

      const [orderDb] = await pool.execute('SELECT status FROM orders WHERE order_number = ?', ['TEST-LIVE-ORD-001'])
      assert(orderDb[0].status === 'Preparing', 'Order status updated cleanly in MySQL')
    }

    console.log('\n[6. Customer Payment Anti-Self-Certification in MySQL]')
    {
      const orderId = 'TEST-LIVE-ORD-005'
      const itemPrice = Number(item1.price)
      const serviceCharge = Math.round(itemPrice * 0.05 * 100) / 100
      const total = Math.round((itemPrice + serviceCharge) * 100) / 100

      const unverifiedPaidOrder = {
        id: orderId,
        customer: 'Self Certifier',
        _source: 'mobile',
        type: 'Dine in',
        paymentMethod: 'GCash',
        payment: 'Paid', // Unverified self-claim
        status: 'Confirmed',
        products: [{ id: item1.menu_item_id, name: item1.name, price: itemPrice, quantity: 1 }],
        subtotal: itemPrice,
        serviceCharge,
        total,
      }

      const resPay = await persistVerifiedOrder(unverifiedPaidOrder, pool)
      assert(resPay.success === true, 'Order processed')
      assert(resPay.isTampered === false, 'Prices are accurate (not tampered)')

      const [orderDb] = await pool.execute('SELECT payment_status, status FROM orders WHERE order_number = ?', [orderId])
      assert(orderDb[0].payment_status === 'Pending Review', 'payment_status downgraded from "Paid" to "Pending Review" in MySQL')
      assert(orderDb[0].status === 'Under Review', 'status set to "Under Review" in MySQL')
    }

    console.log('\n[7. Real MySQL Transaction Rollback on Error]')
    {
      const connection = await pool.getConnection()
      let rollbackHappened = false
      try {
        await connection.beginTransaction()
        await connection.execute(
          `INSERT INTO orders (order_number, customer_name, items_summary, subtotal, service_charge, discount, total, order_type, payment_status, payment_method, status, time_label, order_date)
           VALUES ('TEST-LIVE-FAIL', 'Fail User', 'Summary', 100, 5, 0, 105, 'Dine in', 'Pending', 'Cash', 'Pending', 'Now', '2026-11-16')`,
        )
        // Force an SQL syntax error or foreign key violation
        await connection.execute('INSERT INTO order_items (non_existent_column) VALUES (123)')
        await connection.commit()
      } catch (err) {
        await connection.rollback()
        rollbackHappened = true
      } finally {
        connection.release()
      }

      assert(rollbackHappened === true, 'Database transaction threw error and caught for rollback')
      const [checkFail] = await pool.execute('SELECT * FROM orders WHERE order_number = ?', ['TEST-LIVE-FAIL'])
      assert(checkFail.length === 0, 'No partial order record was committed to MySQL after rollback')
    }

    // 8. Clean up all TEST-LIVE records to leave production completely clean
    await pool.execute("DELETE FROM order_items WHERE order_number LIKE 'TEST-LIVE-%'")
    await pool.execute("DELETE FROM orders WHERE order_number LIKE 'TEST-LIVE-%'")
    console.log('\n[Teardown] All TEST-LIVE-* records safely cleaned up from MySQL.')

    const [finalCheck] = await pool.execute("SELECT COUNT(*) AS count FROM orders WHERE order_number LIKE 'TEST-LIVE-%'")
    assert(finalCheck[0].count === 0, 'Zero test records remain in production database')

  } catch (err) {
    console.error('Fatal live integration test error:', err)
    failed++
  } finally {
    await pool.end()
  }

  console.log('\n===============================================================')
  console.log(` LIVE MYSQL INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('===============================================================\n')

  if (failed > 0) process.exit(1)
  else process.exit(0)
}

runLiveIntegrationTests()
