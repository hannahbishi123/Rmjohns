/**
 * KitchenPage — real-time Kanban board for kitchen staff & administrators
 *
 * Order data flows:
 *   1. Orders saved to XAMPP via the normal app state sync.
 *   2. Firebase listener in AppContext merges status changes in real time.
 *   3. When a kitchen worker advances an order, updateOrder() updates local
 *      state AND the next PUT /api/state call syncs both MySQL and Firebase.
 *   4. Other connected clients (customer screen, admin dashboard) receive the
 *      Firebase status update without a page refresh.
 */
import { useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'
import './KitchenPage.css'

const KITCHEN_COLUMNS = [
  {
    key: 'Pending',
    title: 'Pending',
    subtitle: 'Orders waiting to be prepared',
    nextStatus: 'Preparing',
    buttonLabel: 'Start Preparing',
    buttonIcon: 'play',
  },
  {
    key: 'Preparing',
    title: 'Preparing',
    subtitle: 'Orders in preparation',
    nextStatus: 'Ready',
    buttonLabel: 'Mark Ready',
    buttonIcon: 'check',
  },
  {
    key: 'Ready',
    title: 'Ready',
    subtitle: 'Orders ready for pickup/serving',
    nextStatus: 'Completed',
    buttonLabel: 'Complete Order',
    buttonIcon: 'check',
  },
]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

function ColumnHeaderIcon({ columnKey }) {
  if (columnKey === 'Pending') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    )
  }
  if (columnKey === 'Preparing') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3c-2.2 0-4.1 1.2-5 3-.4-.1-.8-.1-1.2-.1-2.6 0-4.8 2-4.8 4.6 0 2 1.3 3.7 3.2 4.3V19a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2v-4.2c1.9-.6 3.2-2.3 3.2-4.3 0-2.6-2.2-4.6-4.8-4.6-.4 0-.8 0-1.2.1-.9-1.8-2.8-3-5-3Zm-4.5 13h9v2.5h-9V16Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.4 14.2-3.8-3.8 1.4-1.4 2.4 2.4 5.2-5.2 1.4 1.4-6.6 6.6Z" />
    </svg>
  )
}

function OrderTypeIcon({ type }) {
  const lower = String(type || 'Dine in').toLowerCase()
  if (lower.includes('pickup')) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v11c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V8c0-1.1-.9-2-2-2Zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2Z" />
      </svg>
    )
  }
  if (lower.includes('online')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 2v9a2 2 0 0 1-2 2v9H3v-9a2 2 0 0 1-2-2V2h2v7h1V2h2v7h1V2h2Zm10 0c2.21 0 4 2.24 4 5 0 2.25-1.2 4.15-2.85 4.78L18 22h-2.5l-.15-10.22C13.7 11.15 12.5 9.25 12.5 7c0-2.76 1.79-5 4-5Z" />
    </svg>
  )
}

