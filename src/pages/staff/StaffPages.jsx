// Staff Pages Router
import StaffDashboardPage from '../StaffDashboardPage'
import KitchenPage from '../KitchenPage'
import OrdersPage from '../OrdersPage'
import AttendancePage from '../AttendancePage'
import NotificationsPage from '../NotificationsPage'
import StaffProfilePage from '../StaffProfilePage'
import StaffMenuPage from '../StaffMenuPage'
import StaffPOSPage from '../StaffPOSPage'

const staffPages = {
  'Staff Dashboard': StaffDashboardPage,
  Kitchen: KitchenPage,
  Orders: OrdersPage,
  Attendance: AttendancePage,
  Menu: StaffMenuPage,
  'Point of Sale': StaffPOSPage,
  POS: StaffPOSPage,
  Notifications: NotificationsPage,
  Profile: StaffProfilePage,
}

export default function StaffPages({ page }) {
  const Page = staffPages[page] || StaffDashboardPage
  return <Page />
}
