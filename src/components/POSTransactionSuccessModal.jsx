import './POSTransactionSuccessModal.css'

export default function POSTransactionSuccessModal({ transaction, onClose }) {
  if (!transaction) return null

  const {
    orderId = '—',
    customer = 'Walk-in guest',
    totalPaid = 0,
    paymentMethod = 'Cash',
    cashTendered = 0,
    change = 0,
  } = transaction

  const isCash = String(paymentMethod).toLowerCase() === 'cash'
  const formattedTotal = Number(totalPaid || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const formattedTendered = Number(cashTendered || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const formattedChange = Number(change || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className="pos-success-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-success-modal-title"
    >
      <div
        className="pos-success-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Left Botanical Leaf */}
        <svg
          className="pos-success-leaf pos-success-leaf-tl"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-5 -5 C25 15, 45 45, 40 75 C30 50, 15 30, -5 -5 Z"
            fill="#7CA26E"
            fillOpacity="0.45"
          />
          <path
            d="M-10 15 C15 35, 48 40, 68 30 C45 25, 20 15, -10 15 Z"
            fill="#9ABF8C"
            fillOpacity="0.5"
          />
          <path
            d="M10 -10 C30 15, 35 48, 25 68 C20 45, 10 20, 10 -10 Z"
            fill="#5E8A50"
            fillOpacity="0.4"
          />
          <path
            d="M-5 -5 Q30 35 40 75"
            stroke="#95B887"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Top-Right Botanical Leaf */}
        <svg
          className="pos-success-leaf pos-success-leaf-tr"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M105 -5 C75 15, 55 45, 60 75 C70 50, 85 30, 105 -5 Z"
            fill="#7CA26E"
            fillOpacity="0.45"
          />
          <path
            d="M110 15 C85 35, 52 40, 32 30 C55 25, 80 15, 110 15 Z"
            fill="#9ABF8C"
            fillOpacity="0.5"
          />
          <path
            d="M90 -10 C70 15, 65 48, 75 68 C80 45, 90 20, 90 -10 Z"
            fill="#5E8A50"
            fillOpacity="0.4"
          />
          <path
            d="M105 -5 Q70 35 60 75"
            stroke="#95B887"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Bottom-Left Botanical Wave & Leaves */}
        <svg
          className="pos-success-leaf pos-success-leaf-bl"
          viewBox="0 0 110 90"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-10 95 Q35 70, 75 88 Q100 95, 115 90 L-10 95 Z"
            fill="#C8DBC0"
            fillOpacity="0.55"
          />
          <path
            d="M-5 95 Q30 55, 65 72 Q35 78, -5 95 Z"
            fill="#759E67"
            fillOpacity="0.45"
          />
          <path
            d="M5 95 C15 70, 35 48, 48 35 C42 55, 30 75, 5 95 Z"
            fill="#8EAF80"
            fillOpacity="0.55"
          />
          <path
            d="M-5 85 C22 80, 42 62, 58 45 C45 68, 25 80, -5 85 Z"
            fill="#5A854C"
            fillOpacity="0.45"
          />
        </svg>

        {/* Bottom-Right Botanical Wave & Leaves */}
        <svg
          className="pos-success-leaf pos-success-leaf-br"
          viewBox="0 0 110 90"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M120 95 Q75 70, 35 88 Q10 95, -5 90 L120 95 Z"
            fill="#C8DBC0"
            fillOpacity="0.55"
          />
          <path
            d="M115 95 Q80 55, 45 72 Q75 78, 115 95 Z"
            fill="#759E67"
            fillOpacity="0.45"
          />
          <path
            d="M105 95 C95 70, 75 48, 62 35 C68 55, 80 75, 105 95 Z"
            fill="#8EAF80"
            fillOpacity="0.55"
          />
          <path
            d="M115 85 C88 80, 68 62, 52 45 C65 68, 85 80, 115 85 Z"
            fill="#5A854C"
            fillOpacity="0.45"
          />
        </svg>

        {/* Header Section */}
        <div className="pos-success-header">
          {/* Checkmark with Burst Rays */}
          <div className="pos-success-icon-wrap" aria-hidden="true">
            {/* Left Rays */}
            <svg
              className="pos-success-burst-left"
              width="22"
              height="36"
              viewBox="0 0 22 36"
              fill="none"
            >
              <line
                x1="18"
                y1="6"
                x2="4"
                y2="3"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="18"
                x2="3"
                y2="18"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="18"
                y1="30"
                x2="4"
                y2="33"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>

            {/* Check Badge */}
            <div className="pos-success-check-badge">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Right Rays */}
            <svg
              className="pos-success-burst-right"
              width="22"
              height="36"
              viewBox="0 0 22 36"
              fill="none"
            >
              <line
                x1="4"
                y1="6"
                x2="18"
                y2="3"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="2"
                y1="18"
                x2="19"
                y2="18"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="30"
                x2="18"
                y2="33"
                stroke="#8FA847"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 id="pos-success-modal-title" className="pos-success-title">
            Transaction Completed!
          </h2>
          <p className="pos-success-subtitle">
            Your order has been successfully processed.
          </p>
        </div>

        {/* Transaction Information Card */}
        <div className="pos-success-info-card">
          {/* Order ID */}
          <div className="pos-success-row">
            <span className="pos-success-row-left">
              <span className="pos-success-icon" aria-hidden="true">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
                  <line x1="8" y1="8" x2="16" y2="8" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="8" y1="16" x2="13" y2="16" />
                </svg>
              </span>
              Order ID:
            </span>
            <span className="pos-success-row-value pos-success-order-id">
              {orderId}
            </span>
          </div>

          {/* Customer */}
          <div className="pos-success-row">
            <span className="pos-success-row-left">
              <span className="pos-success-icon" aria-hidden="true">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              Customer:
            </span>
            <span className="pos-success-row-value">{customer}</span>
          </div>

          {/* Total Paid */}
          <div className="pos-success-row">
            <span className="pos-success-row-left">
              <span className="pos-success-peso-icon" aria-hidden="true">
                ₱
              </span>
              Total Paid:
            </span>
            <span className="pos-success-row-value pos-success-total-paid">
              ₱{formattedTotal}
            </span>
          </div>

          {/* Payment Method */}
          <div className="pos-success-row">
            <span className="pos-success-row-left">
              <span className="pos-success-icon" aria-hidden="true">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              Payment Method:
            </span>
            <span className="pos-success-row-value">{paymentMethod}</span>
          </div>

          {/* Cash Transactions: Cash Tendered & Change */}
          {isCash && (
            <>
              <div className="pos-success-row">
                <span className="pos-success-row-left">
                  <span className="pos-success-icon" aria-hidden="true">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </span>
                  Cash Tendered:
                </span>
                <span className="pos-success-row-value pos-success-tendered">
                  ₱{formattedTendered}
                </span>
              </div>

              <div className="pos-success-row">
                <span className="pos-success-row-left">
                  <span className="pos-success-icon" aria-hidden="true">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
                    </svg>
                  </span>
                  Change:
                </span>
                <span className="pos-success-row-value pos-success-change">
                  ₱{formattedChange}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Button: ONLY ONE "Done" button */}
        <div className="pos-success-actions">
          <button
            type="button"
            className="pos-success-done-btn"
            onClick={onClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  )
}
