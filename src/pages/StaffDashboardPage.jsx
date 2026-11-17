import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

function IconTicket() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v3.5a2.5 2.5 0 0 0 0 5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3.5a2.5 2.5 0 0 0 0-5V6a2 2 0 0 1 2-2Zm5.5 3a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0V8a1 1 0 0 0-1-1Zm0 4a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Zm0 4a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z" />
    </svg>
  )
}

function IconBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6h-3V5a4 4 0 0 0-8 0v1H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-9-1a2 2 0 0 1 4 0v1h-4V5Zm4 8a2 2 0 0 1-4 0v-1H8v1a4 4 0 0 0 8 0v-1h-2v1Z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconCalendarOrder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11Zm-9-7H8v-2h2v2Zm4 0h-2v-2h2v2Zm4 0h-2v-2h2v2Zm-8 4H8v-2h2v2Zm4 0h-2v-2h2v2Zm4 0h-2v-2h2v2Z" />
    </svg>
  )
}

function IconChefHat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.5 7.5A4.5 4.5 0 0 0 14 3.1 4.5 4.5 0 0 0 9.8 4 4.5 4.5 0 0 0 5.5 8.5c0 .7.1 1.3.4 1.9A4.5 4.5 0 0 0 6 17v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2c1.7-.8 2.8-2.5 2.8-4.5 0-1.8-.9-3.4-2.3-4.2ZM16 18H8v-1h8v1Z" />
    </svg>
  )
}

function IconCheckCalendar() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H5V8h14v11Zm-8.5-2.5 6-6-1.4-1.4-4.6 4.6-2.1-2.1-1.4 1.4 3.5 3.5Z" />
    </svg>
  )
}

function IconAttendanceDoc() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5 14H7v-2h10v2Zm0-4H7v-2h10v2Zm0-4H7V7h10v2Z" />
    </svg>
  )
}

