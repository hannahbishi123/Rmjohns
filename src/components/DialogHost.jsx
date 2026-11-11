import { useState, useRef } from 'react'
import { money } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { Modal, getCategoryIcon } from './shared'
import { uploadMenuImage, deleteMenuImage } from '../lib/firebase'
import { useField, useForm, FieldError, fieldClass, rules } from '../lib/validation'

export default function DialogHost({ dialog, onClose, menu, payments, setMenu, setStaff, setCart, setRewards, setPromotions, refundOrder, notify }) {
  if (dialog.type === 'account') return <AccountDialog dialog={dialog} onClose={onClose} notify={notify} />
  if (dialog.type === 'food') return <FoodDetailsDialog item={dialog.item} onClose={onClose} setCart={setCart} notify={notify} />
  if (dialog.type === 'receipt-order') {
    const receiptItems = (dialog.order.products || []).map((line) => ({ ...menu.find((item) => item.id === line.id), ...line })).filter((item) => item.id)
    const payment = payments.find((entry) => entry.orderId === dialog.order.id)
    return <ReceiptPreview order={dialog.order} items={receiptItems} payment={payment} onClose={onClose} />
  }
  if (dialog.type === 'customer') return <CustomerDetailsDialog customer={dialog.customer} orders={dialog.orders} onClose={onClose} />
  if (dialog.type === 'confirmation') return <ConfirmationDialog dialog={dialog} onClose={onClose} />
  if (dialog.type === 'receipt') return (
    <Modal onClose={onClose}>
      <div className="receipt-modal">
        <div className="receipt-brand">
          <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="brand-logo" />
          <div><strong>RMJohn&apos;s</strong><small>EATERY</small></div>
        </div>
        <span className="eyebrow">PAYMENT RECEIPT</span>
        <h2>Thank you.</h2>
        <div className="receipt-meta">
          <span>Receipt {dialog.receipt.id} &middot; {dialog.receipt.orderId}</span>
          <span>{dialog.receipt.time}</span>
        </div>
        {dialog.receipt.items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>{item.quantity} &times; {item.name}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="receipt-line"><span>Subtotal</span><strong>{money(dialog.receipt.subtotal)}</strong></div>
        {dialog.receipt.discount > 0 && <div className="receipt-line"><span>Discount</span><strong>&minus;{money(dialog.receipt.discount)}</strong></div>}
        <div className="receipt-line"><span>Service charge</span><strong>{money(dialog.receipt.serviceCharge)}</strong></div>
        <div className="receipt-total"><span>Total &middot; {dialog.receipt.payment}</span><strong>{money(dialog.receipt.total)}</strong></div>
        <div className="receipt-meta">
          <span>Served by &middot; {dialog.receipt.servedBy}</span>
          <span>Paid {money(dialog.receipt.amountPaid)} &middot; Change {money(dialog.receipt.change)}</span>
        </div>
        <div className="receipt-actions">
          <button className="button button-outline" onClick={() => window.print()}>&#9639; <span>Print</span></button>
          <button className="button button-dark" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  )
  if ((dialog.type === 'edit-menu') || (dialog.type === 'add' && dialog.entity === 'menu')) return <MenuForm dialog={dialog} onClose={onClose} setMenu={setMenu} notify={notify} />
  if (dialog.type === 'add-reward' || dialog.type === 'edit-reward') return <RewardForm dialog={dialog} onClose={onClose} setRewards={setRewards} notify={notify} />
  if (dialog.type === 'add-promotion' || dialog.type === 'edit-promotion') return <PromotionForm dialog={dialog} onClose={onClose} setPromotions={setPromotions} notify={notify} />
  if ((dialog.type === 'add' && dialog.entity === 'staff') || dialog.type === 'edit-staff') return <StaffForm dialog={dialog} onClose={onClose} setStaff={setStaff} notify={notify} />
  if (dialog.type === 'delete-staff') return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="modal-symbol warning">&#x232B;</span>
        <h2>Deactivate {dialog.staff.name}?</h2>
        <p>The staff profile will be removed from active shifts in this demo.</p>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Keep active</button>
          <button className="button button-danger" onClick={() => { setStaff((current) => current.map((person) => person.id === dialog.staff.id ? { ...person, status: 'Inactive' } : person)); notify('Staff member deactivated'); onClose() }}>Deactivate</button>
        </div>
      </div>
    </Modal>
  )
  if (dialog.type === 'refund-order') return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="modal-symbol warning">&#x21B6;</span>
        <h2>Refund {dialog.order.id}?</h2>
        <p>{money(dialog.order.total)} will be marked as refunded in the local payment ledger.</p>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Keep payment</button>
          <button className="button button-danger" onClick={() => { refundOrder(dialog.order.id); onClose() }}>Record refund</button>
        </div>
      </div>
    </Modal>
  )
  if (dialog.type === 'delete-menu') return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="modal-symbol warning">&#x232B;</span>
        <h2>Remove this menu item?</h2>
        <p><strong>{dialog.item.name}</strong> will be removed from this demo menu.</p>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Keep item</button>
          <button className="button button-danger" onClick={() => { setMenu((current) => current.filter((item) => item.id !== dialog.item.id)); notify('Menu item removed'); onClose() }}>Remove item</button>
        </div>
      </div>
    </Modal>
  )
  if (dialog.type === 'order') return <OrderTrackingDialog order={dialog.order} onClose={onClose} />
  return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="modal-symbol">&#x2733;</span>
        <h2>{dialog.title}</h2>
        <p>{dialog.text}</p>
        <button className="button button-dark complete-button" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  )
}

