import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { OrdersTable, Pagination, usePagination } from '../components/shared'
import { money, statusClass } from '../data/mockData'
import './OrdersPage.css'

const STATUS_TABS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled']
const ORDER_STATUS_OPTIONS = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled']
const PAGE_SIZE_CHOICES = [10, 25, 50, 100]

export default function OrdersPage() {
  const {
    role,
    filteredOrders: orders = [],
    orders: allOrders = [],
    customers = [],
    setOrderFilter,
    orderFilter,
    updateOrder,
    setDialog,
  } = useApp()

  const isAdmin = role === 'Admin'
  const [search, setSearch] = useState('')

  // Hide the generic AppShell page-heading when Admin Order Management renders its own banner
  useEffect(() => {
    if (!isAdmin) return
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-orders-page-content')
    return () => {
      if (container) container.classList.remove('adm-orders-page-content')
    }
  }, [isAdmin])

  // Map customer names to emails so searching by customer email also matches orders
  const customerEmailByName = useMemo(() => {
    const map = new Map()
    for (const c of customers) {
      if (c?.name && c?.email) {
        map.set(String(c.name).toLowerCase(), String(c.email).toLowerCase())
      }
    }
    return map
  }, [customers])

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) => {
      const idStr = String(order.id || '')
      const custStr = String(order.customer || '')
      const emailStr =
        String(order.email || order.customerEmail || '') ||
        customerEmailByName.get(custStr.toLowerCase()) ||
        ''
      const itemsStr = String(order.items || '')
      return `${idStr} ${custStr} ${emailStr} ${itemsStr}`.toLowerCase().includes(q)
    })
  }, [orders, search, customerEmailByName])

  const pagination = usePagination(visibleOrders, 10)

  const statusCounts = useMemo(() => {
    const counts = { All: allOrders.length }
    for (const tab of STATUS_TABS) {
      if (tab !== 'All') {
        counts[tab] = allOrders.filter((o) => o.status === tab).length
      }
    }
    return counts
  }, [allOrders])

  /* ── Preserve existing Staff Orders view untouched ── */
  if (!isAdmin) {
    return (
      <section className="panel full-panel">
        <div className="toolbar">
          <div className="tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={orderFilter === tab ? 'tab active' : 'tab'}
                onClick={() => setOrderFilter(tab)}
              >
                {tab}
                <span>{statusCounts[tab] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="search-box order-search">
            <span>⌕</span>
            <input
              value={search}
              maxLength="120"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders..."
            />
          </div>
        </div>
        <OrdersTable
          orders={pagination.paginatedItems}
          onStatus={updateOrder}
          onDetails={(order) => setDialog({ type: 'order', order })}
          onRefund={(order) => setDialog({ type: 'refund-order', order })}
        />
        <Pagination {...pagination} />
      </section>
    )
  }

  /* ── Redesigned Admin Order Management Page ── */
  return (
    <div className="adm-orders-mgmt">
      {/* ══════════════ 1. ORDERS HEADER BANNER ══════════════ */}
      <header className="adm-ord-banner">
        {/* Decorative curved waves & leaf illustrations on the right */}
        <svg
          className="adm-ord-banner-art"
          viewBox="0 0 960 150"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M540 0 C640 35 710 95 620 150 L960 150 L960 0 Z"
            fill="#2A5E38"
            fillOpacity="0.45"
          />
          <path
            d="M660 0 C585 45 540 100 490 150 L960 150 L960 0 Z"
            fill="#13311F"
            fillOpacity="0.58"
          />
          <path
            d="M720 -10 C650 40 610 100 580 150 L770 150 C780 95 815 40 875 -10 Z"
            fill="#A3C644"
            fillOpacity="0.22"
          />
        </svg>

        {/* Botanical leaves cluster on right of header */}
        <svg
          className="adm-ord-banner-leaves"
          viewBox="0 0 210 140"
          fill="none"
          aria-hidden="true"
        >
          <path d="M125 135 C132 86 162 46 204 20 C196 72 168 112 125 135 Z" fill="#5D9E31" />
          <path d="M128 132 Q164 76 200 24" stroke="#B7E048" strokeWidth="2" strokeLinecap="round" />
          <path d="M84 142 C96 98 130 68 176 58 C154 102 120 130 84 142 Z" fill="#77B83F" />
          <path d="M88 138 Q130 98 172 60" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M148 64 C132 42 138 18 160 6 C172 28 166 50 148 64 Z" fill="#89C54B" />
          <path d="M52 136 C68 112 94 98 126 98 C106 122 80 136 52 136 Z" fill="#498425" />
        </svg>

        <div className="adm-ord-banner-left">
          {/* Circular fork & spoon icon badge */}
          <div className="adm-ord-icon-circle" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="#E4EEBA" strokeWidth="2.8" fill="rgba(22, 54, 34, 0.55)" />
              {/* Fork */}
              <path
                d="M18 13V21C18 22.8 19.2 24 20.5 24V35M18 13V19M20.5 13V19M23 13V21C23 22.8 21.8 24 20.5 24"
                stroke="#F9F9F6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Spoon */}
              <ellipse cx="29.5" cy="17.5" rx="3.2" ry="4.8" fill="#F9F9F6" />
              <path d="M29.5 22.5V35" stroke="#F9F9F6" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>

          <span className="adm-ord-banner-divider" aria-hidden="true" />

          <div className="adm-ord-banner-titles">
            <h1>Orders</h1>
            <p>Keep track of every order smoothly.</p>
          </div>
        </div>
      </header>

      {/* ══════════════ 2. STATUS FILTERS & SEARCH BAR ══════════════ */}
      <div className="adm-ord-toolbar">
        <div className="adm-ord-filters" role="tablist" aria-label="Order status filters">
          {STATUS_TABS.map((tab) => {
            const isSelected = orderFilter === tab
            const count = statusCounts[tab] ?? 0
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`adm-ord-filter-pill${isSelected ? ' is-selected' : ''}`}
                onClick={() => setOrderFilter(tab)}
              >
                <span className="adm-ord-filter-label">{tab}</span>
                <span className="adm-ord-filter-count">{count}</span>
              </button>
            )
          })}
        </div>

        <label className="adm-ord-search" aria-label="Search orders">
          <svg
            className="adm-ord-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.2" y2="16.2" />
          </svg>
          <input
            type="text"
            value={search}
            maxLength={120}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
          />
          {search && (
            <button
              type="button"
              className="adm-ord-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>
      </div>

      {/* ══════════════ 3. ORDERS TABLE CONTAINER ══════════════ */}
      <section className="adm-ord-card" aria-label="Orders list">
        <div className="adm-ord-table-scroll">
          <table className="adm-ord-table">
            <thead>
              <tr>
                <th className="col-order">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="9" cy="20" r="1.8" />
                      <circle cx="18" cy="20" r="1.8" />
                      <path d="M2 3h3l2.3 11.2a1.8 1.8 0 0 0 1.8 1.4h9.6a1.8 1.8 0 0 0 1.7-1.3L22 6H6.2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>ORDER</span>
                  </span>
                </th>
                <th className="col-customer">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-3.8 3.6-6.5 8-6.5s8 2.7 8 6.5" />
                    </svg>
                    <span>CUSTOMER</span>
                  </span>
                </th>
                <th className="col-items">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
                      <circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none" />
                      <circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none" />
                      <circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none" />
                      <line x1="9" y1="6" x2="20" y2="6" />
                      <line x1="9" y1="12" x2="20" y2="12" />
                      <line x1="9" y1="18" x2="20" y2="18" />
                    </svg>
                    <span>ITEMS</span>
                  </span>
                </th>
                <th className="col-total">
                  <span className="adm-ord-th">
                    <span className="adm-ord-peso-icon" aria-hidden="true">₱</span>
                    <span>TOTAL</span>
                  </span>
                </th>
                <th className="col-status">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="22 12 18 12 15 20 9 4 6 12 2 12" />
                    </svg>
                    <span>STATUS</span>
                  </span>
                </th>
                <th className="col-time">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 15.5 14" />
                    </svg>
                    <span>TIME</span>
                  </span>
                </th>
                <th className="col-action">
                  <span className="adm-ord-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                    <span>ACTION</span>
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {pagination.paginatedItems.map((order) => {
                const statusKey = statusClass(order.status || 'Pending')
                return (
                  <tr
                    key={order.id}
                    className="adm-ord-row"
                    onClick={() => setDialog({ type: 'order', order })}
                  >
                    {/* 1. Order ID */}
                    <td className="col-order">
                      <strong className="adm-ord-id">{order.id}</strong>
                    </td>

                    {/* 2. Customer */}
                    <td className="col-customer">
                      <span className="adm-ord-customer">{order.customer}</span>
                    </td>

                    {/* 3. Items */}
                    <td className="col-items">
                      <span className="adm-ord-items">{order.items}</span>
                    </td>

                    {/* 4. Total */}
                    <td className="col-total">
                      <strong className="adm-ord-total">{money(order.total)}</strong>
                    </td>

                    {/* 5. Status Badge Select */}
                    <td
                      className="col-status"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`adm-ord-status-wrap status-${statusKey}`}>
                        <span className="adm-ord-status-dot" aria-hidden="true" />
                        <select
                          className="adm-ord-status-select"
                          value={order.status}
                          aria-label={`Status for order ${order.id}`}
                          onChange={(e) => updateOrder(order.id, e.target.value)}
                        >
                          {ORDER_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="adm-ord-status-chevron"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </td>

                    {/* 6. Time */}
                    <td className="col-time">
                      <span className="adm-ord-time">{order.time}</span>
                    </td>

                    {/* 7. Action */}
                    <td
                      className="col-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="adm-ord-refund-btn"
                        onClick={() => setDialog({ type: 'refund-order', order })}
                      >
                        Refund
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {visibleOrders.length === 0 && (
            <div className="adm-ord-empty">
              No orders match your current filter or search query.
            </div>
          )}
        </div>

        {/* ══════════════ 4. PAGINATION FOOTER ══════════════ */}
        <div className="adm-ord-footer">
          <div className="adm-ord-footer-left">
            <span className="adm-ord-showing">
              Showing <strong>{pagination.startEntry}&ndash;{pagination.endEntry}</strong> of{' '}
              <strong>{pagination.totalItems}</strong> orders
            </span>

            <label className="adm-ord-rows-label">
              <span>Rows per page:</span>
              <div className="adm-ord-rows-select-wrap">
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_CHOICES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </label>
          </div>

          <div className="adm-ord-footer-right">
            <button
              type="button"
              className="adm-ord-page-nav"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              &lsaquo; Previous
            </button>

            <div className="adm-ord-page-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`adm-ord-page-num${pageNum === pagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === pagination.currentPage ? 'page' : undefined}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="adm-ord-page-nav"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next &rsaquo;
            </button>
          </div>
        </div>
      </section>

      {/* Subtle decorative bottom botanical waves matching the reference */}
      <div className="adm-ord-bottom-decor" aria-hidden="true">
        <svg className="adm-ord-bottom-wave" viewBox="0 0 1200 70" preserveAspectRatio="none" fill="none">
          <path d="M0 52 C240 12 460 66 740 36 C940 14 1090 30 1200 46 L1200 70 L0 70 Z" fill="#C6DC63" fillOpacity="0.6" />
          <path d="M0 60 C250 26 470 72 750 46 C950 26 1095 40 1200 54 L1200 70 L0 70 Z" fill="#1B3B2B" />
        </svg>
      </div>
    </div>
  )
}
