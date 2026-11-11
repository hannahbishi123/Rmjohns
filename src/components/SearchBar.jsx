/**
 * SearchBar — full live-search component
 *
 * Features:
 * - Debounced input (220 ms) — no request spam
 * - Searches name · category · description (case-insensitive, trims spaces)
 * - Autocomplete dropdown with food thumbnails + prices
 * - Category suggestion chips
 * - Popular items shown when input is empty / focused
 * - Recently searched items (sessionStorage, max 5)
 * - Keyboard navigation (↑ ↓ Enter Escape)
 * - Click-outside to close
 * - Clear (✕) button
 * - "No results" empty state
 * - Clicking a result navigates to Menu and pre-applies the search query
 * - Clicking a category chip navigates to Menu and pre-applies the category filter
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'
import { getCategoryIcon } from './shared'

const DEBOUNCE_MS   = 220
const MAX_RESULTS   = 8
const MAX_POPULAR   = 5
const MAX_RECENT    = 5
const RECENT_KEY    = 'rmjohns_recent_searches'

// ── Helpers ───────────────────────────────────────────────────────────────────
function readRecent() {
  try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(term) {
  if (!term.trim()) return
  const list = [term, ...readRecent().filter((t) => t !== term)].slice(0, MAX_RECENT)
  try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

// Score a menu item against a query — higher = better match
function score(item, q) {
  const lq = q.toLowerCase()
  const name = item.name.toLowerCase()
  const cat  = item.category.toLowerCase()
  const desc = (item.description || '').toLowerCase()
  if (name === lq) return 100
  if (name.startsWith(lq)) return 80
  if (name.includes(lq)) return 60
  if (cat.includes(lq)) return 40
  if (desc.includes(lq)) return 20
  return 0
}

function searchMenu(menu, query) {
  const q = query.trim().replace(/\s+/g, ' ')
  if (!q) return []
  return menu
    .map((item) => ({ item, s: score(item, q) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item)
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconTrend() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

// ── Food thumbnail in dropdown ────────────────────────────────────────────────
function SearchThumb({ item }) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        className="sb-thumb-img"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="sb-thumb-icon">
      {getCategoryIcon(item.category)}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchBar() {
  const { menu, navigate, setQuery: setGlobalQuery, setCategory: setGlobalCategory, setDialog } = useApp()

  const [input, setInput]           = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen]             = useState(false)
  const [focused, setFocused]       = useState(false)
  const [activeIdx, setActiveIdx]   = useState(-1)
  const [loading, setLoading]       = useState(false)
  const [recentSearches, setRecentSearches] = useState(readRecent)

  const inputRef    = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  // ── Debounce input ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(input.trim().replace(/\s+/g, ' '))
      setLoading(false)
      setActiveIdx(-1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [input])

  // ── Click outside → close ───────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── Compute results ──────────────────────────────────────────────────────
  const results     = debouncedQ ? searchMenu(menu, debouncedQ) : []
  const availOnly   = results.filter((item) => item.available)
  const unavailable = results.filter((item) => !item.available)
  const allResults  = [...availOnly, ...unavailable]

  // Popular = first MAX_POPULAR available items (sorted by id as proxy)
  const popular = menu.filter((item) => item.available).slice(0, MAX_POPULAR)

  // Unique categories from search results (or all if no query)
  const categoriesFromResults = [...new Set((debouncedQ ? allResults : menu).map((i) => i.category))]

  // Items shown in dropdown list
  const listItems = debouncedQ ? allResults : popular

  // ── Navigate to menu with query applied ──────────────────────────────────
  function applySearch(term) {
    const t = term.trim()
    if (!t) return
    saveRecent(t)
    setRecentSearches(readRecent())
    setInput(t)
    setGlobalQuery(t)
    setGlobalCategory('All')
    navigate('Menu')
    setOpen(false)
  }

  function applyCategory(cat) {
    setGlobalCategory(cat)
    setGlobalQuery('')
    setInput('')
    navigate('Menu')
    setOpen(false)
  }

  function openFoodDetail(item) {
    saveRecent(item.name)
    setRecentSearches(readRecent())
    setDialog({ type: 'food', item })
    setOpen(false)
  }

  function clear() {
    setInput('')
    setDebouncedQ('')
    setGlobalQuery('')
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((prev) => Math.min(prev + 1, listItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && listItems[activeIdx]) {
        openFoodDetail(listItems[activeIdx])
      } else if (input.trim()) {
        applySearch(input)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showDropdown = open && (focused || input.length > 0)

  return (
    <div className="sb-wrap" ref={containerRef} role="search">
      {/* ── Input row ── */}
      <div className={`sb-input-row${focused ? ' focused' : ''}`}>
        <span className="sb-search-icon"><IconSearch /></span>

        <input
          ref={inputRef}
          type="text"
          className="sb-input"
          value={input}
          placeholder="Search food, category..."
          aria-label="Search food"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          autoComplete="off"
          spellCheck="false"
          onFocus={() => { setFocused(true); setOpen(true) }}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={onKeyDown}
        />

        {/* Loading dot */}
        {loading && input.length > 0 && <span className="sb-loading" aria-hidden="true" />}

        {/* Clear button */}
        {input.length > 0 && !loading && (
          <button className="sb-clear-btn" onClick={clear} aria-label="Clear search" tabIndex={0}>
            <IconClear />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className="sb-dropdown" role="listbox" aria-label="Search suggestions">

          {/* ── Category chips ── */}
          {categoriesFromResults.length > 0 && (
            <div className="sb-section">
              <span className="sb-section-label">Categories</span>
              <div className="sb-chips">
                {categoriesFromResults.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    className="sb-chip"
                    onClick={() => applyCategory(cat)}
                    tabIndex={0}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent searches (only when input is empty) ── */}
          {!debouncedQ && recentSearches.length > 0 && (
            <div className="sb-section">
              <span className="sb-section-label">
                <IconClock /> Recent
              </span>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  className="sb-recent-row"
                  onClick={() => applySearch(term)}
                >
                  <span className="sb-recent-icon"><IconClock /></span>
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Popular / Results list ── */}
          <div className="sb-section">
            <span className="sb-section-label">
              {debouncedQ
                ? <>Results <small style={{ fontWeight: 400, color: '#9eaaa0' }}>({allResults.length})</small></>
                : <><IconTrend /> Popular dishes</>
              }
            </span>

            {listItems.length === 0 && debouncedQ && (
              <div className="sb-no-results">
                <span className="sb-no-results-icon">🍽</span>
                <strong>No food found for &ldquo;{debouncedQ}&rdquo;</strong>
                <small>Try searching by category, e.g. &ldquo;Silog&rdquo; or &ldquo;Drinks&rdquo;</small>
              </div>
            )}

            {listItems.map((item, idx) => (
              <button
                key={item.id}
                className={`sb-result-row${!item.available ? ' sb-unavailable' : ''}${idx === activeIdx ? ' sb-active' : ''}`}
                role="option"
                aria-selected={idx === activeIdx}
                onClick={() => openFoodDetail(item)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <SearchThumb item={item} />
                <div className="sb-result-info">
                  <span className="sb-result-name">
                    {/* Highlight matching chars */}
                    {highlightMatch(item.name, debouncedQ)}
                  </span>
                  <span className="sb-result-cat">{item.category}</span>
                </div>
                <div className="sb-result-right">
                  <span className="sb-result-price">{money(item.price)}</span>
                  {!item.available && <span className="sb-unavail-badge">Unavailable</span>}
                </div>
              </button>
            ))}
          </div>

          {/* ── Footer: search all ── */}
          {debouncedQ && allResults.length > 0 && (
            <div className="sb-footer">
              <button className="sb-search-all-btn" onClick={() => applySearch(input)}>
                <IconSearch />
                Search &ldquo;{debouncedQ}&rdquo; in full menu →
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Bold-highlight matching substring ────────────────────────────────────────
function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="sb-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
