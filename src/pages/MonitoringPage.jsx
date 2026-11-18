import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'
import './MonitoringPage.css'

export default function MonitoringPage() {
  const { staff, setStaff, deviceConnected, setDeviceConnected, scanEvents, recordStaffScan, notify } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isHwOnline, setIsHwOnline] = useState(false)
  const [lastUnknownCard, setLastUnknownCard] = useState(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [rfidInput, setRfidInput] = useState('')
  const [isSavingRfid, setIsSavingRfid] = useState(false)

  // Auto-detect real ESP32 RFID hardware status
  useEffect(() => {
    let active = true
    const checkHw = async () => {
      try {
        const res = await fetch('/api/iot/status')
        if (res.ok) {
          const data = await res.json()
          if (active) {
            setIsHwOnline(Boolean(data.online))
            if (data.online) {
              setDeviceConnected(true)
            }
            if (data.lastUnknownCard) {
              setLastUnknownCard(data.lastUnknownCard)
            }
          }
        }
      } catch {}
    }
    checkHw()
    const timer = setInterval(checkHw, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [setDeviceConnected])

  async function handleSaveRfid(e) {
    if (e) e.preventDefault()
    if (!selectedStaff || !rfidInput.trim()) {
      return notify('Please select a staff member and enter an RFID UID')
    }
    const cleanUid = rfidInput.trim().toUpperCase()
    setIsSavingRfid(true)
    try {
      const res = await fetch('/api/staff/assign-rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: selectedStaff.id, rfid_uid: cleanUid }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStaff((curr) =>
          curr.map((p) => (p.id === selectedStaff.id ? { ...p, rfidUid: cleanUid } : p))
        )
        setLastUnknownCard(null)
        setAssignModalOpen(false)
        notify(`RFID card ${cleanUid} assigned to ${selectedStaff.name}!`)
      } else {
        notify(data.error || 'Failed to assign RFID card')
      }
    } catch (err) {
      notify('Network error assigning RFID: ' + err.message)
    } finally {
      setIsSavingRfid(false)
    }
  }

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
                <i /> {isHwOnline ? 'ESP32 Hardware Online · Active' : deviceConnected ? 'Connected · Live Demo' : 'Offline · Reader Disconnected'}
              </span>
            </div>
            <p className="adm-mon-device-desc">
              {isHwOnline ? 'Physical Hardware Connected · NodeMCU ESP32 + RC522 RFID Sensor' : 'Visual simulation mode • NodeMCU ESP32-WROOM • 13.56 MHz RFID Sensor'}
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

      {/* ── 2.5 UNREGISTERED CARD DETECTED BANNER ───────────────────────── */}
      {lastUnknownCard && (
        <section
          style={{
            margin: '16px 0 24px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #FFF8E1, #FFECB3)',
            border: '1.5px solid #FFA000',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(255, 160, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FF8F00',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              💳
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#E65100', fontSize: '15px' }}>
                New Physical RFID Card Detected: <span style={{ fontFamily: 'monospace', background: '#fff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FFB74D', fontSize: '14px' }}>{lastUnknownCard.uid}</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#5D4037', marginTop: '3px' }}>
                Tapped on the ESP32 reader at {lastUnknownCard.time}. Link this card to a staff member for instant Time In / Time Out.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              style={{
                background: '#E65100',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 18px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(230, 81, 0, 0.3)',
              }}
              onClick={() => {
                setRfidInput(lastUnknownCard.uid)
                setSelectedStaff(staff[0] || null)
                setAssignModalOpen(true)
              }}
            >
              Link Card to Staff
            </button>
            <button
              type="button"
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: '#5D4037',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => setLastUnknownCard(null)}
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

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
                <th>RFID Card</th>
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
                      {person.rfidUid ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(person)
                            setRfidInput(person.rfidUid)
                            setAssignModalOpen(true)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: '600',
                            background: '#E8F5E9',
                            color: '#1B5E20',
                            border: '1px solid #A5D6A7',
                            cursor: 'pointer',
                          }}
                          title="Click to edit or reassign RFID UID"
                        >
                          <span>💳</span>
                          <span>{person.rfidUid}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(person)
                            setRfidInput(lastUnknownCard?.uid || '')
                            setAssignModalOpen(true)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            background: '#F5F5F5',
                            color: '#616161',
                            border: '1px dashed #BDBDBD',
                            cursor: 'pointer',
                          }}
                          title="Assign RFID Card to this staff"
                        >
                          <span>+</span>
                          <span>Link Card</span>
                        </button>
                      )}
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

      {/* ── 6. ASSIGN RFID MODAL ─────────────────────────────────────────── */}
      {assignModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssignModalOpen(false)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px 28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E0E0E0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>💳</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1B5E20' }}>
                  Assign RFID Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9E9E9E',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRfid}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#424242', marginBottom: '6px' }}>
                  Staff Member:
                </label>
                <select
                  value={selectedStaff?.id || ''}
                  onChange={(e) => {
                    const found = staff.find((p) => p.id === e.target.value)
                    setSelectedStaff(found || null)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CFD8DC',
                    fontSize: '14px',
                    background: '#FAFAFA',
                  }}
                >
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role || 'Staff'}) — ID: {p.id} {p.rfidUid ? `[Card: ${p.rfidUid}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#424242' }}>
                    RFID Card UID (Hex):
                  </label>
                  {lastUnknownCard?.uid && (
                    <button
                      type="button"
                      onClick={() => setRfidInput(lastUnknownCard.uid)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#E65100',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Paste Last Tapped: {lastUnknownCard.uid}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 4A7B2C19"
                  value={rfidInput}
                  onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
                  maxLength={32}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #2E7D32',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#757575' }}>
                  Tap card on the ESP32 reader or type the UID manually from the Serial Monitor.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #BDBDBD',
                    background: '#fff',
                    color: '#616161',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRfid || !rfidInput.trim()}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2E7D32',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: isSavingRfid ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                  }}
                >
                  {isSavingRfid ? 'Saving...' : 'Link Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
