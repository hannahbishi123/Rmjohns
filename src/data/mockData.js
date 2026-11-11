export const initialMenu = [
  // ── Silog Meals ────────────────────────────────────────────────────────────
  { id: 1,  name: 'Lechon Kawali Silog',             category: 'Silog Meals',  price: 135, description: 'Crispy pork, garlic rice, and egg',                  tone: 'clay',   available: true },
  { id: 2,  name: 'Liempo Silog',                    category: 'Silog Meals',  price: 135, description: 'Grilled liempo with garlic rice and egg',            tone: 'moss',   available: true },
  { id: 3,  name: 'Hungarian Silog',                 category: 'Silog Meals',  price: 115, description: 'Savory sausage, garlic rice, and egg',               tone: 'olive',  available: true },
  { id: 4,  name: 'Burger Silog',                    category: 'Silog Meals',  price: 75,  description: 'Burger patty, garlic rice, and egg',                 tone: 'citrus', available: true },
  { id: 5,  name: 'Shanghai Silog',                  category: 'Silog Meals',  price: 75,  description: 'Shanghai-style meat, garlic rice, and egg',          tone: 'moss',   available: true },
  { id: 6,  name: 'Skinless Silog',                  category: 'Silog Meals',  price: 75,  description: 'Lean pork, garlic rice, and egg',                    tone: 'lime',   available: true },
  { id: 7,  name: 'Tapsilog Pork',                   category: 'Silog Meals',  price: 115, description: 'Tapa-style pork with garlic rice and egg',           tone: 'clay',   available: true },
  { id: 8,  name: 'Tapsilog Beef',                   category: 'Silog Meals',  price: 135, description: 'Beef tapa, garlic rice, and egg',                    tone: 'berry',  available: true },
  { id: 9,  name: 'Hamsilog',                        category: 'Silog Meals',  price: 75,  description: 'Ham, garlic rice, and egg',                          tone: 'olive',  available: true },
  { id: 10, name: 'Tocilog',                         category: 'Silog Meals',  price: 115, description: 'Cured beef tocino with garlic rice and egg',         tone: 'citrus', available: true },
  { id: 11, name: 'Hotsilog',                        category: 'Silog Meals',  price: 75,  description: 'Hotdog, garlic rice, and egg',                       tone: 'lime',   available: true },

  // ── Solo Orders ────────────────────────────────────────────────────────────
  { id: 12, name: 'Beef Pares w/ Rice',              category: 'Solo Orders',  price: 75,  description: 'Tender beef pares with steamed rice',                tone: 'clay',   available: true },
  { id: 13, name: 'Goto w/ Rice',                    category: 'Solo Orders',  price: 75,  description: 'Classic goto with rice and savory broth',            tone: 'moss',   available: true },
  { id: 14, name: 'Sweet & Spicy Pork Ribs w/ Rice', category: 'Solo Orders',  price: 135, description: 'Sweet and spicy pork ribs with rice',               tone: 'berry',  available: true },

  // ── Ulam + Kanin ───────────────────────────────────────────────────────────
  { id: 15, name: 'Meat + Rice',                     category: 'Ulam + Kanin', price: 85,  description: 'Choice meat with steamed rice',                      tone: 'olive',  available: true },
  { id: 16, name: 'Veggies + Rice',                  category: 'Ulam + Kanin', price: 65,  description: 'Fresh vegetables and rice',                          tone: 'lime',   available: true },
  { id: 17, name: 'Fish + Rice',                     category: 'Ulam + Kanin', price: 75,  description: 'Fillet fish with steamed rice',                      tone: 'citrus', available: true },

  // ── Extras ─────────────────────────────────────────────────────────────────
  { id: 18, name: 'Platter of Rice',                 category: 'Extras',       price: 150, description: 'Large serving for sharing',                          tone: 'moss',   available: true },
  { id: 19, name: 'Cup of Rice',                     category: 'Extras',       price: 15,  description: 'Small rice cup',                                     tone: 'olive',  available: true },

  // ── Cold Drinks ────────────────────────────────────────────────────────────
  { id: 20, name: 'Calamansi',                       category: 'Cold Drinks',  price: 30,  description: 'Fresh calamansi drink',                              tone: 'citrus', available: true },
  { id: 21, name: 'Cucumber',                        category: 'Cold Drinks',  price: 30,  description: 'Refreshing cucumber cooler',                         tone: 'lime',   available: true },
  { id: 22, name: 'Pineapple',                       category: 'Cold Drinks',  price: 30,  description: 'Sweet pineapple refreshment',                        tone: 'citrus', available: true },
  { id: 23, name: 'Iced Tea',                        category: 'Cold Drinks',  price: 25,  description: 'Chilled iced tea',                                   tone: 'olive',  available: true },
  { id: 24, name: 'Lemonade',                        category: 'Cold Drinks',  price: 30,  description: 'Classic lemonade',                                   tone: 'citrus', available: true },

  // ── Hot Drinks ─────────────────────────────────────────────────────────────
  { id: 25, name: 'Coffee',                          category: 'Hot Drinks',   price: 20,  description: 'Classic hot coffee',                                 tone: 'clay',   available: true },
  { id: 26, name: 'Choco / Milo',                    category: 'Hot Drinks',   price: 25,  description: 'Warm chocolate drink',                               tone: 'berry',  available: true },
  { id: 27, name: 'Milk',                            category: 'Hot Drinks',   price: 25,  description: 'Comforting hot milk',                                tone: 'moss',   available: true },

  // ── Desserts ───────────────────────────────────────────────────────────────
  { id: 28, name: 'Halo Halo',                       category: 'Desserts',     price: 85,  description: 'Mixed dessert treat with shaved ice',                tone: 'berry',  available: true },
  { id: 29, name: 'Mais con Yelo',                   category: 'Desserts',     price: 45,  description: 'Sweet corn dessert with ice',                        tone: 'citrus', available: true },
  { id: 30, name: 'Buko Salad',                      category: 'Desserts',     price: 50,  description: 'Coconut salad',                                      tone: 'lime',   available: true },
]

