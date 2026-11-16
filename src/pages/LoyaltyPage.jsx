import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'
import './LoyaltyPage.css'

const PAGE_SIZE_CHOICES = [10, 25, 50, 100]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

export default function LoyaltyPage() {
  const {
    points = 0,
    role,
    customers = [],
    setCustomers,
    rewards = [],
    setRewards,
    loyaltyHistory = [],
    redeemReward,
    setDialog,
    confirmAction,
    notify,
  } = useApp()

  const isAdmin = role === 'Admin'
  const [customerSearch, setCustomerSearch] = useState('')
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Admin Loyalty Management renders its own banner
  useEffect(() => {
    if (!isAdmin) return
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-loyalty-page-content')
    return () => {
      if (container) container.classList.remove('adm-loyalty-page-content')
    }
  }, [isAdmin])

  const visibleCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      `${c.name || ''} ${c.id || ''} ${c.email || ''}`.toLowerCase().includes(q),
    )
  }, [customers, customerSearch])

  const historyPagination = usePagination(loyaltyHistory, 10)
  const rewardPagination = usePagination(rewards, 10)
  const customerPointsPagination = usePagination(visibleCustomers, 10)

  // Determine the target next reward (default 200 pts / Complimentary dessert)
  const availableRewards = useMemo(
    () => rewards.filter((reward) => reward.available !== false),
    [rewards],
  )
  const nextReward = useMemo(() => {
    if (!availableRewards.length) {
      return { name: 'Complimentary dessert', points: 200 }
    }
    const sorted = [...availableRewards].sort((a, b) => Number(a.points) - Number(b.points))
    return sorted.find((r) => Number(r.points) > points) || sorted[0]
  }, [availableRewards, points])

  const nextRewardTarget = Number(nextReward?.points) || 200
  const progressPct = Math.min(100, Math.round((Number(points) / nextRewardTarget) * 100))
  const pointsRemaining = Math.max(nextRewardTarget - Number(points), 0)

  function adjustPoints(customerId, delta) {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? { ...customer, points: Math.max(0, customer.points + delta) }
          : customer,
      ),
    )
  }

  async function handleDeleteReward(reward) {
    const result = await confirmAction({
      title: `Remove "${reward.name}"?`,
      text: 'This reward will be permanently deleted from the catalog.',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Keep it',
      icon: 'warning',
    })
    if (!result.isConfirmed) return
    setRewards((current) => current.filter((entry) => entry.id !== reward.id))
    notify(`"${reward.name}" removed from the catalog`, {
      icon: 'success',
      title: 'Reward removed',
    })
  }

  function handleToggleReward(reward) {
    setRewards((current) =>
      current.map((entry) =>
        entry.id === reward.id ? { ...entry, available: !entry.available } : entry,
      ),
    )
    notify(
      `"${reward.name}" is now ${reward.available ? 'hidden' : 'available'}`,
      { icon: 'info', title: 'Reward updated' },
    )
  }

  /* ── Preserve Customer Loyalty view untouched ── */
  if (!isAdmin) {
    return (
      <>
        <section className="loyalty-hero">
          <div>
            <span className="eyebrow">RMJOHN&apos;S GOODNESS CLUB</span>
            <h2>A little something back.</h2>
            <p>Every visit brings you closer to a little treat.</p>
          </div>
          <div className="points-display">
            <span>AVAILABLE POINTS</span>
            <strong>{points}</strong>
            <small>1 point per ₱100 spent</small>
          </div>
        </section>

        <div className="loyalty-content">
          <section className="panel progress-panel">
            <div className="panel-heading">
              <div>
                <h2>Your next treat</h2>
                <p>Redeem a favorite on your next visit</p>
              </div>
              <span className="reward-icon">✳</span>
            </div>
            <div className="reward-progress">
              <div className="progress-track">
                <i style={{ width: `${Math.min(points / 2, 100)}%` }} />
              </div>
              <div>
                <strong>{points} pts</strong>
                <span>200 pts</span>
              </div>
            </div>
            <p className="reward-caption">
              {Math.max(200 - points, 0)} points until a complimentary dessert
            </p>
          </section>

          <section className="panel reward-panel">
            <div className="panel-heading">
              <div>
                <h2>Little rewards</h2>
                <p>Good things, earned</p>
              </div>
            </div>
            {availableRewards.map((reward) => (
              <div className="reward-item" key={reward.id}>
                <span className="reward-icon">✳</span>
                <div>
                  <strong>{reward.name}</strong>
                  <small>{reward.description}</small>
                </div>
                <button
                  className="button button-outline"
                  disabled={points < reward.points}
                  onClick={() => redeemReward(reward)}
                >
                  {reward.points} pts &middot; Redeem
                </button>
              </div>
            ))}
          </section>
        </div>

        <section className="panel full-panel points-history">
          <div className="panel-heading">
            <div>
              <h2>Points history</h2>
              <p>Purchases and redemptions in this session</p>
            </div>
          </div>
          {historyPagination.paginatedItems.map((entry) => (
            <div className="history-row" key={entry.id}>
              <span className="history-date">{entry.date}</span>
              <strong>{entry.detail}</strong>
              <span className={entry.delta >= 0 ? 'points-positive' : 'points-used'}>
                {entry.delta >= 0 ? '+' : ''}
                {entry.delta} pts
              </span>
            </div>
          ))}
          <Pagination {...historyPagination} />
        </section>
      </>
    )
  }

  /* ── Redesigned Admin Loyalty Management View ── */
  return (
    <div className="adm-loyalty-mgmt">
      {/* ══════════════ 1. LOYALTY HEADER BANNER ══════════════ */}
      <header className="adm-loy-banner">
        <svg
          className="adm-loy-banner-art"
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
          className="adm-loy-banner-leaves"
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

        <div className="adm-loy-banner-left">
          <span className="adm-loy-date">{dynamicDate}</span>
          <h1>Loyalty</h1>
          <p>Small gestures. Meaningful rewards.</p>
        </div>

        <button
          type="button"
          className="adm-loy-add-btn"
          onClick={() => setDialog({ type: 'add-reward' })}
        >
          <span className="adm-loy-plus" aria-hidden="true">+</span>
          <span>Add reward</span>
        </button>
      </header>

      {/* ══════════════ 2. LOYALTY AT A GLANCE ══════════════ */}
      <section className="adm-loy-glance-card" aria-label="Loyalty at a glance">
        <div className="adm-loy-glance-brand">
          <div className="adm-loy-gift-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 7h-2.18A3 3 0 0 0 15 3c-1.3 0-2.4.84-2.82 2h-.36C11.4 3.84 10.3 3 9 3a3 3 0 0 0-2.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-11-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-4 15H7v-8h4v8Zm6 0h-4v-8h4v8Z" />
            </svg>
          </div>
          <div>
            <h2>Loyalty at a glance</h2>
            <p>Your loyalty program overview</p>
          </div>
        </div>

        <div className="adm-loy-glance-metric">
          <span className="adm-loy-metric-label">Available Points</span>
          <div className="adm-loy-metric-value">
            <svg className="adm-loy-star-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="m12 2.2 2.95 6.1 6.73.95-4.88 4.72 1.16 6.7L12 17.48l-5.96 3.19 1.16-6.7L2.32 9.25l6.73-.95L12 2.2Z" />
            </svg>
            <strong>{points}</strong>
          </div>
        </div>

        <div className="adm-loy-glance-metric">
          <span className="adm-loy-metric-label">Next Reward</span>
          <div className="adm-loy-metric-value adm-loy-metric-next">
            <svg className="adm-loy-gift-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 7h-2.18A3 3 0 0 0 15 3c-1.3 0-2.4.84-2.82 2h-.36C11.4 3.84 10.3 3 9 3a3 3 0 0 0-2.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-11-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-4 15H7v-8h4v8Zm6 0h-4v-8h4v8Z" />
            </svg>
            <strong>{nextRewardTarget} pts</strong>
          </div>
        </div>

        <div className="adm-loy-glance-progress">
          <span className="adm-loy-metric-label">Your Progress</span>
          <div className="adm-loy-progress-inline">
            <div className="adm-loy-bar-track">
              <div
                className="adm-loy-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <strong>{progressPct}%</strong>
          </div>
        </div>
      </section>

      {/* ══════════════ 3. YOUR NEXT TREAT & LITTLE REWARDS ══════════════ */}
      <div className="adm-loy-two-col">
        {/* Left Card: Your next treat */}
        <section className="adm-loy-card adm-loy-treat-card">
          <div className="adm-loy-card-head">
            <div className="adm-loy-head-left">
              <svg className="adm-loy-head-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="m12 2.2 2.95 6.1 6.73.95-4.88 4.72 1.16 6.7L12 17.48l-5.96 3.19 1.16-6.7L2.32 9.25l6.73-.95L12 2.2Z" />
              </svg>
              <div>
                <h2>Your next treat</h2>
                <p>Redeem a favorite on your next visit</p>
              </div>
            </div>
            <span className="adm-loy-soft-star-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 2.2 2.95 6.1 6.73.95-4.88 4.72 1.16 6.7L12 17.48l-5.96 3.19 1.16-6.7L2.32 9.25l6.73-.95L12 2.2Z" />
              </svg>
            </span>
          </div>

          <div className="adm-loy-treat-progress">
            <div className="adm-loy-treat-track">
              <div
                className="adm-loy-treat-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="adm-loy-treat-scale">
              <strong>{points} pts</strong>
              <span>{nextRewardTarget} pts</span>
            </div>
          </div>

          <p className="adm-loy-treat-note">
            {pointsRemaining} points until a {(nextReward?.name || 'complimentary dessert').toLowerCase()}
          </p>
        </section>

        {/* Right Card: Little rewards */}
        <section className="adm-loy-card adm-loy-rewards-card">
          <div className="adm-loy-card-head">
            <div className="adm-loy-head-left">
              <svg className="adm-loy-head-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 7h-2.18A3 3 0 0 0 15 3c-1.3 0-2.4.84-2.82 2h-.36C11.4 3.84 10.3 3 9 3a3 3 0 0 0-2.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-11-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-4 15H7v-8h4v8Zm6 0h-4v-8h4v8Z" />
              </svg>
              <div>
                <h2>Little rewards</h2>
                <p>Good things, earned</p>
              </div>
            </div>
          </div>

          <div className="adm-loy-reward-list">
            {availableRewards.map((reward) => (
              <div className="adm-loy-reward-row" key={reward.id}>
                <span className="adm-loy-soft-star-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2.2 2.95 6.1 6.73.95-4.88 4.72 1.16 6.7L12 17.48l-5.96 3.19 1.16-6.7L2.32 9.25l6.73-.95L12 2.2Z" />
                  </svg>
                </span>
                <div className="adm-loy-reward-copy">
                  <strong>{reward.name}</strong>
                  <small>{reward.description}</small>
                </div>
                <button
                  type="button"
                  className="adm-loy-redeem-btn"
                  disabled={points < reward.points}
                  onClick={() => redeemReward(reward)}
                >
                  {reward.points} pts - Redeem
                </button>
              </div>
            ))}
            {availableRewards.length === 0 && (
              <p className="adm-loy-empty-inline">No active rewards available right now.</p>
            )}
          </div>
        </section>
      </div>

      {/* ══════════════ 4. POINTS HISTORY (FULL WIDTH TABLE) ══════════════ */}
      <section className="adm-loy-card adm-loy-table-card" aria-label="Points history">
        <div className="adm-loy-card-head adm-loy-table-card-head">
          <div className="adm-loy-head-left">
            <svg className="adm-loy-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <polyline points="3 3 3 8 8 8" />
              <polyline points="12 7 12 12 15.5 14" />
            </svg>
            <div>
              <h2>Points history</h2>
              <p>Purchases and redemptions in this session</p>
            </div>
          </div>
        </div>

        <div className="adm-loy-table-scroll">
          <table className="adm-loy-table adm-loy-history-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th className="col-points-right">POINTS</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.paginatedItems.map((entry) => {
                const isPositive = Number(entry.delta) >= 0
                return (
                  <tr key={entry.id}>
                    <td className="adm-loy-td-date">{entry.date}</td>
                    <td className="adm-loy-td-desc">
                      {String(entry.detail || '').replace('·', '-')}
                    </td>
                    <td className="col-points-right">
                      <span className={isPositive ? 'adm-loy-pts-earned' : 'adm-loy-pts-redeemed'}>
                        {isPositive ? '+' : ''}
                        {entry.delta} pts
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {loyaltyHistory.length === 0 && (
            <div className="adm-loy-empty">No loyalty transactions recorded yet.</div>
          )}
        </div>

        {/* History Pagination Footer matching reference */}
        <div className="adm-loy-footer">
          <div className="adm-loy-footer-left">
            <span className="adm-loy-showing">
              Showing <strong>{historyPagination.startEntry}&ndash;{historyPagination.endEntry}</strong> of{' '}
              <strong>{historyPagination.totalItems}</strong> entries
            </span>

            <label className="adm-loy-rows-label">
              <span>Rows per page:</span>
              <div className="adm-loy-rows-select-wrap">
                <select
                  value={historyPagination.pageSize}
                  onChange={(e) => historyPagination.onPageSizeChange(Number(e.target.value))}
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

          <div className="adm-loy-footer-right">
            <button
              type="button"
              className="adm-loy-page-nav"
              disabled={historyPagination.currentPage <= 1}
              onClick={() => historyPagination.onPageChange(1)}
            >
              &laquo; First
            </button>
            <button
              type="button"
              className="adm-loy-page-nav"
              disabled={historyPagination.currentPage <= 1}
              onClick={() => historyPagination.onPageChange(historyPagination.currentPage - 1)}
            >
              &lsaquo; Prev
            </button>

            <div className="adm-loy-page-numbers">
              {Array.from({ length: historyPagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`adm-loy-page-num${pageNum === historyPagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === historyPagination.currentPage ? 'page' : undefined}
                  onClick={() => historyPagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="adm-loy-page-nav"
              disabled={historyPagination.currentPage >= historyPagination.totalPages}
              onClick={() => historyPagination.onPageChange(historyPagination.currentPage + 1)}
            >
              Next &rsaquo;
            </button>
            <button
              type="button"
              className="adm-loy-page-nav"
              disabled={historyPagination.currentPage >= historyPagination.totalPages}
              onClick={() => historyPagination.onPageChange(historyPagination.totalPages)}
            >
              Last &raquo;
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════ 5. REWARD CATALOG & CUSTOMER POINTS (2-COLUMN) ══════════════ */}
      <div className="adm-loy-bottom-grid">
        {/* Left Table Card: Reward Catalog */}
        <section className="adm-loy-card adm-loy-table-card" aria-label="Reward catalog">
          <div className="adm-loy-card-head adm-loy-table-card-head">
            <div className="adm-loy-head-left">
              <svg className="adm-loy-head-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18 4V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1H3a1 1 0 0 0-1 1v3c0 2.62 1.98 4.78 4.53 4.98A6.01 6.01 0 0 0 11 16.9V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.1a6.01 6.01 0 0 0 4.47-3.92C20.02 12.78 22 10.62 22 8V5a1 1 0 0 0-1-1h-3ZM4 8V6h2v4.83C4.84 10.42 4 9.31 4 8Zm16 0c0 1.31-.84 2.42-2 2.83V6h2v2Z" />
              </svg>
              <div>
                <h2>Reward catalog</h2>
                <p>Update available rewards and point costs</p>
              </div>
            </div>
          </div>

          <div className="adm-loy-table-scroll">
            <table className="adm-loy-table">
              <thead>
                <tr>
                  <th>REWARD</th>
                  <th>POINT COST</th>
                  <th>STATUS</th>
                  <th className="col-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rewardPagination.paginatedItems.map((reward) => (
                  <tr key={reward.id}>
                    <td>
                      <div className="adm-loy-reward-cell">
                        <strong>{reward.name}</strong>
                        <small>{reward.description}</small>
                      </div>
                    </td>
                    <td className="adm-loy-td-cost">{reward.points} pts</td>
                    <td>
                      <button
                        type="button"
                        className={`adm-loy-status-pill ${reward.available ? 'is-available' : 'is-hidden'}`}
                        onClick={() => handleToggleReward(reward)}
                        title="Click to toggle reward availability"
                      >
                        <i className="adm-loy-status-dot" aria-hidden="true" />
                        <span>{reward.available ? 'Available' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td className="col-center">
                      <div className="adm-loy-actions">
                        <button
                          type="button"
                          className="adm-loy-action-btn adm-loy-edit-btn"
                          aria-label={`Edit ${reward.name}`}
                          title={`Edit ${reward.name}`}
                          onClick={() => setDialog({ type: 'edit-reward', reward })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="adm-loy-action-btn adm-loy-delete-btn"
                          aria-label={`Delete ${reward.name}`}
                          title={`Delete ${reward.name}`}
                          onClick={() => handleDeleteReward(reward)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rewards.length === 0 && (
              <div className="adm-loy-empty">No rewards in catalog.</div>
            )}
          </div>

          {rewardPagination.totalPages > 1 && (
            <div className="adm-loy-compact-pagination">
              <Pagination {...rewardPagination} />
            </div>
          )}
        </section>

        {/* Right Table Card: Customer Points */}
        <section className="adm-loy-card adm-loy-table-card" aria-label="Customer points">
          <div className="adm-loy-card-head adm-loy-table-card-head adm-loy-cust-head">
            <div className="adm-loy-head-left">
              <svg className="adm-loy-head-icon" viewBox="0 0 36 28" fill="currentColor" aria-hidden="true">
                <circle cx="18" cy="8.5" r="4.8" />
                <circle cx="8" cy="10.5" r="3.6" />
                <circle cx="28" cy="10.5" r="3.6" />
                <path d="M9.5 25c0-4.4 3.8-7.8 8.5-7.8s8.5 3.4 8.5 7.8H9.5Z" />
                <path d="M1.5 25c0-3.2 2.5-5.8 5.8-6.2-.9 1.3-1.4 2.9-1.4 4.7V25H1.5Zm33 0h-4.4v-1.5c0-1.8-.5-3.4-1.4-4.7 3.3.4 5.8 3 5.8 6.2Z" />
              </svg>
              <div>
                <h2>Customer points</h2>
                <p>Manage customer points manually</p>
              </div>
            </div>

            <label className="adm-loy-cust-search" aria-label="Search customer points">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.2" y2="16.2" />
              </svg>
              <input
                type="text"
                placeholder="Search customer points..."
                value={customerSearch}
                maxLength={120}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="adm-loy-table-scroll">
            <table className="adm-loy-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>POINTS</th>
                  <th className="col-center">ADJUST</th>
                </tr>
              </thead>
              <tbody>
                {customerPointsPagination.paginatedItems.map((customer) => (
                  <tr key={customer.id}>
                    <td className="adm-loy-td-cust">
                      {customer.name} - {customer.id}
                    </td>
                    <td className="adm-loy-td-cust-pts">{customer.points}</td>
                    <td className="col-center">
                      <div className="adm-loy-adjust-group">
                        <button
                          type="button"
                          className="adm-loy-adjust-btn"
                          onClick={() => adjustPoints(customer.id, -10)}
                          aria-label={`Remove 10 points from ${customer.name}`}
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          className="adm-loy-adjust-btn"
                          onClick={() => adjustPoints(customer.id, 10)}
                          aria-label={`Add 10 points to ${customer.name}`}
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleCustomers.length === 0 && (
              <div className="adm-loy-empty">No matching customers found.</div>
            )}
          </div>

          {customerPointsPagination.totalPages > 1 && (
            <div className="adm-loy-compact-pagination">
              <Pagination {...customerPointsPagination} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
