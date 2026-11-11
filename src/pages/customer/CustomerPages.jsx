import CustomerHomePage from '../CustomerHomePage'
import MenuPage from '../MenuPage'
import CartPage from '../CartPage'
import CheckoutPage from '../CheckoutPage'
import MyOrdersPage from '../MyOrdersPage'
import LoyaltyPage from '../LoyaltyPage'
import NotificationsPage from '../NotificationsPage'
import ProfilePage from '../ProfilePage'

const customerPages = { Home: CustomerHomePage, Menu: MenuPage, Cart: CartPage, Checkout: CheckoutPage, 'My orders': MyOrdersPage, Loyalty: LoyaltyPage, Notifications: NotificationsPage, Profile: ProfilePage }

export default function CustomerPages({ page }) {
  const Page = customerPages[page] || CustomerHomePage
  return <Page />
}
