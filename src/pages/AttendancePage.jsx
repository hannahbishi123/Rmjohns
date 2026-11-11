import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, StatusBadge, usePagination } from '../components/shared'

const formatDateLabel = (value) => {
  if (!value) return 'Today'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export default function AttendancePage() {
  const { staff, recordStaffScan, deviceConnected, scanEvents } = useApp()
  const [attendanceDate, setAttendanceDate] = useState('2026-09-29')
  const today = new Date()
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const summary = useMemo(() => {
    const present = staff.filter((person) => person.status === 'Present').length
    const offline = staff.filter((person) => person.status === 'Offline').length
    const onBreak = staff.filter((person) => person.status === 'On break').length
    return { present, offline, onBreak }
  }, [staff])

  function handleScan(person) {
    const action = person.status === 'Present' ? 'Time out' : 'Time in'
    recordStaffScan(person.id, action)
  }

  const history = [...scanEvents].slice(0, 6)
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(staff, 6)

  return <>
    <section className="attendance-tracker panel">
      <div className="panel-heading">
        <div>
          <h2>Attendance tracker</h2>
          <p>{formatDateLabel(attendanceDate)}</p>
        </div>
        <div className="date-picker-wrap">
          <label htmlFor="attendance-date">Date</label>
          <input id="attendance-date" type="date" max={maxDate} value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
        </div>
      </div>

      <div className="attendance-overview">
        <div className="attendance-card primary-card">
          <span className="eyebrow">SHIFT STATUS</span>
          <strong>{summary.present}</strong>
          <small>Staff currently clocked in</small>
        </div>
        <div className="attendance-card">
          <span className="eyebrow">ON BREAK</span>
          <strong>{summary.onBreak}</strong>
          <small>During this period</small>
        </div>
        <div className="attendance-card">
          <span className="eyebrow">OFFLINE</span>
          <strong>{summary.offline}</strong>
          <small>Not currently active</small>
        </div>
      </div>
    </section>

    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <h2>Today’s attendance</h2>
          <p>{summary.present} present · {formatDateLabel(attendanceDate)}</p>
        </div>
        <button className="button button-outline" onClick={() => window.print()}>↧ <span>Print report</span></button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
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
            {paginatedItems.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="staff-name">
                    <span className="avatar small-avatar">{person.name.split(' ').map((part) => part[0]).join('')}</span>
                    <strong>{person.name}</strong>
                  </div>
                </td>
                <td>{person.role}</td>
                <td>{person.id}</td>
                <td>{person.time || '—'}</td>
                <td>{person.timeOut || '—'}</td>
                <td><StatusBadge status={person.status} /></td>
                <td>
                  <button className="button button-outline scan-button" disabled={!deviceConnected} onClick={() => handleScan(person)}>
                    {person.status === 'Present' ? 'Time out' : 'Time in'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
    </section>

    <section className="panel attendance-history-panel">
      <div className="panel-heading">
        <div>
          <h2>Attendance history</h2>
          <p>Recent check-in and check-out activity</p>
        </div>
      </div>

      <div className="attendance-history-list">
        {history.map((entry) => (
          <div className="history-item" key={entry.id}>
            <div className="history-bullet" />
            <div className="history-copy">
              <strong>{entry.name}</strong>
              <span>{entry.action} · {entry.time}</span>
            </div>
            <span className="history-status">{entry.action === 'Time in' ? 'Present' : 'Clocked out'}</span>
          </div>
        ))}
      </div>
    </section>
  </>
}