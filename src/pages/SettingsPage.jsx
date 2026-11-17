import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiRequest } from '../lib/api'
import './SettingsPage.css'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconRefresh({ spinning }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : {}}
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function SettingsPage() {
  const {
    notify,
    preferences = {},
    setPreferences,
    firebaseConnected,
    confirmAction,
    setDialog,
    swalShowLoading,
    swalCloseLoading,
  } = useApp()

  const defaults = { orders: true, attendance: true, loyalty: false, receipts: true }

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncLog, setSyncLog] = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [direction, setDirection] = useState(null)
  const pollRef = useRef(null)

  // ── Load sync status on mount + poll every 10 s ────────────────────────────
  async function loadStatus() {
    try {
      const data = await apiRequest('/api/sync/status')
      setSyncStatus(data)
    } catch {
      /* backend offline — ignore */
    }
    try {
      const data = await apiRequest('/api/sync/direction')
      setDirection(data)
    } catch {
      /* ignore */
    }
  }

  async function loadLog() {
    setLogLoading(true)
    try {
      const data = await apiRequest('/api/sync/log')
      setSyncLog(data.log || [])
    } catch {
      setSyncLog([])
    } finally {
      setLogLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    loadLog()
    pollRef.current = setInterval(() => {
      loadStatus()
    }, 10_000)
    return () => clearInterval(pollRef.current)
  }, [])

  function toggle(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  async function runInitialSync() {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    swalShowLoading('Synchronizing database…', 'Pushing local MySQL records to Firebase Realtime Database.')
    try {
      const result = await apiRequest('/api/sync/initial', { method: 'POST' })
      swalCloseLoading()
      setSyncResult({ ok: true, message: result.message, synced: result.synced })
      notify(result.message, { icon: 'success', title: 'MySQL → Firebase sync complete' })
      await loadStatus()
      await loadLog()
    } catch (error) {
      swalCloseLoading()
      setSyncResult({ ok: false, message: error.message })
      notify(error.message, { icon: 'error', title: 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  async function flushQueue() {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    swalShowLoading('Flushing sync queue…', 'Retrying pending Firebase synchronization records.')
    try {
      const result = await apiRequest('/api/sync/flush', { method: 'POST' })
      swalCloseLoading()
      const msg = `Flushed ${result.flushed} pending record(s) to Firebase.`
      setSyncResult({ ok: true, message: msg })
      notify(msg, { icon: 'success', title: 'Queue flushed' })
      await loadStatus()
      await loadLog()
    } catch (error) {
      swalCloseLoading()
      setSyncResult({ ok: false, message: error.message })
      notify(error.message, { icon: 'error', title: 'Flush failed' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleResetPreferences() {
    const result = await confirmAction({
      title: 'Reset preferences?',
      text: 'All system preferences will return to their default values.',
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Keep current',
      icon: 'warning',
    })
    if (!result.isConfirmed) return
    setPreferences(defaults)
    notify('Preferences reset to defaults', { icon: 'success', title: 'Preferences reset' })
  }

  // Derive UI values from status
  const mysqlOk = syncStatus !== null
  const fbOk = syncStatus?.firebase?.connected ?? firebaseConnected
  const queuePending = syncStatus?.queue?.pending || 0
  const queueFailed = syncStatus?.queue?.failed || 0
  const mode = syncStatus?.mode || (fbOk ? 'live' : 'local')
  const modeLabel =
    {
      live: 'Live · Two-way sync',
      syncing: 'Syncing…',
      local: 'Local only (Firebase offline)',
      error: 'Error',
    }[mode] || mode

  // Helper to extract collection name and record count from message
  function parseLogEntry(entry) {
    const time = entry.ts ? entry.ts.slice(11, 19) : '—'
    const level = (entry.level || 'info').toUpperCase()
    const msg = entry.message || ''

    // Match "collection_name: upserted X record(s)"
    const colMatch = msg.match(/^([a-zA-Z0-9_]+):/)
    const collection = entry.collection || (colMatch ? colMatch[1] : 'system')

    const recMatch = msg.match(/(\d+)\s+record/)
    const records = entry.records || (recMatch ? recMatch[1] : '1')

    return { time, level, message: msg, collection, records }
  }

  return (
    <div className="adm-settings-page">
      {/* ── 1. SETTINGS HEADER BANNER ──────────────────────────────────────── */}
      <section className="adm-set-banner">
        <svg className="adm-set-banner-leaves" viewBox="0 0 240 140" fill="none" aria-hidden="true">
          <path d="M40 130 C30 80 75 35 145 20 C130 65 95 110 40 130 Z" fill="rgba(212, 225, 87, 0.22)" />
          <path d="M100 125 C110 75 160 45 215 50 C190 85 155 115 100 125 Z" fill="rgba(255, 255, 255, 0.16)" />
          <path d="M15 95 C25 60 60 40 100 48 C80 80 50 98 15 95 Z" fill="rgba(212, 225, 87, 0.12)" />
        </svg>

        <div className="adm-set-banner-left">
          <div className="adm-set-banner-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div className="adm-set-banner-text">
            <h1>Settings</h1>
            <p>Manage system preferences.</p>
          </div>
        </div>
      </section>

      {/* ── 2. UPPER TWO-COLUMN GRID ──────────────────────────────────────── */}
      <div className="adm-set-upper-grid">
        {/* ── LEFT COLUMN: Sync Status & Sync Log ─────────────────────────── */}
        <div className="adm-set-col">
          {/* Section B: Synchronization Status */}
          <section className="adm-set-card">
            <div className="adm-set-card-header">
              <div className="adm-set-card-header-left">
                <span className="adm-set-card-header-icon" aria-hidden="true">🔄</span>
                <div>
                  <h2>Synchronization Status</h2>
                  <p>Live view of MySQL ↔ Firebase two-way sync.</p>
                </div>
              </div>
              <button
                className="adm-set-btn-pill"
                onClick={() => {
                  loadStatus()
                  loadLog()
                }}
                disabled={syncing}
                type="button"
                title="Refresh database connection status"
              >
                <IconRefresh spinning={syncing} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="adm-set-card-body">
              {/* Database status cards */}
              <div className="adm-set-db-grid">
                {/* MySQL */}
                <div className="adm-set-db-box">
                  <div className="adm-set-db-box-left">
                    <span className="adm-set-db-icon" aria-hidden="true">🗄️</span>
                    <div className="adm-set-db-info">
                      <strong>MySQL Database</strong>
                      <small>XAMPP / Local Database</small>
                    </div>
                  </div>
                  <span className={`adm-set-status-pill ${mysqlOk ? 'connected' : 'offline'}`}>
                    <span className={`adm-set-dot ${mysqlOk ? 'green' : 'red'}`} />
                    <span>{mysqlOk ? 'Connected' : 'Offline'}</span>
                  </span>
                </div>

                {/* Firebase */}
                <div className="adm-set-db-box">
                  <div className="adm-set-db-box-left">
                    <span className="adm-set-db-icon" aria-hidden="true">🔥</span>
                    <div className="adm-set-db-info">
                      <strong>Firebase Realtime Database</strong>
                      <small>Live Cloud Database</small>
                    </div>
                  </div>
                  <span className={`adm-set-status-pill ${fbOk ? 'connected' : 'offline'}`}>
                    <span className={`adm-set-dot ${fbOk ? 'green' : 'amber'}`} />
                    <span>{fbOk ? 'Connected' : 'Offline'}</span>
                  </span>
                </div>
              </div>

              {/* Sync Mode */}
              <div className="adm-set-mode-bar">
                <div className="adm-set-mode-left">
                  <span className="adm-set-mode-icon" aria-hidden="true">⇄</span>
                  <div className="adm-set-mode-info">
                    <strong>Sync Mode</strong>
                    <small>
                      {queuePending > 0 ? `${queuePending} record(s) pending · ` : ''}
                      Both directions active: MySQL ↔ Firebase
                    </small>
                  </div>
                </div>
                <span className="adm-set-status-pill connected">
                  <span>{modeLabel}</span>
                </span>
              </div>

              {/* Directions */}
              <div className="adm-set-dir-grid">
                <div className="adm-set-dir-box">
                  <div className="adm-set-dir-left">
                    <span style={{ fontSize: '18px' }} aria-hidden="true">🗄️</span>
                    <div className="adm-set-dir-info">
                      <strong>MySQL → Firebase</strong>
                      <small>Updates are synced in real-time</small>
                    </div>
                  </div>
                  <div className="adm-set-check-badge">
                    <IconCheck />
                  </div>
                </div>

                <div className="adm-set-dir-box">
                  <div className="adm-set-dir-left">
                    <span style={{ fontSize: '18px' }} aria-hidden="true">🔥</span>
                    <div className="adm-set-dir-info">
                      <strong>Firebase → MySQL</strong>
                      <small>Updates are synced in real-time</small>
                    </div>
                  </div>
                  <div className="adm-set-check-badge">
                    <IconCheck />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="adm-set-actions-row">
                <button
                  className="adm-set-btn-action btn-dark"
                  onClick={runInitialSync}
                  disabled={syncing || !fbOk}
                  type="button"
                  title={!fbOk ? 'Firebase is offline' : 'Push all MySQL records to Firebase'}
                >
                  <span>{syncing ? '↻ Syncing…' : '↑ Sync MySQL → Firebase'}</span>
                </button>
                {queuePending > 0 && (
                  <button
                    className="adm-set-btn-action btn-outline"
                    onClick={flushQueue}
                    disabled={syncing || !fbOk}
                    type="button"
                  >
                    <span>↻ Flush queue ({queuePending})</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Section D: Sync Log */}
          <section className="adm-set-log-card">
            <div className="adm-set-log-header">
              <div className="adm-set-log-header-left">
                <span style={{ fontSize: '18px' }} aria-hidden="true">📄</span>
                <div>
                  <h2>Sync Log</h2>
                  <p>Recent Firebase ↔ MySQL sync events.</p>
                </div>
              </div>
              <button
                className="adm-set-log-btn-refresh"
                onClick={loadLog}
                disabled={logLoading}
                type="button"
                title="Refresh synchronization logs"
              >
                <IconRefresh spinning={logLoading} />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="adm-set-log-table-wrap">
              <table className="adm-set-log-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>LEVEL</th>
                    <th>MESSAGE</th>
                    <th>COLLECTION</th>
                    <th>RECORDS</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLog.map((rawEntry, i) => {
                    const { time, level, message, collection, records } = parseLogEntry(rawEntry)
                    return (
                      <tr key={i}>
                        <td className="adm-set-log-time">{time}</td>
                        <td>
                          <span className={`adm-set-log-level-badge ${level.toLowerCase()}`}>
                            {level}
                          </span>
                        </td>
                        <td className="adm-set-log-msg">{message}</td>
                        <td className="adm-set-log-col">{collection}</td>
                        <td className="adm-set-log-recs">{records}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {syncLog.length === 0 && (
                <div className="adm-set-log-empty">
                  {logLoading ? 'Loading sync log…' : 'No sync events recorded in this session.'}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN: How Sync Works & System Preferences ───────────── */}
        <div className="adm-set-col">
          {/* Section C: How Synchronization Works */}
          <section className="adm-set-dark-card">
            <div className="adm-set-dark-card-header">
              <div className="adm-set-dark-icon" aria-hidden="true">💡</div>
              <div>
                <h2>How Synchronization Works</h2>
                <p>Understanding the MySQL ↔ Firebase two-way sync architecture.</p>
              </div>
            </div>

            <div className="adm-set-steps-list">
              {/* Step 1 */}
              <div className="adm-set-step-item">
                <div className="adm-set-step-num">1</div>
                <div className="adm-set-step-content">
                  <strong>
                    <span aria-hidden="true">💻</span>
                    <span>Localhost makes a change</span>
                  </strong>
                  <p>
                    Admin adds a menu item, records a payment, or updates an order on localhost.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="adm-set-step-item">
                <div className="adm-set-step-num">2</div>
                <div className="adm-set-step-content">
                  <strong>
                    <span aria-hidden="true">☁️</span>
                    <span>Live domain sees the update</span>
                  </strong>
                  <p>
                    The live domain (firebase hosting) has an active Firebase onValue listener on every collection.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="adm-set-step-item">
                <div className="adm-set-step-num">3</div>
                <div className="adm-set-step-content">
                  <strong>
                    <span aria-hidden="true">🌐</span>
                    <span>Domain makes a change</span>
                  </strong>
                  <p>
                    A customer places an order or a user edits their profile on the domain.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="adm-set-step-item">
                <div className="adm-set-step-num">4</div>
                <div className="adm-set-step-content">
                  <strong>
                    <span aria-hidden="true">🛡️</span>
                    <span>Offline resilience</span>
                  </strong>
                  <p>
                    If Firebase is temporarily offline, writes are queued.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section E: System Preferences */}
          <section className="adm-set-card">
            <div className="adm-set-card-header">
              <div className="adm-set-card-header-left">
                <span className="adm-set-card-header-icon" aria-hidden="true">⚙️</span>
                <div>
                  <h2>System Preferences</h2>
                  <p>Configure system behavior and features.</p>
                </div>
              </div>
            </div>

            <div className="adm-set-card-body">
              <div className="adm-set-pref-list">
                {/* 1. Order updates */}
                <label className="adm-set-pref-row">
                  <div className="adm-set-pref-left">
                    <span className="adm-set-pref-icon" aria-hidden="true">🛒</span>
                    <div className="adm-set-pref-info">
                      <strong>Order updates</strong>
                      <small>New orders and order status changes</small>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="adm-set-checkbox"
                    checked={preferences.orders ?? true}
                    onChange={() => toggle('orders')}
                  />
                </label>

                {/* 2. Attendance alerts */}
                <label className="adm-set-pref-row">
                  <div className="adm-set-pref-left">
                    <span className="adm-set-pref-icon" aria-hidden="true">👥</span>
                    <div className="adm-set-pref-info">
                      <strong>Attendance alerts</strong>
                      <small>Staff check-in and device status</small>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="adm-set-checkbox"
                    checked={preferences.attendance ?? true}
                    onChange={() => toggle('attendance')}
                  />
                </label>

                {/* 3. Loyalty updates */}
                <label className="adm-set-pref-row">
                  <div className="adm-set-pref-left">
                    <span className="adm-set-pref-icon" aria-hidden="true">⭐</span>
                    <div className="adm-set-pref-info">
                      <strong>Loyalty updates</strong>
                      <small>Points earned and reward activity</small>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="adm-set-checkbox"
                    checked={preferences.loyalty ?? true}
                    onChange={() => toggle('loyalty')}
                  />
                </label>

                {/* 4. Receipt copies */}
                <label className="adm-set-pref-row">
                  <div className="adm-set-pref-left">
                    <span className="adm-set-pref-icon" aria-hidden="true">📄</span>
                    <div className="adm-set-pref-info">
                      <strong>Receipt copies</strong>
                      <small>Include a receipt preview after POS sales</small>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="adm-set-checkbox"
                    checked={preferences.receipts ?? true}
                    onChange={() => toggle('receipts')}
                  />
                </label>
              </div>

              {/* Action buttons */}
              <div className="adm-set-pref-actions">
                <button
                  className="adm-set-btn-save"
                  onClick={() =>
                    notify('Preferences saved to the database', { icon: 'success', title: 'Saved' })
                  }
                  type="button"
                >
                  <span aria-hidden="true">💾</span>
                  <span>Save Preferences</span>
                </button>
                <button
                  className="adm-set-btn-reset"
                  onClick={handleResetPreferences}
                  type="button"
                >
                  <span aria-hidden="true">↻</span>
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── 3. ACCOUNT ACCESS BANNER (Bottom Full Width) ─────────────────── */}
      <section className="adm-set-account-banner">
        <svg className="adm-set-account-leaves" viewBox="0 0 200 120" fill="none" aria-hidden="true">
          <path d="M40 110 C50 65 95 40 150 45 C130 80 100 105 40 110 Z" fill="rgba(27, 59, 43, 0.14)" />
          <path d="M90 115 C110 70 150 50 195 55 C175 85 145 110 90 115 Z" fill="rgba(212, 225, 87, 0.28)" />
        </svg>

        <div className="adm-set-account-left">
          <div className="adm-set-account-avatar" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          </div>
          <div className="adm-set-account-text">
            <h3>Account Access</h3>
            <p>
              Role access is validated against Firebase Authentication, Cloud Firestore, and MySQL. Passwords are stored as one-way bcrypt hashes in MySQL and verified via Firebase Authentication.
            </p>
          </div>
        </div>

        <button
          className="adm-set-btn-provision"
          type="button"
          onClick={() => setDialog({ type: 'account', mode: 'register' })}
        >
          <span aria-hidden="true">👤+</span>
          <span>Provision Admin / Staff Account</span>
        </button>
      </section>
    </div>
  )
}
