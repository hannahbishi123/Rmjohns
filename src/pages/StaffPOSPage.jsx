import { Component, useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'
import POSTransactionSuccessModal from '../components/POSTransactionSuccessModal'
import './StaffPOSPage.css'

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} · ${monthDayYear}`
}

// Exact categories and order requested for Staff Point of Sale
const POS_EXACT_CATEGORIES = [
  'All',
  'Desserts',
  'Silog Meals',
  'Solo Orders',
  'Ulam + Kanin',
  'Extras',
  'Cold Drinks',
  'Hot Drinks',
]

// High-resolution Filipino food photography fallbacks matching reference dishes
const FOOD_IMAGE_FALLBACKS = {
  adobo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
  caldereta: 'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=700&q=80',
  sinigang: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80',
  tea: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80',
  shake: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=700&q=80',
  flan: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=700&q=80',
  spaghetti: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281788?auto=format&fit=crop&w=700&q=80',
  pancit: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=700&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80',
  fries: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=700&q=80',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=80',
  halo: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=700&q=80',
  tapsilog: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
  silog: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
  default: '/admin-banner-dish.jpg',
}

function resolveFoodImage(item) {
  if (item?.imageUrl) return item.imageUrl
  if (item?.image) return item.image
  const name = String(item?.name || '').toLowerCase()
  for (const [key, url] of Object.entries(FOOD_IMAGE_FALLBACKS)) {
    if (key !== 'default' && name.includes(key)) return url
  }
  return FOOD_IMAGE_FALLBACKS.default
}

class StaffPOSErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[StaffPOS ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="staff-pos-mgmt" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', maxWidth: '520px', margin: '0 auto', border: '1px solid #E5EAE2', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ color: '#1B3B2B', marginTop: 0 }}>Point of Sale Encountered an Issue</h2>
            <p style={{ color: '#5C6E63', fontSize: '0.95rem' }}>An error occurred while displaying the POS page. Please click the button below to recover.</p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{ background: '#1B3B2B', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}
            >
              Reload POS Interface
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function StaffPOSPageInner() {
  const {
    menu = [],
    cart = [],
    cartTotal = 0,
    addToCart,
    changeQuantity,
    clearCart,
    orders = [],
    setOrders,
    setPayments,
    addNotification,
    notify,
    confirmAction,
    profile,
  } = useApp()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [orderType, setOrderType] = useState('Dine in')
  const [customerName, setCustomerName] = useState('Walk-in guest')
  const [amountTendered, setAmountTendered] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successTransaction, setSuccessTransaction] = useState(null)

  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide generic AppShell page-heading when Staff POS renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('staff-pos-page-content')
    return () => {
      if (container) container.classList.remove('staff-pos-page-content')
    }
  }, [])

  // Reset to first page when search or category filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory])

  // Dynamic category list based on existing database menu items
  const safeMenu = Array.isArray(menu) ? menu : []
  const safeCart = Array.isArray(cart) ? cart : []
  const safeOrders = Array.isArray(orders) ? orders : []

  // Dynamic category counts based on existing database menu items
  const categoryCounts = useMemo(() => {
    const counts = { All: safeMenu.length }
    for (const item of safeMenu) {
      if (!item) continue
      const cat = item.category || 'Other'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [safeMenu])

  // Filter available menu items by search and exact category match
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return safeMenu.filter((item) => {
      if (!item) return false

      // Category filter (Exact match)
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false
      }

      // Search filter
      if (q) {
        const nameStr = String(item.name || '').toLowerCase()
        const catStr = String(item.category || '').toLowerCase()
        const descStr = String(item.description || '').toLowerCase()
        return nameStr.includes(q) || catStr.includes(q) || descStr.includes(q)
      }
      return true
    })
  }, [safeMenu, search, selectedCategory])

  // 6 items per page (2 rows x 3 columns) matching reference POS screenshot
  const pageSize = 6
  const totalItems = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const startEntry = totalItems === 0 ? 0 : startIndex + 1
  const endEntry = endIndex

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, endIndex),
    [filteredItems, startIndex, endIndex]
  )

  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  )

  // Subtotal, 12% Tax, and Total computations matching reference mockup
  const subtotal = Number(cartTotal) || 0
  const tax = Math.round(subtotal * 12) / 100 // 12% Tax
  const grandTotal = Math.round((subtotal + tax) * 100) / 100

  // Refresh button handler
  function handleRefresh() {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      notify?.('Point of Sale refreshed', { icon: 'success' })
    }, 450)
  }

  // Add to cart with feedback
  function handleAddToCart(item) {
    if (!item) return
    addToCart(item)
    notify?.(`${item.name} added to cart`, { icon: 'success' })
  }

  // Clear current order
  async function handleClearCart() {
    if (!safeCart.length) return
    const result = await confirmAction({
      title: 'Clear current order?',
      text: 'All selected items in this transaction will be removed.',
      confirmButtonText: 'Yes, clear order',
      cancelButtonText: 'Keep items',
      icon: 'warning',
    })
    if (result.isConfirmed) {
      clearCart()
    }
  }

  // Open Checkout Modal
  function handleOpenCheckout() {
    if (!safeCart.length) {
      notify?.('Your current order is empty. Add menu items first.', {
        icon: 'warning',
        title: 'Empty Order',
      })
      return
    }
    setAmountTendered(grandTotal.toString())
    setCheckoutModalOpen(true)
  }

  // Process Checkout & Order Completion
  async function handleProcessCheckout(e) {
    e?.preventDefault()
    if (!safeCart.length || isSubmitting) return

    const tenderedNum = Number(amountTendered)
    if (paymentMethod === 'Cash') {
      if (isNaN(tenderedNum) || tenderedNum < grandTotal) {
        notify?.(`Cash tendered must be at least ₱${grandTotal.toFixed(2)}`, {
          icon: 'error',
          title: 'Insufficient Amount',
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const orderId = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`
      const receiptId = `RC-${String(safeOrders.length + 1).padStart(6, '0')}`
      const changeAmount = paymentMethod === 'Cash' ? Math.max(0, tenderedNum - grandTotal) : 0
      const orderItemsSummary = safeCart.map((item) => `${item.quantity} × ${item.name}`).join(', ')

      const newOrder = {
        id: orderId,
        customer: customerName.trim() || 'Walk-in guest',
        items: orderItemsSummary,
        products: safeCart.map(({ id: pid, menuId, quantity, addons, name, price, image, imageUrl }) => ({
          id: menuId ?? pid,
          quantity,
          addons,
          name,
          price,
          image: imageUrl || image,
        })),
        subtotal,
        tax,
        serviceCharge: 0,
        discount: 0,
        total: grandTotal,
        type: orderType,
        pickupLocation: 'RM John’s Eatery • Main Counter',
        notes: `Processed by Staff (${profile?.name || 'Staff'})`,
        payment: 'Paid',
        paymentMethod,
        status: 'Completed',
        time: 'Just now',
        date: new Date().toISOString().split('T')[0],
      }

      const newPayment = {
        id: `PAY-${String(Date.now()).slice(-6)}`,
        orderId,
        method: paymentMethod,
        amount: grandTotal,
        amountPaid: paymentMethod === 'Cash' ? tenderedNum : grandTotal,
        change: changeAmount,
        status: 'Paid',
        reference: receiptId,
      }

      // Update state (automatically synchronized to MySQL and Firebase via AppContext)
      setOrders((current) => [newOrder, ...current])
      setPayments((current) => [newPayment, ...current])
      addNotification?.('POS Order Completed', `${orderId} paid ₱${grandTotal.toFixed(2)} via ${paymentMethod}`)

      // Clear cart & close checkout modal
      clearCart()
      setCheckoutModalOpen(false)

      // Open redesigned POS Transaction Completed popup
      setSuccessTransaction({
        orderId,
        customer: newOrder.customer,
        totalPaid: grandTotal,
        paymentMethod,
        cashTendered: tenderedNum,
        change: changeAmount,
      })
    } catch (err) {
      console.error('Checkout error:', err)
      notify?.('Failed to process order. Please try again.', {
        icon: 'error',
        title: 'Checkout Failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="staff-pos-mgmt">
      {/* ══════════════ 1. POS HERO BANNER ══════════════ */}
      <header className="staff-pos-banner">
        {/* Decorative curved waves art */}
        <svg
          className="staff-pos-banner-art"
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

        {/* Botanical leaves decoration */}
        <svg
          className="staff-pos-banner-leaves"
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

        <div className="staff-pos-banner-left">
          <span className="staff-pos-date">{dynamicDate}</span>
          <h1>Point of Sale</h1>
          <p>Quick and easy ordering.</p>
        </div>

        <button
          type="button"
          className={`staff-pos-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={handleRefresh}
          aria-label="Refresh Point of Sale"
        >
          <svg
            className="staff-pos-refresh-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
          </svg>
          <span>Refresh</span>
        </button>
      </header>

      {/* ══════════════ 2. TWO-COLUMN POS WORKSPACE ══════════════ */}
      <div className="staff-pos-layout">
        {/* LEFT COLUMN: Menu Products, Categories, Search & Pagination */}
        <section className="staff-pos-left" aria-label="Menu Products Selection">
          {/* Controls: Search and Category Pills */}
          <div className="staff-pos-controls-row">
            {/* Search Field */}
            <div className="staff-pos-search-wrap">
              <svg
                className="staff-pos-search-icon"
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
                className="staff-pos-search-input"
                value={search}
                maxLength={120}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food, categories..."
              />
              {search && (
                <button
                  type="button"
                  className="staff-pos-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Category Filter Pills in ONE horizontal row */}
            <div className="staff-pos-categories" role="tablist" aria-label="POS Categories">
              {POS_EXACT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat
                const count = categoryCounts[cat] ?? 0
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`staff-pos-cat-btn${isSelected ? ' is-active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product Cards Grid (3 Columns) */}
          <div className="staff-pos-grid">
            {paginatedItems.map((item) => {
              const imgSrc = resolveFoodImage(item)
              return (
                <div className="staff-pos-card" key={item.id}>
                  <div className="staff-pos-card-img-wrap">
                    <img
                      src={imgSrc}
                      alt={item.name}
                      className="staff-pos-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = FOOD_IMAGE_FALLBACKS.default
                      }}
                    />
                  </div>

                  <div className="staff-pos-card-body">
                    <h3 className="staff-pos-item-name" title={item.name}>
                      {item.name}
                    </h3>
                    <span className="staff-pos-item-price">
                      {money(item.price)}
                    </span>
                    <button
                      type="button"
                      className="staff-pos-add-btn"
                      onClick={() => handleAddToCart(item)}
                      aria-label={`Add ${item.name} to order`}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="staff-pos-empty">
              No menu items match your search or selected category.
            </div>
          )}

          {/* Pagination */}
          <div className="staff-pos-pagination">
            <span className="staff-pos-showing">
              Showing {totalItems === 0 ? 0 : startEntry}–{endEntry} of {totalItems} items
            </span>

            <div className="staff-pos-pagination-nav">
              <button
                type="button"
                className="staff-pos-page-btn"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                &lsaquo;
              </button>

              {pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`staff-pos-page-btn${p === safePage ? ' is-active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                className="staff-pos-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Current Order Panel */}
        <aside className="staff-pos-order-panel" aria-label="Current Order Panel">
          {/* Header */}
          <div className="staff-pos-order-header">
            <h2>Current Order</h2>
            {safeCart.length > 0 && (
              <button
                type="button"
                className="staff-pos-clear-cart-btn"
                onClick={handleClearCart}
                title="Clear current order"
                aria-label="Clear current order"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="staff-pos-order-body">
            {safeCart.length > 0 ? (
              safeCart.map((item) => {
                const itemImg = resolveFoodImage(item)
                return (
                  <div className="staff-pos-cart-item" key={item.id}>
                    <img
                      src={itemImg}
                      alt={item.name}
                      className="staff-pos-cart-thumb"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = FOOD_IMAGE_FALLBACKS.default
                      }}
                    />

                    <div className="staff-pos-cart-details">
                      <strong className="staff-pos-cart-title" title={item.name}>
                        {item.name}
                      </strong>
                      <span className="staff-pos-cart-unit-price">
                        {money(item.price)}
                      </span>

                      <div className="staff-pos-stepper">
                        <button
                          type="button"
                          className="staff-pos-step-btn"
                          onClick={() => changeQuantity(item.id, -1)}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          &minus;
                        </button>
                        <span className="staff-pos-step-qty">{item.quantity}</span>
                        <button
                          type="button"
                          className="staff-pos-step-btn"
                          onClick={() => changeQuantity(item.id, 1)}
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <strong className="staff-pos-cart-total-price">
                      {money(item.price * item.quantity)}
                    </strong>
                  </div>
                )
              })
            ) : (
              <div className="staff-pos-cart-empty">
                <svg
                  className="staff-pos-cart-empty-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="18" cy="21" r="1.5" />
                  <path d="M2.5 3.5h3l2.2 11a1.6 1.6 0 0 0 1.6 1.3h9.4a1.6 1.6 0 0 0 1.5-1.2L22 6.5H6" />
                </svg>
                <strong>Order is empty</strong>
                <span>Add products from the menu to start.</span>
              </div>
            )}
          </div>

          {/* Totals & Checkout Button */}
          <div className="staff-pos-order-footer">
            <div className="staff-pos-summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <div className="staff-pos-summary-row">
              <span>Tax (12%)</span>
              <strong>{money(tax)}</strong>
            </div>

            {/* Total Green Highlight Box */}
            <div className="staff-pos-total-box">
              <span className="staff-pos-total-label">Total</span>
              <strong className="staff-pos-total-amount">
                {money(grandTotal)}
              </strong>
            </div>

            {/* Prominent Checkout Button */}
            <button
              type="button"
              className="staff-pos-checkout-btn"
              disabled={safeCart.length === 0}
              onClick={handleOpenCheckout}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="15" x2="8" y2="15" />
                <line x1="12" y1="15" x2="16" y2="15" />
              </svg>
              <span>Checkout</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ══════════════ 3. CHECKOUT MODAL ══════════════ */}
      {checkoutModalOpen && (
        <div
          className="staff-pos-modal-overlay"
          onClick={() => setCheckoutModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-checkout-title"
        >
          <div
            className="staff-pos-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="staff-pos-modal-head">
              <h3 id="staff-checkout-title">Complete Transaction</h3>
              <button
                type="button"
                className="staff-pos-modal-close"
                onClick={() => setCheckoutModalOpen(false)}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProcessCheckout}>
              <div className="staff-pos-modal-body">
                {/* Total highlight banner */}
                <div className="staff-pos-modal-total-banner">
                  <span>Total Amount Due</span>
                  <strong>{money(grandTotal)}</strong>
                </div>

                {/* Customer name */}
                <div className="staff-pos-field-group">
                  <label className="staff-pos-field-label">Customer Name</label>
                  <input
                    type="text"
                    className="staff-pos-input"
                    value={customerName}
                    maxLength={60}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in guest"
                  />
                </div>

                {/* Order Type */}
                <div className="staff-pos-field-group">
                  <label className="staff-pos-field-label">Order Type</label>
                  <div className="staff-pos-order-types">
                    {['Dine in', 'Take out'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`staff-pos-method-btn${orderType === type ? ' is-active' : ''}`}
                        onClick={() => setOrderType(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="staff-pos-field-group">
                  <label className="staff-pos-field-label">Payment Method</label>
                  <div className="staff-pos-payment-methods">
                    {['Cash', 'GCash', 'Maya', 'Card', 'QR Payment'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`staff-pos-method-btn${paymentMethod === m ? ' is-active' : ''}`}
                        onClick={() => {
                          setPaymentMethod(m)
                          if (m !== 'Cash') {
                            setAmountTendered(grandTotal.toString())
                          }
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Tendered & Change (only when Cash is selected) */}
                {paymentMethod === 'Cash' && (
                  <div className="staff-pos-field-group">
                    <label className="staff-pos-field-label">Cash Tendered (₱)</label>
                    <input
                      type="number"
                      step="any"
                      min={grandTotal}
                      className="staff-pos-input"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder={`Enter amount (min. ₱${grandTotal.toFixed(2)})`}
                      required
                    />

                    {/* Quick Cash Chips */}
                    <div className="staff-pos-quick-cash">
                      <button
                        type="button"
                        className="staff-pos-cash-chip"
                        onClick={() => setAmountTendered(grandTotal.toString())}
                      >
                        Exact
                      </button>
                      {[200, 500, 1000, 2000].map((amt) => {
                        if (amt < grandTotal) return null
                        return (
                          <button
                            key={amt}
                            type="button"
                            className="staff-pos-cash-chip"
                            onClick={() => setAmountTendered(amt.toString())}
                          >
                            ₱{amt}
                          </button>
                        )
                      })}
                    </div>

                    {/* Change banner */}
                    <div className="staff-pos-change-banner">
                      <span>Change:</span>
                      <strong>
                        {money(Math.max(0, (Number(amountTendered) || 0) - grandTotal))}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="staff-pos-modal-actions">
                <button
                  type="button"
                  className="staff-pos-cancel-btn"
                  onClick={() => setCheckoutModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="staff-pos-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm & Complete Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redesigned POS Transaction Completed Success Popup */}
      {successTransaction && (
        <POSTransactionSuccessModal
          transaction={successTransaction}
          onClose={() => setSuccessTransaction(null)}
        />
      )}
    </div>
  )
}

export default function StaffPOSPage() {
  return (
    <StaffPOSErrorBoundary>
      <StaffPOSPageInner />
    </StaffPOSErrorBoundary>
  )
}
