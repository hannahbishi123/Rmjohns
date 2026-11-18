import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'
import './CustomersPage.css'

const CUSTOMER_PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

function getCustomerInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CU'
  return parts.map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

function buildCustomerPageTokens(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const tokens = [1]
  const left = Math.max(2, currentPage - 1)
  const right = Math.min(totalPages - 1, currentPage + 1)

  if (left > 2) tokens.push('ellipsis-left')
  for (let p = left; p <= right; p++) tokens.push(p)
  if (right < totalPages - 1) tokens.push('ellipsis-right')
  tokens.push(totalPages)
  return tokens
}

export default function CustomersPage() {
  const { customers = [], orders = [], setDialog, deleteCustomer } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All customers')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Customer Management renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-customers-page-content')
    return () => {
      if (container) container.classList.remove('adm-customers-page-content')
    }
  }, [])

  const visibleCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const matchesSearch =
        !q ||
        `${customer.name || ''} ${customer.email || ''} ${customer.id || ''}`
          .toLowerCase()
          .includes(q)

      if (!matchesSearch) return false
      if (filter === 'All customers') return true
      if (filter === 'Active') return customer.status === 'Active'
      if (filter === 'Inactive') return customer.status !== 'Active'
      if (filter === 'Loyalty members') return Number(customer.points) > 0
      return true
    })
  }, [customers, search, filter])

  // Pagination calculations
  const totalItems = visibleCustomers.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const startEntry = totalItems === 0 ? 0 : startIndex + 1
  const endEntry = endIndex

  const paginatedCustomers = useMemo(
    () => visibleCustomers.slice(startIndex, endIndex),
    [visibleCustomers, startIndex, endIndex],
  )

  const pageTokens = useMemo(
    () => buildCustomerPageTokens(safePage, totalPages),
    [safePage, totalPages],
  )

  function handleSearchChange(value) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleFilterChange(nextFilter) {
    setFilter(nextFilter)
    setCurrentPage(1)
  }

  function handlePageSizeChange(nextSize) {
    const parsed = Number(nextSize)
    if (CUSTOMER_PAGE_SIZE_OPTIONS.includes(parsed)) {
      setPageSize(parsed)
      setCurrentPage(1)
    }
  }

  return (
    <div className="adm-customers-mgmt">
      {/* ══════════════ 1. CUSTOMERS HEADER BANNER ══════════════ */}
      <header className="adm-cst-banner">
        <svg
          className="adm-cst-banner-art"
          viewBox="0 0 960 155"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M520 0 C610 40 675 98 595 155 L960 155 L960 0 Z"
            fill="#2B603A"
            fillOpacity="0.45"
          />
          <path
            d="M645 0 C565 48 520 105 475 155 L960 155 L960 0 Z"
            fill="#13311F"
            fillOpacity="0.58"
          />
          <path
            d="M695 -10 C625 42 585 102 555 155 L745 155 C760 98 795 42 855 -10 Z"
            fill="#A3C644"
            fillOpacity="0.24"
          />
        </svg>

        <svg
          className="adm-cst-banner-leaves"
          viewBox="0 0 240 135"
          fill="none"
          aria-hidden="true"
        >
          <path d="M125 132 C134 84 164 46 206 20 C198 72 170 112 125 132 Z" fill="#5D9E31" />
          <path d="M129 128 Q165 74 202 24" stroke="#B7E048" strokeWidth="2" strokeLinecap="round" />
          <path d="M78 136 C92 94 126 64 172 54 C150 98 116 126 78 136 Z" fill="#77B83F" />
          <path d="M82 132 Q124 92 168 56" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M182 135 C192 98 214 70 242 54 C232 94 210 122 182 135 Z" fill="#498425" />
        </svg>

        <div className="adm-cst-banner-left">
          <span className="adm-cst-date">{dynamicDate}</span>
          <h1>Customers</h1>
          <p>Get to know your regulars.</p>
        </div>
      </header>

      {/* ══════════════ 2. SEARCH AND STATUS FILTER ══════════════ */}
      <div className="adm-cst-toolbar">
        <label className="adm-cst-search" aria-label="Search customers by name, ID, or email">
          <svg
            className="adm-cst-search-icon"
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
            placeholder="Search customers..."
            value={search}
            maxLength={120}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="adm-cst-search-clear"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <div className="adm-cst-filter-wrap">
          <select
            className="adm-cst-filter-select"
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            aria-label="Filter customers"
          >
            <option value="All customers">All customers</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Loyalty members">Loyalty members</option>
          </select>
          <svg
            className="adm-cst-filter-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ══════════════ 3. CUSTOMER TABLE CONTAINER ══════════════ */}
      <section className="adm-cst-card" aria-label="Customers directory">
        <div className="adm-cst-table-scroll">
          <table className="adm-cst-table">
            <thead>
              <tr>
                <th className="col-customer">CUSTOMER</th>
                <th className="col-id">CUSTOMER ID</th>
                <th className="col-orders">ORDERS</th>
                <th className="col-spend">TOTAL SPEND</th>
                <th className="col-points">POINTS</th>
                <th className="col-status">STATUS</th>
                <th className="col-actions">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCustomers.map((customer) => {
                const customerOrders = orders.filter(
                  (order) => order.customer === customer.name,
                )
                const isActive = customer.status === 'Active'
                return (
                  <tr key={customer.id} className="adm-cst-row">
                    {/* 1. Customer (Avatar + Name + Email) */}
                    <td className="col-customer">
                      <div className="adm-cst-person">
                        <span className="adm-cst-avatar" aria-hidden="true">
                          {getCustomerInitials(customer.name)}
                        </span>
                        <div className="adm-cst-person-copy">
                          <strong>{customer.name}</strong>
                          <small>{customer.email || 'No email on file'}</small>
                        </div>
                      </div>
                    </td>

                    {/* 2. Customer ID */}
                    <td className="col-id">
                      <span className="adm-cst-id">{customer.id}</span>
                    </td>

                    {/* 3. Orders */}
                    <td className="col-orders">
                      <span className="adm-cst-orders">{customer.orders ?? 0}</span>
                    </td>

                    {/* 4. Total Spend */}
                    <td className="col-spend">
                      <span className="adm-cst-spend">{money(customer.spend ?? 0)}</span>
                    </td>

                    {/* 5. Points */}
                    <td className="col-points">
                      <strong className="adm-cst-points">{customer.points ?? 0}</strong>
                    </td>

                    {/* 6. Status Badge */}
                    <td className="col-status">
                      <span
                        className={`adm-cst-status-badge ${isActive ? 'is-active' : 'is-inactive'}`}
                      >
                        <i className="adm-cst-status-dot" aria-hidden="true" />
                        <span>{customer.status || 'Active'}</span>
                      </span>
                    </td>

                    {/* 7. Actions */}
                    <td className="col-actions">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="adm-cst-more-btn"
                          aria-label={`View details for ${customer.name}`}
                          title={`View ${customer.name} profile`}
                          onClick={() =>
                            setDialog({
                              type: 'customer',
                              customer,
                              orders: customerOrders,
                            })
                          }
                        >
                          &bull;&bull;&bull;
                        </button>
                        <button
                          type="button"
                          className="adm-cst-delete-btn"
                          aria-label={`Delete ${customer.name}`}
                          title={`Delete ${customer.name} and user account`}
                          onClick={async () => {
                            const confirmed = window.confirm(`Sigurado ka bang nais mong burahin ang customer account ni ${customer.name}? Mabubura ang record nito nang permanente.`)
                            if (confirmed && deleteCustomer) {
                              await deleteCustomer(customer.id)
                            }
                          }}
                          style={{
                            border: '1px solid #FFCDD2',
                            background: '#FFEBEE',
                            color: '#C62828',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {paginatedCustomers.length === 0 && (
            <div className="adm-cst-empty">
              No customers match your current search or filter.
            </div>
          )}
        </div>

        {/* ══════════════ 4. PAGINATION FOOTER (BOTTOM RIGHT ALIGNED) ══════════════ */}
        <div className="adm-cst-footer">
          {/* LEFT SIDE: Showing X–Y of Z customers */}
          <div className="adm-cst-footer-left">
            <span className="adm-cst-showing">
              Showing <strong>{startEntry}&ndash;{endEntry}</strong> of{' '}
              <strong>{totalItems}</strong> customers
            </span>
          </div>

          {/* RIGHT SIDE: Rows per page + First, Prev, Page Numbers, Next, Last */}
          <div className="adm-cst-footer-right">
            <label className="adm-cst-rows-label">
              <span>Rows per page:</span>
              <div className="adm-cst-rows-select-wrap">
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  aria-label="Rows per page"
                >
                  {CUSTOMER_PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </label>

            <div className="adm-cst-pagination-controls" role="navigation" aria-label="Customers pagination">
              <button
                type="button"
                className="adm-cst-page-btn"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
                title="First page"
              >
                &laquo;
              </button>

              <button
                type="button"
                className="adm-cst-page-btn"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                aria-label="Previous page"
                title="Previous page"
              >
                &lsaquo;
              </button>

              {pageTokens.map((token) =>
                typeof token === 'string' ? (
                  <span key={token} className="adm-cst-page-ellipsis" aria-hidden="true">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    className={`adm-cst-page-btn adm-cst-page-num${token === safePage ? ' is-active' : ''}`}
                    aria-current={token === safePage ? 'page' : undefined}
                    onClick={() => setCurrentPage(token)}
                  >
                    {token}
                  </button>
                ),
              )}

              <button
                type="button"
                className="adm-cst-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                aria-label="Next page"
                title="Next page"
              >
                &rsaquo;
              </button>

              <button
                type="button"
                className="adm-cst-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
                title="Last page"
              >
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
