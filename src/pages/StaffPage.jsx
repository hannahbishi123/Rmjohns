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
  const { staff = [], setStaff, setDialog, notify } = useApp()
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'requests'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All status')

  // Registration Requests State
  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [requestsFilter, setRequestsFilter] = useState('All') // 'All' | 'PENDING' | 'APPROVED' | 'REJECTED'

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  // Review Details Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)

  function handleOpenReview(staffMember) {
    setReviewTarget(staffMember)
    setReviewModalOpen(true)
  }

  // Live RFID Enrollment Session State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [enrollingStaff, setEnrollingStaff] = useState(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState('waiting') // 'waiting' | 'success' | 'error'
  const [enrolledUid, setEnrolledUid] = useState('')
  const [enrollError, setEnrollError] = useState('')

  const dynamicDate = useMemo(() => formatDynamicHeaderDate(), [])

  // Hide generic AppShell heading
  useEffect(() => {
    const container = document.querySelector('.page-content')
    if (container) container.classList.add('adm-staff-page-content')
    return () => {
      if (container) container.classList.remove('adm-staff-page-content')
    }
  }, [])

  // Fetch staff registration requests from backend
  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/staff-requests')
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.requests)) {
          setRequests(data.requests)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch staff requests:', err)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 5000)
    return () => clearInterval(interval)
  }, [])

  // Pending count for badge
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.approvalStatus === 'PENDING').length
  }, [requests])

  // Filtered regular staff
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

  // Filtered requests
  const visibleRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestsFilter === 'All') return true
      return r.approvalStatus === requestsFilter
    })
  }, [requests, requestsFilter])

  // ── APPROVE STAFF REQUEST ──────────────────────────────────────────────────
  async function handleApprove(staffMember) {
    try {
      const res = await fetch('/api/admin/staff-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffMember.id,
          admin_name: 'Admin',
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Approved ${staffMember.name}! Eligible for RFID enrollment.`, { icon: 'success' })
        fetchRequests()
        // Automatically prompt for RFID enrollment
        handleStartEnrollment(staffMember)
      } else {
        notify(data.error || 'Failed to approve staff request', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error approving staff: ' + err.message, { icon: 'error' })
    }
  }

  // ── OPEN REJECTION MODAL ───────────────────────────────────────────────────
  function handleOpenReject(staffMember) {
    setRejectTarget(staffMember)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  // ── SUBMIT REJECTION WITH REASON ───────────────────────────────────────────
  async function handleSubmitReject(e) {
    if (e) e.preventDefault()
    if (!rejectionReason.trim()) {
      return notify('Please enter a rejection reason.', { icon: 'warning' })
    }
    if (!rejectTarget) return

    setIsSubmittingReject(true)
    try {
      const res = await fetch('/api/admin/staff-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: rejectTarget.id,
          rejection_reason: rejectionReason.trim(),
          admin_name: 'Admin',
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Registration for ${rejectTarget.name} was rejected. Reason saved.`, { icon: 'info' })
        setRejectModalOpen(false)
        setRejectTarget(null)
        setRejectionReason('')
        fetchRequests()
      } else {
        notify(data.error || 'Failed to reject registration', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error rejecting staff: ' + err.message, { icon: 'error' })
    } finally {
      setIsSubmittingReject(false)
    }
  }

  // ── DELETE STAFF REQUEST & USER ACCOUNT ────────────────────────────────────
  async function handleDeleteRequest(staffMember) {
    if (!staffMember) return
    const confirmed = window.confirm(`Sigurado ka bang nais mong burahin ang record ni ${staffMember.name}? Mabubura ang account at request nito nang permanente.`)
    if (!confirmed) return

    try {
      const res = await fetch('/api/admin/staff-requests/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffMember.id }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Matagumpay na nabura ang account ni ${staffMember.name}.`, { icon: 'success' })
        if (reviewModalOpen && reviewTarget?.id === staffMember.id) {
          setReviewModalOpen(false)
          setReviewTarget(null)
        }
        fetchRequests()
      } else {
        notify(data.error || 'Nabigong burahin ang staff record.', { icon: 'error' })
      }
    } catch (err) {
      notify('Error sa pagbura: ' + err.message, { icon: 'error' })
    }
  }

  // ── START LIVE RFID ENROLLMENT SESSION ──────────────────────────────────────
  async function handleStartEnrollment(staffMember) {
    setEnrollingStaff(staffMember)
    setEnrollmentStatus('waiting')
    setEnrolledUid('')
    setEnrollError('')
    setEnrollModalOpen(true)

    try {
      const res = await fetch('/api/iot/enrollment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffMember.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setEnrollError(data.error || 'Could not start enrollment session on ESP32.')
        setEnrollmentStatus('error')
      }
    } catch (err) {
      setEnrollError(err.message)
      setEnrollmentStatus('error')
    }
  }

  // Poll enrollment status while modal is open
  useEffect(() => {
    if (!enrollModalOpen || enrollmentStatus !== 'waiting') return

    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/iot/status')
        if (res.ok) {
          const data = await res.json()
          // If enrollment was active and now completed, check if staff was linked
          if (enrollingStaff) {
            const reqRes = await fetch('/api/admin/staff-requests')
            if (reqRes.ok) {
              const reqData = await reqRes.json()
              const updated = reqData.requests?.find((r) => r.id === enrollingStaff.id)
              if (updated && updated.rfidStatus === 'ACTIVE' && updated.rfidUid) {
                setEnrolledUid(updated.rfidUid)
                setEnrollmentStatus('success')
                notify(`RFID Card [${updated.rfidUid}] linked to ${enrollingStaff.name}!`, { icon: 'success' })
                fetchRequests()
              }
            }
          }
        }
      } catch {}
    }, 2000)

    return () => clearInterval(pollTimer)
  }, [enrollModalOpen, enrollmentStatus, enrollingStaff])

  // Cancel enrollment
  async function handleCancelEnrollment() {
    try {
      await fetch('/api/iot/enrollment/cancel', { method: 'POST' })
    } catch {}
    setEnrollModalOpen(false)
    setEnrollingStaff(null)
  }

  function handleAddStaff() {
    setDialog({ type: 'add', entity: 'staff' })
  }

  return (
    <div className="adm-staff-mgmt">
      {/* ══════════════ 1. STAFF HEADER BANNER ══════════════ */}
      <header className="adm-stf-banner">
        <svg
          className="adm-stf-banner-art"
          viewBox="0 0 960 155"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M520 0 C610 40 675 98 595 155 L960 155 L960 0 Z" fill="#2B603A" fillOpacity="0.45" />
          <path d="M645 0 C565 48 520 105 475 155 L960 155 L960 0 Z" fill="#13311F" fillOpacity="0.58" />
          <path d="M695 -10 C625 42 585 102 555 155 L745 155 C760 98 795 42 855 -10 Z" fill="#A3C644" fillOpacity="0.24" />
        </svg>

        <svg className="adm-stf-banner-leaves" viewBox="0 0 220 130" fill="none" aria-hidden="true">
          <path d="M110 128 C118 82 146 46 186 22 C178 70 152 108 110 128 Z" fill="#5D9E31" />
          <path d="M114 124 Q148 72 182 26" stroke="#B7E048" strokeWidth="2" strokeLinecap="round" />
          <path d="M68 132 C80 92 112 64 156 54 C136 96 104 122 68 132 Z" fill="#77B83F" />
          <path d="M72 128 Q112 90 152 56" stroke="#D4E157" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M36 128 C52 106 78 92 108 92 C90 116 64 128 36 128 Z" fill="#498425" />
        </svg>

        <div className="adm-stf-banner-left">
          <span className="adm-stf-date">{dynamicDate}</span>
          <h1>Staff & Registrations</h1>
          <p>Manage eatery crew, review mobile app registrations, and enroll RFID attendance cards.</p>
        </div>

        <button type="button" className="adm-stf-banner-add-btn" onClick={handleAddStaff}>
          <span className="adm-stf-plus" aria-hidden="true">+</span>
          <span>Add staff</span>
        </button>
      </header>

      {/* ══════════════ TAB NAVIGATION ══════════════ */}
      <div className="adm-stf-nav-tabs">
        <button
          type="button"
          className={`adm-stf-tab-btn ${activeTab === 'directory' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Team Directory</span>
          <span className="adm-stf-tab-badge">{staff.length}</span>
        </button>

        <button
          type="button"
          className={`adm-stf-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>Staff Registration Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="adm-stf-tab-badge-pending">
              {pendingRequestsCount} PENDING
            </span>
          )}
        </button>
      </div>

      {/* ══════════════ TAB 1: TEAM DIRECTORY ══════════════ */}
      {activeTab === 'directory' && (
        <>
          {/* SEARCH AND STATUS FILTERS */}
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

          {/* TEAM DIRECTORY TABLE CARD */}
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

            <div className="adm-stf-table-scroll">
              <table className="adm-stf-table">
                <thead>
                  <tr>
                    <th className="col-staff">Staff Member</th>
                    <th className="col-role">Position / Role</th>
                    <th className="col-contact">Contact</th>
                    <th className="col-status">Status</th>
                    <th className="col-rfid">RFID Card</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((person) => {
                    const initials = getInitials(person.name)
                    const stClass = statusClass(person.status || 'Offline')
                    const rfidActive = Boolean(person.rfidUid)

                    return (
                      <tr key={person.id} className="adm-stf-row">
                        <td className="col-staff">
                          <div className="adm-stf-person">
                            <span className="adm-stf-avatar" aria-hidden="true">
                              {initials}
                            </span>
                            <div className="adm-stf-meta">
                              <span className="adm-stf-name">{person.name}</span>
                              <span className="adm-stf-id">{person.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="col-role">
                          <span className="adm-stf-role">{person.role}</span>
                        </td>

                        <td className="col-contact">
                          <span className="adm-stf-contact">{person.contact || '—'}</span>
                        </td>

                        <td className="col-status">
                          <span className={`adm-stf-status-badge status-${stClass}`}>
                            <i className="adm-stf-status-dot" aria-hidden="true" />
                            <span>{person.status}</span>
                          </span>
                        </td>

                        <td className="col-rfid">
                          {rfidActive ? (
                            <span className="adm-stf-rfid-active-badge" title={`RFID UID: ${person.rfidUid}`}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                              <code>{person.rfidUid}</code>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="adm-stf-enroll-btn"
                              onClick={() => handleStartEnrollment(person)}
                              title="Start RFID enrollment on ESP32 terminal"
                            >
                              Enroll Card
                            </button>
                          )}
                        </td>

                        <td className="col-actions">
                          <div className="adm-stf-action-group">
                            <button
                              type="button"
                              className="adm-stf-action-btn edit-btn"
                              onClick={() => setDialog({ type: 'edit', entity: 'staff', item: person })}
                              aria-label={`Edit ${person.name}`}
                              title="Edit staff details"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="adm-stf-action-btn delete-btn"
                              onClick={() => setDialog({ type: 'delete', entity: 'staff', item: person })}
                              aria-label={`Delete ${person.name}`}
                              title="Delete staff member"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
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

            {/* PAGINATION FOOTER */}
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
        </>
      )}

      {/* ══════════════ TAB 2: STAFF REGISTRATION REQUESTS ══════════════ */}
      {activeTab === 'requests' && (
        <section className="adm-stf-card" aria-label="Staff registration requests">
          <div className="adm-stf-card-head">
            <div className="adm-stf-card-title-group">
              <div className="adm-stf-team-icon" style={{ background: '#FFF3E0', color: '#E65100' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <h2>Staff Registration Requests</h2>
                <p>Mobile app registration submissions awaiting Admin approval or RFID card enrollment.</p>
              </div>
            </div>

            <div className="adm-stf-requests-filter-pills">
              {['All', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`adm-stf-req-filter-pill ${requestsFilter === f ? 'is-active' : ''}`}
                  onClick={() => setRequestsFilter(f)}
                >
                  {f === 'PENDING' && <span className="adm-stf-pending-dot" />}
                  {f} ({requests.filter((r) => (f === 'All' ? true : r.approvalStatus === f)).length})
                </button>
              ))}
            </div>
          </div>

          <div className="adm-stf-table-scroll">
            <table className="adm-stf-table">
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Contact Info</th>
                  <th>Requested Position</th>
                  <th>Applied / Decision Date</th>
                  <th>Approval Status</th>
                  <th>RFID Enrollment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((req) => {
                  const initials = getInitials(req.name)
                  const isPending = req.approvalStatus === 'PENDING'
                  const isApproved = req.approvalStatus === 'APPROVED'
                  const isRejected = req.approvalStatus === 'REJECTED'
                  const isRfidActive = req.rfidStatus === 'ACTIVE' && Boolean(req.rfidUid)

                  return (
                    <tr key={req.id} className={`adm-stf-row ${isPending ? 'is-pending-row' : ''}`}>
                      <td>
                        <div
                          className="adm-stf-person is-clickable"
                          onClick={() => handleOpenReview(req)}
                          title="Click to review applicant info"
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="adm-stf-avatar" style={{ background: isPending ? '#FFF3E0' : undefined, color: isPending ? '#E65100' : undefined }}>
                            {initials}
                          </span>
                          <div className="adm-stf-meta">
                            <span className="adm-stf-name">{req.name}</span>
                            <span className="adm-stf-id">{req.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="adm-stf-contact">{req.contact || '—'}</span>
                      </td>

                      <td>
                        <span className="adm-stf-position-badge">
                          {req.position || 'Staff'}
                        </span>
                      </td>

                      <td>
                        <div className="adm-stf-date-meta">
                          <span>{req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : (req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent')}</span>
                          {req.approvedBy && <small>By: {req.approvedBy}</small>}
                        </div>
                      </td>

                      <td>
                        <span className={`adm-stf-approval-pill status-${(req.approvalStatus || 'pending').toLowerCase()}`}>
                          {isPending && <span className="adm-stf-pulse-dot" />}
                          <span>{req.approvalStatus || 'PENDING'}</span>
                        </span>
                        {isRejected && req.rejectionReason && (
                          <div className="adm-stf-rejection-note" title={req.rejectionReason}>
                            Reason: {req.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td>
                        {isRfidActive ? (
                          <span className="adm-stf-rfid-active-badge">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <code>{req.rfidUid}</code>
                          </span>
                        ) : isApproved ? (
                          <button
                            type="button"
                            className="adm-stf-enroll-btn"
                            onClick={() => handleStartEnrollment(req)}
                          >
                            Enroll RFID
                          </button>
                        ) : (
                          <span className="adm-stf-rfid-locked">Requires Approval</span>
                        )}
                      </td>

                      <td>
                        <div className="adm-stf-req-actions">
                          <button
                            type="button"
                            className="adm-stf-review-btn"
                            onClick={() => handleOpenReview(req)}
                            title="Review applicant information before accepting or rejecting"
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Review
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="adm-stf-accept-btn"
                                onClick={() => handleApprove(req)}
                                title="Approve registration and unlock RFID enrollment"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="adm-stf-reject-btn"
                                onClick={() => handleOpenReject(req)}
                                title="Reject registration with reason"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              className="adm-stf-enroll-card-btn"
                              onClick={() => handleStartEnrollment(req)}
                            >
                              Enroll Card
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              className="adm-stf-re-review-btn"
                              onClick={() => handleApprove(req)}
                              title="Re-review and approve this registration without creating duplicates"
                            >
                              Re-review / Accept
                            </button>
                          )}

                          <button
                            type="button"
                            className="adm-stf-delete-req-btn"
                            onClick={() => handleDeleteRequest(req)}
                            title="Delete this registration request and user account permanently"
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {visibleRequests.length === 0 && (
              <div className="adm-stf-empty">
                No registration requests found in this category.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════ REVIEW APPLICANT DETAILS MODAL ══════════════ */}
      {reviewModalOpen && reviewTarget && (
        <div className="adm-stf-modal-backdrop" onClick={() => setReviewModalOpen(false)}>
          <div className="adm-stf-modal-card review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon review-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h3>Review Staff Application</h3>
                <p>Suriin ang mga impormasyon ng nag-register bago i-accept o i-reject.</p>
              </div>
              <button type="button" className="adm-stf-modal-close" onClick={() => setReviewModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="adm-stf-modal-body review-modal-content">
              {/* Profile Card Header */}
              <div className="adm-stf-review-profile-header">
                <span className="adm-stf-review-avatar">
                  {getInitials(reviewTarget.name)}
                </span>
                <div className="adm-stf-review-profile-meta">
                  <h4>{reviewTarget.name}</h4>
                  <div className="adm-stf-review-badges">
                    <span className="adm-stf-position-badge">{reviewTarget.position || 'Staff'}</span>
                    <span className={`adm-stf-approval-pill status-${(reviewTarget.approvalStatus || 'pending').toLowerCase()}`}>
                      {reviewTarget.approvalStatus === 'PENDING' && <span className="adm-stf-pulse-dot" />}
                      <span>{reviewTarget.approvalStatus || 'PENDING'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="adm-stf-review-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Buong Pangalan (Full Name)</span>
                  <span className="detail-value">{reviewTarget.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Posisyon (Position)</span>
                  <span className="detail-value position-value">{reviewTarget.position || 'Staff'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value highlight-value">{reviewTarget.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact / Phone</span>
                  <span className="detail-value">{reviewTarget.contact || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Staff / Reference ID</span>
                  <span className="detail-value mono-value">{reviewTarget.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Petsa ng Pag-register</span>
                  <span className="detail-value">
                    {reviewTarget.createdAt ? new Date(reviewTarget.createdAt).toLocaleString() : 'Kamakailan'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">RFID Card Status</span>
                  <span className="detail-value">
                    {reviewTarget.rfidStatus === 'ACTIVE' ? `Active (${reviewTarget.rfidUid})` : (reviewTarget.rfidStatus || 'UNREGISTERED')}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Approval Status</span>
                  <span className="detail-value">
                    {reviewTarget.approvedBy ? `${reviewTarget.approvalStatus} (ni ${reviewTarget.approvedBy})` : reviewTarget.approvalStatus}
                  </span>
                </div>
              </div>

              {/* Previous Rejection Reason if any */}
              {reviewTarget.approvalStatus === 'REJECTED' && reviewTarget.rejectionReason && (
                <div className="adm-stf-review-rejection-box">
                  <strong>Rejection Reason:</strong>
                  <p>{reviewTarget.rejectionReason}</p>
                </div>
              )}

              {/* Instructional Guide Box */}
              <div className="adm-stf-review-guide-alert">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  Pakitignan kung tama ang pangalan, contact, at posisyon. Kapag in-<strong>Accept</strong>, maaari nang i-enroll ang RFID card ng staff para sa attendance. Kapag may mali o kulang, i-click ang <strong>Reject</strong> at ipaliwanag ang dahilan.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="adm-stf-modal-actions review-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn delete-action-btn"
                  onClick={() => {
                    const target = reviewTarget
                    handleDeleteRequest(target)
                  }}
                  title="Burahin ang account at application ng user na ito nang permanente"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete User
                </button>

                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={() => setReviewModalOpen(false)}
                >
                  Close
                </button>

                {reviewTarget.approvalStatus === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      className="adm-stf-modal-btn reject-action-btn"
                      onClick={() => {
                        const target = reviewTarget
                        setReviewModalOpen(false)
                        handleOpenReject(target)
                      }}
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      className="adm-stf-modal-btn accept-action-btn"
                      onClick={() => {
                        const target = reviewTarget
                        setReviewModalOpen(false)
                        handleApprove(target)
                      }}
                    >
                      Accept & Unlock RFID
                    </button>
                  </>
                )}

                {reviewTarget.approvalStatus === 'REJECTED' && (
                  <button
                    type="button"
                    className="adm-stf-modal-btn accept-action-btn"
                    onClick={() => {
                      const target = reviewTarget
                      setReviewModalOpen(false)
                      handleApprove(target)
                    }}
                  >
                    Re-review / Accept
                  </button>
                )}

                {reviewTarget.approvalStatus === 'APPROVED' && reviewTarget.rfidStatus !== 'ACTIVE' && (
                  <button
                    type="button"
                    className="adm-stf-modal-btn accept-action-btn"
                    onClick={() => {
                      const target = reviewTarget
                      setReviewModalOpen(false)
                      handleStartEnrollment(target)
                    }}
                  >
                    Enroll RFID Card
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ REJECTION REASON MODAL ══════════════ */}
      {rejectModalOpen && rejectTarget && (
        <div className="adm-stf-modal-backdrop" onClick={() => !isSubmittingReject && setRejectModalOpen(false)}>
          <div className="adm-stf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon reject-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <h3>Reject Staff Registration</h3>
                <p>Provide a clear reason for rejecting this applicant.</p>
              </div>
              <button
                type="button"
                className="adm-stf-modal-close"
                onClick={() => setRejectModalOpen(false)}
                disabled={isSubmittingReject}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReject} className="adm-stf-modal-body">
              <div className="adm-stf-modal-applicant-summary">
                <span className="summary-name">{rejectTarget.name}</span>
                <span className="summary-pos">{rejectTarget.position || rejectTarget.role || 'Staff'}</span>
                <span className="summary-contact">{rejectTarget.contact}</span>
              </div>

              <div className="adm-stf-form-field">
                <label htmlFor="rejectionReasonInput">
                  Rejection Reason <em>*</em>
                </label>
                <textarea
                  id="rejectionReasonInput"
                  rows={4}
                  maxLength={500}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Incomplete credentials, applicant needs to re-upload ID, incorrect position selected..."
                  required
                  autoFocus
                />
                <small className="form-help">
                  This reason will be displayed in the user's mobile app account. RFID enrollment and attendance access will remain blocked.
                </small>
              </div>

              <div className="adm-stf-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isSubmittingReject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-stf-modal-btn confirm-reject-btn"
                  disabled={isSubmittingReject || !rejectionReason.trim()}
                >
                  {isSubmittingReject ? 'Saving Rejection...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ LIVE RFID ENROLLMENT MODAL ══════════════ */}
      {enrollModalOpen && enrollingStaff && (
        <div className="adm-stf-modal-backdrop" onClick={handleCancelEnrollment}>
          <div className="adm-stf-modal-card enroll-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon rfid-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <h3>RFID Attendance Card Enrollment</h3>
                <p>Linking an RFID card to <strong>{enrollingStaff.name}</strong></p>
              </div>
              <button type="button" className="adm-stf-modal-close" onClick={handleCancelEnrollment}>
                ×
              </button>
            </div>

            <div className="adm-stf-modal-body enroll-modal-content">
              {enrollmentStatus === 'waiting' && (
                <div className="adm-stf-enroll-waiting">
                  <div className="adm-stf-radar-pulse">
                    <div className="radar-circle" />
                    <div className="radar-card-icon">
                      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#2B603A" strokeWidth="2.2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                  </div>

                  <div className="adm-stf-oled-mockup">
                    <div className="oled-header">ESP32 OLED DISPLAY:</div>
                    <div className="oled-text-line line1">READY TO SCAN</div>
                    <div className="oled-text-line line2">ENROLL RFID CARD</div>
                    <div className="oled-text-line line3">{enrollingStaff.name}</div>
                  </div>

                  <p className="adm-stf-enroll-instruction">
                    Please tap the physical RFID card onto the <strong>RC522 reader</strong> on your ESP32 device now.
                  </p>
                  <small className="adm-stf-enroll-note">
                    The backend verifies approval and prevents duplicate RFID cards automatically.
                  </small>
                </div>
              )}

              {enrollmentStatus === 'success' && (
                <div className="adm-stf-enroll-success">
                  <div className="success-icon-wrap">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#2B603A" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4>REGISTRATION SUCCESSFUL!</h4>
                  <p>RFID Card <code>{enrolledUid}</code> has been linked to {enrollingStaff.name}.</p>
                  <div className="adm-stf-oled-mockup success-oled">
                    <div className="oled-text-line line1">REGISTRATION SUCCESSFUL</div>
                    <div className="oled-text-line line2">{enrollingStaff.name}</div>
                    <div className="oled-text-line line3">CARD LINKED</div>
                  </div>
                </div>
              )}

              {enrollmentStatus === 'error' && (
                <div className="adm-stf-enroll-error">
                  <p className="error-msg">{enrollError || 'An error occurred during enrollment.'}</p>
                  <button type="button" className="adm-stf-enroll-btn" onClick={() => handleStartEnrollment(enrollingStaff)}>
                    Try Again
                  </button>
                </div>
              )}

              <div className="adm-stf-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={handleCancelEnrollment}
                >
                  {enrollmentStatus === 'success' ? 'Done' : 'Cancel Enrollment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botanical bottom decor */}
      <div className="adm-stf-bottom-decor" aria-hidden="true">
        <svg className="adm-stf-bottom-wave" viewBox="0 0 1200 68" preserveAspectRatio="none" fill="none">
          <path d="M0 50 C240 12 460 64 740 34 C940 14 1090 28 1200 44 L1200 68 L0 68 Z" fill="#C6DC63" fillOpacity="0.6" />
          <path d="M0 58 C250 24 470 70 750 44 C950 24 1095 38 1200 52 L1200 68 L0 68 Z" fill="#1B3B2B" />
        </svg>
      </div>
    </div>
  )
}
