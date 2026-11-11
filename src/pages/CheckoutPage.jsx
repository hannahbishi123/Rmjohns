import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'
import { FoodThumb } from '../components/shared'
import { useField, useForm, FieldError, fieldClass, rules } from '../lib/validation'

// ── Reservation sub-panel ─────────────────────────────────────────────────────
function ReservationPanel() {
  const { reservation, setReservation, confirmAction, notify } = useApp()

  const today   = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const dateF   = useField(reservation?.date  || minDate, (v) => {
    if (!v) return 'Date is required.'
    const d = new Date(`${v}T00:00:00`)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    if (isNaN(d.getTime()) || d < t) return 'Choose today or a future date.'
    return null
  })
  const timeF   = useField(reservation?.time  || '18:00', (v) => {
    if (!v) return 'Time is required.'
    if (!/^\d{2}:\d{2}$/.test(v)) return 'Enter a valid time.'
    return null
  })
  const guestsF = useField(String(reservation?.guests || 2), (v) => {
    const n = Number(v)
    if (!v) return 'Guest count is required.'
    if (!Number.isInteger(n) || n < 1 || n > 20) return 'Enter a whole number from 1 to 20.'
    return null
  })
  const form = useForm({ dateF, timeF, guestsF })

  function saveReservation(e) {
    e.preventDefault()
    dateF.forceTouch(); timeF.forceTouch(); guestsF.forceTouch()
    if (!form.isValid) return
    setReservation({ date: dateF.value, time: timeF.value, guests: Number(guestsF.value), status: 'Confirmed' })
    notify(reservation ? 'Reservation updated' : 'Reservation confirmed', { icon: 'success', title: 'Done' })
  }

  async function cancelReservation() {
    const result = await confirmAction({
      title: 'Cancel reservation?',
      text:  'Your reservation details will remain with a cancelled status.',
      confirmButtonText: 'Cancel reservation',
      cancelButtonText:  'Keep reservation',
    })
    if (!result.isConfirmed) return
    setReservation((current) => current ? { ...current, status: 'Cancelled' } : current)
    notify('Reservation cancelled', { icon: 'info', title: 'Reservation updated' })
  }

  return (
    <section className="panel reservation-panel">
      <div className="panel-heading">
        <div>
          <h2>Your reservation</h2>
          <p>Choose a date, time, and party size.</p>
        </div>
        <span className={`reservation-status ${reservation?.status === 'Cancelled' ? 'cancelled' : reservation ? 'confirmed' : 'not-booked'}`}>
          {reservation?.status || 'Not booked'}
        </span>
      </div>

      <form className="reservation-fields" onSubmit={saveReservation} noValidate>
        <label>
          Date
          <input
            type="date"
            min={minDate}
            value={dateF.value}
            onChange={dateF.onChange}
            onBlur={dateF.onBlur}
            className={fieldClass(dateF)}
            required
          />
          <FieldError field={dateF} label="Date" />
        </label>

        <label>
          Time
          <input
            type="time"
            value={timeF.value}
            onChange={timeF.onChange}
            onBlur={timeF.onBlur}
            className={fieldClass(timeF)}
            required
          />
          <FieldError field={timeF} label="Time" />
        </label>

        <label>
          Number of guests
          <input
            type="number"
            min="1"
            max="20"
            value={guestsF.value}
            onChange={guestsF.onChange}
            onBlur={guestsF.onBlur}
            className={fieldClass(guestsF)}
            required
          />
          <FieldError field={guestsF} label="Guests" />
        </label>

        <div className="reservation-actions">
          <button className="button button-dark" type="submit">
            {reservation ? 'Save changes' : 'Book reservation'}
          </button>
          {reservation && reservation.status !== 'Cancelled' && (
            <button className="button button-outline" type="button" onClick={cancelReservation}>
              Cancel reservation
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

// ── Main checkout page ────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { cart, cartTotal, paymentMethod, setPaymentMethod, placeOrder, navigate, checkoutInfo, setCheckoutInfo, notify } = useApp()
  const [activeSection, setActiveSection] = useState('pickup')

  // ── Live-validated fields ─────────────────────────────────────────────────
  const customerName = useField(checkoutInfo.customer || '', rules.name('Your name'))
  const notesF       = useField(checkoutInfo.notes   || '', rules.notes)
  const form         = useForm({ customerName })

  // Keep checkoutInfo in sync while user types
  function handleNameChange(e) {
    customerName.onChange(e)
    setCheckoutInfo((current) => ({ ...current, customer: e.target.value.slice(0, 80) }))
  }
  function handleNotesChange(e) {
    notesF.onChange(e)
    setCheckoutInfo((current) => ({ ...current, notes: e.target.value.slice(0, 500) }))
  }

  const sectionTabs = (
    <div className="pickup-section-tabs">
      <strong>Pickup</strong>
      <div className="pickup-subtabs" role="tablist" aria-label="Pickup options">
        <button type="button" role="tab"
          aria-selected={activeSection === 'pickup'}
          className={activeSection === 'pickup' ? 'active' : ''}
          onClick={() => setActiveSection('pickup')}>
          Pickup order
        </button>
        <button type="button" role="tab"
          aria-selected={activeSection === 'reservation'}
          className={activeSection === 'reservation' ? 'active' : ''}
          onClick={() => setActiveSection('reservation')}>
          Reservation
        </button>
      </div>
    </div>
  )

  if (activeSection === 'reservation') {
    return <div className="pickup-section">{sectionTabs}<ReservationPanel /></div>
  }

  if (!cart.length) {
    return (
      <div className="pickup-section">
        {sectionTabs}
        <section className="panel empty-cart">
          <div className="empty-cart-mark">＋</div>
          <h2>Your order is waiting</h2>
          <p>Add something from the menu before checkout.</p>
          <button className="button button-dark" onClick={() => navigate('Menu')}>
            Explore menu <span>→</span>
          </button>
        </section>
      </div>
    )
  }

  function submit(e) {
    e.preventDefault()
    customerName.forceTouch()
    notesF.forceTouch()
    if (!form.isValid || (notesF.value && notesF.error)) return
    placeOrder()
  }

  const notesLength = notesF.value.length
  const notesNearLimit = notesLength > 450

  return (
    <div className="pickup-section">
      {sectionTabs}
      <div className="checkout-layout">

        {/* ── Order summary ── */}
        <section className="panel cart-panel">
          <div className="panel-heading">
            <div>
              <h2>Order summary</h2>
              <p>{cart.reduce((n, item) => n + item.quantity, 0)} items</p>
            </div>
            <button className="text-button" onClick={() => navigate('Cart')}>Edit cart</button>
          </div>
          {cart.map((item) => (
            <div className="cart-line" key={item.id}>
              <FoodThumb item={item} small />
              <div className="cart-line-info">
                <strong>{item.quantity} × {item.name}</strong>
                <small>{money(item.price)} each</small>
              </div>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
        </section>

        {/* ── Checkout form ── */}
        <form className="panel checkout-panel" onSubmit={submit} noValidate>
          <div className="eyebrow">CHECKOUT</div>
          <h2>Almost yours.</h2>

          <div className="checkout-fields">
            {/* Customer name */}
            <label>
              Your name
              <input
                value={customerName.value}
                onChange={handleNameChange}
                onBlur={customerName.onBlur}
                className={fieldClass(customerName)}
                placeholder="Name for the order"
                maxLength={80}
                required
              />
              <FieldError field={customerName} label="Your name" />
            </label>

            {/* Order type */}
            <label>
              Order type
              <select
                value={checkoutInfo.orderType}
                onChange={(e) => setCheckoutInfo((c) => ({ ...c, orderType: e.target.value }))}
              >
                <option>Pickup</option>
              </select>
            </label>

            {/* Payment method */}
            <label>
              Payment method
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option>Cash</option>
                <option>GCash</option>
                <option>Maya</option>
                <option>Card</option>
                <option>QR Payment</option>
                <option>Other</option>
              </select>
            </label>

            {/* Notes */}
            <label>
              Order notes
              <textarea
                value={notesF.value}
                onChange={handleNotesChange}
                onBlur={notesF.onBlur}
                className={fieldClass(notesF)}
                placeholder="Anything we should know?"
                rows={2}
                maxLength={500}
              />
              <div className={`v-counter${notesNearLimit ? ' v-counter-warn' : ''}`}>
                {notesLength}/500
              </div>
              <FieldError field={notesF} label="Notes" />
            </label>
          </div>

          {/* Totals */}
          <div className="checkout-total">
            <span>Subtotal</span><strong>{money(cartTotal)}</strong>
          </div>
          <div className="checkout-total">
            <span>Service charge</span><strong>{money(Math.round(cartTotal * 0.05))}</strong>
          </div>
          <div className="checkout-total grand">
            <span>Total</span><strong>{money(Math.round(cartTotal * 1.05))}</strong>
          </div>

          <button type="submit" className="button button-dark complete-button">
            Place order <span>→</span>
          </button>
          <p className="secure-note">Demo checkout · no payment is processed</p>
        </form>
      </div>
    </div>
  )
}
