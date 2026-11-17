/**
 * test-order-validation.js
 *
 * Automated Security & Integrity Test Suite for Rmjohns Eateries Backend
 * Tests all 10 required scenarios:
 *  1. Manipulated product prices
 *  2. Incorrect order subtotals
 *  3. Incorrect service charges
 *  4. Negative or zero quantities
 *  5. Unavailable or inactive products
 *  6. Invalid discount codes or negative discounts
 *  7. Incorrect payment amounts
 *  8. Duplicate order submissions & finalized order protection
 *  9. Unauthorized customer payment verification attempt
 * 10. Legitimate Flutter and React order submissions
 */

import { validateAndRecalculateOrder, persistVerifiedOrder, extractProductsList } from './orderValidator.js'

// ── Mock In-Memory Database Engine ───────────────────────────────────────────
class MockDatabase {
  constructor() {
    this.menuItems = [
      { menu_item_id: 1, name: 'Lechon Kawali Silog', price: 135.0, available: 1 },
      { menu_item_id: 2, name: 'Liempo Silog', price: 135.0, available: 1 },
      { menu_item_id: 3, name: 'Hungarian Silog', price: 115.0, available: 1 },
      { menu_item_id: 8, name: 'Tapsilog Beef', price: 135.0, available: 1 },
      { menu_item_id: 20, name: 'Calamansi', price: 30.0, available: 1 },
      { menu_item_id: 28, name: 'Halo Halo', price: 85.0, available: 1 },
      { menu_item_id: 99, name: 'Sold Out Special', price: 150.0, available: 0 }, // Inactive/Unavailable
    ]

    this.customers = [
      { customer_id: 'CU-1042', name: 'Mia Santos' },
      { customer_id: 'CU-1038', name: 'Luca Reyes' },
    ]

    this.promotions = [
      { promotion_id: 1, name: 'Silog Special', status: 'Active' },
      { promotion_id: 2, name: 'Expired Promo', status: 'Inactive' },
    ]

    this.payments = []
    this.orders = new Map()
    this.orderItems = new Map() // order_number -> Array<order_item>
    this.rolledBack = false
    this.committed = false
    this.failOnItemInsert = false
  }

  async beginTransaction() {
    this.rolledBack = false
    this.committed = false
  }
  async commit() {
    this.committed = true
  }
  async rollback() {
    this.rolledBack = true
  }
  release() {}

  async execute(sql, params = []) {
    const s = sql.trim().toLowerCase()

    // 1. SELECT menu_items WHERE menu_item_id IN (...)
    if (s.includes('from menu_items where menu_item_id in')) {
      const results = this.menuItems.filter((item) => params.includes(item.menu_item_id))
      return [results]
    }

    // 2. SELECT menu_items WHERE name = ?
    if (s.includes('from menu_items where name = ?')) {
      const name = params[0]
      const results = this.menuItems.filter((item) => item.name.toLowerCase() === String(name).toLowerCase())
      return [results]
    }

    // 3. SELECT customer_id FROM customers WHERE customer_id = ?
    if (s.includes('from customers where customer_id = ?')) {
      const cid = params[0]
      const results = this.customers.filter((c) => c.customer_id === cid)
      return [results]
    }

    // 4. SELECT promotion_id FROM promotions WHERE promotion_id = ? AND status = 'Active'
    if (s.includes('from promotions where promotion_id = ? and status = \'active\'')) {
      const pid = Number(params[0])
      const results = this.promotions.filter((p) => p.promotion_id === pid && p.status === 'Active')
      return [results]
    }

    // 5. SELECT payment_number, amount, status FROM payments WHERE order_number = ?
    if (s.includes('from payments where order_number = ?')) {
      const onum = params[0]
      const results = this.payments.filter((p) => p.order_number === onum)
      return [results]
    }

    // 6. SELECT order_number, status, total, payment_status FROM orders WHERE order_number = ?
    if (s.includes('from orders where order_number = ?')) {
      const onum = params[0]
      const ord = this.orders.get(onum)
      return [ord ? [ord] : []]
    }

    // 7. INSERT INTO orders ... ON DUPLICATE KEY UPDATE
    if (s.startsWith('insert into orders')) {
      const orderNumber = params[0]
      const record = {
        order_number: params[0],
        customer_id: params[1],
        customer_name: params[2],
        items_summary: params[3],
        subtotal: params[4],
        service_charge: params[5],
        discount: params[6],
        total: params[7],
        order_type: params[8],
        pickup_location: params[9],
        notes: params[10],
        payment_status: params[11],
        payment_method: params[12],
        status: params[13],
        time_label: params[14],
        order_date: params[15],
      }
      this.orders.set(orderNumber, record)
      return [{ affectedRows: 1 }]
    }

    // 8. DELETE FROM order_items WHERE order_number = ?
    if (s.startsWith('delete from order_items where order_number = ?')) {
      const onum = params[0]
      this.orderItems.delete(onum)
      return [{ affectedRows: 1 }]
    }

    // 9. INSERT INTO order_items
    if (s.startsWith('insert into order_items')) {
      if (this.failOnItemInsert) {
        throw new Error('Simulated SQL error during order_items insert')
      }
      const onum = params[0]
      const lnum = params[1]
      const item = {
        order_number: params[0],
        line_number: params[1],
        menu_item_id: params[2],
        item_name: params[3],
        quantity: params[4],
        unit_price: params[5],
        addons: params[6],
      }
      let existing = this.orderItems.get(onum) || []
      // Mirror UNIQUE KEY uq_order_items_order_line (order_number, line_number) with ON DUPLICATE KEY UPDATE
      const idx = existing.findIndex((e) => e.line_number === lnum)
      if (idx >= 0) {
        existing[idx] = item
      } else {
        existing.push(item)
      }
      this.orderItems.set(onum, existing)
      return [{ affectedRows: 1 }]
    }

    return [[]]
  }
}

