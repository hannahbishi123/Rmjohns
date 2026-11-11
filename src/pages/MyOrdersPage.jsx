import { useApp } from '../context/AppContext'
import { Pagination, StatusBadge, usePagination } from '../components/shared'
import { money } from '../data/mockData'

export default function MyOrdersPage() {
  const { orders, setDialog, reorder } = useApp()
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(orders, 5)
  return <section className="panel full-panel"><div className="panel-heading"><div><h2>Your recent orders</h2><p>Track an order, view its receipt, or order it again.</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>ORDER</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{paginatedItems.map((order) => <tr key={order.id}><td><strong className="order-id">{order.id}</strong><small className="history-date">{order.time}</small></td><td className="items-cell">{order.items}</td><td>{money(order.total)}</td><td>{order.paymentMethod || 'Cash'} · {order.payment}</td><td><StatusBadge status={order.status} /></td><td><div className="history-actions"><button className="text-button" onClick={() => setDialog({ type: 'order', order })}>Track</button><button className="text-button" disabled={!order.products?.length} onClick={() => reorder(order)}>Reorder</button><button className="text-button" onClick={() => setDialog({ type: 'receipt-order', order })}>Receipt</button></div></td></tr>)}</tbody></table>{paginatedItems.length === 0 && <div className="empty-state">Your orders will appear here.</div>}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} /></section>
}
