import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/menu_item.dart';
import '../models/order.dart';
import '../models/user_profile.dart';
import '../models/staff_member.dart';
import '../models/payment_record.dart';
import '../models/loyalty_reward.dart';
import '../models/promotion.dart';
import '../models/notification_item.dart';

class FirebaseService {
  static final FirebaseService instance = FirebaseService._internal();
  FirebaseService._internal();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  FirebaseDatabase? _db;
  FirebaseAuth? _auth;

  StreamSubscription? _connSub;

  /// Initialize Firebase safely. If configuration options or plugins are missing,
  /// it gracefully marks initialization as false and permits offline simulation.
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _db = FirebaseDatabase.instance;
      _auth = FirebaseAuth.instance;
      _isInitialized = true;

      // Listen to Realtime DB connection status (.info/connected)
      _connSub = _db!.ref('.info/connected').onValue.listen((event) {
        _isConnected = (event.snapshot.value as bool?) ?? false;
      }, onError: (err) {
        _isConnected = false;
        if (kDebugMode) print('[FirebaseService] Connection check warning: $err');
      });

      if (kDebugMode) print('[FirebaseService] Firebase initialized successfully.');
      return true;
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Firebase init fallback (offline mode): $e');
      _isInitialized = false;
      _isConnected = false;
      return false;
    }
  }

  void dispose() {
    _connSub?.cancel();
  }

  // ── Database Reference Helpers ──────────────────────────────────────────────
  DatabaseReference? _ref(String path) {
    if (!_isInitialized || _db == null) return null;
    return _db!.ref('eateries/$path');
  }

  // ── Realtime Listeners ──────────────────────────────────────────────────────
  Stream<DatabaseEvent>? listenToMenuItems() {
    return _ref('menu_items')?.onValue;
  }

  Stream<DatabaseEvent>? listenToOrders() {
    return _ref('orders')?.onValue;
  }

  Stream<DatabaseEvent>? listenToStaff() {
    return _ref('staff')?.onValue;
  }

  Stream<DatabaseEvent>? listenToCustomers() {
    return _ref('customers')?.onValue;
  }

  Stream<DatabaseEvent>? listenToPayments() {
    return _ref('payments')?.onValue;
  }

  Stream<DatabaseEvent>? listenToRewards() {
    return _ref('rewards')?.onValue;
  }

  Stream<DatabaseEvent>? listenToPromotions() {
    return _ref('promotions')?.onValue;
  }

  Stream<DatabaseEvent>? listenToNotifications() {
    return _ref('notifications')?.onValue;
  }

  Stream<DatabaseEvent>? listenToAttendance() {
    return _ref('attendance')?.onValue;
  }

  Stream<DatabaseEvent>? listenToPoints() {
    return _ref('points')?.onValue;
  }

  // ── Database Write Operations ───────────────────────────────────────────────
  Future<void> saveOrderMap(Map<String, dynamic> orderData) async {
    if (!_isInitialized) return;
    try {
      final id = orderData['id'] ?? DateTime.now().millisecondsSinceEpoch.toString();
      await _ref('orders/$id')?.set(orderData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save order error: $e');
    }
  }

  Future<void> updateOrderStatus(String orderId, String newStatus) async {
    if (!_isInitialized) return;
    try {
      await _ref('orders/$orderId')?.update({'status': newStatus});
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Update order status error: $e');
    }
  }

  Future<void> saveMenuItemMap(Map<String, dynamic> itemData) async {
    if (!_isInitialized) return;
    try {
      final id = itemData['id'];
      await _ref('menu_items/$id')?.set(itemData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save menu item error: $e');
    }
  }

  Future<void> deleteMenuItem(String id) async {
    if (!_isInitialized) return;
    try {
      await _ref('menu_items/$id')?.remove();
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Delete menu item error: $e');
    }
  }

  Future<void> savePaymentMap(Map<String, dynamic> paymentData) async {
    if (!_isInitialized) return;
    try {
      final id = paymentData['id'] ?? paymentData['reference'];
      await _ref('payments/$id')?.set(paymentData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save payment error: $e');
    }
  }

  Future<void> recordAttendanceMap(Map<String, dynamic> scanData) async {
    if (!_isInitialized) return;
    try {
      final id = scanData['id'];
      await _ref('attendance/$id')?.set(scanData);
      // Also update staff member current status
      final staffId = scanData['staffId'];
      if (staffId != null) {
        final action = scanData['action'] == 'Time In' ? 'Present' : 'Offline';
        await _ref('staff/$staffId')?.update({
          'status': action,
          'time': scanData['time'],
        });
      }
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Record attendance error: $e');
    }
  }

  Future<void> updatePoints(int points) async {
    if (!_isInitialized) return;
    try {
      await _ref('points')?.set(points);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Update points error: $e');
    }
  }

  Future<void> saveRewardMap(Map<String, dynamic> rewardData) async {
    if (!_isInitialized) return;
    try {
      final id = rewardData['id'];
      await _ref('rewards/$id')?.set(rewardData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save reward error: $e');
    }
  }

  Future<void> savePromotionMap(Map<String, dynamic> promoData) async {
    if (!_isInitialized) return;
    try {
      final id = promoData['id'];
      await _ref('promotions/$id')?.set(promoData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save promo error: $e');
    }
  }

  Future<void> saveNotificationMap(Map<String, dynamic> notifData) async {
    if (!_isInitialized) return;
    try {
      final id = notifData['id'];
      await _ref('notifications/$id')?.set(notifData);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Save notification error: $e');
    }
  }

  // ── Firebase Auth Helpers ──────────────────────────────────────────────────
  Future<UserCredential?> signInWithEmail(String email, String password) async {
    if (!_isInitialized || _auth == null) return null;
    try {
      return await _auth!.signInWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Auth sign in error: $e');
      rethrow;
    }
  }

  Future<UserCredential?> signUpWithEmail(String email, String password) async {
    if (!_isInitialized || _auth == null) return null;
    try {
      return await _auth!.createUserWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      if (kDebugMode) print('[FirebaseService] Auth sign up error: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    if (!_isInitialized || _auth == null) return;
    await _auth!.signOut();
  }
}
