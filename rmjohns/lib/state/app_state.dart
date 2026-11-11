import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/user_role.dart';
import '../models/user_profile.dart';
import '../models/menu_item.dart';
import '../models/cart_item.dart';
import '../models/order.dart';
import '../models/reservation.dart';
import '../models/payment_record.dart';
import '../models/loyalty_reward.dart';
import '../models/staff_member.dart';
import '../models/promotion.dart';
import '../models/notification_item.dart';
import '../data/mock_data.dart';
import '../services/firebase_service.dart';

class AppState extends ChangeNotifier {
  // ── Firebase connection status ──────────────────────────────────────────────
  bool isFirebaseConnected = false;
  bool isFirebaseInitialized = false;

  // ── Session & User ─────────────────────────────────────────────────────────
  UserProfile? currentUser;
  UserRole currentRole = UserRole.public;

  // ── Menu ───────────────────────────────────────────────────────────────────
  List<MenuItem> menuItems = [];
  String selectedCategory = 'All';
  String menuSearchQuery = '';

  // ── Cart ───────────────────────────────────────────────────────────────────
  List<CartItem> cart = [];

  // ── Orders ─────────────────────────────────────────────────────────────────
  List<OrderModel> orders = [];

  // ── Reservations ───────────────────────────────────────────────────────────
  List<ReservationModel> reservations = [];

  // ── Payments Ledger ────────────────────────────────────────────────────────
  List<PaymentRecord> paymentLedger = [];

  // ── Loyalty ────────────────────────────────────────────────────────────────
  int customerPoints = 240;
  List<LoyaltyReward> rewards = [];
  List<LoyaltyHistoryItem> loyaltyHistory = [];

  // ── Staff & Attendance ─────────────────────────────────────────────────────
  List<StaffMember> staffMembers = [];
  List<ScanEvent> scanEvents = [];
  bool rfidReaderConnected = true;

  // ── Promotions & Notifications ─────────────────────────────────────────────
  List<Promotion> promotions = [];
  List<NotificationItem> notifications = [];

  // ── Customers ──────────────────────────────────────────────────────────────
  List<UserProfile> customers = [];

  // ── Preferences ───────────────────────────────────────────────────────────
  bool orderUpdatesPref = true;
  bool attendanceAlertsPref = true;
  bool loyaltyUpdatesPref = true;
  bool receiptCopiesPref = false;

  // ── Toast Feed ─────────────────────────────────────────────────────────────
  String? toastMessage;

  final List<StreamSubscription> _subscriptions = [];

  AppState() {
    _initData();
    _initFirebase();
  }

