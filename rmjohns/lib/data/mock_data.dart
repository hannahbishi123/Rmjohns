import '../models/menu_item.dart';
import '../models/staff_member.dart';
import '../models/loyalty_reward.dart';
import '../models/promotion.dart';
import '../models/notification_item.dart';
import '../models/user_profile.dart';
import '../models/user_role.dart';

class MockData {
  static List<MenuItem> initialMenuItems = [
    // ── Silog Meals ────────────────────────────────────────────────────────────
    MenuItem(id: '1', name: 'Lechon Kawali Silog', category: 'Silog Meals', price: 135.0, description: 'Crispy pork, garlic rice, and egg', emoji: '🥩', tone: 'clay'),
    MenuItem(id: '2', name: 'Liempo Silog', category: 'Silog Meals', price: 135.0, description: 'Grilled liempo with garlic rice and egg', emoji: '🥓', tone: 'moss'),
    MenuItem(id: '3', name: 'Hungarian Silog', category: 'Silog Meals', price: 115.0, description: 'Savory sausage, garlic rice, and egg', emoji: '🌭', tone: 'olive'),
    MenuItem(id: '4', name: 'Burger Silog', category: 'Silog Meals', price: 75.0, description: 'Burger patty, garlic rice, and egg', emoji: '🍔', tone: 'citrus'),
    MenuItem(id: '5', name: 'Shanghai Silog', category: 'Silog Meals', price: 75.0, description: 'Shanghai-style meat, garlic rice, and egg', emoji: '🥟', tone: 'moss'),
    MenuItem(id: '6', name: 'Skinless Silog', category: 'Silog Meals', price: 75.0, description: 'Lean pork, garlic rice, and egg', emoji: '🌭', tone: 'lime'),
    MenuItem(id: '7', name: 'Tapsilog Pork', category: 'Silog Meals', price: 115.0, description: 'Tapa-style pork with garlic rice and egg', emoji: '🥩', tone: 'clay'),
    MenuItem(id: '8', name: 'Tapsilog Beef', category: 'Silog Meals', price: 135.0, description: 'Beef tapa, garlic rice, and egg', emoji: '🥩', tone: 'berry'),
    MenuItem(id: '9', name: 'Hamsilog', category: 'Silog Meals', price: 75.0, description: 'Ham, garlic rice, and egg', emoji: '🥓', tone: 'olive'),
    MenuItem(id: '10', name: 'Tocilog', category: 'Silog Meals', price: 115.0, description: 'Cured beef tocino with garlic rice and egg', emoji: '🥓', tone: 'citrus'),
    MenuItem(id: '11', name: 'Hotsilog', category: 'Silog Meals', price: 75.0, description: 'Hotdog, garlic rice, and egg', emoji: '🌭', tone: 'lime'),

    // ── Solo Orders ────────────────────────────────────────────────────────────
    MenuItem(id: '12', name: 'Beef Pares w/ Rice', category: 'Solo Orders', price: 75.0, description: 'Tender beef pares with steamed rice', emoji: '🍲', tone: 'clay'),
    MenuItem(id: '13', name: 'Goto w/ Rice', category: 'Solo Orders', price: 75.0, description: 'Classic goto with rice and savory broth', emoji: '🥣', tone: 'moss'),
    MenuItem(id: '14', name: 'Sweet & Spicy Pork Ribs w/ Rice', category: 'Solo Orders', price: 135.0, description: 'Sweet and spicy pork ribs with rice', emoji: '🍖', tone: 'berry'),

    // ── Ulam + Kanin ───────────────────────────────────────────────────────────
    MenuItem(id: '15', name: 'Meat + Rice', category: 'Ulam + Kanin', price: 85.0, description: 'Choice meat with steamed rice', emoji: '🍱', tone: 'olive'),
    MenuItem(id: '16', name: 'Veggies + Rice', category: 'Ulam + Kanin', price: 65.0, description: 'Fresh vegetables and rice', emoji: '🥗', tone: 'lime'),
    MenuItem(id: '17', name: 'Fish + Rice', category: 'Ulam + Kanin', price: 75.0, description: 'Fillet fish with steamed rice', emoji: '🐟', tone: 'citrus'),

    // ── Extras ─────────────────────────────────────────────────────────────────
    MenuItem(id: '18', name: 'Platter of Rice', category: 'Extras', price: 150.0, description: 'Large serving for sharing', emoji: '🍚', tone: 'moss'),
    MenuItem(id: '19', name: 'Cup of Rice', category: 'Extras', price: 15.0, description: 'Small rice cup', emoji: '🍚', tone: 'olive'),

    // ── Cold Drinks ────────────────────────────────────────────────────────────
    MenuItem(id: '20', name: 'Calamansi', category: 'Cold Drinks', price: 30.0, description: 'Fresh calamansi drink', emoji: '🍹', tone: 'citrus'),
    MenuItem(id: '21', name: 'Cucumber', category: 'Cold Drinks', price: 30.0, description: 'Refreshing cucumber cooler', emoji: '🥒', tone: 'lime'),
    MenuItem(id: '22', name: 'Pineapple', category: 'Cold Drinks', price: 30.0, description: 'Sweet pineapple refreshment', emoji: '🍍', tone: 'citrus'),
    MenuItem(id: '23', name: 'Iced Tea', category: 'Cold Drinks', price: 25.0, description: 'Chilled iced tea', emoji: '🍹', tone: 'olive'),
    MenuItem(id: '24', name: 'Lemonade', category: 'Cold Drinks', price: 30.0, description: 'Classic lemonade', emoji: '🍋', tone: 'citrus'),

    // ── Hot Drinks ─────────────────────────────────────────────────────────────
    MenuItem(id: '25', name: 'Coffee', category: 'Hot Drinks', price: 20.0, description: 'Classic hot coffee', emoji: '☕', tone: 'clay'),
    MenuItem(id: '26', name: 'Choco / Milo', category: 'Hot Drinks', price: 25.0, description: 'Warm chocolate drink', emoji: '🍫', tone: 'berry'),
    MenuItem(id: '27', name: 'Milk', category: 'Hot Drinks', price: 25.0, description: 'Comforting hot milk', emoji: '🥛', tone: 'moss'),

    // ── Desserts ───────────────────────────────────────────────────────────────
    MenuItem(id: '28', name: 'Halo Halo', category: 'Desserts', price: 85.0, description: 'Mixed dessert treat with shaved ice', emoji: '🍧', tone: 'berry'),
    MenuItem(id: '29', name: 'Mais con Yelo', category: 'Desserts', price: 45.0, description: 'Sweet corn dessert with ice', emoji: '🌽', tone: 'citrus'),
    MenuItem(id: '30', name: 'Buko Salad', category: 'Desserts', price: 50.0, description: 'Coconut salad', emoji: '🥥', tone: 'lime'),
  ];

