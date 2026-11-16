import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { FoodCard, Pagination, usePagination } from '../components/shared'
import { money } from '../data/mockData'
import './MenuPage.css'

const MENU_CATEGORIES = [
  'All',
  'Silog Meals',
  'Solo Orders',
  'Ulam + Kanin',
  'Extras',
  'Cold Drinks',
  'Hot Drinks',
  'Desserts',
]

function SortChevrons({ active, direction }) {
  return (
    <span className={`adm-mm-sort-icon${active ? ' is-active' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 12 16" fill="none">
        <path
          d="M3.5 6L6 3.2L8.5 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active && direction === 'desc' ? 0.35 : 1}
        />
        <path
          d="M3.5 10L6 12.8L8.5 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active && direction === 'asc' ? 0.35 : 1}
        />
      </svg>
    </span>
  )
}

export default function MenuPage() {
  const {
    role, filteredMenu, categories, category, setCategory,
    query, setQuery, addToCart, updateMenuItem, setDialog, cartCount,
  } = useApp()

  const isAdmin = role === 'Admin'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Hide the generic AppShell page-heading when Admin Menu Management renders its own banner
  useEffect(() => {
    if (!isAdmin) return
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-menu-page-content')
    return () => {
      if (container) container.classList.remove('adm-menu-page-content')
    }
  }, [isAdmin])

  // Ensure standard 8 categories are always present in exact order + any custom categories
  const orderedCategories = useMemo(() => {
    const extra = (categories || []).filter((c) => !MENU_CATEGORIES.includes(c))
    return [...MENU_CATEGORIES, ...extra]
  }, [categories])

  const baseMenu = useMemo(
    () => (isAdmin ? filteredMenu : filteredMenu.filter((item) => item.available)),
    [isAdmin, filteredMenu],
  )

  const sortedMenu = useMemo(() => {
    if (!isAdmin || !sortConfig.key) return baseMenu
    const items = [...baseMenu]
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    items.sort((a, b) => {
      if (sortConfig.key === 'name') {
        return String(a.name || '').localeCompare(String(b.name || '')) * dir
      }
      if (sortConfig.key === 'category') {
        return String(a.category || '').localeCompare(String(b.category || '')) * dir
      }
      if (sortConfig.key === 'price') {
        return (Number(a.price || 0) - Number(b.price || 0)) * dir
      }
      if (sortConfig.key === 'available') {
        return (Number(Boolean(b.available)) - Number(Boolean(a.available))) * dir
      }
      return 0
    })
    return items
  }, [isAdmin, baseMenu, sortConfig])

  const menuPagination = usePagination(sortedMenu, 10)

  function handleSort(key) {
    setSortConfig((curr) => {
      if (curr.key !== key) return { key, direction: 'asc' }
      if (curr.direction === 'asc') return { key, direction: 'desc' }
      return { key: null, direction: 'asc' }
    })
  }

  /* ── Customer / Non-Admin view remains untouched ── */
  if (!isAdmin) {
    return (
      <>
        <div className="menu-toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={query}
              maxLength="120"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the menu..."
            />
          </div>
          <div className="category-pills">
            {orderedCategories.map((item) => (
              <button
                key={item}
                className={category === item ? 'category-pill selected' : 'category-pill'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="button button-outline cart-quick"
            onClick={() =>
              setDialog({
                type: 'info',
                title: 'Your cart',
                text: `${cartCount} items are in your cart. Select Cart in the sidebar to review them.`,
              })
            }
          >
            ＋ {cartCount}
          </button>
        </div>

        <div className="food-grid">
          {menuPagination.paginatedItems.map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onAdd={() => addToCart(item)}
              onDetails={() => setDialog({ type: 'food', item })}
            />
          ))}
        </div>
        {sortedMenu.length === 0 && (
          <div className="panel empty-state">No dishes match your search or category filter.</div>
        )}
        <Pagination {...menuPagination} />
      </>
    )
  }

  /* ── Redesigned Admin Menu Management View ── */
  return (
    <div className="adm-menu-mgmt">
      {/* ══════════════ 1. HEADER BANNER ══════════════ */}
      <header className="adm-mm-banner">
        {/* Subtle decorative organic leaf/wave background shapes */}
        <svg
          className="adm-mm-banner-waves"
          viewBox="0 0 900 140"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M480 0 C580 35 640 95 570 140 L900 140 L900 0 Z"
            fill="#285F38"
            fillOpacity="0.45"
          />
          <path
            d="M620 0 C530 45 480 95 430 140 L900 140 L900 0 Z"
            fill="#143220"
            fillOpacity="0.55"
          />
          <path
            d="M740 -10 C690 40 660 95 640 140 L900 140 L900 -10 Z"
            fill="#D4E157"
            fillOpacity="0.08"
          />
        </svg>

        <div className="adm-mm-banner-left">
          {/* Decorative dual-leaf emblem */}
          <div className="adm-mm-leaf-badge" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M10 34 C8 20 18 10 34 10 C34 26 24 36 10 34 Z"
                fill="#C8E231"
              />
              <path
                d="M10 34 C18 26 25 19 33 11"
                stroke="#173A25"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M22 38 C22 28 30 20 40 20 C40 30 32 38 22 38 Z"
                fill="#A3C644"
                fillOpacity="0.9"
              />
            </svg>
          </div>

          <span className="adm-mm-banner-divider" aria-hidden="true" />

          <div className="adm-mm-banner-titles">
            <h1>Menu Management</h1>
            <p>Manage your menu, pricing and availability.</p>
          </div>
        </div>

        <button
          type="button"
          className="adm-mm-add-btn"
          onClick={() => setDialog({ type: 'add', entity: 'menu' })}
        >
          <span className="adm-mm-add-plus" aria-hidden="true">+</span>
          <span>Add Item</span>
        </button>
      </header>

      {/* ══════════════ 2. SEARCH AND CATEGORY FILTERS ══════════════ */}
      <div className="adm-mm-toolbar">
        <label className="adm-mm-search" aria-label="Search menu">
          <svg
            className="adm-mm-search-icon"
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
          />
          {query && (
            <button
              type="button"
              className="adm-mm-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <div className="adm-mm-categories" role="tablist" aria-label="Filter menu by category">
          {orderedCategories.map((cat) => {
            const isSelected = category === cat
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`adm-mm-cat-btn${isSelected ? ' is-selected' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════ 3. MENU TABLE CARD ══════════════ */}
      <section className="adm-mm-card" aria-label="Menu items table">
        <div className="adm-mm-table-scroll">
          <table className="adm-mm-table">
            <thead>
              <tr>
                <th className="col-item">
                  <button
                    type="button"
                    className="adm-mm-th-btn"
                    onClick={() => handleSort('name')}
                  >
                    <span>ITEM</span>
                    <SortChevrons
                      active={sortConfig.key === 'name'}
                      direction={sortConfig.direction}
                    />
                  </button>
                </th>
                <th className="col-category">
                  <button
                    type="button"
                    className="adm-mm-th-btn"
                    onClick={() => handleSort('category')}
                  >
                    <span>CATEGORY</span>
                    <SortChevrons
                      active={sortConfig.key === 'category'}
                      direction={sortConfig.direction}
                    />
                  </button>
                </th>
                <th className="col-price">
                  <button
                    type="button"
                    className="adm-mm-th-btn"
                    onClick={() => handleSort('price')}
                  >
                    <span>PRICE</span>
                    <SortChevrons
                      active={sortConfig.key === 'price'}
                      direction={sortConfig.direction}
                    />
                  </button>
                </th>
                <th className="col-photo">
                  <span className="adm-mm-th-label">PHOTO</span>
                </th>
                <th className="col-availability">
                  <button
                    type="button"
                    className="adm-mm-th-btn"
                    onClick={() => handleSort('available')}
                  >
                    <span>AVAILABILITY</span>
                    <SortChevrons
                      active={sortConfig.key === 'available'}
                      direction={sortConfig.direction}
                    />
                  </button>
                </th>
                <th className="col-actions">
                  <span className="adm-mm-th-label">ACTIONS</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {menuPagination.paginatedItems.map((item) => (
                <tr key={item.id}>
                  {/* 1. ITEM (Name & description ONLY — no duplicate thumbnail or placeholder) */}
                  <td className="col-item">
                    <div className="adm-mm-item-info">
                      <strong className="adm-mm-item-name">{item.name}</strong>
                      {item.description && (
                        <small className="adm-mm-item-desc">{item.description}</small>
                      )}
                    </div>
                  </td>

                  {/* 2. CATEGORY */}
                  <td className="col-category">
                    <span className="adm-mm-cat-text">{item.category}</span>
                  </td>

                  {/* 3. PRICE */}
                  <td className="col-price">
                    <strong className="adm-mm-price-text">{money(item.price)}</strong>
                  </td>

                  {/* 4. PHOTO (Food thumbnail displayed ONLY inside the Photo column) */}
                  <td className="col-photo">
                    {item.image ? (
                      <div className="adm-mm-photo-wrap">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="adm-mm-photo-img"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling
                            if (fallback) fallback.style.display = 'inline-flex'
                          }}
                        />
                        <span className="adm-mm-no-photo" style={{ display: 'none' }}>
                          No photo
                        </span>
                      </div>
                    ) : (
                      <span className="adm-mm-no-photo">No photo</span>
                    )}
                  </td>

                  {/* 5. AVAILABILITY */}
                  <td className="col-availability">
                    <button
                      type="button"
                      className={`adm-mm-avail-badge ${item.available ? 'is-available' : 'is-unavailable'}`}
                      onClick={() => updateMenuItem(item.id, { available: !item.available })}
                      title="Click to toggle availability"
                    >
                      <span className="adm-mm-avail-dot" aria-hidden="true" />
                      <span>{item.available ? 'Available' : 'Unavailable'}</span>
                    </button>
                  </td>

                  {/* 6. ACTIONS (Separate green Edit and soft red Delete icon buttons) */}
                  <td className="col-actions">
                    <div className="adm-mm-actions">
                      <button
                        type="button"
                        className="adm-mm-action-btn adm-mm-edit-btn"
                        aria-label={`Edit ${item.name}`}
                        title={`Edit ${item.name}`}
                        onClick={() => setDialog({ type: 'edit-menu', item })}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="adm-mm-action-btn adm-mm-delete-btn"
                        aria-label={`Delete ${item.name}`}
                        title={`Delete ${item.name}`}
                        onClick={() => setDialog({ type: 'delete-menu', item })}
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

          {sortedMenu.length === 0 && (
            <div className="adm-mm-empty">
              <p>No menu items match your current search or category filter.</p>
            </div>
          )}
        </div>

        {/* ══════════════ 4. TABLE FOOTER & PAGINATION ══════════════ */}
        <div className="adm-mm-footer">
          <Pagination {...menuPagination} label="items" />
        </div>
      </section>
    </div>
  )
}
