/**
 * Temporary debug script — run with: node backend/test-save.js
 * Tests saveSnapshot with Firebase-shaped data to find the 500 error.
 * DELETE this file after debugging.
 */
import 'dotenv/config'
import { pool, withTransaction } from './database.js'

async function toInt(val) {
  const n = Number(val)
  return Number.isFinite(n) ? Math.floor(n) : null
}

async function testSave() {
  // Simulate Firebase-shaped notification (isRead instead of read)
  const notifications = [
    { id: 1, title: 'Test', detail: 'Detail', isRead: 0, time: 'Now', audience: 'all', _syncedAt: '2026-10-05T10:00:00Z' }
  ]
  // Simulate Firebase-shaped scanEvent (staff_name, staff_id, event_time as strings)
  const scanEvents = [
    { id: '1', staff_name: 'Ava Mendoza', staff_id: 'ST-014', event_time: '10:42 AM', action: 'Time in', _syncedAt: '2026-10-05T10:00:00Z' }
  ]
  // Simulate Firebase string ID on loyalty
  const loyaltyHistory = [
    { id: '1', date: 'Today', detail: 'Test', delta: 5, _syncedAt: '2026-10-05T10:00:00Z' }
  ]

  try {
    await withTransaction(async (connection) => {
      console.log('Testing notifications INSERT…')
      for (const notice of notifications) {
        const isRead = notice.read ?? notice.isRead ?? false
        await connection.execute(
          `INSERT INTO notifications (notification_id, title, detail, audience, time_label, is_read)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), detail=VALUES(detail), audience=VALUES(audience),
             time_label=VALUES(time_label), is_read=VALUES(is_read)`,
          [notice.id, notice.title, notice.detail || '', notice.audience || 'all', notice.time || '', isRead ? 1 : 0],
        )
        console.log('  ✓ notification', notice.id)
      }

      console.log('Testing attendance_events INSERT…')
      for (const event of scanEvents) {
        const staffName = event.name ?? event.staff_name ?? 'Unknown'
        const staffId = event.staffId ?? event.staff_id ?? null
        const eventTime = event.time ?? event.event_time ?? ''
        const eventId = await toInt(event.id ?? event.event_id)
        if (!eventId || eventId < 1) { console.log('  SKIP malformed', event); continue }
        // Verify staff_id exists — null it out if not found (avoids FK violation)
        let resolvedStaffId = null
        if (staffId) {
          const [staffCheck] = await connection.execute('SELECT staff_id FROM staff WHERE staff_id = ? LIMIT 1', [staffId])
          resolvedStaffId = staffCheck.length ? staffId : null
        }
        await connection.execute(
          `INSERT INTO attendance_events (event_id, staff_id, staff_name, event_time, action)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE staff_id=VALUES(staff_id), staff_name=VALUES(staff_name),
             event_time=VALUES(event_time), action=VALUES(action)`,
          [eventId, resolvedStaffId, staffName, eventTime, event.action || 'Time in'],
        )
        console.log('  ✓ scanEvent', eventId, '(staffId resolved to:', resolvedStaffId + ')')
      }

      console.log('Testing loyalty_transactions INSERT…')
      for (const [index, entry] of loyaltyHistory.entries()) {
        const transactionId = await toInt(entry.id)
        if (!transactionId || transactionId < 1) {
          throw new Error(`Loyalty entry ${index + 1} has an invalid identifier (got: ${JSON.stringify(entry.id)}).`)
        }
        await connection.execute(
          `INSERT INTO loyalty_transactions (transaction_id, customer_id, detail, points_delta, date_label)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE detail=VALUES(detail), points_delta=VALUES(points_delta), date_label=VALUES(date_label)`,
          [transactionId, null, entry.detail, entry.delta, entry.date || ''],
        )
        console.log('  ✓ loyalty', transactionId)
      }
    })
    console.log('\n✓ All Firebase-shaped inserts passed.')
  } catch (error) {
    console.error('\n✗ FAILED:', error.message)
    console.error('  SQL state:', error.sqlState)
    console.error('  SQL:', error.sql?.slice(0, 200))
  } finally {
    await pool.end()
  }
}

testSave()
