import { useMemo, useState } from 'react'
import { money, statusClass } from '../data/mockData'

// ── Category SVG icons — no emoji, purely SVG paths ──────────────────────────
// Each icon is a minimal 24×24 SVG line-art illustration appropriate for food.
const categoryIcons = {
  'Silog Meals': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="8" ry="4" />
      <path d="M4 14v2c0 2.21 3.58 4 8 4s8-1.79 8-4v-2" />
      <circle cx="12" cy="8" r="3" />
      <path d="M9 8c0-1.66 1.34-3 3-3" />
    </svg>
  ),
  'Solo Orders': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v18M18 3v18" />
      <path d="M6 9c0 2.5 4 4.5 6 4.5s6-2 6-4.5" />
      <path d="M6 9V3M18 9V3" />
    </svg>
  ),
  'Ulam + Kanin': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11h18" />
      <path d="M5 11V7a7 7 0 0 1 14 0v4" />
      <path d="M3 11c0 4.97 4.03 9 9 9s9-4.03 9-9" />
    </svg>
  ),
  'Extras': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="7" ry="3" />
      <path d="M5 16V9a7 7 0 0 1 14 0v7" />
      <path d="M9 9h6M9 12h6" />
    </svg>
  ),
  'Cold Drinks': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10l-1 14H8L7 3Z" />
      <path d="M7 8h10" />
      <path d="M5 3h14" />
      <path d="M10 21h4M12 17v4" />
    </svg>
  ),
  'Hot Drinks': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 18H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16v5a2 2 0 0 1-2 2H6Z" />
      <path d="M6 13V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9" />
      <path d="M9 6c0 1 1 2 1 3s-1 2-1 3M13 6c0 1 1 2 1 3s-1 2-1 3" />
    </svg>
  ),
  'Desserts': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 4 2.5 5.9 3 8h10c.5-2.1 3-4 3-8 0-4.42-3.58-8-8-8Z" />
      <path d="M9 22h6" />
      <path d="M8 18h8" />
    </svg>
  ),
  'Mains': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12c0-2.21 1.79-4 4-4" />
      <path d="M12 8v1M16 12h-1M12 16v-1M8 12h1" />
    </svg>
  ),
  'Breakfast': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="14" r="7" />
      <circle cx="12" cy="14" r="3" />
      <path d="M12 3v4M8.5 4.5 11 7M15.5 4.5 13 7" />
    </svg>
  ),
  'Salads': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 2.69 1.52 5.03 3.75 6.25L10 20h4l1.25-4.75A7 7 0 0 0 12 2Z" />
      <path d="M9 9c0-1.66 1.34-3 3-3" />
      <path d="M9 20h6" />
    </svg>
  ),
  'Drinks': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10l-1 14H8L7 3Z" />
      <path d="M7 8h10M5 3h14" />
      <path d="M10 21h4M12 17v4" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" />
      <path d="M12 8v1M16 12h-1" />
    </svg>
  ),
}

// eslint-disable-next-line react-refresh/only-export-components
export function getCategoryIcon(category) {
  return categoryIcons[category] || categoryIcons.default
}

export function FoodThumb({ item, small = false }) {
  // If the item has a real photo, use it at any size
  if (item.image) {
    return (
      <div
        className={`food-thumb food-thumb-photo ${item.tone} ${small ? 'small' : ''}`}
        aria-hidden="true"
      >
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Photo failed — swap to SVG fallback
            const wrapper = e.currentTarget.parentElement
            wrapper.classList.remove('food-thumb-photo')
            wrapper.classList.add('food-thumb-icon')
            e.currentTarget.style.display = 'none'
            const fallback = wrapper.querySelector('.food-thumb-svg-fallback')
            if (fallback) fallback.style.display = 'grid'
          }}
        />
        {/* SVG fallback — hidden until image fails */}
        <div className="food-thumb-svg-fallback" style={{ display: 'none' }}>
          {getCategoryIcon(item.category)}
        </div>
      </div>
    )
  }
  // No photo — SVG icon on toned background
  return (
    <div className={`food-thumb food-thumb-icon ${item.tone} ${small ? 'small' : ''}`} aria-hidden="true">
      {getCategoryIcon(item.category)}
    </div>
  )
}

export function FoodCard({ item, onAdd, onDetails }) {
  return (
    <article className="food-card">
      <FoodThumb item={item} />
      <div className="food-card-copy">
        <span className="food-category">{item.category}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="food-card-bottom">
          <button className="text-button" onClick={onDetails}>Details</button>
          <strong>{money(item.price)}</strong>
          <button className="add-button" onClick={onAdd} aria-label={`Add ${item.name} to cart`}>
            <span>＋</span> Add to Cart
          </button>
        </div>
      </div>
    </article>
  )
}

export function StatCard({ label, value, trend, detail, tone, icon }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-meta"><strong className={tone === 'amber' ? 'muted-trend' : ''}>{trend}</strong><span>{detail}</span></div></article>
}

export function SalesChart() {
  const data = [38, 57, 46, 72, 61, 88, 66]
  const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']
  return <div className="chart-area"><div className="chart-y"><span>₱20k</span><span>₱15k</span><span>₱10k</span><span>₱5k</span><span>₱0</span></div><div className="chart-main"><div className="chart-gridlines"><i /><i /><i /><i /><i /></div><div className="bar-set">{data.map((height, index) => <div className="bar-column" key={days[index]}><div className={`chart-bar ${index === 5 ? 'highlight' : ''}`} style={{ height: `${height}%` }} /><span>{days[index]}</span></div>)}</div></div></div>
}

