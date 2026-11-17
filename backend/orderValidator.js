/**
 * orderValidator.js — Backend Price Integrity & Order Validation Engine
 *
 * Prevents client-side price tampering, fake subtotals, negative quantities,
 * invalid promotions, and unauthorized customer payment confirmations across
 * Mobile (Flutter), Web (React), Firebase Realtime DB, and MySQL.
 */

/**
 * Normalizes products list from either an Array or a Firebase-indexed Object.
 * Supports Flutter Mobile payload format and React Web payload format.
 */
export function extractProductsList(order) {
  if (!order) return []

  const rawProducts = order.products ?? order.items_list ?? order.order_items
  if (Array.isArray(rawProducts) && rawProducts.length > 0) {
    return rawProducts.filter(Boolean)
  }
  if (rawProducts && typeof rawProducts === 'object') {
    const list = Object.values(rawProducts).filter(Boolean)
    if (list.length > 0) return list
  }

  // Fallback 1: if items is an array of objects
  if (Array.isArray(order.items) && order.items.length > 0 && typeof order.items[0] === 'object') {
    return order.items
  }

  // Fallback 2: parse string summary like "2 × Liempo Silog, 1 × Calamansi"
  if (typeof order.items === 'string' && order.items.trim()) {
    const segments = order.items.split(/,\s*/)
    const parsed = []
    for (const seg of segments) {
      const match = seg.trim().match(/^(\d+)\s*[×xX]\s*(.+)$/)
      if (match) {
        parsed.push({
          quantity: parseInt(match[1], 10),
          name: match[2].trim(),
        })
      }
    }
    if (parsed.length > 0) return parsed
  }

  return []
}

/**
 * Validates an order and recalculates all monetary values using MySQL menu_items
 * as the authoritative source of truth.
 *
 * @param {object} order - Raw order payload from Firebase or client
 * @param {object} db - MySQL connection or pool (must have .execute() or .query())
 * @returns {Promise<object>} Validation and recalculated result
 */
