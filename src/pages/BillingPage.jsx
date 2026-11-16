import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { OrdersTable, Pagination, usePagination } from '../components/shared'

export default function BillingPage() {
  const { orders, setDialog } = useApp()
  const [search, setSearch] = useState('')
  const visibleOrders = orders.filter((order) => `${order.id} ${order.customer} ${order.items} ${order.paymentMethod || ''}`.toLowerCase().includes(search.toLowerCase()))
  const pagination = usePagination(visibleOrders, 10)
  return (
    <section className="panel full-panel billing-history">
      <div className="panel-heading">
        <div>
          <h2>Billing &amp; receipts</h2>
          <p>Recent transactions · select an order to inspect its bill</p>
        </div>
        <div className="heading-actions">
          <div className="search-box">
            <span>⌕</span>
            <input
              placeholder="Search bills..."
              value={search}
              maxLength="120"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="button button-outline" onClick={() => window.print()}>
            ▧ <span>Print list</span>
          </button>
        </div>
      </div>
      <OrdersTable orders={pagination.paginatedItems} onDetails={(order) => setDialog({ type: 'receipt-order', order })} />
      <Pagination {...pagination} />
    </section>
  )
}