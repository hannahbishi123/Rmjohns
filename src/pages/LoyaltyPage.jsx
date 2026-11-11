import { useApp } from '../context/AppContext'

export default function LoyaltyPage() {
  const { points, role, customers, setCustomers, rewards, setRewards, loyaltyHistory, redeemReward, setDialog, confirmAction, notify } = useApp()
  const isAdmin = role === 'Admin'

  function adjustPoints(customerId, delta) {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? { ...customer, points: Math.max(0, customer.points + delta) }
          : customer
      )
    )
  }

  async function handleDeleteReward(reward) {
    const result = await confirmAction({
      title: `Remove "${reward.name}"?`,
      text: 'This reward will be permanently deleted from the catalog.',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Keep it',
      icon: 'warning',
    })
    if (!result.isConfirmed) return
    setRewards((current) => current.filter((entry) => entry.id !== reward.id))
    notify(`"${reward.name}" removed from the catalog`, { icon: 'success', title: 'Reward removed' })
  }

  function handleToggleReward(reward) {
    setRewards((current) =>
      current.map((entry) =>
        entry.id === reward.id ? { ...entry, available: !entry.available } : entry
      )
    )
    notify(
      `"${reward.name}" is now ${reward.available ? 'hidden' : 'available'}`,
      { icon: 'info', title: 'Reward updated' }
    )
  }

  return (
    <>
      <section className="loyalty-hero">
        <div>
          <span className="eyebrow">RMJOHN&apos;S GOODNESS CLUB</span>
          <h2>{isAdmin ? 'Loyalty, at a glance.' : 'A little something back.'}</h2>
          <p>Every visit brings you closer to a little treat.</p>
        </div>
        <div className="points-display">
          <span>AVAILABLE POINTS</span>
          <strong>{points}</strong>
          <small>1 point per ₱100 spent</small>
        </div>
      </section>

      <div className="loyalty-content">
        <section className="panel progress-panel">
          <div className="panel-heading">
            <div>
              <h2>Your next treat</h2>
              <p>Redeem a favorite on your next visit</p>
            </div>
            <span className="reward-icon">✳</span>
          </div>
          <div className="reward-progress">
            <div className="progress-track">
              <i style={{ width: `${Math.min(points / 2, 100)}%` }} />
            </div>
            <div><strong>{points} pts</strong><span>200 pts</span></div>
          </div>
          <p className="reward-caption">{Math.max(200 - points, 0)} points until a complimentary dessert</p>
        </section>

        <section className="panel reward-panel">
          <div className="panel-heading">
            <div>
              <h2>Little rewards</h2>
              <p>Good things, earned</p>
            </div>
          </div>
          {rewards.filter((reward) => reward.available).map((reward) => (
            <div className="reward-item" key={reward.id}>
              <span className="reward-icon">✳</span>
              <div>
                <strong>{reward.name}</strong>
                <small>{reward.description}</small>
              </div>
              <button
                className="button button-outline"
                disabled={points < reward.points}
                onClick={() => redeemReward(reward)}
              >
                {reward.points} pts · Redeem
              </button>
            </div>
          ))}
        </section>
      </div>

      <section className="panel full-panel points-history">
        <div className="panel-heading">
          <div>
            <h2>Points history</h2>
            <p>Purchases and redemptions in this session</p>
          </div>
        </div>
        {loyaltyHistory.map((entry) => (
          <div className="history-row" key={entry.id}>
            <span className="history-date">{entry.date}</span>
            <strong>{entry.detail}</strong>
            <span className={entry.delta >= 0 ? 'points-positive' : 'points-used'}>
              {entry.delta >= 0 ? '+' : ''}{entry.delta} pts
            </span>
          </div>
        ))}
      </section>

      {isAdmin && (
        <section className="panel full-panel loyalty-admin">
          <div className="panel-heading">
            <div>
              <h2>Reward catalog</h2>
              <p>Update available rewards and point costs</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>REWARD</th>
                  <th>POINT COST</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id}>
                    <td>
                      <strong>{reward.name}</strong>
                      <small className="history-date">{reward.description}</small>
                    </td>
                    <td>{reward.points} pts</td>
                    <td>{reward.available ? 'Available' : 'Hidden'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label={`Edit ${reward.name}`}
                          onClick={() => setDialog({ type: 'edit-reward', reward })}
                        >
                          ✎
                        </button>
                        <button
                          aria-label={`Toggle ${reward.name}`}
                          onClick={() => handleToggleReward(reward)}
                        >
                          {reward.available ? 'Ⅱ' : '▶'}
                        </button>
                        <button
                          aria-label={`Delete ${reward.name}`}
                          onClick={() => handleDeleteReward(reward)}
                        >
                          ⌫
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel-heading loyalty-customer-heading">
            <div>
              <h2>Customer points</h2>
              <p>Manual point adjustments for the demo</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>POINTS</th>
                  <th>ADJUST</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name} · {customer.id}</td>
                    <td>{customer.points}</td>
                    <td>
                      <div className="points-controls">
                        <button
                          onClick={() => adjustPoints(customer.id, -10)}
                          aria-label={`Remove points from ${customer.name}`}
                        >
                          −10
                        </button>
                        <button
                          onClick={() => adjustPoints(customer.id, 10)}
                          aria-label={`Add points to ${customer.name}`}
                        >
                          ＋10
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
