import { useApp } from '../context/AppContext'

// ── Quick-nav card ────────────────────────────────────────────────────────────
function QuickCard({ icon, label, description, onClick }) {
  return (
    <button className="home-quick-card" onClick={onClick} type="button">
      <span className="home-quick-icon" aria-hidden="true">{icon}</span>
      <span className="home-quick-label">{label}</span>
      <span className="home-quick-desc">{description}</span>
      <span className="home-quick-arrow" aria-hidden="true">→</span>
    </button>
  )
}

export default function CustomerHomePage() {
  const { navigate, profile, points, cartCount } = useApp()
  const firstName = profile?.name?.split(' ')[0] || 'there'

  return (
    <div className="customer-home-clean">

      {/* ── Welcome banner — full width, logo + text centered ── */}
      <section className="welcome-banner-full">
        {/* Logo centered at top */}
        <div className="wbf-logo-ring">
          <img
            src="/rmjohns-logo.jpg"
            alt="RMJohn's Eatery"
            className="wbf-logo"
          />
        </div>

        {/* Brand name */}
        <span className="wbf-eyebrow">RMJOHN&apos;S EATERY</span>

        {/* Welcome heading */}
        <h2 className="wbf-heading">Welcome back, {firstName}! 👋</h2>

        {/* Subtitle */}
        <p className="wbf-sub">Fresh Filipino food, made with care. What would you like today?</p>

        {/* CTA */}
        <button className="wbf-btn" onClick={() => navigate('Menu')}>
          Browse menu →
        </button>
      </section>

      {/* ── Quick navigation cards ── */}
      <div className="home-quick-grid">
        <QuickCard
          icon="▦"
          label="Menu"
          description="Browse all available dishes"
          onClick={() => navigate('Menu')}
        />
        <QuickCard
          icon={cartCount > 0 ? `＋ ${cartCount}` : '＋'}
          label="Cart"
          description={cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} waiting` : 'Your order basket'}
          onClick={() => navigate('Cart')}
        />
        <QuickCard
          icon="▤"
          label="My Orders"
          description="Track your order status"
          onClick={() => navigate('My orders')}
        />
        <QuickCard
          icon="✳"
          label={`Loyalty · ${points} pts`}
          description="Redeem rewards and check points"
          onClick={() => navigate('Loyalty')}
        />
      </div>

    </div>
  )
}