export default function KitchenPage() {
  const { orders = [], updateOrder, notify, firebaseConnected } = useApp()
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Kitchen Management renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-kitchen-page-content')
    return () => {
      if (container) container.classList.remove('adm-kitchen-page-content')
    }
  }, [])

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(order.status),
      ),
    [orders],
  )

  function handleRefresh() {
    notify('Kitchen queue refreshed from live data')
  }

  return (
    <div className="adm-kitchen-mgmt">
      {/* ══════════════ 1. KITCHEN HEADER BANNER ══════════════ */}
      <header className="adm-kit-banner">
        <svg
          className="adm-kit-banner-art"
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
          className="adm-kit-banner-leaves"
          viewBox="0 0 220 130"
          fill="none"
          aria-hidden="true"
        >
          <path d="M110 128 C118 82 146 46 186 22 C178 70 152 108 110 128 Z" fill="#5D9E31" />
          <path d="M114 124 Q148 72 182 26" stroke="#B7E048" strokeWidth="2" strokeLinecap="round" />
          <path d="M68 132 C80 92 112 64 156 54 C136 96 104 122 68 132 Z" fill="#77B83F" />
          <path d="M72 128 Q112 90 152 56" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M36 128 C52 106 78 92 108 92 C90 116 64 128 36 128 Z" fill="#498425" />
        </svg>

        <div className="adm-kit-banner-left">
          <span className="adm-kit-date">{dynamicDate}</span>
          <h1>Kitchen</h1>
          <p>Prepare tickets and move orders through the kitchen.</p>
        </div>

        <button
          type="button"
          className="adm-kit-banner-btn"
          onClick={handleRefresh}
        >
          <span className="adm-kit-plus" aria-hidden="true">+</span>
          <span>Refresh</span>
        </button>
      </header>

      {/* ══════════════ 2. KITCHEN QUEUE SUMMARY CARD ══════════════ */}
      <section className="adm-kit-summary-card" aria-label="Kitchen queue summary">
        <div className="adm-kit-summary-brand">
          <div className="adm-kit-chef-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-2.2 0-4.1 1.2-5 3-.4-.1-.8-.1-1.2-.1-2.6 0-4.8 2-4.8 4.6 0 2 1.3 3.7 3.2 4.3V19a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2v-4.2c1.9-.6 3.2-2.3 3.2-4.3 0-2.6-2.2-4.6-4.8-4.6-.4 0-.8 0-1.2.1-.9-1.8-2.8-3-5-3Zm-4.5 13h9v2.5h-9V16Z" />
            </svg>
          </div>
          <div>
            <h2>Kitchen Queue</h2>
            <p>Live order updates</p>
          </div>
        </div>

        <div className="adm-kit-summary-tickets">
          <strong>{activeOrders.length}</strong>
          <span>Active Tickets</span>
        </div>

        <div className="adm-kit-summary-status">
          <span
            className={`adm-kit-live-pill ${firebaseConnected ? 'is-live' : 'is-local'}`}
            title={
              firebaseConnected
                ? 'Firebase connected — live order updates active'
                : 'Using local data — orders still update immediately'
            }
          >
            <i className="adm-kit-live-dot" aria-hidden="true" />
            <span>{firebaseConnected ? 'LIVE' : 'LIVE'}</span>
          </span>
        </div>

        <div className="adm-kit-summary-actions">
          <button
            type="button"
            className="adm-kit-refresh-btn"
            onClick={handleRefresh}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-15.5-6.36L3 8" />
              <polyline points="3 3 3 8 8 8" />
              <path d="M3 12a9 9 0 0 0 15.5 6.36L21 16" />
              <polyline points="16 16 21 16 21 21" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* ══════════════ 3. KITCHEN ORDER BOARD (3 COLUMNS) ══════════════ */}
      <div className="adm-kit-board">
        {KITCHEN_COLUMNS.map((col) => {
          const stageOrders = activeOrders.filter((order) =>
            col.key === 'Pending'
              ? ['Pending', 'Confirmed'].includes(order.status)
              : order.status === col.key,
          )

          return (
            <section
              className="adm-kit-column"
              key={col.key}
              aria-label={`${col.title} orders`}
            >
              {/* Column Header */}
              <div className="adm-kit-col-head">
                <div className="adm-kit-col-head-left">
                  <span className="adm-kit-col-icon">
                    <ColumnHeaderIcon columnKey={col.key} />
                  </span>
                  <div>
                    <h2>{col.title}</h2>
                    <p>{col.subtitle}</p>
                  </div>
                </div>
                <span className="adm-kit-col-count">{stageOrders.length}</span>
              </div>

              {/* Column Order Cards */}
              <div className="adm-kit-col-body">
                {stageOrders.map((order) => (
                  <article className="adm-kit-ticket" key={order.id}>
                    <div className="adm-kit-ticket-main">
                      {/* Order ID Badge */}
                      <div className="adm-kit-ticket-id-badge">
                        <strong>{order.id}</strong>
                      </div>

                      {/* Order Details */}
                      <div className="adm-kit-ticket-info">
                        <div className="adm-kit-ticket-top">
                          <span className="adm-kit-ticket-time">{order.time}</span>
                          <strong className="adm-kit-ticket-total">{money(order.total)}</strong>
                        </div>

                        <p className="adm-kit-ticket-items">{order.items}</p>

                        <div className="adm-kit-ticket-tags">
                          <span className="adm-kit-type-pill">
                            <OrderTypeIcon type={order.type} />
                            <span>{order.type || 'Dine in'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Full-Width Forest-Green Action Button */}
                    <button
                      type="button"
                      className="adm-kit-action-btn"
                      onClick={() => updateOrder(order.id, col.nextStatus)}
                    >
                      <span className="adm-kit-action-left">
                        {col.buttonIcon === 'play' ? (
                          <svg
                            className="adm-kit-btn-icon"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <polygon points="7 5 19 12 7 19 7 5" />
                          </svg>
                        ) : (
                          <svg
                            className="adm-kit-btn-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span>{col.buttonLabel}</span>
                      </span>
                      <span className="adm-kit-action-arrow" aria-hidden="true">→</span>
                    </button>
                  </article>
                ))}

                {stageOrders.length === 0 && (
                  <div className="adm-kit-col-empty">
                    <p>No {col.title.toLowerCase()} tickets right now.</p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
