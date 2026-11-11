import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { money } from '../data/mockData'

export default function PaymentsPage() {
  const { orders, payments, paymentMethod, setPaymentMethod, recordPayment, notify } = useApp()
  const defaultOrder = orders.find((order) => order.payment !== 'Paid') || orders[0]
  const [selectedOrderId, setSelectedOrderId] = useState(defaultOrder?.id || '')
  const [amountPaid, setAmountPaidValue] = useState(String(defaultOrder?.total || 0))
  const selectedOrder = orders.find((order) => order.id === selectedOrderId)
  const due = selectedOrder?.total || 0
  const change = Math.max(0, Number(amountPaid) - due)
  function chooseOrder(id) {
    setSelectedOrderId(id)
    setAmountPaidValue(String(orders.find((order) => order.id === id)?.total || 0))
  }
  function setAmountPaid(value) {
    const amount = Number(value)
    if (value && (!Number.isFinite(amount) || amount < 0 || amount > 10000000)) {
      return notify('Amount received must be between 0 and 10,000,000.', { icon: 'error', title: 'Check your payment' })
    }
    setAmountPaidValue(value)
  }
  function submit(status = 'Paid') {
    if (!selectedOrder) return notify('Select an order before recording payment.', { icon: 'error', title: 'Check your payment' })
    const received = Number(amountPaid)
    if (!amountPaid.trim()) return notify('Enter the amount received.', { icon: 'error', title: 'Check your payment' })
    if (!Number.isFinite(received) || received < 0 || received > 10000000) return notify('Amount received must be between 0 and 10,000,000.', { icon: 'error', title: 'Check your payment' })
    if (status === 'Paid' && received < due) return notify('Amount received must cover the order total.', { icon: 'error', title: 'Insufficient payment' })
    recordPayment(selectedOrderId, paymentMethod, status === 'Paid' ? due : received, status, received)
  }
  return <div className="billing-grid"><section className="panel payment-panel"><div className="eyebrow">UNIFIED PAYMENT · SIMULATION</div><h2>Take a payment</h2><p className="form-description">Payments are linked to demo orders; no gateway or money movement is connected.</p><label>Order<select value={selectedOrderId} onChange={(event) => chooseOrder(event.target.value)}>{orders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.customer} · {money(order.total)}</option>)}</select></label><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>GCash</option><option>Maya</option><option>Card</option><option>QR Payment</option><option>Other</option></select></label><div className="payment-methods">{['Cash', 'GCash', 'Maya', 'Card', 'QR Payment', 'Other'].map((method) => <button key={method} onClick={() => setPaymentMethod(method)} className={paymentMethod === method ? 'method-option selected' : 'method-option'}><span>{method}</span></button>)}</div><div className="checkout-total grand"><span>Order total</span><strong>{money(due)}</strong></div><label>Amount received<input type="number" min="0" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} /></label>{paymentMethod === 'Cash' && <div className="checkout-total"><span>Change</span><strong>{money(change)}</strong></div>}<div className="modal-actions payment-actions"><button className="button button-outline" onClick={() => submit('Cancelled')}>Cancel payment</button><button className="button button-outline" onClick={() => submit('Failed')}>Mark failed</button><button className="button button-dark" onClick={() => submit('Paid')}>Confirm payment</button></div><p className="secure-note">Payment confirmation changes the linked order and creates a local payment record.</p></section><section className="panel full-panel"><div className="panel-heading"><div><h2>Payment records</h2><p>Mock transaction references · linked to orders</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>REFERENCE</th><th>ORDER</th><th>METHOD</th><th>AMOUNT</th><th>TENDER</th><th>CHANGE</th><th>STATUS</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.reference}</strong></td><td>{payment.orderId}</td><td>{payment.method}</td><td>{money(payment.amount)}</td><td>{money(payment.amountPaid ?? payment.amount)}</td><td>{money(payment.change || 0)}</td><td><span className={`status-badge ${payment.status.toLowerCase()}`}><i />{payment.status}</span></td></tr>)}</tbody></table></div></section></div>
}