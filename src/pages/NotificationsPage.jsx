import { useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { usePagination } from '../components/shared'
import './NotificationsPage.css'

const PAGE_SIZE_CHOICES = [10, 25, 50, 100]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} · ${monthDayYear}`
}

function NotificationIcon({ title = '' }) {
  const t = title.toLowerCase()
  if (t.includes('payment')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  }
  if (t.includes('attendance')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    )
  }
  if (t.includes('loyalty') || t.includes('reward')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  // Default / Order
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="11" y2="12" />
    </svg>
  )
}

export default function NotificationsPage() {
  const { notifications = [], setNotifications, role } = useApp()
  const isCustomer = role === 'Customer'
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Staff Notifications renders its own banner
  useEffect(() => {
    if (isCustomer) return
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('staff-notifications-page-content')
    return () => {
      if (container) container.classList.remove('staff-notifications-page-content')
    }
  }, [isCustomer])

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notice) =>
      isCustomer
        ? !notice.audience || notice.audience === 'all' || notice.audience === 'customer'
        : notice.audience !== 'customer',
    )
  }, [notifications, isCustomer])

  const unread = useMemo(
    () => visibleNotifications.filter((notice) => !notice.read).length,
    [visibleNotifications],
  )

  const pagination = usePagination(visibleNotifications, 10)

  function markAllRead() {
    const visibleIds = new Set(visibleNotifications.map((notice) => notice.id))
    setNotifications((current) =>
      current.map((notice) => (visibleIds.has(notice.id) ? { ...notice, read: true } : notice)),
    )
  }

  function markSingleRead(id) {
    setNotifications((current) =>
      current.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
    )
  }

  return (
    <div className="staff-notifications-mgmt">
      {/* ══════════════ 1. TOP KITCHEN-STYLE BANNER ══════════════ */}
      <header className="staff-notif-banner">
        {/* Decorative curved waves art */}
        <svg
          className="staff-notif-banner-art"
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

        {/* Decorative botanical leaves cluster */}
        <svg
          className="staff-notif-banner-leaves"
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

        <div className="staff-notif-banner-left">
          <span className="staff-notif-date">{dynamicDate}</span>
          <h1>Notifications</h1>
          <p>The latest system updates.</p>
        </div>
      </header>

      {/* ══════════════ 2. NOTIFICATIONS CONTAINER ══════════════ */}
      <section className="staff-notif-card" aria-label="System notifications">
        <div className="staff-notif-card-header">
          <div className="staff-notif-card-titles">
            <h2>{unread ? `${unread} updates to catch up on` : 'You’re all caught up'}</h2>
            <p>Order, payment, attendance, and loyalty activity</p>
          </div>

          <button
            type="button"
            className="staff-notif-mark-read-btn"
            disabled={!unread}
            onClick={markAllRead}
          >
            Mark all as read
          </button>
        </div>

        {/* ══════════════ 3. NOTIFICATION ITEMS LIST ══════════════ */}
        <div className="staff-notif-list">
          {pagination.paginatedItems.map((notice) => (
            <div
              className={`staff-notif-item${notice.read ? ' is-read' : ''}`}
              key={notice.id}
              onClick={() => markSingleRead(notice.id)}
            >
              <div className="staff-notif-item-left">
                <div className="staff-notif-icon-circle" aria-hidden="true">
                  <NotificationIcon title={notice.title} />
                </div>
                <div className="staff-notif-item-copy">
                  <h3 className="staff-notif-item-title">{notice.title}</h3>
                  <p className="staff-notif-item-detail">{notice.detail}</p>
                </div>
              </div>

              <span className="staff-notif-item-time">{notice.time || 'Just now'}</span>
            </div>
          ))}

          {visibleNotifications.length === 0 && (
            <div className="staff-notif-empty">
              No notifications to display right now.
            </div>
          )}
        </div>

        {/* ══════════════ 4. PAGINATION FOOTER ══════════════ */}
        <div className="staff-notif-footer">
          <div className="staff-notif-footer-left">
            <span className="staff-notif-showing">
              Showing {pagination.startEntry}&ndash;{pagination.endEntry} of{' '}
              {pagination.totalItems} entries
            </span>

            <label className="staff-notif-rows-label">
              <span>Rows per page:</span>
              <div className="staff-notif-rows-select-wrap">
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

          <div className="staff-notif-footer-right">
            <button
              type="button"
              className="staff-notif-page-nav"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(1)}
            >
              &laquo; First
            </button>

            <button
              type="button"
              className="staff-notif-page-nav"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              &lsaquo; Prev
            </button>

            <div className="staff-notif-page-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`staff-notif-page-num${pageNum === pagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === pagination.currentPage ? 'page' : undefined}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="staff-notif-page-nav"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next &rsaquo;
            </button>

            <button
              type="button"
              className="staff-notif-page-nav"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.totalPages)}
            >
              Last &raquo;
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