  void _initData() {
    menuItems = List.from(MockData.initialMenuItems);
    staffMembers = List.from(MockData.initialStaff);
    rewards = List.from(MockData.initialRewards);
    promotions = List.from(MockData.initialPromotions);
    notifications = List.from(MockData.initialNotifications);
    customers = List.from(MockData.initialCustomers);

    loyaltyHistory = [
      LoyaltyHistoryItem(
        id: 'lh1',
        title: 'Earned from Order #VK-2840',
        points: 40,
        isEarned: true,
        timestamp: DateTime.now().subtract(const Duration(days: 2)),
      ),
      LoyaltyHistoryItem(
        id: 'lh2',
        title: 'Earned from Order #VK-2841',
        points: 200,
        isEarned: true,
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];

    final initialOrder = OrderModel(
      id: 'VK-2841',
      customerName: 'Mia Santos',
      customerId: 'CU-1042',
      items: [
        CartItem(menuItem: menuItems[1], quantity: 2), // Liempo Silog
        CartItem(menuItem: menuItems[19], quantity: 1), // Calamansi
      ],
      orderType: 'Pickup',
      paymentMethod: 'GCash',
      createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
      status: OrderStatus.preparing,
      subtotal: 300.0,
      serviceCharge: 15.0,
      total: 315.0,
    );
    orders.add(initialOrder);

    paymentLedger.add(
      PaymentRecord(
        reference: 'VD-002841',
        orderId: 'VK-2841',
        customerName: 'Mia Santos',
        paymentMethod: 'GCash',
        amount: 315.0,
        amountTendered: 315.0,
        change: 0.0,
        timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
        status: PaymentStatus.paid,
      ),
    );
  }

  Future<void> _initFirebase() async {
    final success = await FirebaseService.instance.initialize();
    isFirebaseInitialized = success;
    isFirebaseConnected = FirebaseService.instance.isConnected;
    notifyListeners();

    if (success) {
      _setupFirebaseListeners();
    }
  }

  void _setupFirebaseListeners() {
    // Menu items stream
    final menuStream = FirebaseService.instance.listenToMenuItems();
    if (menuStream != null) {
      _subscriptions.add(menuStream.listen((event) {
        isFirebaseConnected = true;
        if (event.snapshot.exists && event.snapshot.value != null) {
          final data = event.snapshot.value;
          if (data is Map) {
            final List<MenuItem> parsed = [];
            data.forEach((k, v) {
              if (v is Map) {
                parsed.add(MenuItem.fromMap(v, k.toString()));
              }
            });
            if (parsed.isNotEmpty) {
              menuItems = parsed;
              notifyListeners();
            }
          }
        }
      }, onError: (_) => isFirebaseConnected = false));
    }

    // Orders stream
    final ordersStream = FirebaseService.instance.listenToOrders();
    if (ordersStream != null) {
      _subscriptions.add(ordersStream.listen((event) {
        if (event.snapshot.exists && event.snapshot.value != null) {
          final data = event.snapshot.value;
          if (data is Map) {
            final List<OrderModel> parsed = [];
            data.forEach((k, v) {
              if (v is Map) {
                parsed.add(OrderModel.fromMap(v, k.toString()));
              }
            });
            if (parsed.isNotEmpty) {
              parsed.sort((a, b) => b.createdAt.compareTo(a.createdAt));
              orders = parsed;
              notifyListeners();
            }
          }
        }
      }));
    }

    // Staff stream
    final staffStream = FirebaseService.instance.listenToStaff();
    if (staffStream != null) {
      _subscriptions.add(staffStream.listen((event) {
        if (event.snapshot.exists && event.snapshot.value != null) {
          final data = event.snapshot.value;
          if (data is Map) {
            final List<StaffMember> parsed = [];
            data.forEach((k, v) {
              if (v is Map) {
                parsed.add(StaffMember.fromMap(v, k.toString()));
              }
            });
            if (parsed.isNotEmpty) {
              staffMembers = parsed;
              notifyListeners();
            }
          }
        }
      }));
    }

    // Attendance stream
    final attendanceStream = FirebaseService.instance.listenToAttendance();
    if (attendanceStream != null) {
      _subscriptions.add(attendanceStream.listen((event) {
        if (event.snapshot.exists && event.snapshot.value != null) {
          final data = event.snapshot.value;
          if (data is Map) {
            final List<ScanEvent> parsed = [];
            data.forEach((k, v) {
              if (v is Map) {
                parsed.add(ScanEvent.fromMap(v, k.toString()));
              }
            });
            if (parsed.isNotEmpty) {
              scanEvents = parsed;
              notifyListeners();
            }
          }
        }
      }));
    }
  }

  @override
  void dispose() {
    for (var sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }

  void showToast(String msg) {
    toastMessage = msg;
    notifyListeners();
  }

  void clearToast() {
    toastMessage = null;
  }

  // ── AUTH / ROLE ─────────────────────────────────────────────────────────────
  bool login(String identifier, String password) {
    if (identifier.trim().isEmpty || password.length < 4) {
      showToast('Identifier & password (min 4 chars) required.');
      return false;
    }

    final lower = identifier.trim().toLowerCase();
    if (lower.contains('admin')) {
      currentRole = UserRole.admin;
      currentUser = UserProfile(
        id: 'ADM-001',
        name: 'Manager Admin',
        email: identifier.contains('@') ? identifier : 'admin@rmjohns.com',
        phone: '09170000000',
        role: UserRole.admin,
      );
    } else if (lower.contains('staff')) {
      currentRole = UserRole.staff;
      currentUser = UserProfile(
        id: 'STF-102',
        name: 'Juan Cashier',
        email: identifier.contains('@') ? identifier : 'staff@rmjohns.com',
        phone: '09189876543',
        role: UserRole.staff,
      );
    } else {
      currentRole = UserRole.customer;
      currentUser = UserProfile(
        id: 'CU-1042',
        name: 'Mia Santos',
        email: identifier.contains('@') ? identifier : 'mia.santos@email.com',
        phone: '+63 917 555 0142',
        role: UserRole.customer,
      );
    }

    // Try Firebase Auth in background if initialized
    FirebaseService.instance.signInWithEmail(currentUser!.email, password).catchError((_) => null);

    showToast('Signed in as ${currentRole.label}');
    notifyListeners();
    return true;
  }

  void signUpCustomer(String name, String email, String phone, String password) {
    final newCust = UserProfile(
      id: 'CU-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      name: name,
      email: email,
      phone: phone,
      role: UserRole.customer,
    );
    customers.add(newCust);
    currentUser = newCust;
    currentRole = UserRole.customer;

    // Push customer to Firebase
    FirebaseService.instance.saveOrderMap(newCust.toMap());
    FirebaseService.instance.signUpWithEmail(email, password).catchError((_) => null);

    showToast('Customer account created! Welcome $name');
    notifyListeners();
  }

  void logout() {
    currentRole = UserRole.public;
    currentUser = null;
    cart.clear();
    FirebaseService.instance.signOut();
    showToast('Logged out successfully');
    notifyListeners();
  }

  // ── CART CALCULATIONS ───────────────────────────────────────────────────────
  double get cartSubtotal {
    double sum = 0.0;
    for (var item in cart) {
      sum += item.totalPrice;
    }
    return sum;
  }

  double get cartServiceCharge => cartSubtotal * 0.05; // 5%

  double get cartTotal => cartSubtotal + cartServiceCharge;

  int get cartCount => cart.fold(0, (sum, item) => sum + item.quantity);

  void addToCart(MenuItem item, {int quantity = 1, String addon = 'None'}) {
    final existingIndex = cart.indexWhere(
      (c) => c.menuItem.id == item.id && c.selectedAddon == addon,
    );
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.add(CartItem(menuItem: item, quantity: quantity, selectedAddon: addon));
    }
    showToast('Added ${item.name} to cart');
    notifyListeners();
  }

  void updateCartQuantity(int index, int delta) {
    if (index >= 0 && index < cart.length) {
      cart[index].quantity += delta;
      if (cart[index].quantity <= 0) {
        cart.removeAt(index);
      }
      notifyListeners();
    }
  }

  void clearCart() {
    cart.clear();
    showToast('Cart cleared');
    notifyListeners();
  }

  // ── CHECKOUT & ORDERS ───────────────────────────────────────────────────────
  OrderModel? placeOrder({
    required String name,
    required String orderType,
    required String paymentMethod,
    String notes = '',
  }) {
    if (cart.isEmpty) {
      showToast('Cart is empty!');
      return null;
    }

    final orderId = 'VK-${2842 + orders.length}';
    final sub = cartSubtotal;
    final sc = cartServiceCharge;
    final tot = cartTotal;

    final newOrder = OrderModel(
      id: orderId,
      customerName: name,
      customerId: currentUser?.id ?? 'CU-GUEST',
      items: List.from(cart),
      orderType: orderType,
      paymentMethod: paymentMethod,
      notes: notes,
      createdAt: DateTime.now(),
      status: OrderStatus.pending,
      subtotal: sub,
      serviceCharge: sc,
      total: tot,
    );

    orders.insert(0, newOrder);

    // Record Payment
    final paymentRec = PaymentRecord(
      reference: 'VD-00${2842 + orders.length}',
      orderId: orderId,
      customerName: name,
      paymentMethod: paymentMethod,
      amount: tot,
      amountTendered: tot,
      change: 0.0,
      timestamp: DateTime.now(),
      status: PaymentStatus.paid,
    );
    paymentLedger.insert(0, paymentRec);

    // Sync to Firebase Database
    FirebaseService.instance.saveOrderMap(newOrder.toMap());
    FirebaseService.instance.savePaymentMap(paymentRec.toMap());

    // Award Loyalty Points
    final ptsEarned = (sub / 100).floor();
    if (ptsEarned > 0) {
      customerPoints += ptsEarned;
      FirebaseService.instance.updatePoints(customerPoints);
      loyaltyHistory.insert(
        0,
        LoyaltyHistoryItem(
          id: 'lh-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Earned from Order #$orderId',
          points: ptsEarned,
          isEarned: true,
          timestamp: DateTime.now(),
        ),
      );
    }

    // Add notification
    final notif = NotificationItem(
      id: 'notif-${DateTime.now().millisecondsSinceEpoch}',
      title: 'New order received',
      detail: '$orderType order $orderId from $name is preparing.',
      timestamp: DateTime.now(),
      audience: NotificationAudience.all,
    );
    notifications.insert(0, notif);
    FirebaseService.instance.saveNotificationMap(notif.toMap());

    cart.clear();
    showToast('Order #$orderId placed successfully!');
    notifyListeners();
    return newOrder;
  }

  void updateOrderStatus(String orderId, OrderStatus newStatus) {
    final idx = orders.indexWhere((o) => o.id == orderId);
    if (idx >= 0) {
      orders[idx].status = newStatus;
      FirebaseService.instance.updateOrderStatus(orderId, newStatus.label);
      showToast('Order #$orderId updated to ${newStatus.label}');
      notifyListeners();
    }
  }

  // ── POS CASHIER SYSTEM ──────────────────────────────────────────────────────
  OrderModel? completePOSSale({
    required List<CartItem> posItems,
    required String paymentMethod,
    required double discountPercent,
    required double cashTendered,
  }) {
    if (posItems.isEmpty) {
      showToast('POS sale is empty');
      return null;
    }

    double sub = posItems.fold(0.0, (s, item) => s + item.totalPrice);
    double sc = sub * 0.05;
    double disc = sub * (discountPercent / 100.0);
    double tot = sub + sc - disc;

    if (paymentMethod == 'Cash' && cashTendered < tot) {
      showToast('Insufficient cash tendered!');
      return null;
    }

    double change = paymentMethod == 'Cash' ? (cashTendered - tot) : 0.0;
    final orderId = 'POS-${1000 + orders.length + 1}';

    final posOrder = OrderModel(
      id: orderId,
      customerName: 'Counter Customer',
      customerId: 'POS-WALKIN',
      items: posItems,
      orderType: 'Takeout',
      paymentMethod: paymentMethod,
      notes: 'Counter POS Sale',
      createdAt: DateTime.now(),
      status: OrderStatus.completed,
      subtotal: sub,
      serviceCharge: sc,
      discount: disc,
      total: tot,
    );

    orders.insert(0, posOrder);

    final payRec = PaymentRecord(
      reference: 'VD-POS${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      orderId: orderId,
      customerName: 'Counter Customer',
      paymentMethod: paymentMethod,
      amount: tot,
      amountTendered: paymentMethod == 'Cash' ? cashTendered : tot,
      change: change,
      timestamp: DateTime.now(),
      status: PaymentStatus.paid,
    );

    paymentLedger.insert(0, payRec);

    // Sync POS sale to Firebase
    FirebaseService.instance.saveOrderMap(posOrder.toMap());
    FirebaseService.instance.savePaymentMap(payRec.toMap());

    showToast('POS Sale #$orderId completed!');
    notifyListeners();
    return posOrder;
  }

  // ── MENU MANAGEMENT ────────────────────────────────────────────────────────
  void saveMenuItem(MenuItem item) {
    final idx = menuItems.indexWhere((m) => m.id == item.id);
    if (idx >= 0) {
      menuItems[idx] = item;
      showToast('${item.name} updated');
    } else {
      menuItems.add(item);
      showToast('Added ${item.name}');
    }
    FirebaseService.instance.saveMenuItemMap(item.toMap());
    notifyListeners();
  }

  void toggleItemAvailability(String id) {
    final idx = menuItems.indexWhere((m) => m.id == id);
    if (idx >= 0) {
      menuItems[idx].isAvailable = !menuItems[idx].isAvailable;
      FirebaseService.instance.saveMenuItemMap(menuItems[idx].toMap());
      showToast('${menuItems[idx].name} availability updated');
      notifyListeners();
    }
  }

  void deleteMenuItem(String id) {
    final idx = menuItems.indexWhere((m) => m.id == id);
    if (idx >= 0) {
      final name = menuItems[idx].name;
      menuItems.removeAt(idx);
      FirebaseService.instance.deleteMenuItem(id);
      showToast('Menu item $name deleted');
      notifyListeners();
    }
  }

  // ── STAFF ATTENDANCE & RFID SIMULATION ──────────────────────────────────────
  void toggleRFIDReader() {
    rfidReaderConnected = !rfidReaderConnected;
    showToast(rfidReaderConnected ? 'ESP32 RFID Reader Connected' : 'ESP32 RFID Reader Disconnected');
    notifyListeners();
  }

  void simulateRFIDScan(StaffMember staff) {
    if (!rfidReaderConnected) {
      showToast('Cannot scan: ESP32 RFID Reader is offline!');
      return;
    }

    final isPresent = staff.attendanceStatus == AttendanceStatus.present;
    final nextStatus = isPresent ? AttendanceStatus.offline : AttendanceStatus.present;
    final action = isPresent ? 'Time Out' : 'Time In';

    staff.attendanceStatus = nextStatus;
    final timeStr = '${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')} AM';
    if (nextStatus == AttendanceStatus.present) {
      staff.timeIn = timeStr;
    } else {
      staff.timeOut = timeStr;
    }

