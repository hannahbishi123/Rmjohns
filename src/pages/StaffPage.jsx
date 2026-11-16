import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { usePagination } from '../components/shared'
import { statusClass } from '../data/mockData'
import './StaffPage.css'

const PAGE_SIZE_CHOICES = [10, 25, 50, 100]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} - ${monthDayYear}`
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'ST'
  return parts.map((part) => part[0]).join('').slice(0, 3)
}

export default function StaffPage() {
  const { staff = [], setDialog } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')

  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Staff Management renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-staff-page-content')
    return () => {
      if (container) container.classList.remove('adm-staff-page-content')
    }
  }, [])

  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter((person) => {
      const matchesSearch =
        !q ||
        `${person.name || ''} ${person.id || ''} ${person.role || ''} ${person.contact || ''}`
          .toLowerCase()
          .includes(q)
      const matchesStatus = statusFilter === 'All status' || person.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [staff, search, statusFilter])

  const pagination = usePagination(visibleStaff, 10)
  const activeTodayCount = useMemo(
    () => staff.filter((person) => person.status === 'Present').length,
    [staff],
  )

  function handleAddStaff() {
    setDialog({ type: 'add', entity: 'staff' })
  }

  return (
    <div className="adm-staff-mgmt">
      {/* ══════════════ 1. STAFF HEADER BANNER ══════════════ */}
      <header className="adm-stf-banner">
        {/* Decorative curved waves on the right */}
        <svg
          className="adm-stf-banner-art"
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

        {/* Botanical leaf cluster on the bottom-right of the header */}
        <svg
          className="adm-stf-banner-leaves"
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

        <div className="adm-stf-banner-left">
          <span className="adm-stf-date">{dynamicDate}</span>
          <h1>Staff</h1>
          <p>Your people make this place.</p>
        </div>

        <button
          type="button"
          className="adm-stf-banner-add-btn"
          onClick={handleAddStaff}
        >
          <span className="adm-stf-plus" aria-hidden="true">+</span>
          <span>Add staff</span>
        </button>
      </header>

      {/* ══════════════ 2. SEARCH AND STATUS FILTERS ══════════════ */}
      <div className="adm-stf-toolbar">
        <label className="adm-stf-search" aria-label="Search staff by name, role, or ID">
          <svg
            className="adm-stf-search-icon"
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
            placeholder="Search staff by name, role, or ID..."
          />
          {search && (
            <button
              type="button"
              className="adm-stf-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <div className="adm-stf-status-filter-wrap">
          <select
            className="adm-stf-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter staff by status"
          >
            <option value="All status">All status</option>
            <option value="Present">Present</option>
            <option value="Offline">Offline</option>
            <option value="On break">On break</option>
            {staff.some((p) => p.status === 'Inactive') && (
              <option value="Inactive">Inactive</option>
            )}
          </select>
          <svg
            className="adm-stf-filter-chevron"
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

      {/* ══════════════ 3. TEAM DIRECTORY CONTAINER ══════════════ */}
      <section className="adm-stf-card" aria-label="Team directory">
        <div className="adm-stf-card-head">
          <div className="adm-stf-card-title-group">
            <div className="adm-stf-team-icon" aria-hidden="true">
              <svg viewBox="0 0 36 28" fill="currentColor">
                <circle cx="18" cy="8.5" r="4.8" />
                <circle cx="8" cy="10.5" r="3.6" />
                <circle cx="28" cy="10.5" r="3.6" />
                <path d="M9.5 25c0-4.4 3.8-7.8 8.5-7.8s8.5 3.4 8.5 7.8H9.5Z" />
                <path d="M1.5 25c0-3.2 2.5-5.8 5.8-6.2-.9 1.3-1.4 2.9-1.4 4.7V25H1.5Zm33 0h-4.4v-1.5c0-1.8-.5-3.4-1.4-4.7 3.3.4 5.8 3 5.8 6.2Z" />
              </svg>
            </div>
            <div>
              <h2>Team directory</h2>
              <p>
                {staff.length} team members &middot; {activeTodayCount} active today
              </p>
            </div>
          </div>

          <button
            type="button"
            className="adm-stf-card-add-btn"
            onClick={handleAddStaff}
          >
            <span aria-hidden="true">+</span>
            <span>Add staff</span>
          </button>
        </div>

        {/* ══════════════ 4. STAFF TABLE ══════════════ */}
        <div className="adm-stf-table-scroll">
          <table className="adm-stf-table">
            <thead>
              <tr>
                <th className="col-member">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="9" cy="7.5" r="3.5" />
                      <circle cx="16.5" cy="9" r="2.6" />
                      <path d="M2.5 19.5c0-3.2 2.9-5.8 6.5-5.8s6.5 2.6 6.5 5.8H2.5Z" />
                      <path d="M15.5 14.2c2.8.3 5 2.3 5 5.3h-3.8v-.8c0-1.7-.5-3.2-1.2-4.5Z" />
                    </svg>
                    <span>STAFF MEMBER</span>
                  </span>
                </th>
                <th className="col-id">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="5" width="20" height="14" rx="2.5" />
                      <circle cx="8" cy="11" r="2" fill="currentColor" stroke="none" />
                      <path d="M5.5 16c0-1.4 1.1-2.4 2.5-2.4s2.5 1 2.5 2.4" />
                      <line x1="13" y1="10" x2="18.5" y2="10" />
                      <line x1="13" y1="14" x2="17" y2="14" />
                    </svg>
                    <span>STAFF ID</span>
                  </span>
                </th>
                <th className="col-position">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="7" width="18" height="13" rx="2" />
                      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="3" y1="13" x2="21" y2="13" />
                    </svg>
                    <span>POSITION</span>
                  </span>
                </th>
                <th className="col-status">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="22 12 18 12 15 20 9 4 6 12 2 12" />
                    </svg>
                    <span>STATUS</span>
                  </span>
                </th>
                <th className="col-contact">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <polyline points="3 7 12 13 21 7" />
                    </svg>
                    <span>CONTACT</span>
                  </span>
                </th>
                <th className="col-actions">
                  <span className="adm-stf-th">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                    <span>ACTIONS</span>
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {pagination.paginatedItems.map((person) => {
                const stClass = statusClass(person.status || 'Offline')
                const contactDisplay =
                  person.contact || `+63 917 ••• ${String(person.id || '').slice(-3)}`
                return (
                  <tr key={person.id} className="adm-stf-row">
                    {/* 1. Staff Member (Circular avatar + Full name) */}
                    <td className="col-member">
                      <div className="adm-stf-member-cell">
                        <span className="adm-stf-avatar" aria-hidden="true">
                          {getInitials(person.name)}
                        </span>
                        <strong className="adm-stf-name">{person.name}</strong>
                      </div>
                    </td>

                    {/* 2. Staff ID */}
                    <td className="col-id">
                      <span className="adm-stf-id">{person.id}</span>
                    </td>

                    {/* 3. Position */}
                    <td className="col-position">
                      <span className="adm-stf-role">{person.role}</span>
                    </td>

                    {/* 4. Status Badge */}
                    <td className="col-status">
                      <span className={`adm-stf-status-badge status-${stClass}`}>
                        <i className="adm-stf-status-dot" aria-hidden="true" />
                        <span>{person.status}</span>
                      </span>
                    </td>

                    {/* 5. Contact */}
                    <td className="col-contact">
                      <span className="adm-stf-contact">{contactDisplay}</span>
                    </td>

                    {/* 6. Actions (Edit & Delete icon buttons) */}
                    <td className="col-actions">
                      <div className="adm-stf-actions">
                        <button
                          type="button"
                          className="adm-stf-action-btn adm-stf-edit-btn"
                          aria-label={`Edit ${person.name}`}
                          title={`Edit ${person.name}`}
                          onClick={() => setDialog({ type: 'edit-staff', staff: person })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="adm-stf-action-btn adm-stf-delete-btn"
                          aria-label={`Deactivate ${person.name}`}
                          title={`Deactivate ${person.name}`}
                          onClick={() => setDialog({ type: 'delete-staff', staff: person })}
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
                )
              })}
            </tbody>
          </table>

          {pagination.paginatedItems.length === 0 && (
            <div className="adm-stf-empty">
              No staff members match your current search or status filter.
            </div>
          )}
        </div>

        {/* ══════════════ 5. PAGINATION FOOTER ══════════════ */}
        <div className="adm-stf-footer">
          <div className="adm-stf-footer-left">
            <span className="adm-stf-showing">
              Showing <strong>{pagination.startEntry}&ndash;{pagination.endEntry}</strong> of{' '}
              <strong>{pagination.totalItems}</strong> staff
            </span>

            <label className="adm-stf-rows-label">
              <span>Rows per page:</span>
              <div className="adm-stf-rows-select-wrap">
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

          <div className="adm-stf-footer-right">
            <button
              type="button"
              className="adm-stf-page-nav"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              &lsaquo; Previous
            </button>

            <div className="adm-stf-page-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`adm-stf-page-num${pageNum === pagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === pagination.currentPage ? 'page' : undefined}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="adm-stf-page-nav"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next &rsaquo;
            </button>
          </div>
        </div>
      </section>

      {/* Subtle bottom botanical wave matching Menu & Orders */}
      <div className="adm-stf-bottom-decor" aria-hidden="true">
        <svg className="adm-stf-bottom-wave" viewBox="0 0 1200 68" preserveAspectRatio="none" fill="none">
          <path d="M0 50 C240 12 460 64 740 34 C940 14 1090 28 1200 44 L1200 68 L0 68 Z" fill="#C6DC63" fillOpacity="0.6" />
          <path d="M0 58 C250 24 470 70 750 44 C950 24 1095 38 1200 52 L1200 68 L0 68 Z" fill="#1B3B2B" />
        </svg>
      </div>
    </div>
  )
}
