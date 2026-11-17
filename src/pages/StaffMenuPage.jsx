import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { useApp } from '../context/AppContext'
import { usePagination } from '../components/shared'
import { money } from '../data/mockData'
import './StaffMenuPage.css'

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} · ${monthDayYear}`
}

export default function StaffMenuPage() {
  const { menu = [], addToCart, updateMenuItem, notify } = useApp()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // ── Edit Modal State ───────────────────────────────────────────
  const [editingItem, setEditingItem] = useState(null)
  const [editAvailable, setEditAvailable] = useState(true)
  const [editStock, setEditStock] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Hide the generic AppShell page-heading when Staff Menu renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('staff-menu-page-content')
    return () => {
      if (container) container.classList.remove('staff-menu-page-content')
    }
  }, [])

  // Calculate actual dynamic counts for each existing database category
  const categoryCounts = useMemo(() => {
    const counts = { All: menu.length }
    for (const item of menu) {
      if (!item) continue
      const cat = item.category || 'Other'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [menu])

  // Preserve exact existing database category names and order, starting with 'All'
  const categoriesList = useMemo(() => {
    const existingCats = []
    for (const item of menu) {
      if (item?.category && !existingCats.includes(item.category)) {
        existingCats.push(item.category)
      }
    }
    return ['All', ...existingCats]
  }, [menu])

  // Filter menu items by search and category using exact database category matches
  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    return menu.filter((item) => {
      if (!item) return false
      // Exact category matching
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
  }, [menu, search, selectedCategory])

  // 12 items per page (2 rows x 6 columns) matching reference image
  const pagination = usePagination(filteredMenu, 12)

  // Reset pagination to first page when search or category changes
  useEffect(() => {
    pagination.onPageChange(1)
  }, [search, selectedCategory])

  function handleAddToCart(item) {
    if (!item.available) {
      notify?.(`${item.name} is currently unavailable.`, { icon: 'warning' })
      return
    }
    addToCart(item)
    notify?.(`${item.name} added to cart`, { icon: 'success' })
  }

  // ── Open Edit Modal for a Menu Item ────────────────────────────
  function handleOpenEditModal(item) {
    setEditingItem(item)
    setEditAvailable(Boolean(item.available !== false))
    setEditStock(item.stock != null ? String(item.stock) : '')
  }

  function handleCloseEditModal() {
    if (isSaving) return
    setEditingItem(null)
  }

  // ── Save Changes (Staff permissions enforced: only available & stock) ──
  async function handleSaveItem() {
    if (!editingItem) return
    setIsSaving(true)

    try {
      // ONLY availability and stock are transmitted — strict frontend boundary
      const updates = {
        available: Boolean(editAvailable),
      }
      if (editStock !== '' && editStock != null) {
        const parsed = parseInt(editStock, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          updates.stock = parsed
        }
      }

      await updateMenuItem(editingItem.id, updates)

      const savedName = editingItem.name
      const savedAvailability = editAvailable

      setEditingItem(null)

      // Centered SweetAlert notification
      Swal.fire({
        position: 'center',
        icon: 'success',
        title: 'Menu Item Updated',
        text: `"${savedName}" availability updated to ${savedAvailability ? 'Available' : 'Unavailable'}.`,
        confirmButtonColor: '#1B3B2B',
        confirmButtonText: 'Done',
        background: '#F9F9F6',
        color: '#1B3B2B',
        customClass: {
          popup: 'rmj-swal-popup',
          confirmButton: 'rmj-swal-confirm-btn',
        },
      })
    } catch (err) {
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not update menu item.',
        confirmButtonColor: '#1B3B2B',
        background: '#F9F9F6',
        color: '#1B3B2B',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="staff-menu-mgmt">
      {/* ══════════════ 1. TOP KITCHEN-STYLE BANNER ══════════════ */}
      <header className="staff-menu-banner">
        {/* Decorative curved waves art */}
        <svg
          className="staff-menu-banner-art"
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
          className="staff-menu-banner-leaves"
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

        <div className="staff-menu-banner-left">
          <span className="staff-menu-date">{dynamicDate}</span>
          <h1>Menu Management</h1>
          <p>Browse our menu offerings and manage item availability.</p>
        </div>
      </header>

      {/* ══════════════ 2. SEARCH BAR ══════════════ */}
      <div className="staff-menu-search-wrap">
        <svg
          className="staff-menu-search-icon"
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
          className="staff-menu-search-input"
          value={search}
          maxLength={120}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
        />
        {search && (
          <button
            type="button"
            className="staff-menu-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* ══════════════ 3. CATEGORY FILTERS ══════════════ */}
      <div className="staff-menu-categories" role="tablist" aria-label="Menu categories">
        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat
          const count = categoryCounts[cat] ?? 0
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`staff-menu-cat-btn${isSelected ? ' is-active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* ══════════════ 4. FOOD CARDS GRID ══════════════ */}
      <div className="staff-menu-grid">
        {pagination.paginatedItems.map((item) => {
          const imgSrc = item.imageUrl || item.image || '/admin-banner-dish.jpg'
          const isAvail = Boolean(item.available !== false)
          return (
            <div className={`staff-menu-card${!isAvail ? ' is-item-unavailable' : ''}`} key={item.id}>
              {/* Image with Availability Badge & Quick Edit */}
              <div className="staff-menu-card-img-wrap">
                <img
                  src={imgSrc}
                  alt={item.name}
                  className="staff-menu-card-img"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = '/admin-banner-dish.jpg'
                  }}
                />
                <span className={`staff-menu-card-status-pill ${isAvail ? 'status-avail' : 'status-unavail'}`}>
                  <span className="staff-menu-status-dot" aria-hidden="true" />
                  <span>{isAvail ? 'Available' : 'Unavailable'}</span>
                </span>
              </div>

              <div className="staff-menu-card-body">
                <div className="staff-menu-card-details">
                  <h3 className="staff-menu-item-name" title={item.name}>
                    {item.name}
                  </h3>
                  <span className="staff-menu-item-price">
                    {money(item.price)}
                  </span>
                </div>

                {/* Card Action Buttons Row: Edit Button + Add to Cart Button */}
                <div className="staff-menu-card-actions">
                  <button
                    type="button"
                    className="staff-menu-card-edit-btn"
                    onClick={() => handleOpenEditModal(item)}
                    title={`Edit ${item.name} availability`}
                    aria-label={`Edit ${item.name}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className={`staff-menu-add-btn${!isAvail ? ' is-btn-disabled' : ''}`}
                    disabled={!isAvail}
                    onClick={() => handleAddToCart(item)}
                    title={isAvail ? `Add ${item.name} to cart` : 'Item currently unavailable'}
                  >
                    <svg
                      width="13"
                      height="13"
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
                    <span>{isAvail ? 'Add to Cart' : 'Unavailable'}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filteredMenu.length === 0 && (
          <div className="staff-menu-empty">
            No menu items found matching &quot;{search}&quot;.
          </div>
        )}
      </div>

      {/* ══════════════ 5. PAGINATION FOOTER ══════════════ */}
      {filteredMenu.length > 0 && (
        <div className="staff-menu-pagination">
          <span className="staff-menu-pagi-info">
            Showing {pagination.startEntry}&ndash;{pagination.endEntry} of{' '}
            {pagination.totalItems} items
          </span>

          <div className="staff-menu-pagi-controls">
            <button
              type="button"
              className="staff-menu-pagi-nav"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              aria-label="Previous page"
            >
              &lsaquo;
            </button>

            <div className="staff-menu-pagi-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`staff-menu-pagi-num${pageNum === pagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === pagination.currentPage ? 'page' : undefined}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="staff-menu-pagi-nav"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              aria-label="Next page"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ 6. STAFF EDIT MENU ITEM MODAL ══════════════ */}
      {editingItem && (
        <div
          className="staff-menu-modal-backdrop"
          onClick={handleCloseEditModal}
          role="presentation"
        >
          <div
            className="staff-menu-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-edit-modal-title"
          >
            {/* Modal Header */}
            <div className="staff-menu-modal-header">
              <div className="staff-menu-modal-title-wrap">
                <span className="staff-menu-modal-icon-badge" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
                <div>
                  <h2 id="staff-edit-modal-title">Edit Menu Item</h2>
                  <p>Staff item management &mdash; availability &amp; stock</p>
                </div>
              </div>
              <button
                type="button"
                className="staff-menu-modal-close"
                onClick={handleCloseEditModal}
                disabled={isSaving}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Read-only Item Summary Box (Restricted details locked to Admin) */}
            <div className="staff-menu-modal-preview">
              <img
                src={editingItem.imageUrl || editingItem.image || '/admin-banner-dish.jpg'}
                alt={editingItem.name}
                className="staff-menu-modal-preview-img"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = '/admin-banner-dish.jpg'
                }}
              />
              <div className="staff-menu-modal-preview-info">
                <div className="staff-menu-modal-preview-top">
                  <h3 title={editingItem.name}>{editingItem.name}</h3>
                  <span className="staff-menu-modal-admin-badge" title="Food name, price, category, and image are managed by Admin only">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Admin Managed</span>
                  </span>
                </div>
                <div className="staff-menu-modal-preview-meta">
                  <span className="staff-menu-modal-cat-tag">{editingItem.category}</span>
                  <strong className="staff-menu-modal-price-tag">{money(editingItem.price)}</strong>
                </div>
                <p className="staff-menu-modal-desc-note">
                  {editingItem.description || 'Standard kitchen recipe.'}
                </p>
              </div>
            </div>

            {/* Editable Controls */}
            <div className="staff-menu-modal-body">
              {/* 1. Availability Status */}
              <div className="staff-menu-modal-field">
                <label className="staff-menu-modal-label">
                  Availability Status <span className="staff-req-star">*</span>
                </label>
                <div className="staff-menu-avail-selector" role="radiogroup" aria-label="Availability Status">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={editAvailable}
                    className={`staff-menu-avail-opt ${editAvailable ? 'is-selected is-available' : ''}`}
                    onClick={() => setEditAvailable(true)}
                  >
                    <span className="staff-menu-avail-dot dot-available" aria-hidden="true" />
                    <div className="staff-menu-avail-text">
                      <strong>Available</strong>
                      <small>Ready for kitchen preparation and customer ordering</small>
                    </div>
                    {editAvailable && (
                      <span className="staff-menu-check-badge" aria-hidden="true">✓</span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={!editAvailable}
                    className={`staff-menu-avail-opt ${!editAvailable ? 'is-selected is-unavailable' : ''}`}
                    onClick={() => setEditAvailable(false)}
                  >
                    <span className="staff-menu-avail-dot dot-unavailable" aria-hidden="true" />
                    <div className="staff-menu-avail-text">
                      <strong>Unavailable</strong>
                      <small>Temporarily out of stock or ingredients depleted</small>
                    </div>
                    {!editAvailable && (
                      <span className="staff-menu-check-badge" aria-hidden="true">✓</span>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Stock Quantity (Optional / Supported) */}
              <div className="staff-menu-modal-field">
                <div className="staff-menu-label-row">
                  <label className="staff-menu-modal-label" htmlFor="staff-menu-stock-input">
                    Stock Quantity
                  </label>
                  <span className="staff-menu-optional-tag">Daily inventory tracking</span>
                </div>
                <div className="staff-menu-stock-stepper">
                  <button
                    type="button"
                    className="staff-stock-step-btn"
                    onClick={() => setEditStock((s) => Math.max(0, (parseInt(s, 10) || 0) - 1))}
                    aria-label="Decrease stock count"
                  >
                    &minus;
                  </button>
                  <input
                    id="staff-menu-stock-input"
                    type="number"
                    min="0"
                    max="9999"
                    className="staff-stock-input"
                    placeholder="Unlimited / On-demand"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                  <button
                    type="button"
                    className="staff-stock-step-btn"
                    onClick={() => setEditStock((s) => (parseInt(s, 10) || 0) + 1)}
                    aria-label="Increase stock count"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="staff-stock-reset-btn"
                    onClick={() => setEditStock('')}
                    title="Set to unlimited on-demand stock"
                  >
                    Unlimited
                  </button>
                </div>
                <small className="staff-stock-hint">
                  Leave blank or set to &ldquo;Unlimited&rdquo; for standard regular preparation.
                </small>
              </div>

              {/* Security Advisory / Admin Guard Notice */}
              <div className="staff-menu-modal-security-note">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Staff privileges permit editing item availability and stock levels only. Name, price, category, and photo changes require Administrator access.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="staff-menu-modal-actions">
              <button
                type="button"
                className="staff-menu-modal-cancel-btn"
                onClick={handleCloseEditModal}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="staff-menu-modal-save-btn"
                onClick={handleSaveItem}
                disabled={isSaving}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
