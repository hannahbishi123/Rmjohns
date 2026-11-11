import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { OrdersTable, SalesChart, StatCard } from '../components/shared'
import { money } from '../data/mockData'

export function SalesReport({ page = 'Sales' }) {
  const { orders, payments, menu } = useApp()
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [paymentFilter, setPaymentFilter] = useState('All payments')
  const [dateRange, setDateRange] = useState('Today')
  const [search, setSearchValue] = useState('')
  function setSearch(value) {
    setSearchValue(value.slice(0, 120))
  }
  const menuById = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu])
  const visibleOrders = orders.filter((order) => {
    const orderDate = order.date || '2026-09-29'
    const matchesDate = dateRange === 'All time' || (dateRange === 'Today' ? orderDate === '2026-09-29' : dateRange === 'This week' ? orderDate >= '2026-09-23' : orderDate >= '2026-09-01')
    const matchesCategory = categoryFilter === 'All categories' || order.products?.some((line) => menuById.get(line.id)?.category === categoryFilter)
    const matchesPayment = paymentFilter === 'All payments' || order.paymentMethod === paymentFilter || order.payment === paymentFilter
    const matchesSearch = `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(search.toLowerCase())
    return matchesDate && matchesCategory && matchesPayment && matchesSearch
  })
  const validOrders = visibleOrders.filter((order) => !['Cancelled', 'Refunded'].includes(order.payment))
  const sales = validOrders.reduce((sum, order) => sum + order.total, 0)
  const completed = visibleOrders.filter((order) => order.status === 'Completed').length
  const cancelled = visibleOrders.filter((order) => order.status === 'Cancelled' || order.payment === 'Refunded').length
  const averageOrder = validOrders.length ? Math.round(sales / validOrders.length) : 0
  const visibleOrderIds = new Set(visibleOrders.map((order) => order.id))
  const paymentTotals = payments.reduce((totals, payment) => {
    if (payment.status === 'Paid' && visibleOrderIds.has(payment.orderId)) totals[payment.method] = (totals[payment.method] || 0) + payment.amount
    return totals
  }, {})
  const paymentTotal = Object.values(paymentTotals).reduce((sum, amount) => sum + amount, 0)
  return <><div className="filter-row"><div className="date-filter"><span>◷</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option>Today</option><option>This week</option><option>This month</option><option>All time</option></select></div><select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{[...new Set(menu.map((item) => item.category))].map((value) => <option key={value}>{value}</option>)}</select><select className="filter-select" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option>All payments</option>{['Cash', 'GCash', 'Maya', 'Card', 'QR Payment', 'Other', 'Pending', 'Failed', 'Cancelled', 'Refunded'].map((value) => <option key={value}>{value}</option>)}</select><div className="search-box report-search"><span>⌕</span><input placeholder="Search sales..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="button button-outline" onClick={() => window.print()}>▧ <span>Print report</span></button></div><div className="stat-grid report-stats"><StatCard label="GROSS SALES" value={money(sales)} trend={`${validOrders.length} valid transactions`} detail={dateRange} tone="green" icon="↗" /><StatCard label="TRANSACTIONS" value={visibleOrders.length} trend={`${completed} completed`} detail={`${cancelled} cancelled/refunded`} tone="blue" icon="▤" /><StatCard label="AVERAGE ORDER" value={money(averageOrder)} trend="Current selection" detail="per valid transaction" tone="amber" icon="◷" /><StatCard label="PAYMENT RECORDS" value={visibleOrders.length} trend={`${Object.keys(paymentTotals).length} methods used`} detail="local demo ledger" tone="pink" icon="＄" /></div><div className="dashboard-grid report-grid"><article className="panel sales-panel"><div className="panel-heading"><div><h2>{page === 'Reports' ? 'Sales report' : 'Sales overview'}</h2><p>Revenue performance · current local orders</p></div><span className="report-total">{money(sales)}</span></div><SalesChart /></article><article className="panel"><div className="panel-heading"><div><h2>Sales by payment method</h2><p>Paid payment records · {money(paymentTotal)}</p></div></div><div className="payment-mix">{Object.keys(paymentTotals).length ? Object.entries(paymentTotals).map(([method, amount]) => <div key={method}><span>{method}</span><div className="mix-track"><i style={{ width: `${paymentTotal ? Math.max(4, amount / paymentTotal * 100) : 0}%` }} /></div><strong>{paymentTotal ? Math.round(amount / paymentTotal * 100) : 0}%</strong></div>) : <p className="empty-state">No paid transactions for this selection.</p>}</div></article></div><section className="panel full-panel report-table"><div className="panel-heading"><div><h2>Transactions</h2><p>Completed, cancelled, and pending activity</p></div><button className="text-button" onClick={() => window.print()}>Print list ↗</button></div><OrdersTable orders={visibleOrders} /></section></>
}

export default function SalesPage() {
  return <SalesReport />
}