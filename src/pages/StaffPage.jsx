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
  return parts.map((part) => part[0]).join('').slice(0, 3).toUpperCase()
}

function generateRandomPassword() {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const specials = '!@#$%^&*'
  let pwd = [
    uppers.charAt(Math.floor(Math.random() * uppers.length)),
    lowers.charAt(Math.floor(Math.random() * lowers.length)),
    digits.charAt(Math.floor(Math.random() * digits.length)),
    specials.charAt(Math.floor(Math.random() * specials.length)),
  ]
  const all = uppers + lowers + digits + specials
  while (pwd.length < 10) {
    pwd.push(all.charAt(Math.floor(Math.random() * all.length)))
  }
  return pwd.sort(() => 0.5 - Math.random()).join('')
}

export default function StaffPage() {
  const { staff = [], setStaff, setDialog, notify } = useApp()
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'requests'

  // Search & Multiple Filters
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('All positions')
  const [employmentFilter, setEmploymentFilter] = useState('All employment')
  const [rfidFilter, setRfidFilter] = useState('All RFID')
  const [shiftFilter, setShiftFilter] = useState('All shifts')

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [rfidHistory, setRfidHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Registration Requests State (Mobile applicants prior to lock)
  const [requests, setRequests] = useState([])
  const [requestsFilter, setRequestsFilter] = useState('All')

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  // Review Details Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)

  // Live RFID Enrollment Session State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [enrollingStaff, setEnrollingStaff] = useState(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState('waiting') // 'waiting' | 'success' | 'duplicate' | 'error'
  const [enrolledUid, setEnrolledUid] = useState('')
  const [enrollError, setEnrollError] = useState('')
  const [enrollCountdown, setEnrollCountdown] = useState(180)

  // Add Staff Form State
  const [addForm, setAddForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthdate: '',
    gender: 'Prefer not to say',
    contactNumber: '',
    email: '',
    address: '',
    employeeId: `EMP-${Date.now().toString().slice(-4)}`,
    position: 'Service Crew',
    dateHired: new Date().toISOString().slice(0, 10),
    employmentStatus: 'Active',
    username: '',
    password: '',
    confirmPassword: '',
    accountStatus: 'Active',
    enrollRfidImmediately: true
  })
  const [addFormErrors, setAddFormErrors] = useState({})
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Edit Staff Form State
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthdate: '',
    gender: '',
    contactNumber: '',
    email: '',
    address: '',
    position: 'Staff',
    dateHired: '',
    employmentStatus: 'Active'
  })
  const [editFormErrors, setEditFormErrors] = useState({})
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

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

  // KPI Overview stats
  const totalStaffCount = staff.length
  const activeTodayCount = useMemo(
    () => staff.filter((person) => person.status === 'Present').length,
    [staff]
  )
  const activeEmploymentCount = useMemo(
    () => staff.filter((person) => (person.employmentStatus || 'Active') === 'Active').length,
    [staff]
  )
  const rfidRegisteredCount = useMemo(
    () => staff.filter((person) => Boolean(person.rfidUid)).length,
    [staff]
  )
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.approvalStatus === 'PENDING').length
  }, [requests])

  // Filtered staff directory
  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter((person) => {
      // Search matching name, employeeId, id, contact, email, position
      const haystack = `${person.name || ''} ${person.employeeId || ''} ${person.id || ''} ${person.position || person.role || ''} ${person.contact || ''} ${person.email || ''}`.toLowerCase()
      const matchesSearch = !q || haystack.includes(q)

      // Position filter
      const pos = person.position || person.role || 'Staff'
      const matchesPosition = positionFilter === 'All positions' || pos.toLowerCase() === positionFilter.toLowerCase()

      // Employment status filter
      const empStatus = person.employmentStatus || 'Active'
      const matchesEmployment = employmentFilter === 'All employment' || empStatus.toLowerCase() === employmentFilter.toLowerCase()

      // RFID status filter
      const hasRfid = Boolean(person.rfidUid)
      const matchesRfid =
        rfidFilter === 'All RFID' ||
        (rfidFilter === 'Registered' && hasRfid) ||
        (rfidFilter === 'Not Registered' && !hasRfid)

      // Shift status filter
      const matchesShift = shiftFilter === 'All shifts' || person.status === shiftFilter

      return matchesSearch && matchesPosition && matchesEmployment && matchesRfid && matchesShift
    })
  }, [staff, search, positionFilter, employmentFilter, rfidFilter, shiftFilter])

  const pagination = usePagination(visibleStaff, 10)

  // Filtered requests
  const visibleRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestsFilter === 'All') return true
      return r.approvalStatus === requestsFilter
    })
  }, [requests, requestsFilter])

  // ── OPEN ADD STAFF MODAL ──────────────────────────────────────────────────
  function handleOpenAddStaff() {
    const tempPassword = generateRandomPassword()
    const autoEmpId = `EMP-${Date.now().toString().slice(-4)}`
    setAddForm({
      firstName: '',
      middleName: '',
      lastName: '',
      birthdate: '',
      gender: 'Prefer not to say',
      contactNumber: '',
      email: '',
      address: '',
      employeeId: autoEmpId,
      position: 'Service Crew',
      dateHired: new Date().toISOString().slice(0, 10),
      employmentStatus: 'Active',
      username: '',
      password: tempPassword,
      confirmPassword: tempPassword,
      accountStatus: 'Active',
      enrollRfidImmediately: true
    })
    setAddFormErrors({})
    setAddModalOpen(true)
  }

  // ── SUBMIT ADD STAFF FORM ─────────────────────────────────────────────────
  async function handleSubmitAddStaff(e) {
    e.preventDefault()
    const errors = {}

    if (!addForm.firstName.trim()) errors.firstName = 'First Name is required'
    if (!addForm.lastName.trim()) errors.lastName = 'Last Name is required'
    if (!addForm.birthdate) errors.birthdate = 'Birthdate is required'
    if (!addForm.contactNumber.trim()) errors.contactNumber = 'Contact Number is required'
    if (!addForm.email.trim()) errors.email = 'Email address is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
      errors.email = 'Please enter a valid email address'
    }
    if (!addForm.employeeId.trim()) errors.employeeId = 'Employee ID is required'
    if (!addForm.password) {
      errors.password = 'Password is required'
    } else if (addForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(addForm.password)) {
      errors.password = 'Password must contain at least one uppercase letter (A–Z)'
    } else if (!/[a-z]/.test(addForm.password)) {
      errors.password = 'Password must contain at least one lowercase letter (a–z)'
    } else if (!/[0-9]/.test(addForm.password)) {
      errors.password = 'Password must contain at least one number (0–9)'
    } else if (!/[^A-Za-z0-9]/.test(addForm.password)) {
      errors.password = 'Password must contain at least one special character (!@#$%…)'
    }

    if (!addForm.confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required'
    } else if (addForm.password !== addForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors)
      return notify('Please correct the highlighted errors in the form.', { icon: 'warning' })
    }

    setIsSubmittingAdd(true)
    try {
      const res = await fetch('/api/admin/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Staff account for ${data.staff.name} created successfully!`, { icon: 'success' })
        setStaff((prev) => [data.staff, ...prev])
        setAddModalOpen(false)

        // If admin checked immediate RFID enrollment, launch it immediately
        if (addForm.enrollRfidImmediately) {
          handleStartEnrollment(data.staff)
        }
      } else {
        notify(data.error || 'Failed to create staff account', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error creating staff: ' + err.message, { icon: 'error' })
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  // ── OPEN EDIT STAFF MODAL ─────────────────────────────────────────────────
  function handleOpenEditStaff(person) {
    setEditTarget(person)
    // Extract first, middle, last name if not explicitly set
    let fn = person.firstName || ''
    let mn = person.middleName || ''
    let ln = person.lastName || ''
    if (!fn && person.name) {
      const parts = person.name.trim().split(/\s+/)
      fn = parts[0] || ''
      if (parts.length > 2) {
        mn = parts.slice(1, -1).join(' ')
        ln = parts[parts.length - 1]
      } else if (parts.length === 2) {
        ln = parts[1]
      }
    }

    setEditForm({
      firstName: fn,
      middleName: mn,
      lastName: ln,
      birthdate: person.birthdate || '',
      gender: person.gender || 'Prefer not to say',
      contactNumber: person.contact || person.contactNumber || '',
      email: person.email || '',
      address: person.address || '',
      position: person.position || person.role || 'Staff',
      dateHired: person.dateHired || '',
      employmentStatus: person.employmentStatus || 'Active'
    })
    setEditFormErrors({})
    setEditModalOpen(true)
  }

  // ── SUBMIT EDIT STAFF FORM ────────────────────────────────────────────────
  async function handleSubmitEditStaff(e) {
    e.preventDefault()
    if (!editTarget) return

    const errors = {}
    if (!editForm.firstName.trim()) errors.firstName = 'First Name is required'
    if (!editForm.lastName.trim()) errors.lastName = 'Last Name is required'
    if (!editForm.contactNumber.trim()) errors.contactNumber = 'Contact Number is required'
    if (!editForm.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = 'Valid email is required'
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors)
      return notify('Please fix validation errors.', { icon: 'warning' })
    }

    setIsSubmittingEdit(true)
    try {
      const res = await fetch('/api/admin/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: editTarget.id,
          ...editForm
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Staff information updated for ${data.staff.name}.`, { icon: 'success' })
        setStaff((prev) => prev.map((p) => (p.id === data.staff.id ? { ...p, ...data.staff } : p)))
        setEditModalOpen(false)
        if (detailsModalOpen && detailsTarget?.id === data.staff.id) {
          setDetailsTarget(data.staff)
        }
      } else {
        notify(data.error || 'Failed to update staff info', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error updating staff: ' + err.message, { icon: 'error' })
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // ── OPEN STAFF DETAILS & RFID MANAGEMENT MODAL ────────────────────────────
  async function handleOpenStaffDetails(person) {
    setDetailsTarget(person)
    setDetailsModalOpen(true)
    setRfidHistory([])
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/staff/${encodeURIComponent(person.id)}/rfid-history`)
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.history)) {
          setRfidHistory(data.history)
        }
      }
    } catch (err) {
      console.warn('Failed to load RFID history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // ── TOGGLE EMPLOYMENT STATUS (ACTIVE / INACTIVE) ───────────────────────────
  async function handleToggleEmploymentStatus(person) {
    const currentStatus = person.employmentStatus || 'Active'
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
    const confirmMsg =
      newStatus === 'Inactive'
        ? `Are you sure you want to DEACTIVATE ${person.name}? They will be blocked from RFID attendance clock-in.`
        : `Are you sure you want to RE-ACTIVATE ${person.name}?`

    if (!window.confirm(confirmMsg)) return

    try {
      const res = await fetch('/api/admin/staff/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: person.id,
          status: newStatus
        })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`${person.name} is now ${newStatus}.`, { icon: 'info' })
        setStaff((prev) => prev.map((p) => (p.id === person.id ? { ...p, employmentStatus: newStatus } : p)))
        if (detailsModalOpen && detailsTarget?.id === person.id) {
          setDetailsTarget((prev) => ({ ...prev, employmentStatus: newStatus }))
        }
      } else {
        notify(data.error || 'Failed to toggle employment status', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error toggling status: ' + err.message, { icon: 'error' })
    }
  }

  // ── DEACTIVATE RFID CARD ──────────────────────────────────────────────────
  async function handleDeactivateRfid(person) {
    if (!person.rfidUid) return
    const confirmed = window.confirm(
      `Sigurado ka bang nais mong i-deactivate ang RFID card (${person.rfidUid}) ni ${person.name}? Hindi na ito magagamit para sa attendance.`
    )
    if (!confirmed) return

    try {
      const res = await fetch('/api/admin/staff/deactivate-rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: person.id })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`RFID card ni ${person.name} ay na-deactivate na.`, { icon: 'info' })
        setStaff((prev) =>
          prev.map((p) => (p.id === person.id ? { ...p, rfidUid: null, rfidStatus: 'INACTIVE' } : p))
        )
        if (detailsModalOpen && detailsTarget?.id === person.id) {
          setDetailsTarget((prev) => ({ ...prev, rfidUid: null, rfidStatus: 'INACTIVE' }))
          // Reload history
          handleOpenStaffDetails({ ...person, rfidUid: null, rfidStatus: 'INACTIVE' })
        }
      } else {
        notify(data.error || 'Nabigong i-deactivate ang RFID', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error deactivating RFID: ' + err.message, { icon: 'error' })
    }
  }

  // ── DELETE STAFF RECORD PERMANENTLY ───────────────────────────────────────
  async function handleDeleteStaff(person) {
    if (!person) return
    const confirmed = window.confirm(
      `Sigurado ka bang nais mong burahin si ${person.name} (${person.employeeId || person.id})? Mabubura ang record at credentials nito nang permanente.`
    )
    if (!confirmed) return

    try {
      const res = await fetch('/api/staff/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: person.id })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Nabura na ang profile ni ${person.name}.`, { icon: 'success' })
        setStaff((prev) => prev.filter((p) => p.id !== person.id))
        if (detailsModalOpen) setDetailsModalOpen(false)
      } else {
        notify(data.error || 'Nabigong burahin ang staff', { icon: 'error' })
      }
    } catch (err) {
      notify('Error sa pagbura: ' + err.message, { icon: 'error' })
    }
  }

  // ── START LIVE RFID ENROLLMENT SESSION ────────────────────────────────────
  async function handleStartEnrollment(staffMember) {
    setEnrollingStaff(staffMember)
    setEnrollmentStatus('waiting')
    setEnrolledUid('')
    setEnrollError('')
    setEnrollCountdown(180)
    setEnrollModalOpen(true)

    try {
      const res = await fetch('/api/iot/enrollment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffMember.id })
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

  // Poll enrollment status and countdown while modal is open
  useEffect(() => {
    if (!enrollModalOpen || enrollmentStatus !== 'waiting') return

    const timer = setInterval(() => {
      setEnrollCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setEnrollmentStatus('error')
          setEnrollError('Enrollment session timed out. Please tap "Try Again" to restart.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/iot/status')
        if (res.ok) {
          const data = await res.json()
          if (enrollingStaff) {
            // Check bootstrap or staff query to see if RFID card was linked
            const checkRes = await fetch('/api/bootstrap')
            if (checkRes.ok) {
              const bData = await checkRes.json()
              const updated = bData.staff?.find((s) => s.id === enrollingStaff.id)
              if (updated && updated.rfidUid && updated.rfidStatus === 'ACTIVE') {
                setEnrolledUid(updated.rfidUid)
                setEnrollmentStatus('success')
                notify(`RFID Card [${updated.rfidUid}] linked to ${enrollingStaff.name}!`, { icon: 'success' })
                setStaff((prev) =>
                  prev.map((p) => (p.id === enrollingStaff.id ? { ...p, ...updated } : p))
                )
                if (detailsModalOpen && detailsTarget?.id === enrollingStaff.id) {
                  setDetailsTarget(updated)
                }
              }
            }
          }
        }
      } catch {}
    }, 2000)

    return () => {
      clearInterval(timer)
      clearInterval(pollTimer)
    }
  }, [enrollModalOpen, enrollmentStatus, enrollingStaff, detailsModalOpen, detailsTarget])

  // Cancel enrollment
  async function handleCancelEnrollment() {
    try {
      await fetch('/api/iot/enrollment/cancel', { method: 'POST' })
    } catch {}
    setEnrollModalOpen(false)
    setEnrollingStaff(null)
  }

  // Requests Tab Handlers
  async function handleApproveRequest(staffMember) {
    try {
      const res = await fetch('/api/admin/staff-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffMember.id, admin_name: 'Admin' })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        notify(`Approved ${staffMember.name}! Eligible for RFID enrollment.`, { icon: 'success' })
        fetchRequests()
        handleStartEnrollment(staffMember)
      } else {
        notify(data.error || 'Failed to approve staff request', { icon: 'error' })
      }
    } catch (err) {
      notify('Network error approving staff: ' + err.message, { icon: 'error' })
    }
  }

  function handleOpenRejectRequest(staffMember) {
    setRejectTarget(staffMember)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  async function handleSubmitRejectRequest(e) {
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
          admin_name: 'Admin'
        })
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

  async function handleDeleteRequest(staffMember) {
    if (!staffMember) return
    const confirmed = window.confirm(`Sigurado ka bang nais mong burahin ang record ni ${staffMember.name}?`)
    if (!confirmed) return

    try {
      const res = await fetch('/api/admin/staff-requests/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffMember.id })
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

  return (
    <div className="adm-staff-mgmt">
      {/* ══════════════ 1. HEADER BANNER ══════════════ */}
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

        <div className="adm-stf-banner-left">
          <span className="adm-stf-date">{dynamicDate}</span>
          <h1>Staff Management & RFID System</h1>
          <p>Admin control for staff accounts, employment designations, and ESP32 RFID card enrollment.</p>
        </div>

        <button type="button" className="adm-stf-banner-add-btn" onClick={handleOpenAddStaff}>
          <span className="adm-stf-plus" aria-hidden="true">+</span>
          <span>Add New Staff</span>
        </button>
      </header>

      {/* ══════════════ 2. KPI OVERVIEW STATS CARDS ══════════════ */}
      <div className="adm-stf-kpi-grid">
        <div className="adm-stf-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Staff</span>
            <span className="kpi-value">{totalStaffCount}</span>
          </div>
        </div>

        <div className="adm-stf-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#F1F8E9', color: '#558B2F' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Present on Shift</span>
            <span className="kpi-value">{activeTodayCount}</span>
          </div>
        </div>

        <div className="adm-stf-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#E0F2F1', color: '#00695C' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Employment</span>
            <span className="kpi-value">{activeEmploymentCount}</span>
          </div>
        </div>

        <div className="adm-stf-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: '#FFF8E1', color: '#F57F17' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">RFID Cards Enrolled</span>
            <span className="kpi-value">{rfidRegisteredCount}</span>
          </div>
        </div>
      </div>

      {/* ══════════════ 3. TAB NAVIGATION ══════════════ */}
      <div className="adm-stf-nav-tabs">
        <button
          type="button"
          className={`adm-stf-tab-btn ${activeTab === 'directory' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Staff Directory</span>
          <span className="adm-stf-tab-badge">{staff.length}</span>
        </button>

        <button
          type="button"
          className={`adm-stf-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>Historical Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="adm-stf-tab-badge-pending">
              {pendingRequestsCount} PENDING
            </span>
          )}
        </button>
      </div>

      {/* ══════════════ 4. STAFF DIRECTORY TAB ══════════════ */}
      {activeTab === 'directory' && (
        <>
          {/* MULTI-FILTER TOOLBAR */}
          <div className="adm-stf-toolbar-advanced">
            <label className="adm-stf-search" aria-label="Search staff by name, ID, role, or contact">
              <svg className="adm-stf-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.2" y2="16.2" />
              </svg>
              <input
                type="text"
                value={search}
                maxLength={120}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, ID, position, contact, email..."
              />
              {search && (
                <button type="button" className="adm-stf-search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </label>

            {/* Position filter */}
            <div className="adm-stf-select-wrap">
              <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
                <option value="All positions">All Positions</option>
                <option value="Manager">Manager</option>
                <option value="Head Chef">Head Chef</option>
                <option value="Service Crew">Service Crew</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            {/* Employment Status filter */}
            <div className="adm-stf-select-wrap">
              <select value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)}>
                <option value="All employment">All Employment</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* RFID Status filter */}
            <div className="adm-stf-select-wrap">
              <select value={rfidFilter} onChange={(e) => setRfidFilter(e.target.value)}>
                <option value="All RFID">All RFID Status</option>
                <option value="Registered">Registered</option>
                <option value="Not Registered">Not Registered</option>
              </select>
            </div>

            {/* Shift filter */}
            <div className="adm-stf-select-wrap">
              <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                <option value="All shifts">All Shifts</option>
                <option value="Present">Present</option>
                <option value="Offline">Offline</option>
                <option value="On break">On break</option>
              </select>
            </div>
          </div>

          {/* TABLE CONTAINER */}
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
                  <h2>Staff Directory</h2>
                  <p>
                    Showing {pagination.paginatedItems.length} of {visibleStaff.length} filtered members &middot; {totalStaffCount} total staff
                  </p>
                </div>
              </div>

              <button type="button" className="adm-stf-card-add-btn" onClick={handleOpenAddStaff}>
                <span aria-hidden="true">+</span>
                <span>Add Staff</span>
              </button>
            </div>

            <div className="adm-stf-table-scroll">
              <table className="adm-stf-table">
                <thead>
                  <tr>
                    <th className="col-staff">Staff Member</th>
                    <th className="col-role">Position</th>
                    <th className="col-contact">Contact & Email</th>
                    <th className="col-emp-status">Employment</th>
                    <th className="col-status">Shift Status</th>
                    <th className="col-rfid">RFID Card Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#6C7D72' }}>
                        No staff members match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    pagination.paginatedItems.map((person) => {
                      const initials = getInitials(person.name)
                      const stClass = statusClass(person.status || 'Offline')
                      const rfidActive = Boolean(person.rfidUid)
                      const empStatus = person.employmentStatus || 'Active'
                      const isEmpActive = empStatus === 'Active'
                      const pos = person.position || person.role || 'Staff'
                      const empId = person.employeeId || person.id

                      return (
                        <tr key={person.id} className={`adm-stf-row ${!isEmpActive ? 'is-inactive-row' : ''}`}>
                          <td className="col-staff">
                            <div
                              className="adm-stf-person is-clickable"
                              onClick={() => handleOpenStaffDetails(person)}
                              title="Click to view full details"
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="adm-stf-avatar" aria-hidden="true">
                                {initials}
                              </span>
                              <div className="adm-stf-meta">
                                <span className="adm-stf-name">{person.name}</span>
                                <span className="adm-stf-empid-badge">{empId}</span>
                              </div>
                            </div>
                          </td>

                          <td className="col-role">
                            <span className={`adm-stf-position-tag pos-${pos.toLowerCase().replace(/\s+/g, '-')}`}>
                              {pos}
                            </span>
                          </td>

                          <td className="col-contact">
                            <div className="adm-stf-contact-meta">
                              <span className="contact-phone">{person.contact || '—'}</span>
                              {person.email && <small className="contact-email">{person.email}</small>}
                            </div>
                          </td>

                          <td className="col-emp-status">
                            <span className={`adm-stf-emp-pill ${isEmpActive ? 'status-active' : 'status-inactive'}`}>
                              <i className="adm-stf-status-dot" aria-hidden="true" />
                              <span>{empStatus}</span>
                            </span>
                          </td>

                          <td className="col-status">
                            <span className={`adm-stf-status-badge status-${stClass}`}>
                              <i className="adm-stf-status-dot" aria-hidden="true" />
                              <span>{person.status || 'Offline'}</span>
                            </span>
                          </td>

                          <td className="col-rfid">
                            {rfidActive ? (
                              <div className="adm-stf-rfid-chip-tag" title={`Card UID: ${person.rfidUid}`}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <rect x="2" y="5" width="20" height="14" rx="2" />
                                  <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                                <code>{person.rfidUid}</code>
                                <span className="rfid-status-text">Registered</span>
                              </div>
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
                              {/* View Details */}
                              <button
                                type="button"
                                className="adm-stf-action-btn view-btn"
                                onClick={() => handleOpenStaffDetails(person)}
                                title="View full profile & RFID history"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>

                              {/* Edit Staff */}
                              <button
                                type="button"
                                className="adm-stf-action-btn edit-btn"
                                onClick={() => handleOpenEditStaff(person)}
                                title="Edit staff information"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              {/* Enroll / Replace RFID */}
                              <button
                                type="button"
                                className="adm-stf-action-btn rfid-action-btn"
                                onClick={() => handleStartEnrollment(person)}
                                title={rfidActive ? 'Replace RFID Card' : 'Register RFID Card'}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <rect x="2" y="5" width="20" height="14" rx="2" />
                                  <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                              </button>

                              {/* Toggle Employment Status */}
                              <button
                                type="button"
                                className={`adm-stf-action-btn toggle-btn ${isEmpActive ? 'deactivate-icon' : 'activate-icon'}`}
                                onClick={() => handleToggleEmploymentStatus(person)}
                                title={isEmpActive ? 'Deactivate staff account' : 'Reactivate staff account'}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                                  <line x1="12" y1="2" x2="12" y2="12" />
                                </svg>
                              </button>

                              {/* Delete Staff */}
                              <button
                                type="button"
                                className="adm-stf-action-btn delete-btn"
                                onClick={() => handleDeleteStaff(person)}
                                title="Delete staff account permanently"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="adm-stf-pagination">
                <span className="pagination-text">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    disabled={!pagination.canPrev}
                    onClick={pagination.prevPage}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.canNext}
                    onClick={pagination.nextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ══════════════ 5. HISTORICAL REQUESTS TAB ══════════════ */}
      {activeTab === 'requests' && (
        <section className="adm-stf-card">
          <div className="adm-stf-card-head">
            <div>
              <h2>Staff Registration Requests</h2>
              <p>Mobile app registration submissions awaiting Admin approval or RFID card enrollment.</p>
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
                          onClick={() => {
                            setReviewTarget(req)
                            setReviewModalOpen(true)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="adm-stf-avatar">{initials}</span>
                          <div className="adm-stf-meta">
                            <span className="adm-stf-name">{req.name}</span>
                            <span className="adm-stf-id">{req.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>{req.contact || '—'}</td>
                      <td>
                        <span className="adm-stf-position-tag">{req.position || 'Staff'}</span>
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
                          <div className="adm-stf-rfid-chip-tag">
                            <code>{req.rfidUid}</code>
                          </div>
                        ) : isApproved ? (
                          <button
                            type="button"
                            className="adm-stf-enroll-btn"
                            onClick={() => handleStartEnrollment(req)}
                          >
                            Enroll Card
                          </button>
                        ) : (
                          <span className="adm-stf-rfid-blocked">Awaiting Approval</span>
                        )}
                      </td>
                      <td>
                        <div className="adm-stf-action-group">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="adm-stf-req-btn accept-btn"
                                onClick={() => handleApproveRequest(req)}
                                title="Approve Request"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="adm-stf-req-btn reject-btn"
                                onClick={() => handleOpenRejectRequest(req)}
                                title="Reject Request"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="adm-stf-action-btn delete-btn"
                            onClick={() => handleDeleteRequest(req)}
                            title="Delete Request"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══════════════ MODAL 1: PROFESSIONAL STAFF REGISTRATION ══════════════ */}
      {addModalOpen && (
        <div className="adm-stf-modal-backdrop" onClick={() => !isSubmittingAdd && setAddModalOpen(false)}>
          <div className="adm-stf-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <h3>Add New Staff Account</h3>
                <p>Register complete staff employment records, credentials, and prepare RFID card enrollment.</p>
              </div>
              <button
                type="button"
                className="adm-stf-modal-close"
                onClick={() => setAddModalOpen(false)}
                disabled={isSubmittingAdd}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitAddStaff} className="adm-stf-modal-body form-modal-body">
              {/* SECTION A: PERSONAL INFORMATION */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <span className="section-number">1</span>
                  <h4>Personal Information</h4>
                </div>
                <div className="form-grid-3">
                  <div className="form-field">
                    <label>First Name <em>*</em></label>
                    <input
                      type="text"
                      value={addForm.firstName}
                      onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                      placeholder="e.g. Juan"
                      required
                    />
                    {addFormErrors.firstName && <span className="field-error">{addFormErrors.firstName}</span>}
                  </div>
                  <div className="form-field">
                    <label>Middle Name <small>(Optional)</small></label>
                    <input
                      type="text"
                      value={addForm.middleName}
                      onChange={(e) => setAddForm({ ...addForm, middleName: e.target.value })}
                      placeholder="e.g. Protacio"
                    />
                  </div>
                  <div className="form-field">
                    <label>Last Name <em>*</em></label>
                    <input
                      type="text"
                      value={addForm.lastName}
                      onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                      placeholder="e.g. Rizal"
                      required
                    />
                    {addFormErrors.lastName && <span className="field-error">{addFormErrors.lastName}</span>}
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Birthdate <em>*</em></label>
                    <input
                      type="date"
                      value={addForm.birthdate}
                      onChange={(e) => setAddForm({ ...addForm, birthdate: e.target.value })}
                      required
                    />
                    {addFormErrors.birthdate && <span className="field-error">{addFormErrors.birthdate}</span>}
                  </div>
                  <div className="form-field">
                    <label>Gender</label>
                    <select
                      value={addForm.gender}
                      onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Contact Number <em>*</em></label>
                    <input
                      type="tel"
                      value={addForm.contactNumber}
                      onChange={(e) => setAddForm({ ...addForm, contactNumber: e.target.value })}
                      placeholder="e.g. 09171234567"
                      required
                    />
                    {addFormErrors.contactNumber && <span className="field-error">{addFormErrors.contactNumber}</span>}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Email Address <em>*</em></label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="e.g. staff.member@gmail.com"
                      required
                    />
                    {addFormErrors.email && <span className="field-error">{addFormErrors.email}</span>}
                  </div>
                  <div className="form-field">
                    <label>Home Address</label>
                    <input
                      type="text"
                      value={addForm.address}
                      onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      placeholder="e.g. 123 Rizal St, Legazpi City"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: EMPLOYMENT INFORMATION */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <span className="section-number">2</span>
                  <h4>Employment Information</h4>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <div className="label-with-action">
                      <label>Employee ID <em>*</em></label>
                      <button
                        type="button"
                        className="btn-text-action"
                        onClick={() => setAddForm({ ...addForm, employeeId: `EMP-${Date.now().toString().slice(-4)}` })}
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={addForm.employeeId}
                      onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                      required
                    />
                    {addFormErrors.employeeId && <span className="field-error">{addFormErrors.employeeId}</span>}
                  </div>

                  <div className="form-field">
                    <label>Position <em>*</em></label>
                    <select
                      value={addForm.position}
                      onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                      required
                    >
                      <option value="Manager">Manager</option>
                      <option value="Head Chef">Head Chef</option>
                      <option value="Service Crew">Service Crew</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Date Hired</label>
                    <input
                      type="date"
                      value={addForm.dateHired}
                      onChange={(e) => setAddForm({ ...addForm, dateHired: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Employment Status</label>
                    <select
                      value={addForm.employmentStatus}
                      onChange={(e) => setAddForm({ ...addForm, employmentStatus: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-field-callout">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Position is an employment designation. All staff accounts operate under Staff role authorizations. Selecting Manager does not grant Admin privileges.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION C: ACCOUNT INFORMATION */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <span className="section-number">3</span>
                  <h4>Account Credentials</h4>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Username <small>(Defaults to Email)</small></label>
                    <input
                      type="text"
                      value={addForm.username}
                      onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                      placeholder="e.g. juan.rizal"
                    />
                  </div>

                  <div className="form-field">
                    <div className="label-with-action">
                      <label>Temporary Password <em>*</em></label>
                      <button
                        type="button"
                        className="btn-text-action"
                        onClick={() => {
                          const p = generateRandomPassword()
                          setAddForm({ ...addForm, password: p, confirmPassword: p })
                        }}
                      >
                        Random
                      </button>
                    </div>
                    <input
                      type="text"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                    />
                    {addFormErrors.password && <span className="field-error">{addFormErrors.password}</span>}
                  </div>

                  <div className="form-field">
                    <label>Confirm Password <em>*</em></label>
                    <input
                      type="text"
                      value={addForm.confirmPassword}
                      onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      required
                    />
                    {addFormErrors.confirmPassword && (
                      <span className="field-error">{addFormErrors.confirmPassword}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION D: RFID ENROLLMENT OPTION */}
              <div className="form-section-card rfid-option-card">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addForm.enrollRfidImmediately}
                    onChange={(e) => setAddForm({ ...addForm, enrollRfidImmediately: e.target.checked })}
                  />
                  <div>
                    <strong>Launch RFID card enrollment on ESP32 reader immediately after saving</strong>
                    <p>The system will open an active 180s enrollment session for this staff member.</p>
                  </div>
                </label>
              </div>

              <div className="adm-stf-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={() => setAddModalOpen(false)}
                  disabled={isSubmittingAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-stf-modal-btn save-btn"
                  disabled={isSubmittingAdd}
                >
                  {isSubmittingAdd ? 'Creating Staff Account...' : 'Save & Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 2: EDIT STAFF MODAL ══════════════ */}
      {editModalOpen && editTarget && (
        <div className="adm-stf-modal-backdrop" onClick={() => !isSubmittingEdit && setEditModalOpen(false)}>
          <div className="adm-stf-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon" style={{ background: '#E3F2FD', color: '#1565C0' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h3>Edit Staff Information</h3>
                <p>Updating profile for <strong>{editTarget.name}</strong> ({editTarget.employeeId || editTarget.id})</p>
              </div>
              <button
                type="button"
                className="adm-stf-modal-close"
                onClick={() => setEditModalOpen(false)}
                disabled={isSubmittingEdit}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitEditStaff} className="adm-stf-modal-body form-modal-body">
              <div className="form-section-card">
                <h4>Personal Details</h4>
                <div className="form-grid-3">
                  <div className="form-field">
                    <label>First Name <em>*</em></label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                    {editFormErrors.firstName && <span className="field-error">{editFormErrors.firstName}</span>}
                  </div>
                  <div className="form-field">
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={editForm.middleName}
                      onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Last Name <em>*</em></label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                    {editFormErrors.lastName && <span className="field-error">{editFormErrors.lastName}</span>}
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Birthdate</label>
                    <input
                      type="date"
                      value={editForm.birthdate}
                      onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Contact Number <em>*</em></label>
                    <input
                      type="tel"
                      value={editForm.contactNumber}
                      onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                      required
                    />
                    {editFormErrors.contactNumber && (
                      <span className="field-error">{editFormErrors.contactNumber}</span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Email Address <em>*</em></label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                    {editFormErrors.email && <span className="field-error">{editFormErrors.email}</span>}
                  </div>
                  <div className="form-field">
                    <label>Home Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section-card">
                <h4>Employment Details</h4>
                <div className="form-grid-3">
                  <div className="form-field">
                    <label>Position <em>*</em></label>
                    <select
                      value={editForm.position}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      required
                    >
                      <option value="Manager">Manager</option>
                      <option value="Head Chef">Head Chef</option>
                      <option value="Service Crew">Service Crew</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Date Hired</label>
                    <input
                      type="date"
                      value={editForm.dateHired}
                      onChange={(e) => setEditForm({ ...editForm, dateHired: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Employment Status</label>
                    <select
                      value={editForm.employmentStatus}
                      onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="adm-stf-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-stf-modal-btn save-btn"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? 'Saving Changes...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 3: STAFF DETAILS & RFID MANAGEMENT MODAL ══════════════ */}
      {detailsModalOpen && detailsTarget && (
        <div className="adm-stf-modal-backdrop" onClick={() => setDetailsModalOpen(false)}>
          <div className="adm-stf-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon" style={{ background: '#F3E5F5', color: '#7B1FA2' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3>Staff Profile & RFID History</h3>
                <p>Complete information and attendance card audit trail</p>
              </div>
              <button type="button" className="adm-stf-modal-close" onClick={() => setDetailsModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="adm-stf-modal-body">
              {/* Profile Header Summary */}
              <div className="details-profile-summary">
                <div className="summary-avatar">{getInitials(detailsTarget.name)}</div>
                <div className="summary-texts">
                  <div className="summary-name-row">
                    <h3>{detailsTarget.name}</h3>
                    <span className="adm-stf-position-tag">{detailsTarget.position || detailsTarget.role || 'Staff'}</span>
                    <span className={`adm-stf-emp-pill ${detailsTarget.employmentStatus === 'Inactive' ? 'status-inactive' : 'status-active'}`}>
                      {detailsTarget.employmentStatus || 'Active'}
                    </span>
                  </div>
                  <div className="summary-sub-row">
                    <span><strong>Employee ID:</strong> {detailsTarget.employeeId || detailsTarget.id}</span>
                    <span>&bull;</span>
                    <span><strong>Date Hired:</strong> {detailsTarget.dateHired || '—'}</span>
                    <span>&bull;</span>
                    <span><strong>Current Shift:</strong> {detailsTarget.status || 'Offline'}</span>
                  </div>
                </div>
              </div>

              {/* Personal & Employment Details Grid */}
              <div className="details-info-grid">
                <div className="info-block">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{detailsTarget.email || detailsTarget.contact || '—'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Contact Number</span>
                  <span className="info-value">{detailsTarget.contact || '—'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Birthdate</span>
                  <span className="info-value">{detailsTarget.birthdate || '—'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{detailsTarget.gender || '—'}</span>
                </div>
                <div className="info-block full-width">
                  <span className="info-label">Home Address</span>
                  <span className="info-value">{detailsTarget.address || '—'}</span>
                </div>
              </div>

              {/* Active RFID Card Control Card */}
              <div className="details-rfid-card">
                <div className="rfid-card-header">
                  <div className="rfid-card-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4>RFID Attendance Card</h4>
                    <p>ESP32 RC522 Reader Integration & Attendance Verification</p>
                  </div>
                </div>

                <div className="rfid-card-body">
                  {detailsTarget.rfidUid ? (
                    <div className="rfid-registered-display">
                      <div className="rfid-uid-chip">
                        <span className="chip-badge">ACTIVE CARD</span>
                        <code>{detailsTarget.rfidUid}</code>
                      </div>
                      <div className="rfid-actions-row">
                        <button
                          type="button"
                          className="adm-stf-enroll-btn"
                          onClick={() => handleStartEnrollment(detailsTarget)}
                        >
                          Replace Card
                        </button>
                        <button
                          type="button"
                          className="adm-stf-deactivate-btn"
                          onClick={() => handleDeactivateRfid(detailsTarget)}
                        >
                          Deactivate Card
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rfid-unregistered-display">
                      <span className="rfid-not-registered-tag">Not Registered</span>
                      <p>This staff member does not have an RFID attendance card linked yet.</p>
                      <button
                        type="button"
                        className="adm-stf-enroll-btn"
                        onClick={() => handleStartEnrollment(detailsTarget)}
                      >
                        Register RFID Card Now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RFID Assignment History Audit Table */}
              <div className="details-history-section">
                <h4>RFID Card Assignment History & Audit Trail</h4>
                {loadingHistory ? (
                  <p className="loading-text">Loading card assignment history...</p>
                ) : rfidHistory.length === 0 ? (
                  <p className="no-history-text">No previous RFID card assignments found for this staff member.</p>
                ) : (
                  <div className="adm-stf-table-scroll">
                    <table className="adm-stf-table history-table">
                      <thead>
                        <tr>
                          <th>Card UID</th>
                          <th>Status</th>
                          <th>Registered At</th>
                          <th>Registered By</th>
                          <th>Deactivated At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfidHistory.map((h) => (
                          <tr key={h.id}>
                            <td><code>{h.rfid_uid}</code></td>
                            <td>
                              <span className={`adm-stf-emp-pill ${h.card_status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                                {h.card_status}
                              </span>
                            </td>
                            <td>{h.registered_at || '—'}</td>
                            <td>{h.registered_by || 'Admin'}</td>
                            <td>{h.deactivated_at || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="adm-stf-modal-actions">
                <button
                  type="button"
                  className="adm-stf-modal-btn cancel-btn"
                  onClick={() => setDetailsModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="adm-stf-modal-btn edit-action-btn"
                  onClick={() => {
                    setDetailsModalOpen(false)
                    handleOpenEditStaff(detailsTarget)
                  }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 4: LIVE RFID ENROLLMENT ══════════════ */}
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
                <p>Linking an RFID card to <strong>{enrollingStaff.name}</strong> ({enrollingStaff.employeeId || enrollingStaff.id})</p>
              </div>
              <button type="button" className="adm-stf-modal-close" onClick={handleCancelEnrollment}>
                ×
              </button>
            </div>

            <div className="adm-stf-modal-body enroll-modal-content">
              {enrollmentStatus === 'waiting' && (
                <div className="adm-stf-enroll-waiting">
                  <div className="enroll-status-badge waiting">
                    <span className="dot pulse" />
                    <span>Waiting for Card Scan &middot; {enrollCountdown}s</span>
                  </div>

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
                    Please tap the physical RFID card onto the <strong>RC522 reader</strong> on your ESP32 terminal now.
                  </p>
                  <small className="adm-stf-enroll-note">
                    The Node backend checks approval, blocks duplicate cards, and logs card assignment history automatically.
                  </small>
                </div>
              )}

              {enrollmentStatus === 'success' && (
                <div className="adm-stf-enroll-success">
                  <div className="enroll-status-badge success">
                    <span>Registered</span>
                  </div>
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
                  <div className="enroll-status-badge error">
                    <span>Enrollment Failed</span>
                  </div>
                  <p className="error-msg">{enrollError || 'An error occurred during enrollment.'}</p>
                  <button
                    type="button"
                    className="adm-stf-enroll-btn"
                    onClick={() => handleStartEnrollment(enrollingStaff)}
                  >
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

      {/* ══════════════ MODAL 5: REJECTION MODAL (REQUESTS) ══════════════ */}
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
                <h3>Reject Registration Request</h3>
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

            <form onSubmit={handleSubmitRejectRequest} className="adm-stf-modal-body">
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

      {/* ══════════════ MODAL 6: REVIEW REQUEST DETAILS ══════════════ */}
      {reviewModalOpen && reviewTarget && (
        <div className="adm-stf-modal-backdrop" onClick={() => setReviewModalOpen(false)}>
          <div className="adm-stf-modal-card review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-stf-modal-head">
              <div className="adm-stf-modal-head-icon review-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3>Review Staff Applicant Details</h3>
                <p>Submitted via mobile application &middot; Awaiting Admin decision</p>
              </div>
              <button type="button" className="adm-stf-modal-close" onClick={() => setReviewModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="adm-stf-modal-body">
              <div className="review-profile-header">
                <span className="review-profile-avatar">{getInitials(reviewTarget.name)}</span>
                <div className="review-profile-info">
                  <h4>{reviewTarget.name}</h4>
                  <span className="adm-stf-position-badge">{reviewTarget.position || reviewTarget.role || 'Staff'}</span>
                </div>
              </div>

              <div className="review-details-grid">
                <div className="review-detail-item">
                  <span className="label">Contact Number</span>
                  <span className="value">{reviewTarget.contact || '—'}</span>
                </div>
                <div className="review-detail-item">
                  <span className="label">Username</span>
                  <span className="value">{reviewTarget.username || '—'}</span>
                </div>
                <div className="review-detail-item">
                  <span className="label">Email Address</span>
                  <span className="value">{reviewTarget.email || reviewTarget.contact || '—'}</span>
                </div>
                <div className="review-detail-item">
                  <span className="label">Approval Status</span>
                  <span className="value">{reviewTarget.approvalStatus || 'PENDING'}</span>
                </div>
              </div>

              <div className="adm-stf-modal-actions review-modal-actions">
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
                        handleOpenRejectRequest(target)
                      }}
                    >
                      Reject Request
                    </button>
                    <button
                      type="button"
                      className="adm-stf-modal-btn accept-action-btn"
                      onClick={() => {
                        const target = reviewTarget
                        setReviewModalOpen(false)
                        handleApproveRequest(target)
                      }}
                    >
                      Accept & Enroll RFID
                    </button>
                  </>
                )}
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