export async function validateAndRecalculateOrder(order, db) {
  const warnings = []
  const orderId = String(order.id || order.order_number || '').trim()

  if (!orderId) {
    return {
      isValid: false,
      isTampered: false,
      rejectionReason: 'Missing order identifier (order_number/id).',
      warnings: ['Order missing ID'],
    }
  }

  const products = extractProductsList(order)
  if (products.length === 0) {
    return {
      isValid: false,
      isTampered: false,
      rejectionReason: 'Order contains no products or item line items.',
      warnings: ['Empty product list cannot be price-verified.'],
    }
  }

  // ── 1. Fetch & Verify Menu Items from Database ─────────────────────────────
  const productIds = products
    .map((p) => Number(p.id ?? p.menu_item_id ?? p.menuId))
    .filter((id) => Number.isInteger(id) && id > 0)

  const menuMap = new Map()

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',')
    const [rows] = await db.execute(
      `SELECT menu_item_id, name, price, available FROM menu_items WHERE menu_item_id IN (${placeholders})`,
      productIds,
    )
    for (const item of rows) {
      menuMap.set(Number(item.menu_item_id), item)
    }
  }

  const verifiedItems = []
  let verifiedSubtotal = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const numericId = Number(p.id ?? p.menu_item_id ?? p.menuId)
    const quantity = Number(p.quantity)

    // Quantity Validation: Must be a positive integer >= 1
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        isValid: false,
        isTampered: true,
        rejectionReason: `Invalid quantity (${p.quantity}) for product "${p.name || numericId}". Quantity must be a positive integer.`,
        warnings: [`Invalid quantity: ${p.quantity}`],
      }
    }

    // Lookup menu item in database
    let dbItem = menuMap.get(numericId)
    if (!dbItem && p.name) {
      // Fallback lookup by exact name if ID didn't match
      const [nameRows] = await db.execute(
        `SELECT menu_item_id, name, price, available FROM menu_items WHERE name = ? LIMIT 1`,
        [p.name],
      )
      if (nameRows.length > 0) {
        dbItem = nameRows[0]
        menuMap.set(Number(dbItem.menu_item_id), dbItem)
      }
    }

    if (!dbItem) {
      return {
        isValid: false,
        isTampered: false,
        rejectionReason: `Product ID ${numericId || p.name} does not exist in the active menu.`,
        warnings: [`Unrecognized product: ${numericId || p.name}`],
      }
    }

    // Availability Check: available must be 1/true
    const isAvailable = Boolean(Number(dbItem.available))
    if (!isAvailable) {
      return {
        isValid: false,
        isTampered: false,
        rejectionReason: `Product "${dbItem.name}" is currently unavailable.`,
        warnings: [`Unavailable product ordered: ${dbItem.name}`],
      }
    }

    // Trusted Unit Price directly from Database (never trust client)
    const verifiedUnitPrice = Number(dbItem.price)
    const lineTotal = Math.round(verifiedUnitPrice * quantity * 100) / 100
    verifiedSubtotal += lineTotal

    // Check if client submitted a manipulated unit price
    const submittedUnitPrice = Number(p.price ?? p.unit_price)
    if (Number.isFinite(submittedUnitPrice) && Math.abs(submittedUnitPrice - verifiedUnitPrice) > 0.01) {
      warnings.push(
        `Client submitted price ₱${submittedUnitPrice} for "${dbItem.name}", verified price is ₱${verifiedUnitPrice}.`,
      )
    }

    // Prepare line item row for order_items table
    verifiedItems.push({
      order_number: orderId,
      line_number: i + 1,
      menu_item_id: Number(dbItem.menu_item_id),
      item_name: dbItem.name,
      quantity,
      unit_price: verifiedUnitPrice,
      addons: p.addons ? JSON.stringify(Array.isArray(p.addons) ? p.addons : [p.addons]) : null,
    })
  }

  verifiedSubtotal = Math.round(verifiedSubtotal * 100) / 100

  // ── 2. Service Charge Recalculation ─────────────────────────────────────────
  // Business rule: Dine-in orders or orders with service charge incur standard 5%
  const orderType = order.orderType ?? order.order_type ?? order.type ?? 'Dine in'
  let verifiedServiceCharge = 0

  if (orderType === 'Dine in' || Number(order.serviceCharge ?? order.service_charge) > 0) {
    verifiedServiceCharge = Math.round(verifiedSubtotal * 0.05 * 100) / 100
  }

  // Reject negative submitted service charge
  const submittedServiceCharge = Number(order.serviceCharge ?? order.service_charge ?? 0)
  if (submittedServiceCharge < 0) {
    warnings.push(`Client submitted negative service charge: ${submittedServiceCharge}. Forced to ₱${verifiedServiceCharge}.`)
  }

  // ── 3. Discount & Promotion Verification ───────────────────────────────────
  let verifiedDiscount = 0
  const submittedDiscount = Number(order.discount ?? 0)

  if (submittedDiscount < 0) {
    warnings.push(`Client submitted negative discount: ${submittedDiscount}. Reset to 0.`)
  } else if (submittedDiscount > 0) {
    // Check if promotion is authorized
    const promoId = order.promotionId ?? order.promotion_id
    if (promoId) {
      const [promoRows] = await db.execute(
        `SELECT promotion_id, name, status FROM promotions WHERE promotion_id = ? AND status = 'Active' LIMIT 1`,
        [promoId],
      )
      if (promoRows.length > 0) {
        verifiedDiscount = Math.min(submittedDiscount, verifiedSubtotal)
      } else {
        warnings.push(`Promotion ID ${promoId} is invalid or inactive. Discount rejected.`)
        verifiedDiscount = 0
      }
    } else {
      // If no promo ID provided, verify if applied by staff or capped at subtotal
      const isStaffOrAdmin = order.staffId || order._source === 'pos'
      if (isStaffOrAdmin) {
        verifiedDiscount = Math.min(submittedDiscount, verifiedSubtotal)
      } else {
        warnings.push(`Customer attempted unauthorized discount of ₱${submittedDiscount}. Reset to 0.`)
        verifiedDiscount = 0
      }
    }
  }

  // ── 4. Verified Total Recalculation ─────────────────────────────────────────
  const verifiedTotal = Math.max(
    0,
    Math.round((verifiedSubtotal + verifiedServiceCharge - verifiedDiscount) * 100) / 100,
  )

  // ── 5. Price Manipulation Detection ─────────────────────────────────────────
  const submittedTotal = Number(order.total ?? 0)
  const submittedSubtotal = Number(order.subtotal ?? 0)

  const isSubtotalManipulated = Math.abs(submittedSubtotal - verifiedSubtotal) > 0.05
  const isTotalManipulated = Math.abs(submittedTotal - verifiedTotal) > 0.05

  let isTampered = isSubtotalManipulated || isTotalManipulated

  if (isTampered) {
    warnings.push(
      `Price manipulation detected: submitted total ₱${submittedTotal} (expected ₱${verifiedTotal}), submitted subtotal ₱${submittedSubtotal} (expected ₱${verifiedSubtotal}).`,
    )
  }

  // ── 6. Customer & Foreign Key Resolution ────────────────────────────────────
  let resolvedCustomerId = null
  const submittedCustomerId = order.customerId ?? order.customer_id
  if (submittedCustomerId && submittedCustomerId !== 'GUEST') {
    const [custRows] = await db.execute(
      `SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1`,
      [submittedCustomerId],
    )
    resolvedCustomerId = custRows.length > 0 ? submittedCustomerId : null
  }

  // ── 7. Payment Verification & Integrity ─────────────────────────────────────
  // Customers cannot self-confirm payment as 'Paid' on customer/mobile orders
  const submittedPayment = order.payment ?? order.payment_status ?? 'Pending'
  const isStaffSource = order._source === 'pos' || Boolean(order.staffId)
  let verifiedPaymentStatus = submittedPayment

  if (submittedPayment === 'Paid' && !isStaffSource) {
    // If not from POS / staff, check if verified in payments table
    const [payRows] = await db.execute(
      `SELECT payment_number, amount, status FROM payments WHERE order_number = ? LIMIT 1`,
      [orderId],
    )
    if (payRows.length > 0 && payRows[0].status === 'Paid') {
      const paidAmount = Number(payRows[0].amount)
      if (paidAmount < verifiedTotal) {
        verifiedPaymentStatus = 'Underpaid'
        warnings.push(`Payment underpaid: paid ₱${paidAmount}, required ₱${verifiedTotal}.`)
      } else {
        verifiedPaymentStatus = 'Paid'
      }
    } else {
      // Customer claimed 'Paid' without backend payment record or staff confirmation
      verifiedPaymentStatus = 'Pending Review'
      warnings.push(`Unverified customer payment claim. Changed status from 'Paid' to 'Pending Review'.`)
    }
  }

  // ── 8. Status Determination ─────────────────────────────────────────────────
  let finalStatus = order.status ?? 'Pending'
  if (isTampered) {
    finalStatus = 'Price Dispute'
  } else if (verifiedPaymentStatus === 'Pending Review' && finalStatus !== 'Cancelled') {
    finalStatus = 'Under Review'
  }

  // Build items summary string if missing
  const itemsSummary =
    typeof order.items === 'string' && order.items.trim()
      ? order.items
      : verifiedItems.map((i) => `${i.quantity} × ${i.item_name}`).join(', ')

  return {
    isValid: true,
    isTampered,
    rejectionReason: null,
    warnings,
    verifiedOrder: {
      order_number: orderId,
      customer_id: resolvedCustomerId,
      customer_name: order.customerName ?? order.customer ?? order.customer_name ?? 'Guest',
      items_summary: itemsSummary,
      subtotal: verifiedSubtotal,
      service_charge: verifiedServiceCharge,
      discount: verifiedDiscount,
      total: verifiedTotal,
      order_type: orderType,
      pickup_location: order.pickupLocation ?? order.pickup_location ?? null,
      notes: order.notes ?? null,
      payment_status: verifiedPaymentStatus,
      payment_method: order.paymentMethod ?? order.payment_method ?? 'Cash',
      status: finalStatus,
      time_label: order.time ?? order.time_label ?? '',
      order_date: order.date ?? order.order_date ?? new Date().toISOString().slice(0, 10),
    },
    verifiedItems,
  }
}

