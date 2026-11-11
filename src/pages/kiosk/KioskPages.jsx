import KioskHomePage from '../KioskHomePage'
import MenuPage from '../MenuPage'
import CartPage from '../CartPage'
import CheckoutPage from '../CheckoutPage'

const kioskPages = { 'Kiosk home': KioskHomePage, Menu: MenuPage, Cart: CartPage, Checkout: CheckoutPage }

export default function KioskPages({ page }) {
  const Page = kioskPages[page] || KioskHomePage
  return <Page />
}