// ── Test Runner ───────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passed++
  } else {
    console.error(`  FAIL: ${message}`)
    failed++
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log(' RMJOHNS EATERIES - ORDER PRICE INTEGRITY & VALIDATION TEST SUITE')
  console.log('=================================================================\n')

  const db = new MockDatabase()

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Manipulated Product Prices
  // Client submits ₱1.00 for Liempo Silog (actual DB price: ₱135.00)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Test 1: Manipulated Product Prices')
  {
    const tamperedOrder = {
      id: 'TEST-ORD-001',
      customer: 'Hacker User',
      type: 'Dine in',
      products: [
        { id: 2, name: 'Liempo Silog', price: 1.0, quantity: 1 }, // FAKE PRICE ₱1.00
      ],
      subtotal: 1.0,
      serviceCharge: 0.05,
      total: 1.05,
      payment: 'Pending',
    }

    const result = await validateAndRecalculateOrder(tamperedOrder, db)
    assert(result.isValid === true, 'Order is processed through verification')
    assert(result.isTampered === true, 'Tampered price is detected')
    assert(result.verifiedOrder.subtotal === 135.0, 'Subtotal is corrected to trusted DB price (₱135.00)')
    assert(result.verifiedOrder.service_charge === 6.75, 'Service charge is recalculated based on ₱135.00 (₱6.75)')
    assert(result.verifiedOrder.total === 141.75, 'Total is corrected to ₱141.75 instead of fake ₱1.05')
    assert(result.verifiedOrder.status === 'Price Dispute', 'Status flagged as "Price Dispute"')

    // Verify persistence saves verified price, NOT manipulated price
    const persistResult = await persistVerifiedOrder(tamperedOrder, db)
    assert(persistResult.success === true, 'Order saved to database')
    const saved = db.orders.get('TEST-ORD-001')
    assert(saved.total === 141.75, 'MySQL orders record stores verified total ₱141.75')
    const savedLines = db.orderItems.get('TEST-ORD-001')
    assert(savedLines[0].unit_price === 135.0, 'MySQL order_items stores verified unit_price ₱135.00')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Incorrect Order Subtotals
  // Client submits 2 x Liempo Silog (₱135 = ₱270) but claims subtotal is ₱50
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 2: Incorrect Order Subtotals')
  {
    const badSubtotalOrder = {
      id: 'TEST-ORD-002',
      customer: 'Faulty Client',
      type: 'Pickup',
      products: [
        { id: 2, name: 'Liempo Silog', price: 135.0, quantity: 2 },
      ],
      subtotal: 50.0, // FORGED SUBTOTAL
      total: 50.0,
      payment: 'Pending',
    }

    const result = await validateAndRecalculateOrder(badSubtotalOrder, db)
    assert(result.isTampered === true, 'Mismatch in subtotal triggers tampering detection')
    assert(result.verifiedOrder.subtotal === 270.0, 'Subtotal recalculated to 2 × ₱135 = ₱270.00')
    assert(result.verifiedOrder.total === 270.0, 'Total corrected to ₱270.00')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Incorrect Service Charges
  // Client submits negative service charge (-₱20) or zero on Dine in
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 3: Incorrect Service Charges')
  {
    const negativeServiceOrder = {
      id: 'TEST-ORD-003',
      customer: 'Greedy User',
      type: 'Dine in',
      products: [
        { id: 1, name: 'Lechon Kawali Silog', quantity: 2 }, // 2 × 135 = 270
      ],
      subtotal: 270.0,
      serviceCharge: -50.0, // NEGATIVE SERVICE CHARGE
      total: 220.0,
      payment: 'Pending',
    }

    const result = await validateAndRecalculateOrder(negativeServiceOrder, db)
    assert(result.verifiedOrder.service_charge === 13.5, 'Negative service charge replaced with 5% (₱13.50)')
    assert(result.verifiedOrder.total === 283.5, 'Total verified to ₱283.50')
    assert(result.isTampered === true, 'Detected price tampering from negative service charge')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Negative or Zero Quantities
  // Client attempts to order negative (-3) or zero (0) quantities
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 4: Negative or Zero Quantities')
  {
    const negativeQtyOrder = {
      id: 'TEST-ORD-004A',
      customer: 'Exploiter',
      products: [{ id: 1, quantity: -2 }],
    }
    const resA = await validateAndRecalculateOrder(negativeQtyOrder, db)
    assert(resA.isValid === false, 'Negative quantity rejected')
    assert(resA.rejectionReason.includes('Invalid quantity'), 'Rejection message specifies invalid quantity')

    const zeroQtyOrder = {
      id: 'TEST-ORD-004B',
      customer: 'Exploiter',
      products: [{ id: 1, quantity: 0 }],
    }
    const resB = await validateAndRecalculateOrder(zeroQtyOrder, db)
    assert(resB.isValid === false, 'Zero quantity rejected')

    const fractionalQtyOrder = {
      id: 'TEST-ORD-004C',
      customer: 'Exploiter',
      products: [{ id: 1, quantity: 1.5 }],
    }
    const resC = await validateAndRecalculateOrder(fractionalQtyOrder, db)
    assert(resC.isValid === false, 'Fractional quantity (1.5) rejected')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Unavailable or Inactive Products
  // Client orders product ID 99 (available = 0)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 5: Unavailable or Inactive Products')
  {
    const unavailableOrder = {
      id: 'TEST-ORD-005',
      customer: 'Mia Santos',
      products: [{ id: 99, name: 'Sold Out Special', quantity: 1 }],
    }

    const result = await validateAndRecalculateOrder(unavailableOrder, db)
    assert(result.isValid === false, 'Unavailable product rejected')
    assert(result.rejectionReason.includes('currently unavailable'), 'Rejection message notes product unavailability')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Invalid Discount Codes or Negative Discounts
  // Client attempts negative discount or unauthorized promotion ID
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 6: Invalid Discount Codes or Negative Discounts')
  {
    const invalidPromoOrder = {
      id: 'TEST-ORD-006A',
      customer: 'Mia Santos',
      type: 'Pickup',
      products: [{ id: 1, quantity: 1 }], // 135
      promotionId: 9999, // Non-existent promotion
      discount: 50.0,
      subtotal: 135.0,
      total: 85.0,
    }
    const resA = await validateAndRecalculateOrder(invalidPromoOrder, db)
    assert(resA.verifiedOrder.discount === 0, 'Invalid promo ID discount reset to 0')
    assert(resA.verifiedOrder.total === 135.0, 'Total recalculated without invalid discount')

    const expiredPromoOrder = {
      id: 'TEST-ORD-006B',
      customer: 'Mia Santos',
      type: 'Pickup',
      products: [{ id: 1, quantity: 1 }],
      promotionId: 2, // Inactive promotion in DB
      discount: 35.0,
      subtotal: 135.0,
      total: 100.0,
    }
    const resB = await validateAndRecalculateOrder(expiredPromoOrder, db)
    assert(resB.verifiedOrder.discount === 0, 'Inactive promotion discount reset to 0')

    const negativeDiscountOrder = {
      id: 'TEST-ORD-006C',
      customer: 'Mia Santos',
      type: 'Pickup',
      products: [{ id: 1, quantity: 1 }],
      discount: -50.0, // Negative discount
      subtotal: 135.0,
      total: 185.0,
    }
    const resC = await validateAndRecalculateOrder(negativeDiscountOrder, db)
    assert(resC.verifiedOrder.discount === 0, 'Negative discount reset to 0')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Incorrect Payment Amounts
  // Payment record in DB is ₱100.00 for order totaling ₱141.75
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 7: Incorrect Payment Amounts')
  {
    db.payments.push({
      order_number: 'TEST-ORD-007',
      amount: 100.0,
      status: 'Paid',
    })

    const underpaidOrder = {
      id: 'TEST-ORD-007',
      customer: 'Mia Santos',
      type: 'Dine in',
      products: [{ id: 2, quantity: 1 }], // 135 + 6.75 = 141.75
      subtotal: 135.0,
      serviceCharge: 6.75,
      total: 141.75,
      payment: 'Paid',
    }

    const result = await validateAndRecalculateOrder(underpaidOrder, db)
    assert(result.verifiedOrder.payment_status === 'Underpaid', 'Status flagged as Underpaid when payment record is short')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Duplicate Order Submissions & Finalized Order Protection
  // Submitting the same order twice; then attempting to edit a Completed order
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 8: Duplicate Order Submissions & Finalized Order Protection')
  {
    const legitOrder = {
      id: 'TEST-ORD-008',
      customer: 'Mia Santos',
      type: 'Dine in',
      products: [{ id: 2, quantity: 1 }],
      subtotal: 135.0,
      serviceCharge: 6.75,
      total: 141.75,
      status: 'Pending',
    }

    // 1st submission
    const res1 = await persistVerifiedOrder(legitOrder, db)
    assert(res1.success === true, 'First submission succeeds')
    assert(db.orderItems.get('TEST-ORD-008').length === 1, 'order_items has 1 line')

    // 2nd duplicate submission with same items
    const res2 = await persistVerifiedOrder(legitOrder, db)
    assert(res2.success === true, 'Duplicate submission processed idempotently')
    assert(db.orderItems.get('TEST-ORD-008').length === 1, 'order_items does NOT duplicate lines (still 1 line)')

    // Now mark order as Completed
    const existing = db.orders.get('TEST-ORD-008')
    existing.status = 'Completed'

    // Client attempts to modify completed order
    const mutateAttempt = {
      id: 'TEST-ORD-008',
      customer: 'Mia Santos',
      type: 'Dine in',
      products: [{ id: 2, quantity: 1 }],
      subtotal: 135.0,
      total: 141.75,
      status: 'Cancelled', // Malicious status change
    }
    const res3 = await persistVerifiedOrder(mutateAttempt, db)
    assert(res3.success === false, 'Modification of completed order is blocked')
    assert(res3.reason.includes('already Completed'), 'Blocked reason explains order is completed')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: Unauthorized Customer Payment Verification Attempt
  // Customer sends mobile order with payment: 'Paid' without staff/backend proof
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 9: Unauthorized Customer Payment Verification Attempt')
  {
    const customerOrder = {
      id: 'TEST-ORD-009',
      customer: 'Customer Without Cashier',
      _source: 'mobile',
      type: 'Dine in',
      products: [{ id: 1, quantity: 1 }],
      subtotal: 135.0,
      serviceCharge: 6.75,
      total: 141.75,
      payment: 'Paid', // Unverified self-claim
      status: 'Confirmed',
    }

    const result = await validateAndRecalculateOrder(customerOrder, db)
    assert(result.verifiedOrder.payment_status === 'Pending Review', 'Self-certified "Paid" is downgraded to "Pending Review"')
    assert(result.verifiedOrder.status === 'Under Review', 'Order status moved to "Under Review"')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 10: Legitimate Flutter and React Order Submissions
  // Test genuine Flutter mobile format and genuine React web format
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 10: Legitimate Flutter and React Order Submissions')
  {
    // A. Flutter Mobile Payload Format
    const flutterOrder = {
      id: 'ORD-MOB-20261116',
      customerName: 'Mia Santos',
      customerId: 'CU-1042',
      items: '2 × Liempo Silog, 1 × Calamansi',
      orderType: 'Dine in',
      paymentMethod: 'GCash',
      notes: 'Please separate sauce',
      subtotal: 300.0, // (135 * 2) + 30 = 300
      serviceCharge: 15.0, // 5% of 300 = 15
      discount: 0.0,
      total: 315.0, // 300 + 15 = 315
      status: 'Pending',
      payment: 'Pending',
      products: [
        { id: 2, menu_item_id: 2, name: 'Liempo Silog', price: 135.0, quantity: 2, addons: ['Extra Rice'] },
        { id: 20, menu_item_id: 20, name: 'Calamansi', price: 30.0, quantity: 1, addons: [] },
      ],
      _source: 'mobile',
    }

    const flutterRes = await persistVerifiedOrder(flutterOrder, db)
    assert(flutterRes.success === true, 'Legitimate Flutter order successfully saved')
    assert(flutterRes.isTampered === false, 'Flutter order has isTampered = false')
    assert(flutterRes.verifiedOrder.subtotal === 300.0, 'Flutter order verified subtotal is ₱300.00')
    assert(flutterRes.verifiedOrder.service_charge === 15.0, 'Flutter order verified service charge is ₱15.00')
    assert(flutterRes.verifiedOrder.total === 315.0, 'Flutter order verified total is ₱315.00')
    assert(flutterRes.verifiedOrder.customer_id === 'CU-1042', 'Customer ID CU-1042 resolved and linked')

    // B. React Web POS Format
    const reactOrder = {
      id: 'VK-2842',
      customer: 'Luca Reyes',
      items: '1 × Tapsilog Beef, 1 × Halo Halo',
      type: 'Dine in',
      paymentMethod: 'Cash',
      notes: '',
      subtotal: 220.0, // 135 + 85 = 220
      serviceCharge: 11.0, // 5% of 220 = 11
      discount: 0,
      total: 231.0,
      status: 'Completed',
      payment: 'Paid',
      staffId: 'ST-001', // Authorized staff
      _source: 'pos',
      products: [
        { id: 8, name: 'Tapsilog Beef', price: 135, quantity: 1, addons: [] },
        { id: 28, name: 'Halo Halo', price: 85, quantity: 1, addons: [] },
      ],
    }

    const reactRes = await persistVerifiedOrder(reactOrder, db)
    assert(reactRes.success === true, 'Legitimate React POS order successfully saved')
    assert(reactRes.isTampered === false, 'React order has isTampered = false')
    assert(reactRes.verifiedOrder.subtotal === 220.0, 'React order verified subtotal is ₱220.00')
    assert(reactRes.verifiedOrder.service_charge === 11.0, 'React order verified service charge is ₱11.00')
    assert(reactRes.verifiedOrder.total === 231.0, 'React order verified total is ₱231.00')
    assert(reactRes.verifiedOrder.payment_status === 'Paid', 'Staff POS sale allowed to record "Paid"')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 11: Transaction Failure and Rollback Integrity
  // Database error occurs during line item insertion; must trigger connection.rollback()
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 11: Transaction Failure and Rollback Integrity')
  {
    db.failOnItemInsert = true
    const failingOrder = {
      id: 'TEST-ORD-FAIL',
      customer: 'Mia Santos',
      products: [{ id: 1, quantity: 1 }],
      subtotal: 135.0,
      total: 141.75,
    }

    let errorCaught = false
    try {
      await persistVerifiedOrder(failingOrder, db)
    } catch (err) {
      errorCaught = true
    }

    assert(errorCaught === true, 'Exception propagated on database failure')
    assert(db.rolledBack === true, 'Transaction was rolled back via connection.rollback()')
    assert(db.committed === false, 'Transaction was NOT committed')
    db.failOnItemInsert = false
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 12: Concurrent / Race Condition Duplicate Submissions
  // Multiple rapid Firebase events for the same order executed in parallel
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTest 12: Concurrent / Race Condition Duplicate Submissions')
  {
    const concurrentOrder = {
      id: 'TEST-ORD-CONCURRENT',
      customer: 'Mia Santos',
      type: 'Dine in',
      products: [{ id: 2, quantity: 1 }],
      subtotal: 135.0,
      serviceCharge: 6.75,
      total: 141.75,
    }

    // Fire 5 identical order events simultaneously
    const results = await Promise.all([
      persistVerifiedOrder(concurrentOrder, db),
      persistVerifiedOrder(concurrentOrder, db),
      persistVerifiedOrder(concurrentOrder, db),
      persistVerifiedOrder(concurrentOrder, db),
      persistVerifiedOrder(concurrentOrder, db),
    ])

    const allSucceeded = results.every((r) => r.success === true)
    assert(allSucceeded === true, 'All concurrent events resolved successfully')
    const finalLines = db.orderItems.get('TEST-ORD-CONCURRENT')
    assert(finalLines.length === 1, 'order_items remains clean with exactly 1 line item (no duplicates)')
  }

  console.log('\n=================================================================')
  console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err)
  process.exit(1)
})
