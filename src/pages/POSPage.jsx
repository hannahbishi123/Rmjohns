import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { FoodThumb } from '../components/shared'
import { money } from '../data/mockData'
import './POSPage.css'

const POS_CATEGORIES = [
  'All',
  'Silog Meals',
  'Solo Orders',
  'Ulam + Kanin',
  'Extras',
  'Cold Drinks',
  'Hot Drinks',
  'Desserts',
]

const POS_PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

function buildPosPageTokens(currentPage, totalPages) {
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

export default function POSPage() {
  const {
    filteredMenu = [],
    categories = [],
    category,
    setCategory,
    query,
    setQuery,
    addToCart,
    cart = [],
    cartTotal = 0,
    changeQuantity,
    cancelSale,
    paymentMethod,
    setPaymentMethod,
    completeSale,
    notify,
    confirmAction,
  } = useApp()

  const [discountPercent, setDiscountPercent] = useState(0)
  const [amountTendered, setAmountTenderedValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when POS renders its own forest-green banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-pos-page-content')
    return () => {
      if (container) container.classList.remove('adm-pos-page-content')
    }
  }, [])

  const orderedCategories = useMemo(() => {
    const extra = categories.filter((c) => !POS_CATEGORIES.includes(c))
    return [...POS_CATEGORIES, ...extra]
  }, [categories])

  const availableItems = useMemo(
    () => filteredMenu.filter((item) => item.available !== false),
    [filteredMenu],
  )

  // Pagination calculations for the POS menu item grid
  const totalItems = availableItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const startEntry = totalItems === 0 ? 0 : startIndex + 1
  const endEntry = endIndex

  const paginatedMenuItems = useMemo(
    () => availableItems.slice(startIndex, endIndex),
    [availableItems, startIndex, endIndex],
  )

  const pageTokens = useMemo(
    () => buildPosPageTokens(safePage, totalPages),
    [safePage, totalPages],
  )

  function handleSearchChange(value) {
    setQuery(value)
    setCurrentPage(1)
  }

  function handleCategoryChange(nextCategory) {
    setCategory(nextCategory)
    setCurrentPage(1)
  }

  function handlePageSizeChange(nextSize) {
    const parsed = Number(nextSize)
    if (POS_PAGE_SIZE_OPTIONS.includes(parsed)) {
      setPageSize(parsed)
      setCurrentPage(1)
    }
  }

  const serviceCharge = Math.round(cartTotal * 0.05)
  const discount = Math.round((cartTotal * discountPercent) / 100)
  const totalDue = Math.max(0, cartTotal + serviceCharge - discount)

  function setAmountTendered(value) {
    const amount = Number(value)
    if (value && (!Number.isFinite(amount) || amount < 0 || amount > 10000000)) {
      return notify('Amount tendered must be between 0 and 10,000,000.', {
        icon: 'error',
        title: 'Check the amount tendered',
      })
    }
    setAmountTenderedValue(value)
  }

  function finishTransaction() {
    if (paymentMethod === 'Cash' && cart.length) {
      const received = Number(amountTendered)
      if (
        !amountTendered.trim() ||
        !Number.isFinite(received) ||
        received < 0 ||
        received > 10000000
      ) {
        return notify('Enter an amount from 0 to 10,000,000.', {
          icon: 'error',
          title: 'Check the amount tendered',
        })
      }
    }
    const completed = completeSale({
      discount: discountPercent,
      amountTendered: Number(amountTendered),
    })
    if (!completed) return
    setAmountTenderedValue('')
    setDiscountPercent(0)
  }

  async function handleCancelSale() {
    if (!cart.length) return cancelSale()
    const result = await confirmAction({
      title: 'Cancel this transaction?',
      text: 'The current order will be voided and all items cleared.',
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'Keep order',
      icon: 'warning',
    })
    if (result.isConfirmed) {
      cancelSale()
      setAmountTenderedValue('')
      setDiscountPercent(0)
    }
  }

  return (
    <div className="adm-pos-mgmt">
      {/* ══════════════ 1. POS HEADER BANNER ══════════════ */}
      <header className="adm-pos-banner">
        <svg
          className="adm-pos-banner-art"
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
          className="adm-pos-banner-leaves"
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

        <div className="adm-pos-banner-left">
          <span className="adm-pos-date">{dynamicDate}</span>
          <h1>POS</h1>
          <p>A faster way to serve the next guest.</p>
        </div>
      </header>

      {/* ══════════════ 2. TWO-COLUMN MAIN POS LAYOUT ══════════════ */}
      <div className="adm-pos-layout">
        {/* LEFT SECTION (~70%): Menu Search, Categories, 2-Column Item Grid & Pagination */}
        <section className="adm-pos-left" aria-label="Menu selection">
          {/* Search Input */}
          <div className="adm-pos-search-row">
            <label className="adm-pos-search" aria-label="Find a menu item">
              <svg
                className="adm-pos-search-icon"
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
                value={query}
                maxLength={120}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Find a menu item..."
              />
              {query && (
                <button
                  type="button"
                  className="adm-pos-search-clear"
                  onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>
          </div>

          {/* Category Filter Pills */}
          <div className="adm-pos-categories" role="tablist" aria-label="POS menu categories">
            {orderedCategories.map((cat) => {
              const isSelected = category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`adm-pos-cat-pill${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Two-Column Menu Item Cards Grid (Paginated) */}
          <div className="adm-pos-grid">
            {paginatedMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="adm-pos-item-card"
                onClick={() => addToCart(item)}
              >
                <div className="adm-pos-item-thumb">
                  <FoodThumb item={item} small />
                </div>

                <div className="adm-pos-item-info">
                  <strong className="adm-pos-item-name">{item.name}</strong>
                  <span className="adm-pos-item-price">{money(item.price)}</span>
                </div>

                <span className="adm-pos-item-add" aria-hidden="true">
                  +
                </span>
              </button>
            ))}
          </div>

          {availableItems.length === 0 && (
            <div className="adm-pos-empty-menu">
              No available menu items match your current search or category filter.
            </div>
          )}

          {/* ══════════════ MENU ITEMS PAGINATION BAR ══════════════ */}
          <nav className="adm-pos-pagination" aria-label="POS menu items pagination">
            <div className="adm-pos-page-left">
              <span className="adm-pos-showing">
                Showing <strong>{startEntry}&ndash;{endEntry}</strong> of{' '}
                <strong>{totalItems}</strong> items
              </span>

              <span className="adm-pos-page-status">
                Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
              </span>

              <label className="adm-pos-rows-label">
                <span>Rows per page:</span>
                <div className="adm-pos-rows-select-wrap">
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    aria-label="Menu items per page"
                  >
                    {POS_PAGE_SIZE_OPTIONS.map((opt) => (
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
            </div>

            <div className="adm-pos-page-right">
              <button
                type="button"
                className="adm-pos-page-btn adm-pos-page-nav"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
              >
                &laquo; First
              </button>

              <button
                type="button"
                className="adm-pos-page-btn adm-pos-page-nav"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                aria-label="Previous page"
              >
                &lsaquo; Previous
              </button>

              <div className="adm-pos-page-numbers">
                {pageTokens.map((token) =>
                  typeof token === 'string' ? (
                    <span key={token} className="adm-pos-page-ellipsis" aria-hidden="true">
                      &hellip;
                    </span>
                  ) : (
                    <button
                      key={token}
                      type="button"
                      className={`adm-pos-page-btn adm-pos-page-num${token === safePage ? ' is-active' : ''}`}
                      aria-current={token === safePage ? 'page' : undefined}
                      onClick={() => setCurrentPage(token)}
                    >
                      {token}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="adm-pos-page-btn adm-pos-page-nav"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                aria-label="Next page"
              >
                Next &rsaquo;
              </button>

              <button
                type="button"
                className="adm-pos-page-btn adm-pos-page-nav"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
              >
                Last &raquo;
              </button>
            </div>
          </nav>
        </section>

        {/* RIGHT SECTION (~30%): Current Order Panel */}
        <aside className="adm-pos-order-card" aria-label="Current order">
          {/* Header */}
          <div className="adm-pos-order-head">
            <div>
              <span className="adm-pos-eyebrow">NEW TRANSACTION</span>
              <h2>Current order</h2>
            </div>
            <button
              type="button"
              className="adm-pos-cancel-btn"
              onClick={handleCancelSale}
            >
              Cancel transaction
            </button>
          </div>

          {/* Order Items or Empty State */}
          <div className="adm-pos-order-body">
            {cart.length > 0 ? (
              <div className="adm-pos-cart-list">
                {cart.map((item) => (
                  <div className="adm-pos-cart-item" key={item.id}>
                    <div className="adm-pos-cart-thumb">
                      <FoodThumb item={item} small />
                    </div>

                    <div className="adm-pos-cart-details">
                      <div className="adm-pos-cart-top">
                        <strong className="adm-pos-cart-name">{item.name}</strong>
                        <strong className="adm-pos-cart-line-total">
                          {money(item.price * item.quantity)}
                        </strong>
                      </div>

                      <div className="adm-pos-cart-bottom">
                        <small className="adm-pos-cart-unit">{money(item.price)} each</small>

                        <div className="adm-pos-qty-controls">
                          <button
                            type="button"
                            className="adm-pos-qty-btn"
                            onClick={() => changeQuantity(item.id, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            &minus;
                          </button>
                          <span className="adm-pos-qty-val">{item.quantity}</span>
                          <button
                            type="button"
                            className="adm-pos-qty-btn"
                            onClick={() => changeQuantity(item.id, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="adm-pos-remove-btn"
                            onClick={() => changeQuantity(item.id, -item.quantity)}
                            aria-label={`Remove ${item.name} from order`}
                            title="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-pos-order-empty">
                <div className="adm-pos-empty-circle" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M2.5 3.5h3l2.2 11a1.6 1.6 0 0 0 1.6 1.3h9.4a1.6 1.6 0 0 0 1.5-1.2L22 6.5H6" />
                  </svg>
                </div>
                <strong>Start a new order</strong>
                <span>Choose items from the menu</span>
              </div>
            )}
          </div>

          {/* Payment, Discount, Totals & Checkout */}
          <div className="adm-pos-order-footer">
            {/* Payment Method */}
            <label className="adm-pos-field">
              <span className="adm-pos-field-label">Payment method</span>
              <div className="adm-pos-select-wrap">
                <span className="adm-pos-select-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </span>
                <select
                  className="adm-pos-select has-left-icon"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Card">Card</option>
                  <option value="QR Payment">QR Payment</option>
                  <option value="Other">Other</option>
                </select>
                <svg className="adm-pos-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </label>

            {/* Discount */}
            <label className="adm-pos-field">
              <span className="adm-pos-field-label">Discount</span>
              <div className="adm-pos-select-wrap">
                <select
                  className="adm-pos-select"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                >
                  <option value="0">No discount</option>
                  <option value="5">5% demo discount</option>
                  <option value="10">10% demo discount</option>
                  <option value="20">20% demo discount</option>
                </select>
                <svg className="adm-pos-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </label>

            {/* Totals Breakdown */}
            <div className="adm-pos-totals">
              <div className="adm-pos-total-row">
                <span>Subtotal</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <div className="adm-pos-total-row adm-pos-total-muted">
                <span>Service charge (5%)</span>
                <strong>{money(serviceCharge)}</strong>
              </div>
              {discount > 0 && (
                <div className="adm-pos-total-row adm-pos-total-discount">
                  <span>Discount &middot; {discountPercent}%</span>
                  <strong>&minus;{money(discount)}</strong>
                </div>
              )}
              {(cart.length > 0 || discount > 0) && (
                <div className="adm-pos-total-row adm-pos-grand-total">
                  <span>Total due</span>
                  <strong>{money(totalDue)}</strong>
                </div>
              )}
            </div>

            {/* Cash Tendered & Change when Cash is selected and items are in cart */}
            {paymentMethod === 'Cash' && cart.length > 0 && (
              <div className="adm-pos-cash-box">
                <label className="adm-pos-field">
                  <span className="adm-pos-field-label">Amount tendered</span>
                  <input
                    type="number"
                    min="0"
                    className="adm-pos-input"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="Enter cash received"
                  />
                </label>
                <div className="adm-pos-total-row adm-pos-change-row">
                  <span>Change</span>
                  <strong>{money(Math.max(0, Number(amountTendered) - totalDue))}</strong>
                </div>
              </div>
            )}

            {/* Complete Transaction Button */}
            <button
              type="button"
              className="adm-pos-complete-btn"
              onClick={finishTransaction}
            >
              <span>Complete transaction</span>
              <span className="adm-pos-complete-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