export function Legend({ color, label, value }) {
  return <div className="legend-item"><span className={`legend-dot ${color}`} />{label}<strong>{value}</strong></div>
}

export function OrdersTable({ orders, compact = false, onStatus, onDetails, onRefund }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th>{!compact && <th>TIME</th>}{onRefund && <th>ACTION</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={() => onDetails?.(order)}><td><strong className="order-id">{order.id}</strong></td><td>{order.customer}</td><td className="items-cell">{order.items}</td><td>{money(order.total)}</td><td>{onStatus ? <select className={`status-select ${statusClass(order.status)}`} value={order.status} onClick={(event) => event.stopPropagation()} onChange={(event) => onStatus(order.id, event.target.value)}>{['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select> : <StatusBadge status={order.status} />}</td>{!compact && <td>{order.time}</td>}{onRefund && <td><button className="text-button" disabled={order.payment !== 'Paid' || order.status !== 'Completed'} onClick={(event) => { event.stopPropagation(); onRefund(order) }}>Refund</button></td>}</tr>)}</tbody></table>{orders.length === 0 && <div className="empty-state">No orders match this view.</div>}</div>
}

export function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass(status)}`}><i />{status}</span>
}

export function CartLine({ item, changeQuantity }) {
  return <div className="cart-line"><FoodThumb item={item} small /><div className="cart-line-info"><strong>{item.name}</strong><small>{money(item.price)}</small><div className="quantity-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label="Increase quantity">＋</button></div></div><strong>{money(item.price * item.quantity)}</strong></div>
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function buildPageRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1)
  }
  const pages = [1]
  const left = Math.max(2, currentPage - 1)
  const right = Math.min(totalPages - 1, currentPage + 1)

  if (left > 2) {
    pages.push('ellipsis-left')
  }
  for (let p = left; p <= right; p++) {
    pages.push(p)
  }
  if (right < totalPages - 1) {
    pages.push('ellipsis-right')
  }
  pages.push(totalPages)
  return pages
}

// This custom hook is colocated with the shared table components.
// eslint-disable-next-line react-refresh/only-export-components
export function usePagination(items, initialPageSize = 10) {
  const defaultSize = PAGE_SIZE_OPTIONS.includes(initialPageSize) ? initialPageSize : 10
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultSize)

  const totalItems = items?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const visiblePage = Math.min(Math.max(1, currentPage), totalPages)

  const startIndex = totalItems === 0 ? 0 : (visiblePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const startEntry = totalItems === 0 ? 0 : startIndex + 1
  const endEntry = endIndex

  const paginatedItems = useMemo(() => {
    return (items || []).slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  function setPageSize(nextSize) {
    const parsed = Number(nextSize)
    if (PAGE_SIZE_OPTIONS.includes(parsed)) {
      setPageSizeState(parsed)
      setCurrentPage(1)
    }
  }

  return {
    currentPage: visiblePage,
    setCurrentPage,
    onPageChange: setCurrentPage,
    pageSize,
    setPageSize,
    onPageSizeChange: setPageSize,
    totalPages,
    totalItems,
    startEntry,
    endEntry,
    paginatedItems,
  }
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  startEntry,
  endEntry,
  onPageChange,
  onPageSizeChange,
}) {
  const resolvedTotal = typeof totalItems === 'number' ? totalItems : totalPages * pageSize
  const resolvedStart = typeof startEntry === 'number'
    ? startEntry
    : (resolvedTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1)
  const resolvedEnd = typeof endEntry === 'number'
    ? endEntry
    : Math.min(currentPage * pageSize, resolvedTotal)

  if (resolvedTotal === 0 && totalPages <= 1) return null

  const pageTokens = buildPageRange(currentPage, totalPages)

  return (
    <div className="pagination" role="navigation" aria-label="Table pagination">
      {/* Left: Record summary & per-page selector */}
      <div className="pagination-meta">
        <span className="pagination-info">
          Showing <strong>{resolvedStart}&ndash;{resolvedEnd}</strong> of <strong>{resolvedTotal}</strong> entries
        </span>
        {onPageSizeChange && (
          <label className="pagination-size-label">
            <span>Rows per page:</span>
            <select
              className="pagination-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Records per page"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Right: First, Prev, Page Numbers + Ellipsis, Next, Last */}
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-button pagination-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(1)}
          aria-label="First page"
          title="First page"
        >
          &laquo; First
        </button>
        <button
          type="button"
          className="pagination-button pagination-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          &lsaquo; Prev
        </button>

        <div className="pagination-pages">
          {pageTokens.map((token) =>
            typeof token === 'string' ? (
              <span key={token} className="pagination-ellipsis" aria-hidden="true">
                &hellip;
              </span>
            ) : (
              <button
                key={token}
                type="button"
                className={`pagination-page ${token === currentPage ? 'active' : ''}`}
                aria-current={token === currentPage ? 'page' : undefined}
                onClick={() => onPageChange?.(token)}
              >
                {token}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          className="pagination-button pagination-nav-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          aria-label="Next page"
          title="Next page"
        >
          Next &rsaquo;
        </button>
        <button
          type="button"
          className="pagination-button pagination-nav-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(totalPages)}
          aria-label="Last page"
          title="Last page"
        >
          Last &raquo;
        </button>
      </div>
    </div>
  )
}

export function Modal({ onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}