  static List<StaffMember> initialStaff = [
    StaffMember(id: 'ST-014', name: 'Ava Mendoza', position: 'Head chef', contact: '+63 917 555 0114', attendanceStatus: AttendanceStatus.present, timeIn: '8:02 AM'),
    StaffMember(id: 'ST-021', name: 'Theo Lim', position: 'Service crew', contact: '+63 917 555 0121', attendanceStatus: AttendanceStatus.present, timeIn: '8:16 AM'),
    StaffMember(id: 'ST-008', name: 'Iris Dela Cruz', position: 'Service crew', contact: '+63 917 555 0108', attendanceStatus: AttendanceStatus.onBreak, timeIn: '8:24 AM'),
    StaffMember(id: 'ST-019', name: 'Marco Uy', position: 'Service crew', contact: '+63 917 555 0119', attendanceStatus: AttendanceStatus.offline, timeIn: '—'),
  ];

  static List<LoyaltyReward> initialRewards = [
    LoyaltyReward(id: '1', name: 'Complimentary dessert', description: 'One sweet thing, on us', pointsRequired: 200, isAvailable: true),
    LoyaltyReward(id: '2', name: 'Free house drink', description: 'A little afternoon pick-me-up', pointsRequired: 350, isAvailable: true),
  ];

  static List<Promotion> initialPromotions = [
    Promotion(id: '1', name: 'Silog Special', detail: 'Double points on all Silog Meals', status: PromotionStatus.active),
    Promotion(id: '2', name: 'Sweet September', detail: 'Complimentary dessert at 200 points', status: PromotionStatus.scheduled),
  ];

  static List<NotificationItem> initialNotifications = [
    NotificationItem(id: '1', title: 'New order received', detail: 'Online order VK-2841 from Mia Santos is preparing.', timestamp: DateTime.now().subtract(const Duration(minutes: 15)), audience: NotificationAudience.all),
    NotificationItem(id: '2', title: 'Attendance recorded', detail: 'Ava Mendoza checked in using the demo RFID reader.', timestamp: DateTime.now().subtract(const Duration(hours: 1)), audience: NotificationAudience.staff),
    NotificationItem(id: '3', title: 'Low availability', detail: 'Halo Halo ingredients are running low. 4 portions remain.', timestamp: DateTime.now().subtract(const Duration(days: 1)), audience: NotificationAudience.admin),
  ];

  static List<UserProfile> initialCustomers = [
    UserProfile(id: 'CU-1042', name: 'Mia Santos', email: 'mia.santos@email.com', phone: '+63 917 555 0142', role: UserRole.customer),
    UserProfile(id: 'CU-1038', name: 'Luca Reyes', email: 'luca.r@email.com', phone: '+63 917 555 0138', role: UserRole.customer),
    UserProfile(id: 'CU-1024', name: 'Nina Cruz', email: 'nina.cruz@email.com', phone: '+63 917 555 0124', role: UserRole.customer),
    UserProfile(id: 'CU-1019', name: 'Noah Garcia', email: 'noah.g@email.com', phone: '+63 917 555 0119', role: UserRole.customer),
  ];
}
