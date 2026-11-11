import { useApp } from '../context/AppContext'
import { Pagination, usePagination } from '../components/shared'

export default function NotificationsPage() {
  const { notifications, setNotifications, role } = useApp()
  const visibleNotifications = notifications.filter((notice) => role === 'Customer'
    ? !notice.audience || notice.audience === 'all' || notice.audience === 'customer'
    : notice.audience !== 'customer')
  const unread = visibleNotifications.filter((notice) => !notice.read).length
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(visibleNotifications, 5)
  function markAllRead() {
    const visibleIds = new Set(visibleNotifications.map((notice) => notice.id))
    setNotifications((current) => current.map((notice) => visibleIds.has(notice.id) ? { ...notice, read: true } : notice))
  }
  return <section className="panel notification-list"><div className="panel-heading"><div><h2>{unread ? `${unread} updates to catch up on` : 'You’re all caught up.'}</h2><p>Order, payment, attendance, and loyalty activity</p></div><button className="text-button" disabled={!unread} onClick={markAllRead}>{unread ? 'Mark all as read' : 'All read'}</button></div>{paginatedItems.map((notice) => <article className={`notification-row ${notice.read ? 'read' : ''}`} key={notice.id}><span className={`notification-icon ${notice.title.toLowerCase().includes('payment') ? 'blue' : notice.title.toLowerCase().includes('order') ? 'green' : 'amber'}`}>{notice.title.toLowerCase().includes('payment') ? '＄' : notice.title.toLowerCase().includes('order') ? '▤' : '✳'}</span><div><strong>{notice.title}</strong><p>{notice.detail}</p></div><span className="notification-time">{notice.time}</span></article>)}<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} /></section>
}