/**
 * Persists an order to MySQL using verified prices, transaction isolation,
 * and automatic order_items synchronization.
 *
 * @param {object} rawOrder - Order snapshot from Firebase or API
 * @param {object} poolOrConnection - MySQL pool or active connection
 * @returns {Promise<{success: boolean, orderId: string, isTampered: boolean, reason?: string}>}
 */
export async function persistVerifiedOrder(rawOrder, poolOrConnection) {
  // Acquire a dedicated connection for the transaction
  const connection = typeof poolOrConnection.getConnection === 'function'
    ? await poolOrConnection.getConnection()
    : poolOrConnection

  const shouldRelease = typeof poolOrConnection.getConnection === 'function'

  try {
    await connection.beginTransaction()

    // 1. Run Price & Integrity Validation
    const validation = await validateAndRecalculateOrder(rawOrder, connection)

    if (!validation.isValid) {
      // If invalid/rejected, record order as Rejected or log security alert
      console.warn(`[SECURITY] Order ${rawOrder.id} rejected: ${validation.rejectionReason}`)
      await connection.rollback()
      return {
        success: false,
        orderId: rawOrder.id,
        isTampered: validation.isTampered,
        reason: validation.rejectionReason,
      }
    }

    const { verifiedOrder, verifiedItems, isTampered } = validation

    if (isTampered) {
      console.warn(
        `[SECURITY AUDIT] Price tampering mitigated on order ${verifiedOrder.order_number}: saved verified total ₱${verifiedOrder.total}.`,
      )
    }

    // 2. Check for existing order state (Idempotency & Completed order protection)
    const [existingOrders] = await connection.execute(
      `SELECT order_number, status, total, payment_status FROM orders WHERE order_number = ? LIMIT 1`,
      [verifiedOrder.order_number],
    )

    if (existingOrders.length > 0) {
      const existing = existingOrders[0]
      // Prevent tampering of completed or cancelled orders
      if (['Completed', 'Cancelled'].includes(existing.status) && verifiedOrder.status !== existing.status) {
        console.warn(`[SECURITY] Attempt to mutate finalized order ${existing.order_number} was blocked.`)
        await connection.rollback()
        return {
          success: false,
          orderId: verifiedOrder.order_number,
          isTampered: true,
          reason: `Order ${existing.order_number} is already ${existing.status} and cannot be modified.`,
        }
      }
    }

    // 3. Upsert into orders table with VERIFIED values
    await connection.execute(
      `INSERT INTO orders
         (order_number, customer_id, customer_name, items_summary, subtotal, service_charge,
          discount, total, order_type, pickup_location, notes, payment_status,
          payment_method, status, time_label, order_date, firebase_sync_status, firebase_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NOW())
       ON DUPLICATE KEY UPDATE
         customer_id=VALUES(customer_id), customer_name=VALUES(customer_name),
         items_summary=VALUES(items_summary), subtotal=VALUES(subtotal),
         service_charge=VALUES(service_charge), discount=VALUES(discount),
         total=VALUES(total), order_type=VALUES(order_type),
         pickup_location=VALUES(pickup_location), notes=VALUES(notes),
         payment_status=VALUES(payment_status), payment_method=VALUES(payment_method),
         status=VALUES(status), time_label=VALUES(time_label), order_date=VALUES(order_date),
         firebase_sync_status='synced', firebase_synced_at=NOW()`,
      [
        verifiedOrder.order_number,
        verifiedOrder.customer_id,
        verifiedOrder.customer_name,
        verifiedOrder.items_summary,
        verifiedOrder.subtotal,
        verifiedOrder.service_charge,
        verifiedOrder.discount,
        verifiedOrder.total,
        verifiedOrder.order_type,
        verifiedOrder.pickup_location,
        verifiedOrder.notes,
        verifiedOrder.payment_status,
        verifiedOrder.payment_method,
        verifiedOrder.status,
        verifiedOrder.time_label,
        verifiedOrder.order_date,
      ],
    )

    // 4. Synchronize order_items table cleanly (delete previous lines for order, then re-insert verified lines)
    await connection.execute(`DELETE FROM order_items WHERE order_number = ?`, [verifiedOrder.order_number])

    for (const item of verifiedItems) {
      await connection.execute(
        `INSERT INTO order_items (order_number, line_number, menu_item_id, item_name, quantity, unit_price, addons)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           menu_item_id=VALUES(menu_item_id), item_name=VALUES(item_name),
           quantity=VALUES(quantity), unit_price=VALUES(unit_price), addons=VALUES(addons)`,
        [
          item.order_number,
          item.line_number,
          item.menu_item_id,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.addons,
        ],
      )
    }

    await connection.commit()
    return {
      success: true,
      orderId: verifiedOrder.order_number,
      isTampered,
      verifiedOrder,
      verifiedItems,
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    if (shouldRelease) {
      connection.release()
    }
  }
}
