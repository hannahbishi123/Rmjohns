import OverviewPage from '../OverviewPage'
import OrdersPage from '../OrdersPage'
import KitchenPage from '../KitchenPage'
import POSPage from '../POSPage'
import SalesPage from '../SalesPage'
import MenuPage from '../MenuPage'
import CustomersPage from '../CustomersPage'
import StaffPage from '../StaffPage'
import MonitoringPage from '../MonitoringPage'
import LoyaltyPage from '../LoyaltyPage'
import ReportsPage from '../ReportsPage'
import NotificationsPage from '../NotificationsPage'
import BillingPage from '../BillingPage'
import PaymentsPage from '../PaymentsPage'
import ProfilePage from '../ProfilePage'
import SettingsPage from '../SettingsPage'

const adminPages = {
  Overview: OverviewPage, Orders: OrdersPage, Kitchen: KitchenPage, POS: POSPage,
  Sales: SalesPage, Menu: MenuPage, Customers: CustomersPage, Staff: StaffPage,
  Monitoring: MonitoringPage, Loyalty: LoyaltyPage, Reports: ReportsPage,
  Notifications: NotificationsPage, Billing: BillingPage, Payments: PaymentsPage,
  Profile: ProfilePage, Settings: SettingsPage,
}

export default function AdminPages({ page }) {
  const Page = adminPages[page] || OverviewPage
  return <Page />
}
