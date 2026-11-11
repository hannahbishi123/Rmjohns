import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { OrdersTable, Pagination, usePagination } from '../components/shared'

export default function OrdersPage() {
  const { filteredOrders: orders, orders: allOrders, setOrderFilter, orderFilter, updateOrder, setDialog } = useApp()
  const [search, setSearch] = useState('')
  const visibleOrders = orders.filter((order) => `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(search.toLowerCase()))
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(visibleOrders, 6)
  const tabs = ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled']
  return <section className="panel full-panel"><div className="toolbar"><div className="tabs">{tabs.map((tab) => <button key={tab} className={orderFilter === tab ? 'tab active' : 'tab'} onClick={() => setOrderFilter(tab)}>{tab}<span>{tab === 'All' ? allOrders.length : allOrders.filter((order) => order.status === tab).length}</span></button>)}</div><div className="search-box order-search"><span>⌕</span><input value={search} maxLength="120" onChange={(event) => setSearch(event.target.value)} placeholder="Search orders..." /></div></div><OrdersTable orders={paginatedItems} onStatus={updateOrder} onDetails={(order) => setDialog({ type: 'order', order })} onRefund={(order) => setDialog({ type: 'refund-order', order })} /><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} /></section>
}
