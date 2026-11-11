import { useApp } from '../context/AppContext'
import './LandingPage.css'

const features = [
  ['⌂', 'Online ordering', 'Let guests browse, customize, and place pickup or dine-in orders.'],
  ['＋', 'Point of sale', 'Build walk-in orders, apply discounts, and complete counter sales.'],
  ['▧', 'Billing & receipts', 'Keep order totals, payment details, and printable receipts together.'],
  ['⇄', 'Unified payments', 'Simulate cash, GCash, Maya, cards, and QR payment choices.'],
  ['↗', 'Sales management', 'See transactions, sales trends, and payment-method summaries.'],
  ['⌁', 'Staff monitoring', 'Preview attendance and ESP32/RFID scan activity in demo mode.'],
  ['✳', 'Loyalty rewards', 'Earn points from orders and redeem rewards in the prototype.'],
  ['▤', 'Order management', 'Move orders from pending through preparation and completion.'],
]

const flow = [
  ['01', 'Choose a channel', 'Guests order online, or the team can ring up a walk-in at POS.'],
  ['02', 'Build the order', 'Select dishes, adjust quantities, and review the order summary.'],
  ['03', 'Pay and prepare', 'Select a simulated payment method, then move the ticket through the kitchen.'],
  ['04', 'Complete the visit', 'Issue a receipt, update sales, and award loyalty points in local demo state.'],
]

