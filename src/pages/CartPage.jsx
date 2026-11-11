import { useApp } from '../context/AppContext'
import { CartLine } from '../components/shared'
import { money } from '../data/mockData'

export default function CartPage() {
  const { cart, cartTotal, changeQuantity, clearCart, navigate, confirmAction } = useApp()

  async function handleClearCart() {
    const result = await confirmAction({
      title: 'Clear your cart?',
      text: 'All items will be removed from your order.',
      confirmButtonText: 'Yes, clear cart',
      cancelButtonText: 'Keep items',
      icon: 'warning',
    })
    if (result.isConfirmed) clearCart()
  }
  if (!cart.length) return <section className="panel empty-cart"><div className="empty-cart-mark">＋</div><h2>Your cart is taking a little break</h2><p>Explore the menu and add something delicious.</p><button className="button button-dark" onClick={() => navigate('Menu')}>Explore menu <span>→</span></button></section>
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0)

  return <div className="cart-page">
    <section className="panel cart-items-panel" aria-labelledby="cart-items-heading">
      <header className="cart-items-heading">
        <div>
          <h2 id="cart-items-heading">Your order</h2>
          <p>{itemCount} {itemCount === 1 ? 'item' : 'items'}, made fresh to order</p>
        </div>
        <div className="cart-actions">
          <button type="button" className="text-button" onClick={() => navigate('Menu')}>＋ Add more</button>
          <button type="button" className="text-button" onClick={handleClearCart}>Clear cart</button>
        </div>
      </header>
      <div className="cart-item-list">
        {cart.map((item) => <CartLine key={item.id} item={item} changeQuantity={changeQuantity} />)}
      </div>
    </section>
    <aside className="panel cart-summary" aria-labelledby="cart-summary-heading">
      <h2 id="cart-summary-heading">Order summary</h2>
      <div className="cart-summary-subtotal"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div>
      <button type="button" className="button button-dark cart-checkout-button" onClick={() => navigate('Checkout')}>Proceed to checkout <span>→</span></button>
    </aside>
  </div>
}