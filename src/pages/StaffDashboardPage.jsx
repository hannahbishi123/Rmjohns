import { useApp } from '../context/AppContext'
import { OrdersTable, StatCard } from '../components/shared'

export default function StaffDashboardPage() {
  const { orders, staff, navigate, notify } = useApp()
  const activeOrders = orders.filter((order) => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(order.status))
  const myStatus = staff.find((member) => member.name === 'Ava Mendoza')?.status || 'Present'
  return <><section className="stat-grid"><StatCard label="ACTIVE TICKETS" value={activeOrders.length} trend="Kitchen queue" detail="orders to prepare" tone="green" icon="♨" /><StatCard label="READY FOR PICKUP" value={orders.filter((order) => order.status === 'Ready').length} trend="Awaiting handoff" detail="today" tone="amber" icon="✓" /><StatCard label="MY SHIFT" value={myStatus} trend="Attendance" detail="demo staff status" tone="blue" icon="◷" /><StatCard label="NEW ORDERS" value={orders.filter((order) => order.status === 'Pending').length} trend="Needs review" detail="front-of-house" tone="pink" icon="▤" /></section><section className="staff-dashboard-actions"><div><span className="eyebrow">STAFF TOOLS</span><h2>Ready for the next ticket?</h2><p>Review order details and move meals through preparation.</p></div><button className="button button-dark" onClick={() => navigate('Kitchen')}>Open kitchen queue <span>→</span></button></section><section className="panel full-panel"><div className="panel-heading"><div><h2>Orders needing attention</h2><p>Pending, preparing, and ready tickets</p></div><button className="text-button" onClick={() => notify('Queue refreshed from local orders')}>Refresh ↻</button></div><OrdersTable orders={activeOrders.slice(0, 6)} /></section></>
}