// Professional SVG food composition — replaces the emoji plate illustration.
// A top-down view of a set table: round plate, cutlery, a drink glass, and
// abstract food silhouettes. No emoji at all.
function HeroPlateIllustration() {
  return (
    <svg
      className="hero-plate-svg"
      viewBox="0 0 340 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Table cloth / linen texture lines */}
      <line x1="0" y1="60" x2="340" y2="60" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="0" y1="120" x2="340" y2="120" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="0" y1="180" x2="340" y2="180" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="0" y1="240" x2="340" y2="240" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="60" y1="0" x2="60" y2="300" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="120" y1="0" x2="120" y2="300" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="180" y1="0" x2="180" y2="300" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="240" y1="0" x2="240" y2="300" stroke="#d8ddcb" strokeWidth="0.8" />
      <line x1="300" y1="0" x2="300" y2="300" stroke="#d8ddcb" strokeWidth="0.8" />

      {/* Plate shadow */}
      <ellipse cx="168" cy="158" rx="88" ry="10" fill="rgba(36,56,38,0.08)" />

      {/* Plate outer rim */}
      <circle cx="168" cy="150" r="88" fill="#fffefa" stroke="#e4e8dc" strokeWidth="1.5" />
      {/* Plate inner rim */}
      <circle cx="168" cy="150" r="72" fill="#f8f6ee" stroke="#dfe3d6" strokeWidth="1" />
      {/* Plate well */}
      <circle cx="168" cy="150" r="56" fill="#f3f1e6" />

      {/* Food — rice mound */}
      <ellipse cx="168" cy="158" rx="32" ry="18" fill="#ede8d4" stroke="#d8d0b8" strokeWidth="1" />
      <ellipse cx="168" cy="152" rx="28" ry="14" fill="#e8e2cc" />
      <ellipse cx="168" cy="147" rx="20" ry="9" fill="#ddd8c0" />

      {/* Food — protein piece (grilled) */}
      <path d="M138 140 C140 128 158 124 170 126 C182 128 192 136 190 148 C188 158 174 162 160 160 C146 158 136 152 138 140Z"
        fill="#c4856a" stroke="#a96b52" strokeWidth="1" />
      {/* Grill marks */}
      <path d="M148 133 L155 148" stroke="#8a4a35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M156 130 L163 145" stroke="#8a4a35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M164 129 L171 144" stroke="#8a4a35" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Food — green vegetable garnish */}
      <ellipse cx="152" cy="163" rx="10" ry="6" fill="#7aab5a" stroke="#5d8a40" strokeWidth="0.8" transform="rotate(-20 152 163)" />
      <ellipse cx="185" cy="155" rx="8" ry="5" fill="#85b863" stroke="#5d8a40" strokeWidth="0.8" transform="rotate(15 185 155)" />
      <ellipse cx="175" cy="168" rx="9" ry="5" fill="#6fa050" stroke="#4e7836" strokeWidth="0.8" transform="rotate(-10 175 168)" />

      {/* Fork (left) */}
      <rect x="64" y="90" width="5" height="120" rx="2.5" fill="#c8cfc4" stroke="#a8b0a4" strokeWidth="0.8" />
      {/* Fork tines */}
      <rect x="62" y="90" width="2" height="28" rx="1" fill="#b8c0b4" />
      <rect x="65.5" y="90" width="2" height="28" rx="1" fill="#b8c0b4" />
      <rect x="69" y="90" width="2" height="28" rx="1" fill="#b8c0b4" />
      {/* Fork tine connector */}
      <path d="M62 118 Q66 124 71 118" fill="#c8cfc4" stroke="#a8b0a4" strokeWidth="0.8" />

      {/* Knife (right) */}
      <rect x="265" y="90" width="5" height="120" rx="2.5" fill="#c8cfc4" stroke="#a8b0a4" strokeWidth="0.8" />
      {/* Blade */}
      <path d="M265 90 Q275 110 270 130 L265 130Z" fill="#b0bab0" stroke="#90a090" strokeWidth="0.8" />

      {/* Spoon (far right) */}
      <rect x="283" y="120" width="4" height="90" rx="2" fill="#c8cfc4" stroke="#a8b0a4" strokeWidth="0.8" />
      <ellipse cx="285" cy="112" rx="9" ry="13" fill="#dde0da" stroke="#a8b0a4" strokeWidth="0.8" />

      {/* Drink glass (top right) */}
      <path d="M268 52 L280 84 L256 84 Z" fill="#d4e8f0" stroke="#9ac4d8" strokeWidth="1" opacity="0.85" />
      <path d="M256 84 L268 84 L268 94 L256 94Z" fill="#b8d8e8" stroke="#9ac4d8" strokeWidth="1" opacity="0.85" />
      <ellipse cx="268" cy="52" rx="6" ry="3" fill="#e8f4f8" stroke="#9ac4d8" strokeWidth="0.8" opacity="0.7" />
      {/* Straw */}
      <line x1="272" y1="48" x2="278" y2="88" stroke="#f4a46a" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

      {/* Side sauce dish (top left) */}
      <ellipse cx="70" cy="80" rx="28" ry="18" fill="#fffefa" stroke="#e4e8dc" strokeWidth="1" />
      <ellipse cx="70" cy="80" rx="22" ry="13" fill="#f5f2e8" />
      <ellipse cx="70" cy="80" rx="14" ry="8" fill="#d4863c" opacity="0.8" />

      {/* Napkin fold (bottom left) */}
      <path d="M30 220 L90 220 L80 260 L20 260Z" fill="#f0f4ea" stroke="#d8e0d0" strokeWidth="1" />
      <line x1="30" y1="235" x2="84" y2="235" stroke="#c8d4c0" strokeWidth="0.8" />
      <line x1="27" y1="248" x2="81" y2="248" stroke="#c8d4c0" strokeWidth="0.8" />

      {/* Herb sprig garnish */}
      <path d="M122 200 Q130 185 138 190" stroke="#5a8a3a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="130" cy="187" rx="5" ry="3" fill="#6aa046" opacity="0.8" transform="rotate(-30 130 187)" />
      <ellipse cx="138" cy="190" rx="5" ry="3" fill="#6aa046" opacity="0.8" transform="rotate(20 138 190)" />

      {/* Plate label (subtle text replacement for 'RMJOHN'S') */}
      <text x="168" y="225" textAnchor="middle" fill="#a8a890" fontSize="7" fontFamily="sans-serif" letterSpacing="2" opacity="0.7">RMJOHN&apos;S</text>
    </svg>
  )
}

