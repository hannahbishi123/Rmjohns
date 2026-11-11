import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Pagination, StatusBadge, usePagination } from '../components/shared'
import { money } from '../data/mockData'

export default function CustomersPage() {
  const { customers, orders, setDialog } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All customers')
  const visibleCustomers = customers.filter((customer) => customer.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'All customers' || (filter === 'Active' ? customer.status === 'Active' : customer.points > 0)))
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(visibleCustomers, 6)
  return <><div className="filter-row"><div className="search-box"><span>⌕</span><input placeholder="Search customers..." value={search} maxLength="120" onChange={(event) => setSearch(event.target.value)} /></div><select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All customers</option><option>Active</option><option>Loyalty members</option></select></div><section className="panel full-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>CUSTOMER</th><th>CUSTOMER ID</th><th>ORDERS</th><th>TOTAL SPEND</th><th>POINTS</th><th>STATUS</th><th /></tr></thead><tbody>{paginatedItems.map((customer) => { const customerOrders = orders.filter((order) => order.customer === customer.name); return <tr key={customer.id}><td><div className="table-person"><span className="avatar small-avatar">{customer.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div></td><td>{customer.id}</td><td>{customer.orders}</td><td>{money(customer.spend)}</td><td><strong>{customer.points}</strong></td><td><StatusBadge status={customer.status} /></td><td><button className="row-more" onClick={() => setDialog({ type: 'customer', customer, orders: customerOrders })}>•••</button></td></tr> })}</tbody></table>{paginatedItems.length === 0 && <div className="empty-state">No customers found.</div>}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} /></section></>
}
