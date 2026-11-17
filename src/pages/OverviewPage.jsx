import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { FoodThumb, Legend } from '../components/shared'
import { money, statusClass } from '../data/mockData'

// Smooth cubic bezier SVG path generator for the Sales Overview area/line chart
function buildSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cpx1 = p0.x + (p1.x - p0.x) * 0.42
    const cpy1 = p0.y
    const cpx2 = p1.x - (p1.x - p0.x) * 0.42
    const cpy2 = p1.y
    path += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
  }
  return path
}

function AdminSalesOverviewChart({ period }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const weeklySeries = [
    { day: 'Mon', pct: 38, label: '₱7,600' },
    { day: 'Tue', pct: 60, label: '₱12,000' },
    { day: 'Wed', pct: 74, label: '₱14,800' },
    { day: 'Thu', pct: 55, label: '₱11,000' },
    { day: 'Fri', pct: 41, label: '₱8,200' },
    { day: 'Sat', pct: 64, label: '₱12,800' },
    { day: 'Sun', pct: 90, label: '₱18,000' },
  ]

  const monthlySeries = [
    { day: 'Mon', pct: 36, label: '₱7,200' },
    { day: 'Tue', pct: 58, label: '₱11,600' },
    { day: 'Wed', pct: 72, label: '₱14,400' },
    { day: 'Thu', pct: 54, label: '₱10,800' },
    { day: 'Fri', pct: 40, label: '₱8,000' },
    { day: 'Sat', pct: 62, label: '₱12,400' },
    { day: 'Sun', pct: 88, label: '₱17,600' },
  ]

  const series = period === 'This week' ? weeklySeries : monthlySeries

  const width = 620
  const height = 190
  const padLeft = 18
  const padRight = 22
  const padTop = 18
  const padBottom = 16
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const coords = series.map((item, idx) => {
    const x = padLeft + (idx / (series.length - 1)) * plotW
    const y = padTop + plotH - (item.pct / 100) * plotH
    return { ...item, x, y }
  })

  const linePath = buildSmoothPath(coords)
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`

  return (
    <div className="adm-chart-wrap">
      <div className="adm-chart-y" aria-hidden="true">
        <span>₱20k</span>
        <span>₱15k</span>
        <span>₱10k</span>
        <span>₱5k</span>
        <span>₱0</span>
      </div>
      <div className="adm-chart-stage">
        <svg
          className="adm-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Sales overview chart"
        >
          <defs>
            <linearGradient id="admSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9AB86C" stopOpacity="0.62" />
              <stop offset="55%" stopColor="#D4E157" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F9F9F6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
            const gy = padTop + step * plotH
            return (
              <line
                key={idx}
                x1={padLeft}
                y1={gy}
                x2={width - padRight}
                y2={gy}
                stroke="#E5E8DC"
                strokeWidth="1"
              />
            )
          })}

          {/* Vertical subtle guide lines */}
          {coords.map((pt, idx) => (
            <line
              key={pt.day}
              x1={pt.x}
              y1={pt.y}
              x2={pt.x}
              y2={padTop + plotH}
              stroke="#DCE3CE"
              strokeWidth="1"
              strokeDasharray={idx === coords.length - 1 ? 'none' : '2 2'}
              opacity="0.7"
            />
          ))}

          {/* Area fill under curve */}
          <path d={areaPath} fill="url(#admSalesAreaGrad)" />

          {/* Smooth Forest Green curve */}
          <path
            d={linePath}
            fill="none"
            stroke="#1B3B2B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data nodes */}
          {coords.map((pt, idx) => {
            const isLast = idx === coords.length - 1
            const isHovered = hoveredIdx === idx
            return (
              <g
                key={pt.day}
                className="adm-chart-node"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {(isLast || isHovered) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isLast ? 8 : 7}
                    fill="#D4E157"
                    stroke="#1B3B2B"
                    strokeWidth="2.5"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? 4 : 4.8}
                  fill={isLast ? '#F9F9F6' : '#E5EFA6'}
                  stroke="#1B3B2B"
                  strokeWidth="2.4"
                />
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredIdx !== null && coords[hoveredIdx] && (
          <div
            className="adm-chart-tooltip"
            style={{
              left: `${((coords[hoveredIdx].x - padLeft) / plotW) * 100}%`,
            }}
          >
            <strong>{coords[hoveredIdx].day}</strong>
            <span>{coords[hoveredIdx].label}</span>
          </div>
        )}

        {/* X-axis day labels */}
        <div className="adm-chart-x">
          {coords.map((pt) => (
            <span key={pt.day}>{pt.day}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const { orders, menu, staff, points, customers, profile, navigate, setDialog } = useApp()
  const [salesPeriod, setSalesPeriod] = useState('This month')

  const sales = orders
    .filter((order) => !['Cancelled', 'Refunded'].includes(order.payment))
    .reduce((sum, order) => sum + order.total, 0)
  const completed = orders.filter((order) => order.status === 'Completed').length
  const pending = orders.filter((order) => ['Pending', 'Confirmed', 'Preparing'].includes(order.status)).length
  const staffPresent = staff.filter((person) => person.status === 'Present').length
  const totalCustomerPoints = customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0) || points

  const channelCounts = {
    inStore: orders.filter((order) => order.type === 'Dine in').length,
    online: orders.filter((order) => ['Online', 'Pickup', 'Takeout'].includes(order.type)).length,
  }
  const channelTotal = Math.max(orders.length, 1)
  const inStorePercent = Math.round((channelCounts.inStore / channelTotal) * 100)
  const onlinePercent = Math.round((channelCounts.online / channelTotal) * 100)

  const itemSales = orders
    .flatMap((order) => order.products || [])
    .reduce((counts, line) => ({ ...counts, [line.id]: (counts[line.id] || 0) + line.quantity }), {})

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Maureen'

  // Helper to get a dish thumbnail item for an order row
  function getOrderDishItem(order) {
    const firstProdId = order.products?.[0]?.id
    if (firstProdId) {
      const found = menu.find((m) => Number(m.id) === Number(firstProdId))
      if (found) return found
    }
    return menu[0] || { name: order.items || 'Order', category: 'Silog Meals', tone: 'moss' }
  }

  // Count total items in an order
  function getOrderItemCount(order) {
    if (Array.isArray(order.products) && order.products.length > 0) {
      return order.products.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0)
    }
    if (typeof order.items === 'string' && order.items.trim()) {
      return order.items.split(',').length
    }
    return 1
  }

  return (
    <div className="adm-dashboard">
      {/* ══════════════ 1. WELCOME BANNER ══════════════ */}
      <section className="adm-welcome-banner" aria-label="Welcome banner">
        {/* Decorative organic wave layers */}
        <svg className="adm-banner-waves" viewBox="0 0 900 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 130 Q220 90 440 125 T900 105 L900 160 L0 160 Z" fill="#A3B18A" fillOpacity="0.22" />
          <path d="M180 145 Q420 95 660 135 T900 115 L900 160 L180 160 Z" fill="#D4E157" fillOpacity="0.26" />
        </svg>

        <div className="adm-welcome-copy">
          <h1>
            Welcome back, <span className="adm-welcome-highlight">Admin!</span>
          </h1>
          <p>Here&apos;s what&apos;s happening with rmjohns today.</p>
        </div>

        <div className="adm-welcome-tagline" aria-hidden="true">
          <span>Eat &bull; Relax &bull; Enjoy</span>
          <svg viewBox="0 0 180 18" fill="none">
            <path d="M10 14 Q90 2 170 12" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <div className="adm-welcome-visual">
          <img
            src="/admin-banner-dish.jpg"
            alt="Signature pasta dish at rmjohns Kitchen & Bar"
            className="adm-welcome-dish-img"
          />
          <button
            type="button"
            className="adm-banner-export-btn"
            onClick={() => navigate('Reports')}
            title="Export sales & operations report"
          >
            ↧ Export Report
          </button>
        </div>
      </section>

      {/* ══════════════ 2. HERO STATISTIC CARDS ══════════════ */}
      <section className="adm-stats-row" aria-label="Key business metrics">
        {/* Card 1: Total Sales (Forest Green) */}
        <article className="adm-stat-card adm-stat-forest" onClick={() => navigate('Sales')} role="button" tabIndex={0}>
          <svg className="adm-stat-wave" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 32 Q75 8 150 36 T260 22 L260 60 L0 60 Z" fill="#A3B18A" fillOpacity="0.32" />
            <path d="M0 44 Q95 22 180 44 T260 34 L260 60 L0 60 Z" fill="#D4E157" fillOpacity="0.38" />
          </svg>
          <div className="adm-stat-icon-wrap adm-icon-lime" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="20" r="1.8" fill="currentColor" />
              <circle cx="18" cy="20" r="1.8" fill="currentColor" />
              <path d="M2 3h3l2.4 11.5a1.6 1.6 0 0 0 1.6 1.3h9.8a1.6 1.6 0 0 0 1.5-1.2L22 6H6" />
            </svg>
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value">{money(sales)}</div>
            <div className="adm-stat-label">Total Sales</div>
            <div className="adm-stat-trend">
              <span className="adm-trend-arrow">↑</span>
              <span>{orders.length} transactions</span>
            </div>
          </div>
        </article>

        {/* Card 2: Total Orders (Cream / Lime) */}
        <article className="adm-stat-card adm-stat-cream" onClick={() => navigate('Orders')} role="button" tabIndex={0}>
          <svg className="adm-stat-wave" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 36 Q80 14 160 38 T260 24 L260 60 L0 60 Z" fill="#D4E157" fillOpacity="0.35" />
            <path d="M0 46 Q100 28 190 46 T260 36 L260 60 L0 60 Z" fill="#A3B18A" fillOpacity="0.28" />
          </svg>
          <div className="adm-stat-icon-wrap adm-icon-forest" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v9a2 2 0 0 1-2 2v9H3v-9a2 2 0 0 1-2-2V2h2v7h1V2h2v7h1V2h2Zm10 0c2.21 0 4 2.24 4 5 0 2.25-1.2 4.15-2.85 4.78L18 22h-2.5l-.15-10.22C13.7 11.15 12.5 9.25 12.5 7c0-2.76 1.79-5 4-5Z" />
            </svg>
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value">{orders.length}</div>
            <div className="adm-stat-label">Total Orders</div>
            <div className="adm-stat-trend">
              <span className="adm-trend-arrow">↑</span>
              <span>{completed} completed &bull; {pending} pending</span>
            </div>
          </div>
        </article>

        {/* Card 3: Total Customers (Forest Green) */}
        <article className="adm-stat-card adm-stat-forest" onClick={() => navigate('Customers')} role="button" tabIndex={0}>
          <svg className="adm-stat-wave" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 32 Q75 8 150 36 T260 22 L260 60 L0 60 Z" fill="#A3B18A" fillOpacity="0.32" />
            <path d="M0 44 Q95 22 180 44 T260 34 L260 60 L0 60 Z" fill="#D4E157" fillOpacity="0.38" />
          </svg>
          <div className="adm-stat-icon-wrap adm-icon-lime" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="7.5" r="3.5" />
              <circle cx="5.5" cy="9.5" r="2.5" opacity="0.8" />
              <circle cx="18.5" cy="9.5" r="2.5" opacity="0.8" />
              <path d="M5.5 19.5c0-3.1 2.9-5.5 6.5-5.5s6.5 2.4 6.5 5.5H5.5Z" />
              <path d="M1 19.5c0-2.2 1.8-4 4.2-4.3-.7.9-1.1 2-1.1 3.3v1H1Zm22 0h-3.1v-1c0-1.3-.4-2.4-1.1-3.3 2.4.3 4.2 2.1 4.2 4.3Z" opacity="0.75" />
            </svg>
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value">{customers.length}</div>
            <div className="adm-stat-label">Total Customers</div>
            <div className="adm-stat-trend">
              <span className="adm-trend-arrow">↑</span>
              <span>{staffPresent} staff on shift</span>
            </div>
          </div>
        </article>

        {/* Card 4: Loyalty Points (Cream / Lime + Botanical Accent) */}
        <article className="adm-stat-card adm-stat-cream adm-stat-loyalty" onClick={() => navigate('Loyalty')} role="button" tabIndex={0}>
          <svg className="adm-stat-wave" viewBox="0 0 260 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 36 Q80 14 160 38 T260 24 L260 60 L0 60 Z" fill="#D4E157" fillOpacity="0.35" />
            <path d="M0 46 Q100 28 190 46 T260 36 L260 60 L0 60 Z" fill="#A3B18A" fillOpacity="0.28" />
          </svg>
          <div className="adm-stat-icon-wrap adm-icon-star-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m12 2.2 2.95 6.1 6.73.95-4.88 4.72 1.16 6.7L12 17.48l-5.96 3.19 1.16-6.7L2.32 9.25l6.73-.95L12 2.2Z" />
            </svg>
          </div>
          <div className="adm-stat-body">
            <div className="adm-stat-value">{totalCustomerPoints.toLocaleString('en-PH')}</div>
            <div className="adm-stat-label">Loyalty Points</div>
            <div className="adm-stat-trend">
              <span className="adm-trend-arrow">↑</span>
              <span>{customers.length} active members</span>
            </div>
          </div>
          {/* Botanical leaves on the right side matching reference image */}
          <svg className="adm-loyalty-leaves" viewBox="0 0 90 120" fill="none" aria-hidden="true">
            <path d="M85 115 C68 85 52 52 45 12" stroke="#2D5A3C" strokeWidth="2" strokeLinecap="round" />
            <path d="M52 28 C34 22 20 28 14 42 C28 44 42 38 52 28 Z" fill="#4E7A52" fillOpacity="0.82" />
            <path d="M62 56 C40 50 24 58 18 72 C34 74 48 68 62 56 Z" fill="#6F9969" fillOpacity="0.82" />
            <path d="M72 84 C50 80 34 88 28 102 C44 104 58 96 72 84 Z" fill="#8FB07C" fillOpacity="0.78" />
            <path d="M56 20 C68 8 82 8 88 18 C78 26 66 26 56 20 Z" fill="#3C6843" fillOpacity="0.85" />
          </svg>
        </article>
      </section>

      {/* ══════════════ 3. MAIN 2-COLUMN DASHBOARD GRID ══════════════ */}
      <section className="adm-main-grid">
        {/* ── LEFT COLUMN: Sales Overview + Recent Orders ── */}
        <div className="adm-col-left">
          {/* Sales Overview Card */}
          <article className="adm-card adm-sales-card">
            <div className="adm-card-head">
              <div className="adm-card-title-group">
                <span className="adm-section-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1B3B2B">
                    <rect x="3" y="12" width="4" height="9" rx="1" />
                    <rect x="10" y="5" width="4" height="16" rx="1" />
                    <rect x="17" y="9" width="4" height="12" rx="1" />
                  </svg>
                </span>
                <h2>Sales Overview</h2>
              </div>
              <select
                className="adm-period-select"
                value={salesPeriod}
                onChange={(e) => setSalesPeriod(e.target.value)}
                aria-label="Select sales overview period"
              >
                <option value="This month">This Month</option>
                <option value="This week">This Week</option>
              </select>
            </div>
            <AdminSalesOverviewChart period={salesPeriod} />
          </article>

          {/* Recent Orders Card */}
          <article className="adm-card adm-orders-card">
            <div className="adm-card-head">
              <div className="adm-card-title-group">
                <span className="adm-section-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B3B2B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <polyline points="3 3 3 8 8 8" />
                    <polyline points="12 7 12 12 15 14" />
                  </svg>
                </span>
                <h2>Recent Orders</h2>
              </div>
              <button
                type="button"
                className="adm-view-all-btn"
                onClick={() => navigate('Orders')}
              >
                View All <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="adm-table-wrap">
              <table className="adm-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 4).map((order) => {
                    const dishItem = getOrderDishItem(order)
                    const itemCount = getOrderItemCount(order)
                    const cleanId = String(order.id).startsWith('#') ? order.id : `#${order.id}`
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setDialog({ type: 'receipt-order', order })}
                        title="Click to inspect order receipt"
                      >
                        <td className="adm-td-order-id">
                          <strong>{cleanId}</strong>
                        </td>
                        <td>
                          <div className="adm-customer-cell">
                            <span className="adm-order-dish-avatar">
                              <FoodThumb item={dishItem} small />
                            </span>
                            <span className="adm-customer-name">{order.customer}</span>
                          </div>
                        </td>
                        <td className="adm-td-items" title={order.items}>
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </td>
                        <td className="adm-td-total">
                          <strong>{money(order.total)}</strong>
                        </td>
                        <td>
                          <span className={`adm-status-pill ${statusClass(order.status)}`}>
                            {order.status === 'Ready' ? 'Ready for Pick-up' : order.status}
                          </span>
                        </td>
                        <td className="adm-td-time">{order.time}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="empty-state">No orders match this view.</div>
              )}
            </div>
          </article>
        </div>

        {/* ── RIGHT COLUMN: Quick Actions + Taste the Difference ── */}
        <div className="adm-col-right">
          {/* Quick Actions Card */}
          <article className="adm-quick-card">
            <div className="adm-quick-header">
              <span className="adm-bolt-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#D4E157">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <h2>Quick Actions</h2>
            </div>
            <div className="adm-quick-grid">
              <button
                type="button"
                className="adm-quick-btn"
                onClick={() => setDialog({ type: 'add', entity: 'menu' })}
              >
                <span className="adm-quick-btn-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1B3B2B">
                    <path d="M12 4a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2Zm-9 11a9 9 0 0 1 18 0H3Zm-1 2h20v2H2v-2Z" />
                  </svg>
                </span>
                <strong>Add Menu</strong>
              </button>

              <button
                type="button"
                className="adm-quick-btn"
                onClick={() => navigate('POS')}
              >
                <span className="adm-quick-btn-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1B3B2B">
                    <circle cx="9" cy="20" r="1.8" />
                    <circle cx="18" cy="20" r="1.8" />
                    <path d="M2 3h3.2l2.2 11h10.8l2-8H6.2" stroke="#1B3B2B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M7.5 14h10.5l1.6-6.5H6.2" fill="#1B3B2B" />
                  </svg>
                </span>
                <strong>New Order</strong>
              </button>

              <button
                type="button"
                className="adm-quick-btn"
                onClick={() => navigate('Reports')}
              >
                <span className="adm-quick-btn-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#1B3B2B">
                    <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6Zm7 1.5L18.5 9H13V3.5ZM8 17v-4h2v4H8Zm3 0v-6h2v6h-2Zm3 0v-2.5h2V17h-2Z" />
                  </svg>
                </span>
                <strong>View Reports</strong>
              </button>

              <button
                type="button"
                className="adm-quick-btn"
                onClick={() => navigate('Settings')}
              >
                <span className="adm-quick-btn-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B3B2B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3.2" fill="#1B3B2B" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                </span>
                <strong>Settings</strong>
              </button>
            </div>
          </article>

          {/* Taste the Difference Promo / Menu Card */}
          <article className="adm-taste-card">
            <div className="adm-taste-copy">
              <h3>
                Taste the
                <br />
                Difference
              </h3>
              <p>Only at rmjohns</p>
              <button
                type="button"
                className="adm-taste-btn"
                onClick={() => navigate('Menu')}
              >
                View Menu <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="adm-taste-visual">
              <img
                src="/admin-promo-dish.jpg"
                alt="Featured dish at rmjohns Kitchen & Bar"
                className="adm-taste-img"
              />
            </div>
          </article>
        </div>
      </section>

      {/* ══════════════ 4. SECONDARY INSIGHTS ROW (Preserves Order Channels & Guest Favorites) ══════════════ */}
      <section className="adm-insights-grid">
        {/* Order Channels Panel */}
        <article className="adm-card adm-channels-card">
          <div className="adm-card-head">
            <div>
              <h2>Order Channels</h2>
              <p className="adm-card-sub">How guests are ordering ({pending} pending &bull; {completed} completed)</p>
            </div>
            <button type="button" className="adm-view-all-btn" onClick={() => navigate('Reports')}>
              Details <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="donut-wrap">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#1B3B2B 0 ${inStorePercent}%, #D4E157 ${inStorePercent}% 100%)`,
              }}
            >
              <div>
                <strong>{orders.length}</strong>
                <small>orders</small>
              </div>
            </div>
            <div className="legend">
              <Legend color="green" label="In-store" value={`${inStorePercent}%`} />
              <Legend color="gold" label="Online / Pickup" value={`${onlinePercent}%`} />
            </div>
          </div>
        </article>

        {/* Guest Favorites Panel */}
        <article className="adm-card adm-favorites-card">
          <div className="adm-card-head">
            <div>
              <h2>Guest Favorites</h2>
              <p className="adm-card-sub">Top picks from linked orders</p>
            </div>
            <button type="button" className="adm-view-all-btn" onClick={() => navigate('Menu')}>
              Menu <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="popular-list">
            {[...menu]
              .sort((a, b) => (itemSales[b.id] || 0) - (itemSales[a.id] || 0))
              .slice(0, 4)
              .map((item, index) => (
                <div className="popular-row" key={item.id}>
                  <span className="rank">0{index + 1}</span>
                  <FoodThumb item={item} small />
                  <span className="popular-name">
                    <strong>{item.name}</strong>
                    <small>{item.category}</small>
                  </span>
                  <span className="popular-sales">{itemSales[item.id] || 0} sold</span>
                </div>
              ))}
          </div>
          <div className="loyalty-note adm-loyalty-note" onClick={() => navigate('Loyalty')} role="button" tabIndex={0}>
            <span>✳</span>
            <div>
              <strong>{points} points</strong>
              <small>Active loyalty program &bull; {customers.length} registered members</small>
            </div>
            <span className="note-arrow">↗</span>
          </div>
        </article>
      </section>
    </div>
  )
}
