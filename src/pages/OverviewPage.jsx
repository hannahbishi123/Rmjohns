import { useApp } from '../context/AppContext'
import { FoodThumb, Legend, OrdersTable, SalesChart, StatCard } from '../components/shared'
import { money } from '../data/mockData'

export default function OverviewPage() {
  const { orders, menu, staff, points, customers, navigate } = useApp()
  const sales = orders.filter((order) => !['Cancelled', 'Refunded'].includes(order.payment)).reduce((sum, order) => sum + order.total, 0)
  const completed = orders.filter((order) => order.status === 'Completed').length
  const pending = orders.filter((order) => ['Pending', 'Confirmed', 'Preparing'].includes(order.status)).length
  const channelCounts = {
    inStore: orders.filter((order) => order.type === 'Dine in').length,
    online: orders.filter((order) => ['Online', 'Pickup', 'Takeout'].includes(order.type)).length,
  }
  const channelTotal = Math.max(orders.length, 1)
  const inStorePercent = Math.round(channelCounts.inStore / channelTotal * 100)
  const onlinePercent = Math.round(channelCounts.online / channelTotal * 100)
  const itemSales = orders.flatMap((order) => order.products || []).reduce((counts, line) => ({ ...counts, [line.id]: (counts[line.id] || 0) + line.quantity }), {})
  return <>
    <section className="stat-grid">
      <StatCard label="TODAY’S SALES" value={money(sales)} trend={`${orders.length} transactions`} detail="current local records" tone="green" icon="↗" />
      <StatCard label="ORDERS TODAY" value={orders.length} trend={`${completed} completed`} detail="current local records" tone="blue" icon="▤" />
      <StatCard label="PENDING ORDERS" value={pending} trend="Needs attention" detail="move tickets in Kitchen" tone="amber" icon="◷" />
      <StatCard label="LOYALTY MEMBERS" value={customers.length} trend="Local mock accounts" detail="this session" tone="pink" icon="✳" />
      <StatCard label="COMPLETED ORDERS" value={completed} trend="On track" detail="today" tone="green" icon="✓" />
      <StatCard label="STAFF PRESENT" value={staff.filter((person) => person.status === 'Present').length} trend="On shift" detail="of 14 scheduled" tone="blue" icon="♧" />
    </section>
    <section className="dashboard-grid">
      <article className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Revenue performance this week</p></div><select className="select-small" defaultValue="This week"><option>This week</option><option>This month</option></select></div><SalesChart /></article>
      <article className="panel channel-panel"><div className="panel-heading"><div><h2>Order channels</h2><p>How guests are ordering</p></div><button className="text-button" onClick={() => navigate('Reports')}>Details ↗</button></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#315a3d 0 ${inStorePercent}%, #d8be73 ${inStorePercent}% 100%)` }}><div><strong>{orders.length}</strong><small>orders</small></div></div><div className="legend"><Legend color="green" label="In-store" value={`${inStorePercent}%`} /><Legend color="gold" label="Online" value={`${onlinePercent}%`} /></div></div></article>
      <article className="panel orders-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Stay on top of the latest tickets</p></div><button className="text-button" onClick={() => navigate('Orders')}>View all ↗</button></div><OrdersTable orders={orders.slice(0, 4)} compact /></article>
      <article className="panel popular-panel"><div className="panel-heading"><div><h2>Guest favorites</h2><p>Top picks from linked orders</p></div><button className="text-button" onClick={() => navigate('Menu')}>Menu ↗</button></div><div className="popular-list">{[...menu].sort((a, b) => (itemSales[b.id] || 0) - (itemSales[a.id] || 0)).slice(0, 4).map((item, index) => <div className="popular-row" key={item.id}><span className="rank">0{index + 1}</span><FoodThumb item={item} small /><span className="popular-name"><strong>{item.name}</strong><small>{item.category}</small></span><span className="popular-sales">{itemSales[item.id] || 0} sold</span></div>)}</div><div className="loyalty-note"><span>✳</span><div><strong>{points} points</strong><small>Your demo account is 80 points from a reward</small></div><span className="note-arrow">↗</span></div></article>
    </section>
  </>
}