    final scanEv = ScanEvent(
      id: 'scan-${DateTime.now().millisecondsSinceEpoch}',
      staffName: staff.name,
      staffId: staff.id,
      time: timeStr,
      action: action,
    );

    scanEvents.insert(0, scanEv);
    FirebaseService.instance.recordAttendanceMap(scanEv.toMap());

    showToast('RFID Scan: ${staff.name} ($action)');
    notifyListeners();
  }

  // ── LOYALTY ────────────────────────────────────────────────────────────────
  bool redeemReward(LoyaltyReward reward) {
    if (customerPoints < reward.pointsRequired) {
      showToast('Not enough points for ${reward.name}!');
      return false;
    }

    customerPoints -= reward.pointsRequired;
    FirebaseService.instance.updatePoints(customerPoints);

    loyaltyHistory.insert(
      0,
      LoyaltyHistoryItem(
        id: 'lh-${DateTime.now().millisecondsSinceEpoch}',
        title: 'Redeemed: ${reward.name}',
        points: reward.pointsRequired,
        isEarned: false,
        timestamp: DateTime.now(),
      ),
    );

    showToast('Reward "${reward.name}" redeemed successfully!');
    notifyListeners();
    return true;
  }

  void adjustCustomerPoints(String customerId, int delta) {
    customerPoints += delta;
    if (customerPoints < 0) customerPoints = 0;
    FirebaseService.instance.updatePoints(customerPoints);
    showToast('Customer points updated by $delta');
    notifyListeners();
  }

  // ── PROMOTIONS ─────────────────────────────────────────────────────────────
  void savePromotion(Promotion promo) {
    final idx = promotions.indexWhere((p) => p.id == promo.id);
    if (idx >= 0) {
      promotions[idx] = promo;
    } else {
      promotions.add(promo);
    }
    FirebaseService.instance.savePromotionMap(promo.toMap());
    showToast('Promotion saved');
    notifyListeners();
  }

  void deletePromotion(String id) {
    promotions.removeWhere((p) => p.id == id);
    showToast('Promotion deleted');
    notifyListeners();
  }
}
