import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'
import './MonitoringPage.css'

export default function MonitoringPage() {
  const { staff, deviceConnected, setDeviceConnected, scanEvents, recordStaffScan, notify } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Live formatted current date
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
  }, [])

  // Filtered staff records
  const visibleStaff = useMemo(() => {
    return staff.filter((p) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || `${p.name} ${p.role} ${p.id} ${p.status}`.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [staff, search, statusFilter])

  const staffPagination = usePagination(visibleStaff, 10)
  const scanPagination = usePagination(scanEvents, 10)

  // Count summaries
  const presentCount = useMemo(() => staff.filter((p) => p.status === 'Present').length, [staff])
  const onBreakCount = useMemo(() => staff.filter((p) => p.status === 'On break').length, [staff])
  const lastScan = scanEvents && scanEvents.length > 0 ? scanEvents[0] : null

  return (
    <div className="adm-mon-mgmt">
      {/* ── 1. HEADER BANNER ────────────────────────────────────────────── */}
      <section className="adm-mon-banner">
        <svg
          className="adm-mon-banner-art"
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,0 L1000,0 L1000,160 Q700,210 400,150 Q200,110 0,180 Z"
            fill="rgba(255, 255, 255, 0.04)"
          />
          <path
            d="M300,0 Q600,180 1000,80 L1000,0 Z"
            fill="rgba(212, 225, 87, 0.05)"
          />
        </svg>

        <svg
          className="adm-mon-banner-leaves"
          viewBox="0 0 200 120"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M30,110 C20,70 55,30 110,20 C100,55 70,95 30,110 Z"
            fill="rgba(212, 225, 87, 0.22)"
          />
          <path
            d="M80,105 C85,65 125,40 170,45 C150,75 120,100 80,105 Z"
            fill="rgba(255, 255, 255, 0.16)"
          />
          <path
            d="M10,80 C15,50 45,35 75,40 C60,65 35,80 10,80 Z"
            fill="rgba(212, 225, 87, 0.12)"
          />
        </svg>

        <div className="adm-mon-banner-left">
          <span className="adm-mon-date">{todayFormatted}</span>
          <h1>Staff Attendance &amp; Monitoring</h1>
          <p>Live RFID attendance tracking, hardware telemetry, and workforce status.</p>
        </div>

        <div className="adm-mon-banner-badge">
          <span className="adm-mon-pulse-dot" />
          <span>{deviceConnected ? 'LIVE LOGGING ACTIVE' : 'READER STANDBY'}</span>
        </div>
      </section>

      {/* ── 2. DEVICE STATUS PANEL ──────────────────────────────────────── */}
      <section className="adm-mon-device-panel">
        <div className="adm-mon-device-left">
          <div className="adm-mon-device-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </div>
          <div className="adm-mon-device-info">
            <span className="adm-mon-device-eyebrow">DEVICE HARDWARE STATUS</span>
            <div className="adm-mon-device-title-row">
              <h2>ESP32 Attendance Reader</h2>
              <span className={`adm-mon-status-pill ${deviceConnected ? 'connected' : 'offline'}`}>
                <i /> {deviceConnected ? 'Connected · Live Demo' : 'Offline · Reader Disconnected'}
              </span>
            </div>
            <p className="adm-mon-device-desc">
              Visual simulation mode &bull; NodeMCU ESP32-WROOM &bull; 13.56 MHz RFID Sensor
            </p>
          </div>
        </div>

        <button
          className={`adm-mon-device-btn ${deviceConnected ? 'btn-disconnect' : 'btn-reconnect'}`}
          onClick={() => {
            setDeviceConnected((curr) => !curr)
            notify(`Demo reader ${deviceConnected ? 'disconnected' : 'connected'}`)
          }}
          type="button"
        >
          {deviceConnected ? (
            <>
              <span style={{ fontSize: '15px' }}>⏻</span>
              <span>Disconnect Reader</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '15px' }}>↻</span>
              <span>Reconnect Reader</span>
            </>
          )}
        </button>
      </section>

      {/* ── 3. ATTENDANCE SUMMARY STAT CARDS ─────────────────────────────── */}
      <div className="adm-mon-stats-grid">
        {/* Card 1: Present Today */}
        <div className="adm-mon-stat-card card-primary">
          <div className="adm-mon-stat-top">
            <span className="adm-mon-stat-label">Present Today</span>
            <div className="adm-mon-stat-icon">✓</div>
          </div>
          <div className="adm-mon-stat-mid">
            <div className="adm-mon-stat-value">{presentCount}</div>
          </div>
          <div className="adm-mon-stat-bottom">
            <span className="adm-mon-stat-trend">On shift right now</span>
            <span className="adm-mon-stat-dot">&bull;</span>
            <span>Active attendance</span>
          </div>
        </div>

        {/* Card 2: On Break */}
        <div className="adm-mon-stat-card">
          <div className="adm-mon-stat-top">
            <span className="adm-mon-stat-label">On Break</span>
            <div className="adm-mon-stat-icon icon-amber">◷</div>
          </div>
          <div className="adm-mon-stat-mid">
            <div className="adm-mon-stat-value" style={{ color: '#C07000' }}>{onBreakCount}</div>
          </div>
          <div className="adm-mon-stat-bottom">
            <span className="adm-mon-stat-trend">Taking a breather</span>
            <span className="adm-mon-stat-dot">&bull;</span>
            <span>Back on shift soon</span>
          </div>
        </div>

        {/* Card 3: RFID Reader */}
        <div className="adm-mon-stat-card">
          <div className="adm-mon-stat-top">
            <span className="adm-mon-stat-label">RFID Reader</span>
            <div className="adm-mon-stat-icon icon-blue">⌁</div>
          </div>
          <div className="adm-mon-stat-mid">
            <div className="adm-mon-stat-value" style={{ fontSize: '24px', color: deviceConnected ? '#1A6932' : '#9C2A2A' }}>
              {deviceConnected ? 'Ready' : 'Not Ready'}
            </div>
          </div>
          <div className="adm-mon-stat-bottom">
            <span className="adm-mon-stat-trend">
              {lastScan ? `${lastScan.action} · ${lastScan.time}` : 'No recent scan'}
            </span>
            <span className="adm-mon-stat-dot">&bull;</span>
            <span>{lastScan?.name || 'Awaiting tap'}</span>
          </div>
        </div>

        {/* Card 4: Device Sync */}
        <div className="adm-mon-stat-card">
          <div className="adm-mon-stat-top">
            <span className="adm-mon-stat-label">Device Sync</span>
            <div className="adm-mon-stat-icon icon-green">◉</div>
          </div>
          <div className="adm-mon-stat-mid">
            <div className="adm-mon-stat-value" style={{ fontSize: '24px', color: '#1B3B2B' }}>
              {deviceConnected ? 'Live Cloud' : 'Offline'}
            </div>
          </div>
          <div className="adm-mon-stat-bottom">
            <span className="adm-mon-stat-trend">ESP32 · DEMO-01</span>
            <span className="adm-mon-stat-dot">&bull;</span>
            <span>Simulation Gateway</span>
          </div>
        </div>
      </div>

      {/* ── 4. TODAY'S ATTENDANCE TABLE ─────────────────────────────────── */}
      <section className="adm-mon-panel">
        <div className="adm-mon-panel-header">
          <div className="adm-mon-panel-title-group">
            <h2>Today’s Attendance</h2>
            <p>Staff check-ins, clock-in times, and RFID card actions &bull; {todayFormatted}</p>
          </div>

          <div className="adm-mon-panel-actions">
            {/* Search Box */}
            <div className="adm-mon-search-box">
              <span className="adm-mon-search-icon" aria-hidden="true">⌕</span>
              <input
                placeholder="Search staff, position, or ID..."
                value={search}
                maxLength="120"
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="adm-mon-search-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              className="adm-mon-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by attendance status"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present Only</option>
              <option value="On break">On Break Only</option>
              <option value="Offline">Offline Only</option>
            </select>

            {/* Print Button */}
            <button
              className="adm-mon-print-btn"
              onClick={() => window.print()}
              type="button"
              title="Print Today's Attendance Report"
            >
              <span style={{ fontSize: '15px' }}>↧</span>
              <span>Print Report</span>
            </button>
          </div>
        </div>

        <div className="adm-mon-table-wrap">
          <table className="adm-mon-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Position</th>
                <th>Staff ID</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
                <th>RFID Action</th>
              </tr>
            </thead>
            <tbody>
              {staffPagination.paginatedItems.map((person) => {
                const isPresent = person.status === 'Present'
                const isOnBreak = person.status === 'On break'
                const initials = person.name
                  ? person.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                  : 'ST'

                return (
                  <tr key={person.id}>
                    <td>
                      <div className="adm-mon-staff-cell">
                        <span className="adm-mon-avatar">{initials}</span>
                        <div className="adm-mon-staff-name-wrap">
                          <span className="adm-mon-staff-name">{person.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="adm-mon-role-cell">{person.role || 'Service Staff'}</td>
                    <td>
                      <span className="adm-mon-id-badge">{person.id}</span>
                    </td>
                    <td>
                      <span className={`adm-mon-time-cell ${person.time ? '' : 'empty'}`}>
                        {person.time || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`adm-mon-time-cell ${person.timeOut ? '' : 'empty'}`}>
                        {person.timeOut || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`adm-mon-badge ${
                          isPresent
                            ? 'status-present'
                            : isOnBreak
                              ? 'status-on-break'
                              : 'status-offline'
                        }`}
                      >
                        <i />
                        {person.status || 'Offline'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`adm-mon-scan-btn ${isPresent ? 'btn-time-out' : 'btn-time-in'}`}
                        disabled={!deviceConnected || person.status === 'Inactive'}
                        onClick={() =>
                          recordStaffScan(person.id, isPresent ? 'Time out' : 'Time in')
                        }
                        type="button"
                        title={
                          !deviceConnected
                            ? 'Device reader is offline'
                            : isPresent
                              ? 'Record clock-out'
                              : 'Record clock-in'
                        }
                      >
                        {isPresent ? 'Time Out' : 'Time In'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {staffPagination.paginatedItems.length === 0 && (
            <div className="adm-mon-empty-state">
              No staff attendance records match your search or filter.
            </div>
          )}
        </div>

        <Pagination {...staffPagination} />
      </section>

      {/* ── 5. RECENT RFID SCAN LOGS ────────────────────────────────────── */}
      <section className="adm-mon-scan-log-panel">
        <div className="adm-mon-panel-header">
          <div className="adm-mon-panel-title-group">
            <h2>Recent RFID Scan Events</h2>
            <p>Live telemetry stream of badge taps and hardware sensor scans</p>
          </div>
        </div>

        <div className="adm-mon-log-list">
          {scanPagination.paginatedItems.map((event) => {
            const isTimeIn = (event.action || '').toLowerCase().includes('in')
            return (
              <div className="adm-mon-log-item" key={event.id}>
                <div className="adm-mon-log-left">
                  <div className="adm-mon-log-icon" aria-hidden="true">⌁</div>
                  <span className="adm-mon-log-time">{event.time}</span>
                  <div>
                    <span className="adm-mon-log-person">{event.name}</span>
                    <span className="adm-mon-log-id">#{event.staffId}</span>
                  </div>
                </div>

                <span className={`adm-mon-log-action-badge ${isTimeIn ? 'action-in' : 'action-out'}`}>
                  {event.action}
                </span>
              </div>
            )
          })}

          {scanPagination.paginatedItems.length === 0 && (
            <div className="adm-mon-empty-state">
              No RFID scan events logged yet today.
            </div>
          )}
        </div>

        <Pagination {...scanPagination} />
      </section>
    </div>
  )
}
