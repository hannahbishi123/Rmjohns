import { useApp } from '../context/AppContext'
import { OrdersTable } from '../components/shared'

export default function BillingPage() {
  const { orders, setDialog } = useApp()
  return <section className="panel full-panel billing-history"><div className="panel-heading"><div><h2>Billing &amp; receipts</h2><p>Recent transactions · select an order to inspect its bill</p></div><button className="button button-outline" onClick={() => window.print()}>▧ <span>Print list</span></button></div><OrdersTable orders={orders} onDetails={(order) => setDialog({ type: 'receipt-order', order })} /></section>
}