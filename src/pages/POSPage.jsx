import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CartLine, FoodThumb } from '../components/shared'
import { money } from '../data/mockData'

export default function POSPage() {
  const { filteredMenu, categories, category, setCategory, query, setQuery, addToCart, cart, cartTotal, changeQuantity, cancelSale, paymentMethod, setPaymentMethod, completeSale, notify, confirmAction } = useApp()
  const [discountPercent, setDiscountPercent] = useState(0)
  const [amountTendered, setAmountTenderedValue] = useState('')
  const serviceCharge = Math.round(cartTotal * 0.05)
  const discount = Math.round(cartTotal * discountPercent / 100)
  const totalDue = Math.max(0, cartTotal + serviceCharge - discount)
  function setAmountTendered(value) {
    const amount = Number(value)
    if (value && (!Number.isFinite(amount) || amount < 0 || amount > 10000000)) {
      return notify('Amount tendered must be between 0 and 10,000,000.', { icon: 'error', title: 'Check the amount tendered' })
    }
    setAmountTenderedValue(value)
  }
  function finishTransaction() {
    if (paymentMethod === 'Cash' && cart.length) {
      const received = Number(amountTendered)
      if (!amountTendered.trim() || !Number.isFinite(received) || received < 0 || received > 10000000) {
        return notify('Enter an amount from 0 to 10,000,000.', { icon: 'error', title: 'Check the amount tendered' })
      }
    }
    const completed = completeSale({ discount: discountPercent, amountTendered: Number(amountTendered) })
    if (!completed) return
    setAmountTendered('')
    setDiscountPercent(0)
  }
  async function handleCancelSale() {
    if (!cart.length) return cancelSale() // will show "no active transaction" notify
    const result = await confirmAction({
      title: 'Cancel this transaction?',
      text: 'The current order will be voided and all items cleared.',
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'Keep order',
      icon: 'warning',
    })
    if (result.isConfirmed) cancelSale()
  }
  return <div className="pos-layout"><section className="pos-catalog"><div className="menu-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a menu item..." /></div></div><div className="category-pills pos-categories">{categories.map((item) => <button key={item} className={category === item ? 'category-pill selected' : 'category-pill'} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="food-grid pos-food-grid">{filteredMenu.filter((item) => item.available).map((item) => <button className="pos-product" key={item.id} onClick={() => addToCart(item)}><FoodThumb item={item} small /><span><strong>{item.name}</strong><small>{money(item.price)}</small></span><i>＋</i></button>)}</div></section><aside className="panel ticket-panel"><div className="ticket-head"><div><span className="eyebrow">NEW TRANSACTION</span><h2>Current order</h2></div><button className="text-button" onClick={handleCancelSale}>Cancel transaction</button></div><div className="ticket-items">{cart.length ? cart.map((item) => <CartLine key={item.id} item={item} changeQuantity={changeQuantity} />) : <div className="ticket-empty"><span>＋</span><strong>Start a new order</strong><small>Choose items from the menu</small></div>}</div><div className="ticket-options"><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>GCash</option><option>Maya</option><option>Card</option><option>QR Payment</option><option>Other</option></select></label><label>Discount<select value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))}><option value="0">No discount</option><option value="5">5% demo discount</option><option value="10">10% demo discount</option><option value="20">20% demo discount</option></select></label><div className="ticket-total"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><div className="ticket-total"><span>Service charge <small>5%</small></span><strong>{money(serviceCharge)}</strong></div>{discount > 0 && <div className="ticket-total"><span>Discount · {discountPercent}%</span><strong>−{money(discount)}</strong></div>}<div className="ticket-total total"><span>Total due</span><strong>{money(totalDue)}</strong></div>{paymentMethod === 'Cash' && <label>Amount tendered<input type="number" min="0" value={amountTendered} onChange={(event) => setAmountTendered(event.target.value)} placeholder="Enter cash received" /></label>}{paymentMethod === 'Cash' && <div className="ticket-total"><span>Change</span><strong>{money(Math.max(0, Number(amountTendered) - totalDue))}</strong></div>}<button className="button button-dark complete-button" onClick={finishTransaction}>Complete transaction <span>→</span></button></div></aside></div>
}