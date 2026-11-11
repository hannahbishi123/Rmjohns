/**
 * KitchenPage — real-time Kanban board for kitchen staff
 *
 * Order data flows:
 *   1. Orders saved to XAMPP via the normal app state sync.
 *   2. Firebase listener in AppContext merges status changes in real time.
 *   3. When a kitchen worker advances an order, updateOrder() updates local
 *      state AND the next PUT /api/state call syncs both MySQL and Firebase.
 *   4. Other connected clients (customer screen, admin dashboard) receive the
 *      Firebase status update without a page refresh.
 */
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'

const stages = ['Pending', 'Preparing', 'Ready']

export default function KitchenPage() {
  const { orders, updateOrder, notify, firebaseConnected } = useApp()
  const activeOrders = orders.filter((order) =>
    ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(order.status),
  )

  return (
    <>
      <div className="kitchen-toolbar">
        <span
          className="live-dot"
          style={{ background: firebaseConnected ? '#4CAF50' : '#FFC107' }}
          title={firebaseConnected ? 'Live updates active' : 'Offline — using local data'}
        />
        {' '}Kitchen queue · {activeOrders.length} active ticket{activeOrders.length !== 1 ? 's' : ''}
        {' '}
        <span
          className="kitchen-sync-badge"
          title={firebaseConnected ? 'Firebase connected' : 'Firebase unavailable — orders still update locally'}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 10,
            marginLeft: 6,
            background: firebaseConnected ? '#E6F4EC' : '#FFF8E1',
            color: firebaseConnected ? '#1B5E35' : '#7A5800',
            border: `1px solid ${firebaseConnected ? '#A8D5B5' : '#FFD54F'}`,
          }}
        >
          {firebaseConnected ? '● LIVE' : '◌ LOCAL'}
        </span>
        <button
          className="button button-outline"
          style={{ marginLeft: 12 }}
          onClick={() => notify('Kitchen queue refreshed from live data')}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="kitchen-board">
        {stages.map((stage) => {
          const stageOrders = activeOrders.filter((order) =>
            stage === 'Pending'
              ? ['Pending', 'Confirmed'].includes(order.status)
              : order.status === stage,
          )

          const nextStatus = stage === 'Pending' ? 'Preparing' : stage === 'Preparing' ? 'Ready' : 'Completed'
          const buttonLabel = stage === 'Pending' ? 'Start preparing' : stage === 'Preparing' ? 'Mark ready' : 'Complete order'

          return (
            <section className="kitchen-column" key={stage}>
              <div className="kitchen-column-head">
                <h2>{stage}</h2>
                <span>{stageOrders.length}</span>
              </div>

              {stageOrders.map((order) => (
                <article className="panel kitchen-ticket" key={order.id}>
                  <div className="kitchen-ticket-head">
                    <strong>{order.id}</strong>
                    <span>{order.time}</span>
                  </div>
                  <p>{order.items}</p>
                  <div className="kitchen-ticket-meta">
                    <span>{order.type}</span>
                    <span>{money(order.total)}</span>
                  </div>
                  <button
                    className="button button-dark"
                    onClick={() => updateOrder(order.id, nextStatus)}
                  >
                    {buttonLabel} <span>→</span>
                  </button>
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </>
  )
}
