import POSPage from '../POSPage'
import OrdersPage from '../OrdersPage'
import PaymentsPage from '../PaymentsPage'
import BillingPage from '../BillingPage'
import AttendancePage from '../AttendancePage'
import ProfilePage from '../ProfilePage'

const cashierPages = { POS: POSPage, Orders: OrdersPage, Payments: PaymentsPage, Billing: BillingPage, Attendance: AttendancePage, Profile: ProfilePage }

export default function CashierPages({ page }) {
  const Page = cashierPages[page] || POSPage
  return <Page />
}
