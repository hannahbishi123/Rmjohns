import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { usePagination } from '../components/shared'
import './AttendancePage.css'

const PAGE_SIZE_CHOICES = [10, 25, 50, 100]

function formatDynamicHeaderDate() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDayYear = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  return `${weekday} · ${monthDayYear}`
}

function formatDateLabel(value) {
  if (!value) return 'Today'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatDateShort(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function AttendancePage() {
  const { staff = [], recordStaffScan, deviceConnected, notify } = useApp()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [attendanceDate, setAttendanceDate] = useState('2026-11-17')
  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide the generic AppShell page-heading when Staff Attendance renders its own banner
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('staff-attendance-page-content')
    return () => {
      if (container) container.classList.remove('staff-attendance-page-content')
    }
  }, [])

  const summary = useMemo(() => {
    const present = staff.filter((person) => person.status === 'Present' || person.status === 'Online').length
    const offline = staff.filter((person) => person.status === 'Offline' || (!['Present', 'Online', 'On break', 'On Break'].includes(person.status))).length
    const onBreak = staff.filter((person) => person.status === 'On break' || person.status === 'On Break').length
    return { present, offline, onBreak }
  }, [staff])

  function handleRefresh() {
    notify?.('Attendance refreshed from live data')
  }

  function handleScan(person) {
    const action = person.status === 'Present' ? 'Time out' : 'Time in'
    recordStaffScan(person.id, action)
  }

  const staffPagination = usePagination(staff, 10)

  return (
    <div className="staff-attendance-mgmt">
      {/* ══════════════ 1. TOP KITCHEN-STYLE BANNER ══════════════ */}
      <header className="staff-att-banner">
        {/* Decorative curved waves art */}
        <svg
          className="staff-att-banner-art"
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
          className="staff-att-banner-leaves"
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

        <div className="staff-att-banner-left">
          <span className="staff-att-date">{dynamicDate}</span>
          <h1>Attendance</h1>
          <p>Your shift at a glance.</p>
        </div>

        <button
          type="button"
          className="staff-att-banner-refresh-btn"
          onClick={handleRefresh}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Refresh</span>
        </button>
      </header>

      {/* ══════════════ 2. ATTENDANCE TRACKER CONTAINER ══════════════ */}
      <section className="staff-att-tracker-card" aria-label="Attendance tracker summary">
        <div className="staff-att-card-header">
          <div className="staff-att-card-titles">
            <h2>Attendance tracker</h2>
            <p>{formatDateLabel(attendanceDate)}</p>
          </div>

          <label className="staff-att-date-pill" aria-label="Select attendance date">
            <span>{formatDateShort(attendanceDate)}</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              className="staff-att-native-date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </label>
        </div>

        {/* 3 Summary Cards */}
        <div className="staff-att-stats-grid">
          {/* Card 1: Shift Status */}
          <div className="staff-att-stat-card">
            <span className="staff-att-stat-eyebrow">SHIFT STATUS</span>
            <strong className="staff-att-stat-value">{summary.present}</strong>
            <span className="staff-att-stat-sub">Staff currently clocked in</span>
            <svg className="staff-att-stat-wave" viewBox="0 0 100 70" fill="none" aria-hidden="true">
              <path d="M0 70 C30 30 65 60 100 10 L100 70 Z" fill="#DDECC5" fillOpacity="0.7" />
            </svg>
          </div>

          {/* Card 2: On Break */}
          <div className="staff-att-stat-card">
            <span className="staff-att-stat-eyebrow">ON BREAK</span>
            <strong className="staff-att-stat-value">{summary.onBreak}</strong>
            <span className="staff-att-stat-sub">During this period</span>
            <svg className="staff-att-stat-wave" viewBox="0 0 100 70" fill="none" aria-hidden="true">
              <path d="M0 70 C30 30 65 60 100 10 L100 70 Z" fill="#DDECC5" fillOpacity="0.7" />
            </svg>
          </div>

          {/* Card 3: Offline */}
          <div className="staff-att-stat-card">
            <span className="staff-att-stat-eyebrow">OFFLINE</span>
            <strong className="staff-att-stat-value">{summary.offline}</strong>
            <span className="staff-att-stat-sub">Not currently active</span>
            <svg className="staff-att-stat-wave" viewBox="0 0 100 70" fill="none" aria-hidden="true">
              <path d="M0 70 C30 30 65 60 100 10 L100 70 Z" fill="#DDECC5" fillOpacity="0.7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════ 3. TODAY'S ATTENDANCE TABLE CONTAINER ══════════════ */}
      <section className="staff-att-table-card" aria-label="Today's attendance list">
        <div className="staff-att-card-header">
          <div className="staff-att-card-titles">
            <h2>Today’s attendance</h2>
            <p>{summary.present} present · {formatDateLabel(attendanceDate)}</p>
          </div>

          <button
            type="button"
            className="staff-att-print-btn"
            onClick={() => window.print()}
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print report</span>
          </button>
        </div>

        <div className="staff-att-table-scroll">
          <table className="staff-att-table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>POSITION</th>
                <th>STAFF ID</th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>ATTENDANCE</th>
                <th>TRACK</th>
              </tr>
            </thead>
            <tbody>
              {staffPagination.paginatedItems.map((person) => {
                const initials = person.name
                  ? person.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'ST'

                const statusKey = (person.status || 'Offline').toLowerCase().replace(' ', '-')
                const isPresent = person.status === 'Present' || person.status === 'Online'

                return (
                  <tr key={person.id}>
                    {/* STAFF MEMBER */}
                    <td>
                      <div className="staff-att-member-cell">
                        <span className="staff-att-avatar">{initials}</span>
                        <strong className="staff-att-name">{person.name}</strong>
                      </div>
                    </td>

                    {/* POSITION */}
                    <td>
                      <span className="staff-att-pos">{person.role || 'Service crew'}</span>
                    </td>

                    {/* STAFF ID */}
                    <td>
                      <span className="staff-att-id">{person.id}</span>
                    </td>

                    {/* TIME IN */}
                    <td>
                      <span className="staff-att-time">{person.time || '—'}</span>
                    </td>

                    {/* TIME OUT */}
                    <td>
                      <span className="staff-att-time">{person.timeOut || '—'}</span>
                    </td>

                    {/* ATTENDANCE */}
                    <td>
                      <span className={`staff-att-status-pill status-${statusKey}`}>
                        <span className="staff-att-status-dot" aria-hidden="true" />
                        <span>{person.status || 'Offline'}</span>
                      </span>
                    </td>

                    {/* TRACK */}
                    <td>
                      <button
                        type="button"
                        className={`staff-att-track-btn${isPresent ? ' is-time-out' : ' is-time-in'}`}
                        disabled={!deviceConnected}
                        onClick={() => handleScan(person)}
                      >
                        {isPresent ? 'Time out' : 'Time in'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ══════════════ 4. PAGINATION FOOTER ══════════════ */}
        <div className="staff-att-footer">
          <div className="staff-att-footer-left">
            <span className="staff-att-showing">
              Showing {staffPagination.startEntry}&ndash;{staffPagination.endEntry} of{' '}
              {staffPagination.totalItems} entries
            </span>

            <label className="staff-att-rows-label">
              <span>Rows per page:</span>
              <div className="staff-att-rows-select-wrap">
                <select
                  value={staffPagination.pageSize}
                  onChange={(e) => staffPagination.onPageSizeChange(Number(e.target.value))}
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

          <div className="staff-att-footer-right">
            <button
              type="button"
              className="staff-att-page-nav"
              disabled={staffPagination.currentPage <= 1}
              onClick={() => staffPagination.onPageChange(1)}
            >
              &laquo; First
            </button>

            <button
              type="button"
              className="staff-att-page-nav"
              disabled={staffPagination.currentPage <= 1}
              onClick={() => staffPagination.onPageChange(staffPagination.currentPage - 1)}
            >
              &lsaquo; Prev
            </button>

            <div className="staff-att-page-numbers">
              {Array.from({ length: staffPagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`staff-att-page-num${pageNum === staffPagination.currentPage ? ' is-active' : ''}`}
                  aria-current={pageNum === staffPagination.currentPage ? 'page' : undefined}
                  onClick={() => staffPagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="staff-att-page-nav"
              disabled={staffPagination.currentPage >= staffPagination.totalPages}
              onClick={() => staffPagination.onPageChange(staffPagination.currentPage + 1)}
            >
              Next &rsaquo;
            </button>

            <button
              type="button"
              className="staff-att-page-nav"
              disabled={staffPagination.currentPage >= staffPagination.totalPages}
              onClick={() => staffPagination.onPageChange(staffPagination.totalPages)}
            >
              Last &raquo;
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