export default function StaffDashboardPage() {
  const { orders = [], staff = [], profile = {}, navigate, setDialog, updateOrder, notify } = useApp()

  // ── 1. Real-time statistics from active orders ────────────────────────────
  // Active kitchen tickets: orders requiring prep (Pending, Confirmed, Preparing)
  const activeTickets = useMemo(() => {
    return orders.filter((o) => ['Pending', 'Confirmed', 'Preparing'].includes(o.status))
  }, [orders])

  // Ready for pickup tickets
  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'Ready')
  }, [orders])

  // New incoming orders (Pending)
  const newOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'Pending')
  }, [orders])

  // Current staff member attendance / shift
  const currentStaffName = profile.name || 'Staff'
  const currentStaffMember = staff.find((s) => s.name?.toLowerCase() === currentStaffName.toLowerCase()) || staff[0]
  const staffShiftStatus = currentStaffMember?.status || 'On Duty'

  // ── 2. Orders Needing Attention (Pending, Preparing, Ready, Confirmed) ─────
  const attentionOrders = useMemo(() => {
    const list = orders.filter((o) => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(o.status))
    // Sort so Pending and Preparing are prioritized on top
    const priority = { Pending: 1, Confirmed: 2, Preparing: 3, Ready: 4 }
    return list.sort((a, b) => (priority[a.status] || 99) - (priority[b.status] || 99))
  }, [orders])

  // ── 3. Table Pagination ──────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const totalOrders = attentionOrders.length
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return attentionOrders.slice(start, start + pageSize)
  }, [attentionOrders, safePage, pageSize])

  // ── 4. Action Handlers ───────────────────────────────────────────────────
  function handleProcessOrder(order) {
    if (order.status === 'Pending') {
      updateOrder(order.id, { status: 'Preparing' })
      notify(`Order ${order.id} marked as Preparing.`, { icon: 'success', title: 'Ticket Updated' })
    } else {
      setDialog({ type: 'order', order })
    }
  }

  function handleMarkNextReady() {
    // Find the first preparing order and mark it ready
    const nextPreparing = orders.find((o) => o.status === 'Preparing')
    if (nextPreparing) {
      updateOrder(nextPreparing.id, { status: 'Ready' })
      notify(`Order ${nextPreparing.id} is now Ready for Pickup!`, { icon: 'success', title: 'Order Ready' })
    } else {
      notify('No orders are currently Preparing. Navigating to Kitchen Queue.', { icon: 'info' })
      navigate('Kitchen')
    }
  }

  return (
    <div className="staff-dashboard">

      {/* ══════════════ 1. WELCOME HERO BANNER ══════════════ */}
      <section className="staff-welcome-banner" aria-label="Staff welcome banner">
        <svg className="staff-banner-waves" viewBox="0 0 900 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 160 C 220 100, 480 170, 720 120 C 820 98, 880 70, 900 50 L 900 160 Z" fill="#244E38" fillOpacity="0.55" />
          <path d="M0 160 C 180 130, 420 150, 640 105 C 760 80, 840 50, 900 20 L 900 160 Z" fill="#2E6146" fillOpacity="0.38" />
          <path d="M0 160 C 280 145, 520 135, 780 85 C 840 70, 880 50, 900 35 L 900 160 Z" fill="#D4E157" fillOpacity="0.12" />
        </svg>

        <div className="staff-welcome-copy">
          <h1>
            Welcome back, <span className="staff-welcome-highlight">Staff!</span>
          </h1>
          <p>Here&apos;s what&apos;s happening with Rmjohns today.</p>
        </div>

        <div className="staff-welcome-visual" aria-hidden="true">
          <img
            src="/admin-banner-dish.jpg"
            alt="Signature Filipino plated dish"
            className="staff-welcome-dish-img"
          />
        </div>
      </section>

      {/* ══════════════ 2. FOUR SUMMARY STAT CARDS ══════════════ */}
      <section className="staff-stats-row" aria-label="Staff shift metrics">
        {/* Card 1: Active Tickets */}
        <article
          className="staff-stat-card"
          onClick={() => navigate('Kitchen')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('Kitchen')}
          aria-label="Active Tickets"
        >
          <div className="staff-stat-top">
            <span className="staff-stat-icon-wrap">
              <IconTicket />
            </span>
            <div className="staff-stat-meta">
              <span className="staff-stat-label">Active Tickets</span>
              <strong className="staff-stat-value">{activeTickets.length}</strong>
            </div>
          </div>
          <span className="staff-stat-trend">
            <span className="staff-trend-arrow">↑</span> 1 more than last hour
          </span>
          <svg className="staff-card-corner-wave" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 50 Q 50 15 100 0 L 100 50 Z" fill="#D4E157" fillOpacity="0.18" />
          </svg>
        </article>

        {/* Card 2: Ready for Pickup */}
        <article
          className="staff-stat-card"
          onClick={() => navigate('Orders')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('Orders')}
          aria-label="Ready for Pickup"
        >
          <div className="staff-stat-top">
            <span className="staff-stat-icon-wrap">
              <IconBag />
            </span>
            <div className="staff-stat-meta">
              <span className="staff-stat-label">Ready for Pickup</span>
              <strong className="staff-stat-value">{readyOrders.length}</strong>
            </div>
          </div>
          <span className="staff-stat-trend">
            <span className="staff-trend-arrow">↑</span> 2 more than last hour
          </span>
          <svg className="staff-card-corner-wave" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 50 Q 50 15 100 0 L 100 50 Z" fill="#D4E157" fillOpacity="0.18" />
          </svg>
        </article>

        {/* Card 3: My Shift */}
        <article
          className="staff-stat-card"
          onClick={() => navigate('Attendance')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('Attendance')}
          aria-label="My Shift"
        >
          <div className="staff-stat-top">
            <span className="staff-stat-icon-wrap">
              <IconClock />
            </span>
            <div className="staff-stat-meta">
              <span className="staff-stat-label">My Shift</span>
              <strong className="staff-stat-value staff-val-text">{staffShiftStatus}</strong>
            </div>
          </div>
          <span className="staff-stat-trend staff-shift-pill">
            <span className="staff-shift-dot" /> 8:00 AM &ndash; 5:00 PM
          </span>
          <svg className="staff-card-corner-wave" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 50 Q 50 15 100 0 L 100 50 Z" fill="#D4E157" fillOpacity="0.18" />
          </svg>
        </article>

        {/* Card 4: New Orders */}
        <article
          className="staff-stat-card"
          onClick={() => navigate('Orders')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('Orders')}
          aria-label="New Orders"
        >
          <div className="staff-stat-top">
            <span className="staff-stat-icon-wrap">
              <IconCalendarOrder />
            </span>
            <div className="staff-stat-meta">
              <span className="staff-stat-label">New Orders</span>
              <strong className="staff-stat-value">{newOrders.length}</strong>
            </div>
          </div>
          <span className="staff-stat-trend">
            <span className="staff-trend-arrow">↑</span> 3 more than last hour
          </span>
          <svg className="staff-card-corner-wave" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 50 Q 50 15 100 0 L 100 50 Z" fill="#D4E157" fillOpacity="0.18" />
          </svg>
        </article>
      </section>

      {/* ══════════════ 3. MAIN GRID (Orders Table + Quick Actions) ══════════════ */}
      <div className="staff-main-grid">

        {/* ── Left Column: Orders Needing Attention (~70%) ── */}
        <section className="staff-col-left" aria-label="Orders Needing Attention">
          <article className="staff-card staff-orders-card">
            {/* Card Header */}
            <div className="staff-card-head">
              <div className="staff-card-title-group">
                <span className="staff-section-icon" aria-hidden="true">📊</span>
                <h2>Orders Needing Attention</h2>
              </div>
              <button
                type="button"
                className="staff-view-all-btn"
                onClick={() => navigate('Orders')}
              >
                View All &rarr;
              </button>
            </div>

            {/* Table Container */}
            <div className="staff-table-wrap">
              {paginatedOrders.length === 0 ? (
                <div className="staff-empty-orders">
                  <p>🎉 All caught up! No active orders currently need attention.</p>
                </div>
              ) : (
                <table className="staff-orders-table">
                  <thead>
                    <tr>
                      <th scope="col">ORDER #</th>
                      <th scope="col">CUSTOMER</th>
                      <th scope="col">ITEMS</th>
                      <th scope="col">TIME</th>
                      <th scope="col">STATUS</th>
                      <th scope="col" style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => {
                      const statusLower = (order.status || 'pending').toLowerCase()
                      const isPending = statusLower === 'pending' || statusLower === 'confirmed'
                      return (
                        <tr key={order.id}>
                          <td className="staff-td-order-id">
                            <strong>{order.id}</strong>
                          </td>
                          <td className="staff-td-customer">
                            <span>{order.customer || 'Guest Customer'}</span>
                          </td>
                          <td className="staff-td-items" title={order.items || ''}>
                            <span>{order.items || 'Standard order items'}</span>
                          </td>
                          <td className="staff-td-time">
                            <span>{order.time || '12:00 PM'}</span>
                          </td>
                          <td className="staff-td-status">
                            <span className={`staff-status-pill ${statusLower}`}>
                              <span className="staff-status-dot" />
                              {order.status || 'Pending'}
                            </span>
                          </td>
                          <td className="staff-td-actions" style={{ textAlign: 'center' }}>
                            {isPending ? (
                              <button
                                type="button"
                                className="staff-action-btn staff-btn-process"
                                onClick={() => handleProcessOrder(order)}
                                aria-label={`Process order ${order.id}`}
                              >
                                Process
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="staff-action-btn staff-btn-view"
                                onClick={() => setDialog({ type: 'order', order })}
                                aria-label={`View order ${order.id}`}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer / Pagination */}
            <div className="staff-table-footer">
              <span className="staff-footer-count">
                Showing {totalOrders === 0 ? 0 : (safePage - 1) * pageSize + 1}&ndash;{Math.min(safePage * pageSize, totalOrders)} of {totalOrders} orders
              </span>

              <div className="staff-rows-per-page">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  aria-label="Rows per page"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="staff-pagination-nav">
                <button
                  type="button"
                  className="staff-pg-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  &laquo; Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`staff-pg-num${num === safePage ? ' active' : ''}`}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  className="staff-pg-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next &raquo;
                </button>
              </div>
            </div>
          </article>
        </section>

        {/* ── Right Column: Quick Actions (~30%) ── */}
        <aside className="staff-col-right" aria-label="Staff Quick Actions">
          <article className="staff-quick-card">
            <div className="staff-quick-header">
              <span className="staff-bolt-icon" aria-hidden="true">⚡</span>
              <h2>Quick Actions</h2>
            </div>

            <div className="staff-quick-body">
              {/* Action 1: View Kitchen Queue */}
              <button
                type="button"
                className="staff-quick-action-btn"
                onClick={() => navigate('Kitchen')}
              >
                <div className="staff-qbtn-icon">
                  <IconChefHat />
                </div>
                <strong className="staff-qbtn-label">View Kitchen Queue</strong>
              </button>

              {/* Action 2: Mark Order Ready */}
              <button
                type="button"
                className="staff-quick-action-btn"
                onClick={handleMarkNextReady}
              >
                <div className="staff-qbtn-icon">
                  <IconCheckCalendar />
                </div>
                <strong className="staff-qbtn-label">Mark Order Ready</strong>
              </button>

              {/* Action 3: View Attendance */}
              <button
                type="button"
                className="staff-quick-action-btn"
                onClick={() => navigate('Attendance')}
              >
                <div className="staff-qbtn-icon">
                  <IconAttendanceDoc />
                </div>
                <strong className="staff-qbtn-label">View Attendance</strong>
              </button>
            </div>
          </article>
        </aside>

      </div>

    </div>
  )
}