export const initialOrders = [
  { id: 'VK-2841', customer: 'Mia Santos',  items: '2 × Liempo Silog, 1 × Calamansi',           products: [{ id: 2, quantity: 2 }, { id: 20, quantity: 1 }],  subtotal: 300, total: 300, type: 'Pickup',  payment: 'Paid',    paymentMethod: 'GCash', status: 'Preparing', time: '10:42 AM', date: '2026-09-29' },
  { id: 'VK-2840', customer: 'Luca Reyes',  items: '1 × Tapsilog Beef',                          products: [{ id: 8, quantity: 1 }],                            subtotal: 135, total: 135, type: 'Dine in', payment: 'Paid',    paymentMethod: 'Cash',  status: 'Ready',     time: '10:35 AM', date: '2026-09-29' },
  { id: 'VK-2839', customer: 'Nina Cruz',   items: '1 × Beef Pares w/ Rice, 1 × Halo Halo',     products: [{ id: 12, quantity: 1 }, { id: 28, quantity: 1 }], subtotal: 160, total: 160, type: 'Online',  payment: 'Pending', paymentMethod: 'Cash',  status: 'Pending',   time: '10:28 AM', date: '2026-09-29' },
  { id: 'VK-2838', customer: 'Noah Garcia', items: '2 × Lechon Kawali Silog',                    products: [{ id: 1, quantity: 2 }],                            subtotal: 270, total: 270, type: 'Dine in', payment: 'Paid',    paymentMethod: 'Card',  status: 'Completed', time: '10:16 AM', date: '2026-09-28' },
]

export const initialCustomers = [
  { name: 'Mia Santos',   id: 'CU-1042', email: 'mia.santos@email.com',  contact: '+63 917 555 0142', orders: 28, spend: 12840, points: 340, status: 'Active' },
  { name: 'Luca Reyes',   id: 'CU-1038', email: 'luca.r@email.com',       contact: '+63 917 555 0138', orders: 16, spend: 7460,  points: 182, status: 'Active' },
  { name: 'Nina Cruz',    id: 'CU-1024', email: 'nina.cruz@email.com',    contact: '+63 917 555 0124', orders: 12, spend: 5890,  points: 96,  status: 'Active' },
  { name: 'Noah Garcia',  id: 'CU-1019', email: 'noah.g@email.com',       contact: '+63 917 555 0119', orders: 9,  spend: 4120,  points: 74,  status: 'Active' },
]

export const initialRewards = [
  { id: 1, name: 'Complimentary dessert', description: 'One sweet thing, on us',        points: 200, available: true },
  { id: 2, name: 'Free house drink',      description: 'A little afternoon pick-me-up', points: 350, available: true },
]

export const initialPromotions = [
  { id: 1, name: 'Silog Special',   detail: 'Double points on all Silog Meals',    status: 'Active'    },
  { id: 2, name: 'Sweet September', detail: 'Complimentary dessert at 200 points', status: 'Scheduled' },
]

export const initialPayments = initialOrders.map((order, index) => ({
  id:        `PAY-${String(index + 1).padStart(5, '0')}`,
  orderId:   order.id,
  method:    order.paymentMethod,
  amount:    order.total,
  status:    order.payment,
  reference: `VD-${String(2841 - index).padStart(6, '0')}`,
}))

export const initialStaff = [
  { name: 'Ava Mendoza',    id: 'ST-014', role: 'Head chef',    status: 'Present',  time: '8:02 AM' },
  { name: 'Theo Lim',       id: 'ST-021', role: 'Service crew', status: 'Present',  time: '8:16 AM' },
  { name: 'Iris Dela Cruz', id: 'ST-008', role: 'Service crew', status: 'On break', time: '8:24 AM' },
  { name: 'Marco Uy',       id: 'ST-019', role: 'Service crew', status: 'Offline',  time: '—'       },
]

export const navByRole = {
  Admin:    [['Overview', '◫'], ['Orders', '▤'], ['Kitchen', '♨'], ['POS', '＋'], ['Sales', '↗'], ['Menu', '▦'], ['Customers', '♙'], ['Staff', '♧'], ['Monitoring', '◉'], ['Loyalty', '✳'], ['Reports', '▥'], ['Notifications', '♢'], ['Settings', '⚙']],
  Staff:    [['Staff Dashboard', '◫'], ['Kitchen', '♨'], ['Orders', '▤'], ['Attendance', '◷'], ['Notifications', '♢'], ['Profile', '♙']],
  Customer: [['Home', '⌂'], ['Menu', '▦'], ['Cart', '＋'], ['My orders', '▤'], ['Loyalty', '✳'], ['Notifications', '♢'], ['Profile', '♙']],
}

export const money = (amount) => `₱${Number(amount).toLocaleString('en-PH')}`
export const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')
