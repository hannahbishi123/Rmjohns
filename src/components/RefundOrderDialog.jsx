import { useState, useId } from 'react'
import { Modal } from './shared'
import { RmjSwal } from '../lib/swal'
import { money } from '../data/mockData'
import './RefundOrderDialog.css'

export default function RefundOrderDialog({ order, payments = [], refundOrder, onClose, notify }) {
  const matchingPayment = payments.find((entry) => entry.orderId === order?.id)
  const originalTotal = Number(order?.total ?? matchingPayment?.amount ?? 0)
  const paymentMethod = order?.paymentMethod || matchingPayment?.method || 'Cash'
  const paymentStatus = matchingPayment?.status || order?.payment || 'Paid'

  const [refundAmount, setRefundAmount] = useState(originalTotal || 0)
  const [reason, setReason] = useState('Customer request')
  const [customReason, setCustomReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountInputId = useId()
  const reasonSelectId = useId()

  async function handleConfirmRefund(e) {
    if (e) e.preventDefault()
    if (isSubmitting) return

    const amountNum = parseFloat(refundAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid refund amount greater than ₱0.')
      return
    }
    if (amountNum > originalTotal) {
      setErrorMsg(`Refund amount cannot exceed the original total of ₱${originalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`)
      return
    }

    if (reason === 'Other' && !customReason.trim()) {
      setErrorMsg('Please specify a description for "Other" refund reason.')
      return
    }

    const finalReason = reason === 'Other'
      ? customReason.trim()
      : (customReason.trim() ? `${reason} (${customReason.trim()})` : reason)

    setErrorMsg('')
    setIsSubmitting(true)

    try {
      // 1. Record the refund immediately - NO SECOND CONFIRMATION POPUP
      await refundOrder(order.id, amountNum, finalReason)

      // 2. Close the refund modal first
      onClose()

      // 3. Show centered SweetAlert2 success notification ONLY after successful recording
      await RmjSwal.fire({
        position: 'top',
        icon: 'success',
        title: 'Refund Successfully Recorded',
        html: `
          <div style="font-family: inherit; font-size: 14px; color: #4A5A50; line-height: 1.6; margin-top: 6px;">
            Order <strong style="color: #1B3B2B;">${order.id}</strong> has been marked as refunded.
            <div style="margin: 14px 0 10px; padding: 12px 16px; background: #FFFFFF; border: 1.5px solid #DCE3CE; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #5A6B60; font-weight: 500;">Refunded Amount</span>
              <strong style="font-size: 18px; color: #1B3B2B; font-weight: 700;">₱${amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style="font-size: 12.5px; color: #5A6B60; text-align: left; background: #F1F5EB; padding: 8px 12px; border-radius: 8px;">
              <span style="font-weight: 600; color: #1B3B2B;">Reason:</span> ${finalReason}
            </div>
          </div>
        `,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: 'Done',
        confirmButtonColor: '#1B3B2B',
      })
    } catch (err) {
      // If refund fails: keep modal open and display descriptive error SweetAlert
      setIsSubmitting(false)
      await RmjSwal.fire({
        position: 'top',
        icon: 'error',
        title: 'Refund Failed',
        text: err.message || 'Unable to record refund. Please try again.',
        confirmButtonText: 'Okay',
        confirmButtonColor: '#1B3B2B',
      })
    }
  }

  return (
    <Modal onClose={isSubmitting ? () => {} : onClose}>
      <div className="rmj-refund-modal">
        {/* Header */}
        <div className="rmj-refund-header">
          <div className="rmj-refund-icon-badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </div>
          <div className="rmj-refund-title-wrap">
            <h2 className="rmj-refund-title">Process Refund</h2>
            <p className="rmj-refund-subtitle">Review order details and record transaction refund</p>
          </div>
        </div>

        {/* Order Information Card */}
        <div className="rmj-refund-card">
          <div className="rmj-refund-info-grid">
            <div className="rmj-refund-info-row">
              <span className="rmj-refund-info-label">Order ID</span>
              <span className="rmj-refund-badge-order">{order?.id}</span>
            </div>
            {order?.customer && (
              <div className="rmj-refund-info-row">
                <span className="rmj-refund-info-label">Customer</span>
                <span className="rmj-refund-info-value">{order.customer}</span>
              </div>
            )}
            <div className="rmj-refund-info-row">
              <span className="rmj-refund-info-label">Original Payment</span>
              <div className="rmj-refund-payment-pill">
                <span className="rmj-refund-payment-method">{paymentMethod}</span>
                <span className={`rmj-refund-status-tag ${paymentStatus.toLowerCase()}`}>{paymentStatus}</span>
              </div>
            </div>
            <div className="rmj-refund-info-row">
              <span className="rmj-refund-info-label">Order Total</span>
              <span className="rmj-refund-info-value font-semibold">
                ₱{originalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Refund Amount Input */}
          <div className="rmj-refund-amount-group">
            <div className="rmj-refund-amount-header">
              <label htmlFor={amountInputId} className="rmj-refund-field-label">Refund Amount</label>
              {Number(refundAmount) !== originalTotal && (
                <button
                  type="button"
                  className="rmj-refund-quick-btn"
                  onClick={() => setRefundAmount(originalTotal)}
                  disabled={isSubmitting}
                >
                  Full Refund (₱{originalTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                </button>
              )}
            </div>
            <div className="rmj-refund-input-wrap">
              <span className="rmj-refund-currency" aria-hidden="true">₱</span>
              <input
                id={amountInputId}
                type="number"
                step="0.01"
                min="1"
                max={originalTotal}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="rmj-refund-input"
                disabled={isSubmitting}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total to Refund Highlight Box */}
          <div className="rmj-refund-summary-box">
            <div className="rmj-refund-summary-left">
              <span className="rmj-refund-summary-label">Total to Refund</span>
              <span className="rmj-refund-summary-sub">Recorded in payment ledger</span>
            </div>
            <div className="rmj-refund-summary-amount">
              ₱{(Number(refundAmount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Refund Reason Form */}
        <div className="rmj-refund-reason-section">
          <label htmlFor={reasonSelectId} className="rmj-refund-field-label">
            Refund Reason <span className="rmj-required">*</span>
          </label>
          <select
            id={reasonSelectId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rmj-refund-select"
            disabled={isSubmitting}
          >
            <option value="Customer request">Customer request</option>
            <option value="Order cancellation">Order cancellation</option>
            <option value="Wrong item prepared">Wrong item prepared</option>
            <option value="Food quality / kitchen issue">Food quality / kitchen issue</option>
            <option value="Duplicate transaction">Duplicate transaction</option>
            <option value="Out of stock / unavailable item">Out of stock / unavailable item</option>
            <option value="Other">Other reason (specify details below)</option>
          </select>

          <div className="rmj-refund-details-wrap">
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={reason === 'Other' ? 'Enter required reason details...' : 'Additional notes or remarks (optional)...'}
              className="rmj-refund-text-input"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="rmj-refund-error-banner" role="alert">
            <span className="rmj-refund-error-icon" aria-hidden="true">!</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="rmj-refund-actions">
          <button
            type="button"
            className="rmj-refund-btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rmj-refund-btn-confirm"
            onClick={handleConfirmRefund}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="rmj-refund-spinner" aria-hidden="true"></span>
                <span>Processing Refund...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>Confirm Refund</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