export default function LandingPage() {
  const { navigate } = useApp()

  return <div className="landing-page" id="home">
    <header className="landing-header">
      <a className="landing-brand" href="#home" aria-label="RMJohn's home">
        <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="landing-brand-logo" />
        <span><strong>RMJohn&apos;s</strong><small>EATERY</small></span>
      </a>
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#contact">Contact</a>
      </nav>
      <button className="landing-login" onClick={() => navigate('Login')}>Login <span>↗</span></button>
    </header>

    <main>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow"><i /> A BETTER WAY TO RUN LOCAL EATERIES</span>
          <h1>Good food.<br /><em>One connected</em><br />experience.</h1>
          <p>Bring online orders, point-of-sale transactions, staff tools, and guest rewards into one thoughtful system.</p>
          <div className="landing-hero-actions">
            <button className="landing-primary" onClick={() => navigate('Login')}>Get started <span>→</span></button>
            <a className="landing-secondary" href="#features">See what&apos;s included <span>↓</span></a>
          </div>
          <div className="landing-proof">
            <span>01</span> ONE MENU <i /> <span>02</span> EVERY CHANNEL <i /> <span>03</span> ONE TEAM
          </div>
        </div>

        {/* SVG table-top food illustration — no emoji */}
        <div className="landing-visual" role="img" aria-label="Illustrated top-down view of a beautifully plated RMJohn's meal">
          <div className="visual-label">MADE WITH CARE <span>·</span> SERVED TOGETHER</div>
          <div className="table-linen">
            <HeroPlateIllustration />
            <div className="linen-note"><span>RMJOHN&apos;S</span><small>SEASONAL · LOCAL · FRESH</small></div>
          </div>
          <div className="visual-caption">
            <span>FROM OUR KITCHEN</span>
            <strong>A little good in every order.</strong>
          </div>
        </div>

        <div className="hero-side-note">ORDER · PAY · ENJOY <span>↘</span></div>
      </section>

      <section className="landing-intro" id="about">
        <div className="landing-section-tag">01 / ABOUT THE SYSTEM</div>
        <h2>More than a way to take orders.<br /><span>A better way to work together.</span></h2>
        <p>RMJohn&apos;s brings each part of a neighborhood eatery into one connected frontend prototype. Every screen shares the same sample menu, order flow, and in-session activity so the whole experience feels joined up.</p>
        <button className="landing-text-link" onClick={() => navigate('Login')}>Get started <span>↗</span></button>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-heading">
          <div>
            <div className="landing-section-tag">02 / SYSTEM FEATURES</div>
            <h2>Everything has its place.</h2>
          </div>
          <p>One connected system for the front counter, the kitchen, and the people who keep the place running.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map(([icon, title, description], index) => (
            <article className="landing-feature" key={title}>
              <div className="feature-top">
                <span className="feature-icon">{icon}</span>
                <span className="feature-index">0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-process" id="how-it-works">
        <div className="landing-section-heading">
          <div>
            <div className="landing-section-tag">03 / HOW IT WORKS</div>
            <h2>One visit, connected end to end.</h2>
          </div>
          <p>From the first menu view to the last loyalty point, each step updates the same frontend demo.</p>
        </div>
        <div className="landing-flow">
          {flow.map(([number, title, description]) => (
            <article className="landing-flow-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-contact" id="contact">
        <div>
          <div className="landing-section-tag">05 / GET STARTED</div>
          <h2>Ready for a smoother service?</h2>
          <p>Explore the demo with sample data. No account service or payment is connected.</p>
        </div>
        <button className="landing-primary" onClick={() => navigate('Login')}>Get started <span>→</span></button>
      </section>
    </main>

    <footer className="landing-footer">
      <a className="landing-brand" href="#home">
        <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="landing-brand-logo" />
        <span><strong>RMJohn&apos;s</strong><small>EATERY</small></span>
      </a>
      <span>INTEGRATED EATERIES SYSTEM · FRONTEND PROTOTYPE</span>
      <a href="#home">Back to top ↑</a>
    </footer>
  </div>
}
