import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiRequest } from '../lib/api'

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconRefresh({ spinning }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : {}}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// ── Status dot ────────────────────────────────────────────────────────────────
function Dot({ color }) {
  const colors = {
    green:  '#3BB54A',
    amber:  '#F59E0B',
    red:    '#EF4444',
    grey:   '#9CA3AF',
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: colors[color] || colors.grey,
      flexShrink: 0,
    }} />
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  const styles = {
    green: { background: '#e8f8eb', color: '#1a7a2a', border: '1px solid #b8e8c0' },
    amber: { background: '#fef9e7', color: '#7a5800', border: '1px solid #fcd34d' },
    red:   { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' },
    grey:  { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
    blue:  { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      ...(styles[color] || styles.grey),
    }}>
      {label}
    </span>
  )
}

// ── Direction card ────────────────────────────────────────────────────────────
function SyncDirectionCard({ from, to, active, description, pending = 0 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: '#fff',
      border: `1.5px solid ${active ? '#d4ead7' : '#eaede8'}`,
      borderRadius: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2e20' }}>{from}</span>
          <IconArrow />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2e20' }}>{to}</span>
          {pending > 0 && <Badge label={`${pending} pending`} color="amber" />}
        </div>
        <p style={{ margin: 0, fontSize: 11.5, color: '#9eaaa0', lineHeight: 1.5 }}>{description}</p>
      </div>
      <div style={{ flexShrink: 0 }}>
        {active
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#3BB54A', fontSize: 12, fontWeight: 600 }}><IconCheck /> Active</div>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9CA3AF', fontSize: 12 }}><IconX /> Inactive</div>
        }
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { notify, preferences, setPreferences, firebaseConnected, confirmAction } = useApp()
  const defaults = { orders: true, attendance: true, loyalty: false, receipts: true }

  const [syncing, setSyncing]       = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncLog, setSyncLog]       = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [direction, setDirection]   = useState(null)
  const pollRef = useRef(null)

  // ── Load sync status on mount + poll every 10 s ────────────────────────────
  async function loadStatus() {
    try {
      const data = await apiRequest('/api/sync/status')
      setSyncStatus(data)
    } catch { /* backend offline — ignore */ }
    try {
      const data = await apiRequest('/api/sync/direction')
      setDirection(data)
    } catch { /* ignore */ }
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
    pollRef.current = setInterval(() => { loadStatus() }, 10_000)
    return () => clearInterval(pollRef.current)
  }, [])

  function toggle(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  async function runInitialSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await apiRequest('/api/sync/initial', { method: 'POST' })
      setSyncResult({ ok: true, message: result.message, synced: result.synced })
      notify(result.message, { icon: 'success', title: 'MySQL → Firebase sync complete' })
      await loadStatus()
      await loadLog()
    } catch (error) {
      setSyncResult({ ok: false, message: error.message })
      notify(error.message, { icon: 'error', title: 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  async function flushQueue() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await apiRequest('/api/sync/flush', { method: 'POST' })
      const msg = `Flushed ${result.flushed} pending record(s) to Firebase.`
      setSyncResult({ ok: true, message: msg })
      notify(msg, { icon: 'success', title: 'Queue flushed' })
      await loadStatus()
      await loadLog()
    } catch (error) {
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
  const mysqlOk     = syncStatus !== null
  const fbOk        = syncStatus?.firebase?.connected ?? firebaseConnected
  const queuePending = syncStatus?.queue?.pending || 0
  const queueFailed  = syncStatus?.queue?.failed  || 0
  const mode         = syncStatus?.mode || (fbOk ? 'live' : 'local')
  const modeColor    = { live: 'green', syncing: 'amber', local: 'amber', error: 'red' }[mode] || 'grey'
  const modeLabel    = { live: 'Live · Two-way sync', syncing: 'Syncing…', local: 'Local only (Firebase offline)', error: 'Error' }[mode] || mode

  // Log level colors
  function logColor(level) {
    return { error: '#b91c1c', warn: '#7a5800', info: '#1a2e20' }[level] || '#6b7280'
  }

  return (
    <div className="settings-layout">

      {/* ══════════════════════════════════════════════════════════
          1 · SYNC STATUS — always visible at the top
          ══════════════════════════════════════════════════════════ */}
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Synchronisation status</h2>
            <p>Live view of MySQL ↔ Firebase two-way sync.</p>
          </div>
          <button
            className="button button-outline"
            onClick={() => { loadStatus(); loadLog() }}
            disabled={syncing}
            style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
          >
            <IconRefresh spinning={syncing} /> Refresh
          </button>
        </div>

        {/* ── Connection rows ── */}
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {/* XAMPP / MySQL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: mysqlOk ? '#f7fdf7' : '#fef9f9',
            border: `1px solid ${mysqlOk ? '#d4ead7' : '#fca5a5'}`,
            borderRadius: 10,
          }}>
            <Dot color={mysqlOk ? 'green' : 'red'} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13, color: '#1a2e20' }}>XAMPP / MySQL</strong>
              <p style={{ margin: 0, fontSize: 11, color: '#9eaaa0' }}>
                Local database — primary source of truth
              </p>
            </div>
            <Badge label={mysqlOk ? 'Connected' : 'Offline'} color={mysqlOk ? 'green' : 'red'} />
          </div>

          {/* Firebase */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: fbOk ? '#f7fdf7' : '#fffbeb',
            border: `1px solid ${fbOk ? '#d4ead7' : '#fcd34d'}`,
            borderRadius: 10,
          }}>
            <Dot color={fbOk ? 'green' : 'amber'} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13, color: '#1a2e20' }}>Firebase Realtime Database</strong>
              <p style={{ margin: 0, fontSize: 11, color: '#9eaaa0' }}>
                Live cloud database — domain reads from here
              </p>
            </div>
            <Badge label={fbOk ? 'Connected' : 'Offline'} color={fbOk ? 'green' : 'amber'} />
          </div>

          {/* Overall mode */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: '#f7fdf7',
            border: '1px solid #d4ead7',
            borderRadius: 10,
          }}>
            <Dot color={modeColor} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13, color: '#1a2e20' }}>Sync mode</strong>
              <p style={{ margin: 0, fontSize: 11, color: '#9eaaa0' }}>
                {queuePending > 0 && `${queuePending} record(s) pending · `}
                {queueFailed  > 0 && `${queueFailed} failed · `}
                Both directions active when backend + Firebase are running
              </p>
            </div>
            <Badge label={modeLabel} color={modeColor} />
          </div>
        </div>

        {/* ── Sync directions ── */}
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <SyncDirectionCard
            from="MySQL (localhost)"
            to="Firebase (domain)"
            active={mysqlOk && fbOk}
            pending={queuePending}
            description="Every write on localhost is pushed to Firebase immediately. Failed writes are queued and retried every 30 s."
          />
          <SyncDirectionCard
            from="Firebase (domain)"
            to="MySQL (localhost)"
            active={direction?.firebaseToMySQL?.active ?? (mysqlOk && fbOk)}
            description="Firebase onValue listeners watch all collections. Changes made on the live domain are written back to MySQL automatically."
          />
        </div>

        {/* ── Sync result banner ── */}
        {syncResult && (
          <div style={{
            padding: '9px 14px',
            borderRadius: 8,
            marginBottom: 12,
            background: syncResult.ok ? '#e8f8eb' : '#fef2f2',
            color:      syncResult.ok ? '#1a7a2a' : '#b91c1c',
            fontSize: 12.5,
            border: `1px solid ${syncResult.ok ? '#b8e8c0' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {syncResult.ok ? <IconCheck /> : <IconX />}
            <span>{syncResult.message}</span>
            {syncResult.synced != null && (
              <strong style={{ marginLeft: 4 }}>({syncResult.synced} records)</strong>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="button button-dark"
            onClick={runInitialSync}
            disabled={syncing || !fbOk}
            title={!fbOk ? 'Firebase is offline' : 'Push all MySQL records to Firebase'}
          >
            {syncing ? '↻ Syncing…' : '↑ Sync MySQL → Firebase'}
          </button>
          <button
            className="button button-outline"
            onClick={flushQueue}
            disabled={syncing || !fbOk || queuePending === 0}
            title={queuePending === 0 ? 'No pending records' : `Retry ${queuePending} pending record(s)`}
          >
            ↻ Flush queue {queuePending > 0 ? `(${queuePending})` : ''}
          </button>
          <button
            className="button button-outline"
            onClick={() => { loadStatus(); loadLog() }}
            disabled={syncing}
          >
            ⟳ Refresh status
          </button>
        </div>

        {!fbOk && (
          <p style={{ color: '#7a5800', fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            Firebase is currently offline. Ensure the backend is running with a valid
            <code style={{ marginLeft: 4 }}>backend/firebase-service-account.json</code>.
          </p>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          2 · HOW SYNC WORKS — explanation panel
          ══════════════════════════════════════════════════════════ */}
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>How synchronisation works</h2>
            <p>Understanding the MySQL ↔ Firebase two-way sync architecture.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {[
            {
              step: '1',
              title: 'Localhost makes a change',
              desc: 'Admin adds a menu item, records a payment, or updates an order on localhost. The backend writes to MySQL first, then immediately pushes the same record to Firebase under a stable primary-key path.',
            },
            {
              step: '2',
              title: 'Live domain sees the update',
              desc: 'The live domain (Firebase Hosting) has an active Firebase onValue listener on every collection. It receives the update in real time — no page reload needed.',
            },
            {
              step: '3',
              title: 'Domain makes a change',
              desc: 'A customer places an order or a user edits their profile on the domain. The React app writes directly to Firebase. The backend\'s reverse-sync listeners (firebaseToMySQL.js) detect the change and upsert it into MySQL.',
            },
            {
              step: '4',
              title: 'Offline resilience',
              desc: 'If Firebase is temporarily offline, writes are queued in the firebase_sync_queue MySQL table. The retry loop (every 30 s) automatically pushes them once Firebase reconnects. Use "Flush queue" to trigger immediately.',
            },
            {
              step: '5',
              title: 'UI changes',
              desc: 'Source-code and design changes only travel one way: edit the code → npm run build → firebase deploy. This publishes the new dist/ folder to Firebase Hosting and updates both environments.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                flexShrink: 0,
                width: 26, height: 26,
                borderRadius: '50%',
                background: '#3BB54A',
                color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {step}
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#1a2e20', display: 'block', marginBottom: 2 }}>{title}</strong>
                <p style={{ margin: 0, fontSize: 12, color: '#637068', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3 · SYNC LOG
          ══════════════════════════════════════════════════════════ */}
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Sync log</h2>
            <p>Recent Firebase ↔ MySQL sync events from this backend session.</p>
          </div>
          <button
            className="button button-outline"
            onClick={loadLog}
            disabled={logLoading}
            style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
          >
            <IconRefresh spinning={logLoading} /> Refresh log
          </button>
        </div>

        {syncLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9eaaa0', fontSize: 13 }}>
            {logLoading ? 'Loading sync log…' : 'No sync events yet. Start the backend and run a sync.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 1, maxHeight: 320, overflowY: 'auto' }}>
            {syncLog.map((entry, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '86px 42px 1fr',
                gap: 10,
                padding: '7px 4px',
                borderBottom: '1px solid #f0f4f0',
                alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 10, color: '#9eaaa0', fontFamily: 'monospace' }}>
                  {entry.ts ? entry.ts.slice(11, 19) : '—'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  color: logColor(entry.level),
                }}>
                  {entry.level}
                </span>
                <span style={{ fontSize: 12, color: '#3a4a3f', lineHeight: 1.4 }}>
                  {entry.message}
                  {entry.detail && (
                    <span style={{ color: '#9eaaa0', marginLeft: 6 }}>— {entry.detail}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          4 · SYSTEM PREFERENCES
          ══════════════════════════════════════════════════════════ */}
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>System preferences</h2>
            <p>Notification and feature toggles saved to the local database.</p>
          </div>
        </div>

        {[
          ['orders',     'Order updates',    'New orders and order status changes'],
          ['attendance', 'Attendance alerts', 'Staff check-ins and device status'],
          ['loyalty',    'Loyalty updates',   'Points earned and reward activity'],
          ['receipts',   'Receipt copies',    'Include a receipt preview after POS sales'],
        ].map(([key, label, description]) => (
          <label className="setting-row" key={key}>
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <input
              type="checkbox"
              checked={Boolean(preferences[key])}
              onChange={() => toggle(key)}
            />
          </label>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            className="button button-dark"
            onClick={() => notify('Preferences saved to the database', { icon: 'success', title: 'Saved' })}
          >
            Save preferences
          </button>
          <button className="button button-outline" onClick={handleResetPreferences}>
            Reset to defaults
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5 · ACCOUNT ACCESS
          ══════════════════════════════════════════════════════════ */}
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Account access</h2>
            <p>Role access is validated against Firebase and the database.</p>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: '#637068', margin: '0 0 12px', lineHeight: 1.6 }}>
          Customer passwords are stored as one-way hashes in MySQL. Staff and Admin accounts
          are created by an Admin using the privileged setup code. Firebase Auth is used for
          session management on both localhost and the live domain.
        </p>
        <p style={{ fontSize: 12.5, color: '#637068', margin: 0, lineHeight: 1.6 }}>
          To create or manage accounts: use the <strong>Staff</strong> page (staff) or the
          <strong> Register</strong> flow (customers). Role changes must be made in MySQL
          and re-synced to Firebase using <strong>Sync MySQL → Firebase</strong> above.
        </p>
      </section>

    </div>
  )
}