function ConfirmationDialog({ dialog, onClose }) {
  const pickupLocation = dialog.pickupLocation || 'RM John\u2019s Eatery \u2022 Main Branch'
  return (
    <Modal onClose={onClose}>
      <div className="confirmation-modal">
        <div className="confirmation-mark">&#x2713;</div>
        <span className="eyebrow">ORDER CONFIRMED &middot; DIGITAL RECEIPT</span>
        <h2>We&apos;re on it.</h2>
        <p>Your order has been sent to the kitchen.</p>
        <div className="receipt-meta">
          <span>Order {dialog.id}</span>
          <span>{dialog.orderType} &middot; {dialog.paymentMethod}</span>
        </div>
        {dialog.items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>{item.quantity} &times; {item.name}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="receipt-line"><span>Pickup location</span><strong>{pickupLocation}</strong></div>
        <div className="receipt-total">
          <span>Total &middot; Pay {dialog.paymentMethod === 'Cash' ? 'at pickup' : 'simulated'}</span>
          <strong>{money(dialog.total)}</strong>
        </div>
        <p className="secure-note">Order status &middot; Preparing</p>
        <div className="receipt-actions">
          <button className="button button-outline" onClick={() => window.print()}>&#9639; <span>Print receipt</span></button>
          <button className="button button-dark" onClick={onClose}>Done <span>&#x2192;</span></button>
        </div>
      </div>
    </Modal>
  )
}

function OrderTrackingDialog({ order, onClose }) {
  const stages = ['Pending', 'Preparing', 'Ready', 'Completed']
  const currentIndex = stages.indexOf(order.status)
  return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="eyebrow">ORDER TRACKING &middot; {order.type}</span>
        <h2>{order.id}</h2>
        <p>{order.customer} &middot; {money(order.total)} &middot; {order.paymentMethod || 'Cash'} payment</p>
        {order.status === 'Cancelled'
          ? <p className="cancelled-note">This order was cancelled.</p>
          : (
            <div className="tracking-steps">
              {stages.map((stage, index) => (
                <div className={`tracking-step ${index <= currentIndex ? 'complete' : ''}`} key={stage}>
                  <span>{index < currentIndex ? '\u2713' : index + 1}</span>
                  <strong>{stage}</strong>
                </div>
              ))}
            </div>
          )
        }
        <div className="detail-lines">
          <p><span>Items</span><strong>{order.items}</strong></p>
          <p><span>Payment status</span><strong>{order.payment}</strong></p>
          {order.notes && <p><span>Notes</span><strong>{order.notes}</strong></p>}
        </div>
        <button className="button button-dark complete-button" onClick={onClose}>Close tracking</button>
      </div>
    </Modal>
  )
}

