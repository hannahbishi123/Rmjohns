/**
 * ConnectionStatus
 *
 * Shows a small indicator in the top-right corner of the app shell.
 *
 * Modes:
 *   ● LIVE    – Firebase connected + XAMPP backend connected (localhost)
 *   ● CLOUD   – Firebase connected, no XAMPP backend (domain / phone)
 *   ↻ SYNCING – Firebase connected, pending records flushing
 *   ○ OFFLINE – Firebase unavailable
 *
 * On the domain (rmjohns-eateries.web.app), the backend API is unreachable
 * so the app uses Firebase directly. This is normal and correct.
 * On localhost with XAMPP running, both backend and Firebase are connected.
 */

import { useEffect, useRef, useState } from 'react'
import { firebaseListenConnection } from '../lib/firebase'
import { apiRequest } from '../lib/api'

const POLL_INTERVAL = 30_000 // 30 s

// Detect whether we're running on localhost or the deployed domain
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export default function ConnectionStatus() {
  // firebaseUp: tri-state — null = unknown, true = connected, false = disconnected
  const [firebaseUp, setFirebaseUp] = useState(null)
  const [backendUp,  setBackendUp]  = useState(false)
  const [pending,    setPending]    = useState(0)
  const [failed,     setFailed]     = useState(0)
  const [expanded,   setExpanded]   = useState(false)
  const pollRef = useRef(null)

  // ── Poll the backend API (only meaningful on localhost) ───────────────────
  async function pollBackend() {
    try {
      const data = await apiRequest('/api/sync/status')
      setBackendUp(true)
      setPending((data.queue?.pending ?? 0) + (data.queue?.retrying ?? 0))
      setFailed(data.queue?.failed ?? 0)
    } catch {
      setBackendUp(false)
    }
  }

  // ── Subscribe to Firebase connection state ────────────────────────────────
  useEffect(() => {
    const unsub = firebaseListenConnection((connected) => {
      setFirebaseUp(connected)
      if (connected && isLocalhost) pollBackend()
    })

    if (isLocalhost) {
      pollBackend()
      pollRef.current = setInterval(pollBackend, POLL_INTERVAL)
    }

    return () => {
      unsub()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive display mode ───────────────────────────────────────────────────
  let label, icon, className, titleText

  if (firebaseUp === null) {
    // Still connecting on first load
    label = 'CONNECTING'; icon = '○'; className = 'conn-local'
    titleText = 'Connecting to Firebase…'
  } else if (!firebaseUp) {
    label = 'OFFLINE'; icon = '○'; className = 'conn-local'
    titleText = 'Firebase unavailable — working offline'
  } else if (isLocalhost && backendUp && pending > 0) {
    label = 'SYNCING'; icon = '↻'; className = 'conn-syncing'
    titleText = `Syncing ${pending} record${pending !== 1 ? 's' : ''} to Firebase…`
  } else if (isLocalhost && backendUp) {
    label = 'LIVE'; icon = '●'; className = 'conn-live'
    titleText = 'Firebase connected · XAMPP connected · All data synced'
  } else {
    label = 'CLOUD'; icon = '●'; className = 'conn-live'
    titleText = 'Firebase Realtime Database connected'
  }

  return (
    <div
      className={`connection-status ${className}${expanded ? ' expanded' : ''}`}
      title={titleText}
      onClick={() => setExpanded((v) => !v)}
      role="status"
      aria-label={titleText}
    >
      <span className={`conn-icon${label === 'SYNCING' ? ' spinning' : ''}`}>{icon}</span>
      <span className="conn-label">{label}</span>

      {expanded && (
        <div className="conn-detail" role="tooltip">
          {/* Firebase row */}
          <div className="conn-detail-row">
            <span className={`conn-dot ${firebaseUp ? 'conn-dot-green' : 'conn-dot-red'}`} />
            <span>Firebase {firebaseUp ? 'connected' : 'unavailable'}</span>
          </div>

          {/* Backend / XAMPP row — only show on localhost */}
          {isLocalhost && (
            <div className="conn-detail-row">
              <span className={`conn-dot ${backendUp ? 'conn-dot-green' : 'conn-dot-red'}`} />
              <span>XAMPP / MySQL {backendUp ? 'connected' : 'unavailable'}</span>
            </div>
          )}

          {/* Domain info row */}
          {!isLocalhost && firebaseUp && (
            <div className="conn-detail-row">
              <span className="conn-dot conn-dot-green" />
              <span>Cloud database · rmjohns-eateries</span>
            </div>
          )}

          {/* Pending sync */}
          {pending > 0 && (
            <div className="conn-detail-row">
              <span className="conn-dot conn-dot-yellow" />
              <span>{pending} record{pending !== 1 ? 's' : ''} pending sync</span>
            </div>
          )}

          {/* Failed sync */}
          {failed > 0 && (
            <div className="conn-detail-row">
              <span className="conn-dot conn-dot-red" />
              <span>{failed} failed — will retry automatically</span>
            </div>
          )}

          {/* All good */}
          {firebaseUp && pending === 0 && failed === 0 && (
            <div className="conn-detail-row">
              <span className="conn-dot conn-dot-green" />
              <span>All data up to date</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
