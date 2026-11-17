import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'
import { money } from '../data/mockData'
import './ReportsPage.css'

const reportTypes = [
  'Sales report',
  'Order report',
  'Menu report',
  'Customer report',
  'Staff attendance',
  'Loyalty report',
]

const daysOfWeek = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']
const chartHeights = [38, 57, 46, 72, 61, 88, 66]

export default function ReportsPage() {
  const { orders = [], menu = [], customers = [], staff = [], loyaltyHistory = [], payments = [] } = useApp()

  const [reportType, setReportType] = useState('Sales report')
  const [dateRange, setDateRange] = useState('Today')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [paymentFilter, setPaymentFilter] = useState('All payments')
  const [search, setSearch] = useState('')

  const term = search.toLowerCase()
  const menuById = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu])

  // Visible Orders filtered by Date, Category, Payment, and Search
  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.date || '2026-09-29'
      const matchesDate =
        dateRange === 'All time' ||
        (dateRange === 'Today'
          ? orderDate === '2026-09-29'
          : dateRange === 'This week'
            ? orderDate >= '2026-09-23'
            : orderDate >= '2026-09-01')

      const matchesCategory =
        categoryFilter === 'All categories' ||
        order.products?.some((line) => menuById.get(line.id)?.category === categoryFilter)

      const matchesPayment =
        paymentFilter === 'All payments' ||
        order.paymentMethod === paymentFilter ||
        order.payment === paymentFilter

      const matchesSearch =
        !term ||
        `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(term)

      return matchesDate && matchesCategory && matchesPayment && matchesSearch
    })
  }, [orders, dateRange, categoryFilter, paymentFilter, term, menuById])

  // Sales and Metrics Calculations
  const validOrders = useMemo(
    () => visibleOrders.filter((order) => !['Cancelled', 'Refunded'].includes(order.payment)),
    [visibleOrders]
  )
  const sales = useMemo(() => validOrders.reduce((sum, order) => sum + (order.total || 0), 0), [validOrders])
  const completed = useMemo(() => visibleOrders.filter((order) => order.status === 'Completed').length, [visibleOrders])
  const cancelled = useMemo(
    () => visibleOrders.filter((order) => order.status === 'Cancelled' || order.payment === 'Refunded').length,
    [visibleOrders]
  )
  const averageOrder = useMemo(
    () => (validOrders.length ? Math.round(sales / validOrders.length) : 0),
    [sales, validOrders]
  )

  // Payment Breakdown Calculations
  const visibleOrderIds = useMemo(() => new Set(visibleOrders.map((order) => order.id)), [visibleOrders])
  const paymentTotals = useMemo(() => {
    return payments.reduce((totals, payment) => {
      if (payment.status === 'Paid' && visibleOrderIds.has(payment.orderId)) {
        totals[payment.method] = (totals[payment.method] || 0) + (payment.amount || 0)
      }
      return totals
    }, {})
  }, [payments, visibleOrderIds])

  const paymentTotal = useMemo(
    () => Object.values(paymentTotals).reduce((sum, amount) => sum + amount, 0),
    [paymentTotals]
  )

  // Unique menu categories
  const categories = useMemo(() => [...new Set(menu.map((item) => item.category).filter(Boolean))], [menu])

  // Other Report Filtered Lists
  const visibleMenu = useMemo(
    () => menu.filter((item) => !term || `${item.name} ${item.category}`.toLowerCase().includes(term)),
    [menu, term]
  )
  const visibleCustomers = useMemo(
    () => customers.filter((customer) => !term || `${customer.name} ${customer.email} ${customer.id}`.toLowerCase().includes(term)),
    [customers, term]
  )
  const visibleStaff = useMemo(
    () => staff.filter((person) => !term || `${person.name} ${person.role} ${person.id}`.toLowerCase().includes(term)),
    [staff, term]
  )
  const visibleLoyalty = useMemo(
    () => loyaltyHistory.filter((entry) => !term || (entry.detail || '').toLowerCase().includes(term)),
    [loyaltyHistory, term]
  )

  // Paginations for each report view
  const orderPagination = usePagination(visibleOrders, 10)
  const menuPagination = usePagination(visibleMenu, 10)
  const customerPagination = usePagination(visibleCustomers, 10)
  const staffPagination = usePagination(visibleStaff, 10)
  const loyaltyPagination = usePagination(visibleLoyalty, 10)

  // Helper for Status Badge Styling
  function getBadgeClass(status) {
    const s = (status || '').toLowerCase()
    if (s.includes('complete') || s.includes('paid') || s.includes('present') || s.includes('available')) {
      return 'status-completed'
    }
    if (s.includes('pending') || s.includes('preparing') || s.includes('on break')) {
      return 'status-pending'
    }
    if (s.includes('cancel') || s.includes('refund') || s.includes('failed') || s.includes('offline') || s.includes('unavailable')) {
      return 'status-cancelled'
    }
    return 'status-neutral'
  }

  return (
    <div className="adm-reports-page">
      {/* ── 1. REPORTS HEADER BANNER ──────────────────────────────────────── */}
      <section className="adm-rep-banner">
        {/* Botanical leaf flourishes */}
        <svg className="adm-rep-banner-leaves" viewBox="0 0 240 140" fill="none" aria-hidden="true">
          <path d="M40 130 C30 80 75 35 145 20 C130 65 95 110 40 130 Z" fill="rgba(212, 225, 87, 0.22)" />
          <path d="M100 125 C110 75 160 45 215 50 C190 85 155 115 100 125 Z" fill="rgba(255, 255, 255, 0.16)" />
          <path d="M15 95 C25 60 60 40 100 48 C80 80 50 98 15 95 Z" fill="rgba(212, 225, 87, 0.12)" />
        </svg>

        <div className="adm-rep-banner-left">
          <div className="adm-rep-banner-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className="adm-rep-banner-text">
            <h1>Reports</h1>
            <p>The numbers behind a good day.</p>
          </div>
        </div>
      </section>

      {/* ── 2. REPORT FILTERS TOOLBAR ────────────────────────────────────── */}
      <section className="adm-rep-toolbar">
        {/* Top selector: Report type */}
        <div className="adm-rep-toolbar-top">
          <label className="adm-rep-type-label">
            Report type
            <div className="adm-rep-type-select-wrap">
              <select
                className="adm-rep-type-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <span className="adm-rep-chevron" aria-hidden="true">▼</span>
            </div>
          </label>
        </div>

        {/* Secondary controls row */}
        <div className="adm-rep-toolbar-row">
          {/* Date range filter */}
          <div className="adm-rep-filter-select-wrap">
            <span className="adm-rep-filter-icon" aria-hidden="true">◷</span>
            <select
              className="adm-rep-filter-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Filter by date range"
            >
              <option value="Today">Today</option>
              <option value="This week">This week</option>
              <option value="This month">This month</option>
              <option value="All time">All time</option>
            </select>
            <span className="adm-rep-chevron" aria-hidden="true">▼</span>
          </div>

          {/* Category filter (Sales report) */}
          {reportType === 'Sales report' && (
            <div className="adm-rep-filter-select-wrap">
              <span className="adm-rep-filter-icon" aria-hidden="true">▦</span>
              <select
                className="adm-rep-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="All categories">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="adm-rep-chevron" aria-hidden="true">▼</span>
            </div>
          )}

          {/* Payment filter (Sales report) */}
          {reportType === 'Sales report' && (
            <div className="adm-rep-filter-select-wrap">
              <span className="adm-rep-filter-icon" aria-hidden="true">💳</span>
              <select
                className="adm-rep-filter-select"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                aria-label="Filter by payment method"
              >
                <option value="All payments">All payments</option>
                {['Cash', 'GCash', 'Maya', 'Card', 'QR Payment', 'Other', 'Pending', 'Failed', 'Cancelled', 'Refunded'].map(
                  (method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  )
                )}
              </select>
              <span className="adm-rep-chevron" aria-hidden="true">▼</span>
            </div>
          )}

          {/* Search box */}
          <div className="adm-rep-search-wrap">
            <span className="adm-rep-search-icon" aria-hidden="true">⌕</span>
            <input
              className="adm-rep-search-input"
              placeholder={`Search ${reportType.toLowerCase()}...`}
              value={search}
              maxLength="120"
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="adm-rep-search-clear"
                onClick={() => setSearch('')}
                title="Clear search"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          {/* Print button */}
          <button
            className="adm-rep-print-btn"
            onClick={() => window.print()}
            type="button"
            title="Print this report"
          >
            <span style={{ fontSize: '14px' }}>⎙</span>
            <span>Print report</span>
          </button>
        </div>
      </section>

      {/* ── 3. SUMMARY STAT CARDS ────────────────────────────────────────── */}
      <section className="adm-rep-stats-grid">
        {/* Card 1: Gross Sales */}
        <div className="adm-rep-stat-card card-forest">
          <div className="adm-rep-stat-top">
            <span className="adm-rep-stat-label">GROSS SALES</span>
            <div className="adm-rep-stat-icon-wrap" aria-hidden="true">↗</div>
          </div>
          <div className="adm-rep-stat-value">{money(sales)}</div>
          <div className="adm-rep-stat-subtext">
            <strong>{validOrders.length} valid transactions</strong>
            <span>{dateRange}</span>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="adm-rep-stat-card card-cream">
          <div className="adm-rep-stat-top">
            <span className="adm-rep-stat-label">TRANSACTIONS</span>
            <div className="adm-rep-stat-icon-wrap" aria-hidden="true">🗎</div>
          </div>
          <div className="adm-rep-stat-value">{visibleOrders.length}</div>
          <div className="adm-rep-stat-subtext">
            <strong>{completed} completed</strong>
            <span>{cancelled} cancelled/refunded</span>
          </div>
        </div>

        {/* Card 3: Average Order */}
        <div className="adm-rep-stat-card card-forest">
          <div className="adm-rep-stat-top">
            <span className="adm-rep-stat-label">AVERAGE ORDER</span>
            <div className="adm-rep-stat-icon-wrap" aria-hidden="true">◷</div>
          </div>
          <div className="adm-rep-stat-value">{money(averageOrder)}</div>
          <div className="adm-rep-stat-subtext">
            <strong>Current selection</strong>
            <span>per valid transaction</span>
          </div>
        </div>

        {/* Card 4: Payment Records */}
        <div className="adm-rep-stat-card card-cream">
          <div className="adm-rep-stat-top">
            <span className="adm-rep-stat-label">PAYMENT RECORDS</span>
            <div className="adm-rep-stat-icon-wrap" aria-hidden="true">$</div>
          </div>
          <div className="adm-rep-stat-value">{visibleOrders.length}</div>
          <div className="adm-rep-stat-subtext">
            <strong>{Object.keys(paymentTotals).length || 2} methods used</strong>
            <span>local demo ledger</span>
          </div>
        </div>
      </section>

      {/* ── 4. CONDITIONAL REPORT CONTENT ────────────────────────────────── */}
      {reportType === 'Sales report' && (
        <>
          {/* Middle 2-column: Sales chart & Payment method breakdown */}
          <section className="adm-rep-mid-grid">
            {/* Left Card: Sales report chart */}
            <article className="adm-rep-panel">
              <div className="adm-rep-panel-header">
                <div className="adm-rep-panel-title-wrap">
                  <span className="adm-rep-panel-icon" aria-hidden="true">📊</span>
                  <div>
                    <h2>Sales report</h2>
                    <p>Revenue performance · current local orders</p>
                  </div>
                </div>
                <span className="adm-rep-panel-total">{money(sales)}</span>
              </div>

              {/* Bar Chart Visualization */}
              <div className="adm-rep-chart-container">
                <div className="adm-rep-chart-y-axis">
                  <span>₱20k</span>
                  <span>₱15k</span>
                  <span>₱10k</span>
                  <span>₱5k</span>
                  <span>₱0</span>
                </div>
                <div className="adm-rep-chart-body">
                  <div className="adm-rep-chart-gridlines">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="adm-rep-chart-bars">
                    {chartHeights.map((height, index) => {
                      const isHighlight = index === 5 // Monday highlight matching reference
                      return (
                        <div className="adm-rep-chart-col" key={daysOfWeek[index]}>
                          <div
                            className={`adm-rep-chart-bar${isHighlight ? ' highlight' : ''}`}
                            style={{ height: `${height}%` }}
                            title={`${daysOfWeek[index]}: ${height}%`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="adm-rep-chart-x-labels">
                    {daysOfWeek.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* Right Card: Sales by payment method */}
            <article className="adm-rep-panel">
              <div className="adm-rep-panel-header">
                <div className="adm-rep-panel-title-wrap">
                  <span className="adm-rep-panel-icon" aria-hidden="true">💳</span>
                  <div>
                    <h2>Sales by payment method</h2>
                    <p>Paid payment records · {money(paymentTotal || sales)}</p>
                  </div>
                </div>
              </div>

              <div className="adm-rep-payment-list">
                {Object.keys(paymentTotals).length > 0 ? (
                  Object.entries(paymentTotals).map(([method, amount]) => {
                    const pct = paymentTotal ? Math.round((amount / paymentTotal) * 100) : 0
                    return (
                      <div className="adm-rep-payment-row" key={method}>
                        <span className="adm-rep-payment-label">{method}</span>
                        <div className="adm-rep-payment-track">
                          <div
                            className="adm-rep-payment-fill"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                        <span className="adm-rep-payment-pct">{pct}%</span>
                      </div>
                    )
                  })
                ) : (
                  // Baseline demo mix fallback if no specific paid ledger item
                  <>
                    <div className="adm-rep-payment-row">
                      <span className="adm-rep-payment-label">Cash</span>
                      <div className="adm-rep-payment-track">
                        <div className="adm-rep-payment-fill" style={{ width: '31%' }} />
                      </div>
                      <span className="adm-rep-payment-pct">31%</span>
                    </div>
                    <div className="adm-rep-payment-row">
                      <span className="adm-rep-payment-label">GCash</span>
                      <div className="adm-rep-payment-track">
                        <div className="adm-rep-payment-fill" style={{ width: '69%' }} />
                      </div>
                      <span className="adm-rep-payment-pct">69%</span>
                    </div>
                  </>
                )}
              </div>
            </article>
          </section>

          {/* Bottom Card: Transactions Table */}
          <section className="adm-rep-table-panel">
            <div className="adm-rep-table-panel-header">
              <div className="adm-rep-panel-title-wrap">
                <span className="adm-rep-panel-icon" aria-hidden="true">📋</span>
                <div>
                  <h2>Transactions</h2>
                  <p>Completed, cancelled, and pending activity</p>
                </div>
              </div>
              <button
                className="adm-rep-print-list-btn"
                onClick={() => window.print()}
                type="button"
                title="Print transaction list"
              >
                <span>Print list</span>
                <span style={{ fontSize: '11px' }}>▼</span>
              </button>
            </div>

            <div className="adm-rep-table-wrap">
              <table className="adm-rep-table">
                <thead>
                  <tr>
                    <th>ORDER</th>
                    <th>CUSTOMER</th>
                    <th>ITEMS</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {orderPagination.paginatedItems.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="adm-rep-order-chip">{order.id}</span>
                      </td>
                      <td className="adm-rep-customer-cell">{order.customer || 'Guest Customer'}</td>
                      <td className="adm-rep-items-cell" title={order.items}>{order.items}</td>
                      <td className="adm-rep-total-cell">{money(order.total)}</td>
                      <td>
                        <span className={`adm-rep-badge ${getBadgeClass(order.status)}`}>
                          <i />
                          {order.status}
                        </span>
                      </td>
                      <td className="adm-rep-time-cell">{order.time || 'Just now'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orderPagination.paginatedItems.length === 0 && (
                <div className="adm-rep-empty-state">
                  No transaction records match your filters.
                </div>
              )}
            </div>

            <Pagination {...orderPagination} />
          </section>
        </>
      )}

      {/* ── 5. ORDER REPORT ──────────────────────────────────────────────── */}
      {reportType === 'Order report' && (
        <section className="adm-rep-table-panel">
          <div className="adm-rep-table-panel-header">
            <div className="adm-rep-panel-title-wrap">
              <span className="adm-rep-panel-icon" aria-hidden="true">📦</span>
              <div>
                <h2>Order Activity Report</h2>
                <p>Comprehensive order log and customer fulfillments</p>
              </div>
            </div>
          </div>
          <div className="adm-rep-table-wrap">
            <table className="adm-rep-table">
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>CUSTOMER</th>
                  <th>ITEMS</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th>PAYMENT</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {orderPagination.paginatedItems.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="adm-rep-order-chip">{order.id}</span>
                    </td>
                    <td className="adm-rep-customer-cell">{order.customer}</td>
                    <td className="adm-rep-items-cell" title={order.items}>{order.items}</td>
                    <td className="adm-rep-total-cell">{money(order.total)}</td>
                    <td>
                      <span className={`adm-rep-badge ${getBadgeClass(order.status)}`}>
                        <i />
                        {order.status}
                      </span>
                    </td>
                    <td>{order.paymentMethod || order.payment || 'Cash'}</td>
                    <td className="adm-rep-time-cell">{order.time || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orderPagination.paginatedItems.length === 0 && (
              <div className="adm-rep-empty-state">No order records found.</div>
            )}
          </div>
          <Pagination {...orderPagination} />
        </section>
      )}

      {/* ── 6. MENU REPORT ───────────────────────────────────────────────── */}
      {reportType === 'Menu report' && (
        <section className="adm-rep-table-panel">
          <div className="adm-rep-table-panel-header">
            <div className="adm-rep-panel-title-wrap">
              <span className="adm-rep-panel-icon" aria-hidden="true">🍽️</span>
              <div>
                <h2>Product Performance</h2>
                <p>Menu availability and sold quantity from linked orders · {dateRange.toLowerCase()}</p>
              </div>
            </div>
          </div>
          <div className="adm-rep-table-wrap">
            <table className="adm-rep-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>QTY SOLD</th>
                  <th>AVAILABILITY</th>
                </tr>
              </thead>
              <tbody>
                {menuPagination.paginatedItems.map((item) => {
                  const sold = visibleOrders
                    .flatMap((order) => order.products || [])
                    .filter((line) => line.id === item.id)
                    .reduce((sum, line) => sum + line.quantity, 0)
                  return (
                    <tr key={item.id}>
                      <td className="adm-rep-customer-cell">
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.category}</td>
                      <td className="adm-rep-total-cell">{money(item.price)}</td>
                      <td>{sold}</td>
                      <td>
                        <span className={`adm-rep-badge ${item.available ? 'status-completed' : 'status-cancelled'}`}>
                          <i />
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {menuPagination.paginatedItems.length === 0 && (
              <div className="adm-rep-empty-state">No menu items match your search.</div>
            )}
          </div>
          <Pagination {...menuPagination} />
        </section>
      )}

      {/* ── 7. CUSTOMER REPORT ───────────────────────────────────────────── */}
      {reportType === 'Customer report' && (
        <section className="adm-rep-table-panel">
          <div className="adm-rep-table-panel-header">
            <div className="adm-rep-panel-title-wrap">
              <span className="adm-rep-panel-icon" aria-hidden="true">👥</span>
              <div>
                <h2>Customer Summary</h2>
                <p>Orders, lifetime spend, and loyalty points</p>
              </div>
            </div>
          </div>
          <div className="adm-rep-table-wrap">
            <table className="adm-rep-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>EMAIL</th>
                  <th>ORDERS</th>
                  <th>SPEND</th>
                  <th>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {customerPagination.paginatedItems.map((customer) => (
                  <tr key={customer.id}>
                    <td className="adm-rep-customer-cell">
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.orders}</td>
                    <td className="adm-rep-total-cell">{money(customer.spend)}</td>
                    <td>
                      <span className="adm-rep-order-chip">{customer.points} pts</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customerPagination.paginatedItems.length === 0 && (
              <div className="adm-rep-empty-state">No customer records match your search.</div>
            )}
          </div>
          <Pagination {...customerPagination} />
        </section>
      )}

      {/* ── 8. STAFF ATTENDANCE REPORT ────────────────────────────────────── */}
      {reportType === 'Staff attendance' && (
        <section className="adm-rep-table-panel">
          <div className="adm-rep-table-panel-header">
            <div className="adm-rep-panel-title-wrap">
              <span className="adm-rep-panel-icon" aria-hidden="true">⏱️</span>
              <div>
                <h2>Attendance Report</h2>
                <p>Staff status and recorded time-in values</p>
              </div>
            </div>
          </div>
          <div className="adm-rep-table-wrap">
            <table className="adm-rep-table">
              <thead>
                <tr>
                  <th>STAFF MEMBER</th>
                  <th>ID</th>
                  <th>POSITION</th>
                  <th>TIME IN</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {staffPagination.paginatedItems.map((person) => (
                  <tr key={person.id}>
                    <td className="adm-rep-customer-cell">
                      <strong>{person.name}</strong>
                    </td>
                    <td>
                      <span className="adm-rep-order-chip">{person.id}</span>
                    </td>
                    <td>{person.role}</td>
                    <td className="adm-rep-time-cell">{person.time || '—'}</td>
                    <td>
                      <span className={`adm-rep-badge ${getBadgeClass(person.status)}`}>
                        <i />
                        {person.status || 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {staffPagination.paginatedItems.length === 0 && (
              <div className="adm-rep-empty-state">No staff attendance records match your search.</div>
            )}
          </div>
          <Pagination {...staffPagination} />
        </section>
      )}

      {/* ── 9. LOYALTY REPORT ────────────────────────────────────────────── */}
      {reportType === 'Loyalty report' && (
        <section className="adm-rep-table-panel">
          <div className="adm-rep-table-panel-header">
            <div className="adm-rep-panel-title-wrap">
              <span className="adm-rep-panel-icon" aria-hidden="true">🎁</span>
              <div>
                <h2>Loyalty Activity</h2>
                <p>Point awards and redemptions</p>
              </div>
            </div>
          </div>
          <div className="adm-rep-table-wrap">
            <table className="adm-rep-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>ACTIVITY</th>
                  <th>POINTS</th>
                  <th>TYPE</th>
                </tr>
              </thead>
              <tbody>
                {loyaltyPagination.paginatedItems.map((entry) => {
                  const isEarned = (entry.delta || 0) >= 0
                  return (
                    <tr key={entry.id}>
                      <td className="adm-rep-time-cell">{entry.date}</td>
                      <td className="adm-rep-customer-cell">{entry.detail}</td>
                      <td className="adm-rep-total-cell">{Math.abs(entry.delta)} pts</td>
                      <td>
                        <span className={`adm-rep-badge ${isEarned ? 'status-completed' : 'status-pending'}`}>
                          <i />
                          {isEarned ? 'Earned' : 'Redeemed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loyaltyPagination.paginatedItems.length === 0 && (
              <div className="adm-rep-empty-state">No loyalty records match your search.</div>
            )}
          </div>
          <Pagination {...loyaltyPagination} />
        </section>
      )}
    </div>
  )
}