function CustomerDetailsDialog({ customer, orders, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="simple-modal">
        <span className="eyebrow">CUSTOMER PROFILE &middot; {customer.id}</span>
        <h2>{customer.name}</h2>
        <p>{customer.email} &middot; {customer.contact || 'No phone on file'}</p>
        <div className="detail-lines">
          <p><span>Total orders</span><strong>{customer.orders}</strong></p>
          <p><span>Loyalty points</span><strong>{customer.points}</strong></p>
          <p><span>Account status</span><strong>{customer.status}</strong></p>
          <p><span>Recent history</span><strong>{orders.length ? orders.map((order) => `${order.id} (${order.status})`).join(', ') : 'No orders in this session'}</strong></p>
        </div>
        <button className="button button-dark complete-button" onClick={onClose}>Close customer details</button>
      </div>
    </Modal>
  )
}

function ReceiptPreview({ order, items, payment, onClose }) {
  const { profile } = useApp()
  return (
    <Modal onClose={onClose}>
      <div className="receipt-modal">
        <div className="receipt-brand">
          <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="brand-logo" />
          <div><strong>RMJohn&apos;s</strong><small>EATERY</small></div>
        </div>
        <span className="eyebrow">DIGITAL RECEIPT</span>
        <h2>Thank you.</h2>
        <div className="receipt-meta">
          <span>{order.id} &middot; {order.customer}</span>
          <span>{order.time}</span>
        </div>
        {items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>{item.quantity} &times; {item.name}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="receipt-line"><span>Subtotal</span><strong>{money(order.subtotal ?? order.total)}</strong></div>
        {order.discount > 0 && <div className="receipt-line"><span>Discount</span><strong>&minus;{money(order.discount)}</strong></div>}
        {order.serviceCharge > 0 && <div className="receipt-line"><span>Service charge</span><strong>{money(order.serviceCharge)}</strong></div>}
        <div className="receipt-total">
          <span>Payment &middot; {payment?.method || order.paymentMethod || 'Cash'} &middot; {payment?.status || order.payment}</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="receipt-meta">
          <span>Transaction {payment?.reference || order.id}</span>
          <span>Served by &middot; {profile.name}</span>
        </div>
        <div className="receipt-actions">
          <button className="button button-outline" onClick={() => window.print()}>&#9639; <span>Print</span></button>
          <button className="button button-dark" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Password strength checker ────────────────────────────────────────────────
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', checks: [] }
  const checks = [
    { label: '8+ characters',       pass: password.length >= 8 },
    { label: 'Uppercase (A–Z)',      pass: /[A-Z]/.test(password) },
    { label: 'Lowercase (a–z)',      pass: /[a-z]/.test(password) },
    { label: 'Number (0–9)',         pass: /[0-9]/.test(password) },
    { label: 'Special (!@#$%…)',     pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.pass).length
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  return { score, label: labels[score] || '', checks }
}

const strengthColors = ['', '#e53935', '#fb8c00', '#f9a825', '#43a047', '#1b5e20']

// ── Account Dialog ─────────────────────────────────────────────────────────
// Customer self-registration is open. Staff / Admin require the setup code.
const ADMIN_SETUP_CODE = 'rmjohns2026'

function AccountDialog({ dialog, onClose, notify }) {
  const { registerAccount } = useApp()
  const [mode,      setMode]      = useState(dialog.mode || 'register')
  const [role,      setRole]      = useState('Customer')
  const [setupCode, setSetupCode] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [shake,     setShake]     = useState(false)

  // ── Live-validated fields ─────────────────────────────────────
  const nameF    = useField('', rules.name('Full name'))
  const emailF   = useField('', rules.email)
  const phoneF   = useField('', rules.phone)
  const passF    = useField('', rules.password)
  const confirmF = useField('', (v) =>
    v !== passF.value ? 'Passwords do not match.' : !v ? 'Please confirm your password.' : null,
  )
  const form = useForm({ nameF, emailF, passF, confirmF })
  const strength = getPasswordStrength(passF.value)

  function handleRoleChange(r) {
    setRole(r)
    setSetupCode('')
  }

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  async function submit(e) {
    e.preventDefault()

    if (mode === 'forgot') {
      notify('Password reset is simulated in demo mode. No email will be sent.', { icon: 'info', title: 'Demo mode' })
      onClose()
      return
    }

    // Touch all fields to show errors
    nameF.forceTouch(); emailF.forceTouch(); phoneF.forceTouch()
    passF.forceTouch(); confirmF.forceTouch()

    if (!form.isValid || (phoneF.value && phoneF.error)) {
      triggerShake()
      return
    }

    if (role !== 'Customer' && setupCode !== ADMIN_SETUP_CODE) {
      notify('Invalid setup code. Contact your system administrator.', { icon: 'error', title: 'Setup code required' })
      triggerShake()
      return
    }

    try {
      setLoading(true)
      const normalizedPhone = phoneF.value.trim().replace(/[ -]/g, '')
      await registerAccount({
        name:     nameF.value.trim(),
        email:    emailF.value.trim().toLowerCase(),
        phone:    normalizedPhone,
        password: passF.value,
        role,
      })
      notify(`${role} account created. Welcome, ${nameF.value.trim().split(' ')[0]}!`, {
        icon: 'success', title: 'Account created',
      })
      onClose()
    } catch (err) {
      notify(err.message || 'Could not create account. Please try again.', {
        icon: 'error', title: 'Registration failed',
      })
    } finally {
      setLoading(false)
    }
  }

  const roleDescriptions = {
    Customer: 'Order online, earn rewards, track purchases.',
    Staff:    'Staff accounts require a privileged setup code.',
    Admin:    'Admin accounts require a privileged setup code.',
  }
  const roleIcons = { Customer: '\u2302', Staff: '\u25C8', Admin: '\u2733' }

  return (
    <Modal onClose={onClose}>
      <form className={`form-modal account-form${shake ? ' v-shake' : ''}`} onSubmit={submit} noValidate>
        <span className="eyebrow">RMJOHN&apos;S ACCOUNT</span>

        {mode === 'register' ? (
          <>
            <h2>Create your account.</h2>
            <p className="form-description">
              Customers can register freely. Staff and Admin require a privileged setup code.
            </p>

            {/* Role selector */}
            <div className="role-selector" role="group" aria-label="Account role">
              {['Customer', 'Staff', 'Admin'].map((r) => (
                <button key={r} type="button"
                  className={`role-option${role === r ? ' role-option-active' : ''}`}
                  onClick={() => handleRoleChange(r)} aria-pressed={role === r}>
                  <span className="role-option-icon">{roleIcons[r]}</span>
                  <strong>{r}</strong>
                  <small>{roleDescriptions[r]}</small>
                </button>
              ))}
            </div>

            {/* Setup code — Staff / Admin only */}
            {role !== 'Customer' && (
              <label>
                System setup code <span className="optional-label">(required for {role})</span>
                <input
                  name="setupCode"
                  type="password"
                  required
                  maxLength={64}
                  autoComplete="off"
                  placeholder="Enter the privileged setup code"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  className={setupCode && setupCode !== ADMIN_SETUP_CODE ? 'v-invalid' : setupCode === ADMIN_SETUP_CODE ? 'v-valid' : ''}
                />
                {setupCode && setupCode !== ADMIN_SETUP_CODE && (
                  <span className="v-error">
                    <span className="v-icon v-icon-error">✕</span>
                    Invalid setup code.
                  </span>
                )}
                {setupCode === ADMIN_SETUP_CODE && (
                  <span className="v-success">
                    <span className="v-icon v-icon-success">✓</span>
                    Setup code accepted.
                  </span>
                )}
              </label>
            )}

            {/* Full name */}
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Your full name"
                value={nameF.value}
                onChange={nameF.onChange}
                onBlur={nameF.onBlur}
                className={fieldClass(nameF)}
              />
              <FieldError field={nameF} label="Full name" />
            </label>

            {/* Email */}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                value={emailF.value}
                onChange={emailF.onChange}
                onBlur={emailF.onBlur}
                className={fieldClass(emailF)}
              />
              <FieldError field={emailF} label="Email address" />
            </label>

            {/* Phone — optional */}
            <label>
              Phone <span className="optional-label">(optional)</span>
              <input
                name="phone"
                type="tel"
                maxLength={16}
                autoComplete="tel"
                placeholder="+63 917 555 0142"
                value={phoneF.value}
                onChange={phoneF.onChange}
                onBlur={phoneF.onBlur}
                className={fieldClass(phoneF)}
              />
              <FieldError field={phoneF} label="Phone number" />
            </label>

            {/* Password */}
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                placeholder="Min. 8 chars — Aa1! required"
                value={passF.value}
                onChange={(e) => { passF.onChange(e); passF.onBlur() }}
                onBlur={passF.onBlur}
                className={fieldClass(passF)}
              />
              <FieldError field={passF} label="Password" />
            </label>

            {/* Password strength meter */}
            {passF.value.length > 0 && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1,2,3,4,5].map((level) => (
                    <div key={level} className="strength-bar"
                      style={{ background: strength.score >= level ? strengthColors[strength.score] : 'var(--line)' }} />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColors[strength.score] }}>
                  {strength.label}
                </span>
                <ul className="strength-checks">
                  {strength.checks.map((c) => (
                    <li key={c.label} className={c.pass ? 'check-pass' : 'check-fail'}>
                      {c.pass ? '✓' : '✕'} {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirm password */}
            <label>
              Confirm password
              <input
                name="passwordConfirm"
                type="password"
                required
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmF.value}
                onChange={confirmF.onChange}
                onBlur={confirmF.onBlur}
                className={fieldClass(confirmF)}
              />
              <FieldError field={confirmF} label="Confirm password" />
            </label>

            <button className="button button-dark complete-button"
              disabled={loading || (passF.value.length > 0 && strength.score < 5)}>
              {loading ? 'Creating account\u2026' : `Create ${role} account \u2192`}
            </button>

            <div className="account-links">
              <button type="button" className="text-button" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>A fresh start.</h2>
            <p className="form-description">
              Password reset is simulated &mdash; no email will be sent in demo mode.
            </p>
            <label>
              Email address
              <input name="email" type="email" required maxLength={254}
                autoComplete="email" placeholder="you@example.com" />
            </label>
            <button className="button button-dark complete-button">Request reset &#x2192;</button>
            <div className="account-links">
              <button type="button" className="text-button" onClick={() => setMode('register')}>
                Create an account
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
}

function FoodDetailsDialog({ item, onClose, setCart, notify }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedAddon, setSelectedAddon] = useState('')
  const addons = [{ name: 'Extra cheese', price: 45 }, { name: 'Add protein', price: 75 }]
  const addon = addons.find((option) => option.name === selectedAddon)

  function addItem() {
    const id = `custom-${item.id}-${selectedAddon || 'plain'}`
    const product = {
      ...item,
      id,
      menuId: item.id,
      name: selectedAddon ? `${item.name} \u00B7 ${selectedAddon}` : item.name,
      addons: selectedAddon ? [selectedAddon] : [],
      price: item.price + (addon?.price || 0),
      quantity,
    }
    setCart((current) => {
      const existing = current.find((entry) => entry.id === id)
      return existing
        ? current.map((entry) => entry.id === id ? { ...entry, quantity: entry.quantity + quantity } : entry)
        : [...current, product]
    })
    notify(`${product.name} added to order`)
    onClose()
  }

  const hero = item.image
    ? (
      <div className={`food-detail-hero food-detail-hero-photo ${item.tone}`}>
        <img
          src={item.image}
          alt={item.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.parentElement.classList.add('food-detail-hero-icon-fallback')
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
    : (
      <div className={`food-detail-hero food-detail-hero-icon ${item.tone}`}>
        {getCategoryIcon(item.category)}
      </div>
    )

  return (
    <Modal onClose={onClose}>
      <div className="food-detail-modal">
        {hero}
        <span className="eyebrow">{item.category}</span>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <strong className="detail-price">{money(item.price)}</strong>
        <label className="addon-select">
          Add-on
          <select value={selectedAddon} onChange={(event) => setSelectedAddon(event.target.value)}>
            <option value="">No add-on</option>
            {addons.map((option) => (
              <option key={option.name} value={option.name}>{option.name} (+{money(option.price)})</option>
            ))}
          </select>
        </label>
        <div className="detail-controls">
          <div className="quantity-control">
            <button onClick={() => setQuantity((current) => Math.max(1, current - 1))}>&#x2212;</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((current) => current + 1)}>&#xFF0B;</button>
          </div>
          <button className="button button-dark" onClick={addItem}>
            Add to cart &middot; {money((item.price + (addon?.price || 0)) * quantity)}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Menu Form — admin only, Firebase Storage image upload ─────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES      = 4 * 1024 * 1024 // 4 MB

function MenuForm({ dialog, onClose, setMenu, notify }) {
  const { role, updateMenuItem, addMenuItem } = useApp()
  const isAdmin = role === 'Admin'

  const item = dialog.item || {
    name: '', category: 'Silog Meals', price: '', description: '',
    emoji: '\uD83C\uDF7D\uFE0F', tone: 'moss', available: true, image: null,
  }

  // preview  = what the user sees (data URL while selecting, then the real URL after upload)
  // imageFile = the raw File object waiting to be uploaded
  // imageUrl  = the final Firebase Storage URL (or the existing URL when editing)
  const [preview,   setPreview]   = useState(item.image || null)
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl,  setImageUrl]  = useState(item.image || null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [compressing, setCompressing] = useState(false)

  const fileInputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      notify('Only JPEG, PNG, WebP, or GIF images are allowed.', { icon: 'error', title: 'Invalid file type' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      notify('Image must be smaller than 4 MB.', { icon: 'error', title: 'File too large' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    // Show local preview immediately; keep the File for upload on submit
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    setImageFile(file)
  }

  function removeImage() {
    setPreview(null)
    setImageFile(null)
    setImageUrl(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit(event) {
    event.preventDefault()
    const form        = new FormData(event.currentTarget)
    const name        = String(form.get('name')).trim()
    const description = String(form.get('description')).trim()
    const price       = Number(form.get('price'))

    if (name.length < 2 || name.length > 80) {
      return notify('Food name must be 2 to 80 characters.', { icon: 'error', title: 'Check your input' })
    }
    if (description.length < 10 || description.length > 300) {
      return notify('Description must be between 10 and 300 characters.', { icon: 'error', title: 'Check your input' })
    }
    if (!Number.isFinite(price) || price < 1 || price > 1000000) {
      return notify('Price must be between ₱1 and ₱1,000,000.', { icon: 'error', title: 'Check your input' })
    }

    setSaving(true)
    let finalImageUrl = imageUrl // keep existing URL if no new file chosen

    // ── Upload new image to Firebase Storage ─────────────────────────────────
    if (imageFile) {
      try {
        setCompressing(true)
        setUploading(false)
        setProgress(0)
        const tempId = item.id || `new_${Date.now()}`

        // If replacing an existing image, delete the old one from Storage
        if (item.image && item.image.startsWith('https://')) {
          deleteMenuImage(item.image).catch(() => {})
        }

        // uploadMenuImage compresses internally before uploading
        setCompressing(false)
        setUploading(true)

        finalImageUrl = await uploadMenuImage(imageFile, tempId, (pct) => {
          setProgress(pct)
        })
        setImageUrl(finalImageUrl)
        setUploading(false)
      } catch (err) {
        setCompressing(false)
        setUploading(false)
        setSaving(false)
        return notify(
          `Image upload failed: ${err.message}. Check your Firebase Storage rules and try again.`,
          { icon: 'error', title: 'Upload failed' },
        )
      }
    }

    const values = {
      name,
      category: form.get('category'),
      price,
      description,
      image: finalImageUrl || null,
    }

    if (dialog.item) {
      // Edit existing — updateMenuItem writes local state + Firebase RTDB + MySQL
      updateMenuItem(item.id, values)
    } else {
      // Add new — addMenuItem writes local state + Firebase RTDB + MySQL
      const newId = Date.now() // unique numeric ID
      addMenuItem({
        ...values,
        id:        newId,
        emoji:     '\uD83C\uDF7D\uFE0F',
        tone:      'moss',
        available: true,
      })
    }

    setSaving(false)
    notify(dialog.item ? 'Menu item updated' : 'Menu item added', { icon: 'success', title: 'Saved' })
    onClose()
  }

  const isBusy = uploading || saving || compressing

  return (
    <Modal onClose={onClose}>
      <form className="form-modal" onSubmit={submit}>
        <span className="eyebrow">MENU MANAGEMENT</span>
        <h2>{dialog.item ? 'Edit menu item' : 'Add something delicious'}</h2>

        <label>
          Food name
          <input
            name="name"
            defaultValue={item.name}
            minLength="2"
            maxLength="80"
            placeholder="e.g. Lechon Kawali Silog"
            required
            disabled={isBusy}
          />
        </label>

        <div className="form-two">
          <label>
            Category
            <select name="category" defaultValue={item.category} required disabled={isBusy}>
              {['Silog Meals', 'Solo Orders', 'Ulam + Kanin', 'Extras', 'Cold Drinks', 'Hot Drinks', 'Desserts'].map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <label>
            Price (₱)
            <input
              name="price"
              type="number"
              min="1"
              max="1000000"
              step="0.01"
              defaultValue={item.price}
              placeholder="0.00"
              required
              disabled={isBusy}
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            name="description"
            defaultValue={item.description}
            rows="3"
            minLength="10"
            maxLength="300"
            placeholder="Brief description of this dish (10–300 characters)"
            required
            disabled={isBusy}
          />
        </label>

        {/* ── Photo upload — Admin only ── */}
        {isAdmin && (
          <div className="menu-photo-upload">
            <span className="upload-label">
              Photo <span className="optional-label">(optional · JPEG / PNG / WebP · max 4 MB)</span>
            </span>

            {preview ? (
              <div className="upload-preview">
                <img src={preview} alt="Menu item preview" className="upload-preview-img" />

                {/* Upload progress bar */}
                {uploading && (
                  <div className="upload-progress-wrap">
                    <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
                    <span className="upload-progress-label">Uploading… {progress}%</span>
                  </div>
                )}
                {compressing && (
                  <div className="upload-progress-wrap">
                    <div className="upload-progress-bar" style={{ width: '100%', opacity: 0.6, animation: 'pulse-bar 1s infinite' }} />
                    <span className="upload-progress-label">Compressing…</span>
                  </div>
                )}

                {!uploading && (
                  <div className="upload-preview-actions">
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                    >
                      ↻ Change photo
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={removeImage}
                      disabled={isBusy}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload photo"
                disabled={isBusy}
              >
                <span className="upload-icon">📷</span>
                <strong>Click to upload photo</strong>
                <small>JPEG, PNG, WebP or GIF · max 4 MB · stored in Firebase Storage</small>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="button button-dark" disabled={isBusy}>
            {compressing ? 'Compressing…' : uploading ? `Uploading ${progress}%…` : saving ? 'Saving…' : 'Save item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function StaffForm({ dialog, onClose, setStaff, notify }) {
  const staffMember = dialog.staff || { name: '', role: 'Service crew', contact: '' }

  const nameF    = useField(staffMember.name,    rules.name('Staff name'))
  const contactF = useField(staffMember.contact || '', (v) => {
    if (!v) return null // optional
    const validPhone = /^(?:\+?63|0)[ -]?9(?:[ -]?\d){9}$/.test(v)
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    if (!validPhone && !validEmail)
      return 'Enter a valid phone number (+63 917…) or email address.'
    return null
  })
  const form = useForm({ nameF })

  function submit(e) {
    e.preventDefault()
    nameF.forceTouch()
    contactF.forceTouch()
    if (!form.isValid || (contactF.value && contactF.error)) return

    const updates = { name: nameF.value.trim(), role: new FormData(e.currentTarget).get('role'), contact: contactF.value.trim() }
    if (dialog.staff) {
      setStaff((current) => current.map((person) => person.id === dialog.staff.id ? { ...person, ...updates } : person))
    } else {
      setStaff((current) => [...current, { ...updates, id: `ST-${String(22 + current.length).padStart(3, '0')}`, status: 'Offline', time: '\u2014' }])
    }
    notify(dialog.staff ? `${updates.name} profile updated` : `${updates.name} added to the team`, { icon: 'success', title: 'Saved' })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <form className="form-modal" onSubmit={submit} noValidate>
        <span className="eyebrow">TEAM MANAGEMENT</span>
        <h2>{dialog.staff ? 'Edit staff profile' : 'Add a team member'}</h2>

        <label>
          Full name
          <input
            value={nameF.value}
            onChange={nameF.onChange}
            onBlur={nameF.onBlur}
            className={fieldClass(nameF)}
            minLength={2}
            maxLength={80}
            placeholder="e.g. Juan dela Cruz"
            required
          />
          <FieldError field={nameF} label="Full name" />
        </label>

        <label>
          Contact <span className="optional-label">(phone or email)</span>
          <input
            type="text"
            value={contactF.value}
            onChange={contactF.onChange}
            onBlur={contactF.onBlur}
            className={fieldClass(contactF)}
            maxLength={254}
            placeholder="+63 917 555 0142 or staff@email.com"
          />
          <FieldError field={contactF} label="Contact" />
        </label>

        <label>
          Position
          <select name="role" defaultValue={staffMember.role} required>
            <option>Admin</option>
            <option>Manager</option>
            <option>Head chef</option>
            <option>Service crew</option>
            <option>Staff</option>
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-dark">{dialog.staff ? 'Save profile' : 'Add member'}</button>
        </div>
      </form>
    </Modal>
  )
}

function RewardForm({ dialog, onClose, setRewards, notify }) {
  const reward = dialog.reward || { name: '', description: '', points: 100 }

  function submit(event) {
    event.preventDefault()
    const form        = new FormData(event.currentTarget)
    const name        = String(form.get('name')).trim()
    const description = String(form.get('description')).trim()
    const points      = Number(form.get('points'))

    if (name.length < 2 || name.length > 80) {
      return notify('Reward name must be 2 to 80 characters.', { icon: 'error', title: 'Check your input' })
    }
    if (description.length < 5 || description.length > 250) {
      return notify('Description must be 5 to 250 characters.', { icon: 'error', title: 'Check your input' })
    }
    if (!Number.isInteger(points) || points < 1 || points > 1000000) {
      return notify('Points must be a whole number between 1 and 1,000,000.', { icon: 'error', title: 'Check your input' })
    }

    const updates = { name, description, points, available: true }
    if (dialog.reward) {
      setRewards((current) => current.map((item) => item.id === reward.id ? { ...item, ...updates } : item))
    } else {
      setRewards((current) => [...current, { ...updates, id: Math.max(0, ...current.map((item) => item.id)) + 1 }])
    }
    notify(dialog.reward ? 'Reward updated' : 'Reward added')
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <form className="form-modal" onSubmit={submit}>
        <span className="eyebrow">LOYALTY REWARDS</span>
        <h2>{dialog.reward ? 'Edit reward' : 'Add reward'}</h2>
        <label>
          Reward name
          <input
            name="name"
            defaultValue={reward.name}
            minLength="2"
            maxLength="80"
            pattern="(?:\S.*\S|\S{2,})"
            title="Enter a name with at least 2 non-space characters."
            required
          />
        </label>
        <label>
          Description
          <input
            name="description"
            defaultValue={reward.description}
            minLength="5"
            maxLength="250"
            required
          />
        </label>
        <label>
          Points required
          <input
            name="points"
            type="number"
            min="1"
            max="1000000"
            step="1"
            defaultValue={reward.points}
            required
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-dark">Save reward</button>
        </div>
      </form>
    </Modal>
  )
}

function PromotionForm({ dialog, onClose, setPromotions, notify }) {
  const promotion = dialog.promotion || { name: '', detail: '', status: 'Scheduled' }

  function submit(event) {
    event.preventDefault()
    const form   = new FormData(event.currentTarget)
    const name   = String(form.get('name')).trim()
    const detail = String(form.get('detail')).trim()

    if (name.length < 2 || name.length > 80) {
      return notify('Promotion name must be 2 to 80 characters.', { icon: 'error', title: 'Check your input' })
    }
    if (detail.length < 5 || detail.length > 250) {
      return notify('Offer details must be 5 to 250 characters.', { icon: 'error', title: 'Check your input' })
    }

    const updates = { name, detail, status: String(form.get('status')) }
    if (dialog.promotion) {
      setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, ...updates } : item))
    } else {
      setPromotions((current) => [...current, { ...updates, id: Math.max(0, ...current.map((item) => item.id)) + 1 }])
    }
    notify(dialog.promotion ? 'Promotion updated' : 'Promotion added')
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <form className="form-modal" onSubmit={submit}>
        <span className="eyebrow">PROMOTION MANAGEMENT</span>
        <h2>{dialog.promotion ? 'Edit promotion' : 'Add promotion'}</h2>
        <label>
          Promotion name
          <input name="name" defaultValue={promotion.name} minLength="2" maxLength="80" required />
        </label>
        <label>
          Offer details
          <textarea name="detail" defaultValue={promotion.detail} minLength="5" maxLength="250" rows="3" required />
        </label>
        <label>
          Status
          <select name="status" defaultValue={promotion.status}>
            <option>Active</option>
            <option>Scheduled</option>
            <option>Paused</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-dark">Save promotion</button>
        </div>
      </form>
    </Modal>
  )
}
