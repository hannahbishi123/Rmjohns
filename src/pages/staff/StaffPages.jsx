import StaffDashboardPage from '../StaffDashboardPage'
import KitchenPage from '../KitchenPage'
import OrdersPage from '../OrdersPage'
import AttendancePage from '../AttendancePage'
import NotificationsPage from '../NotificationsPage'
import ProfilePage from '../ProfilePage'

const staffPages = { 'Staff Dashboard': StaffDashboardPage, Kitchen: KitchenPage, Orders: OrdersPage, Attendance: AttendancePage, Notifications: NotificationsPage, Profile: ProfilePage }

export default function StaffPages({ page }) {
  const Page = staffPages[page] || StaffDashboardPage
  return <Page />
}
