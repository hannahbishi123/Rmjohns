import 'cart_item.dart';

enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  completed,
  cancelled,
  refunded,
}

extension OrderStatusExtension on OrderStatus {
  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.ready:
        return 'Ready';
      case OrderStatus.completed:
        return 'Completed';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.refunded:
        return 'Refunded';
    }
  }

  static OrderStatus fromString(String str) {
    final lower = str.toLowerCase();
    if (lower.contains('prep')) return OrderStatus.preparing;
    if (lower.contains('read')) return OrderStatus.ready;
    if (lower.contains('comp')) return OrderStatus.completed;
    if (lower.contains('canc')) return OrderStatus.cancelled;
    if (lower.contains('refu')) return OrderStatus.refunded;
    if (lower.contains('conf')) return OrderStatus.confirmed;
    return OrderStatus.pending;
  }
}

class OrderModel {
  final String id;
  final String customerName;
  final String customerId;
  final List<CartItem> items;
  final String orderType; // Pickup, Dine in, Takeout, Online
  final String paymentMethod;
  final String notes;
  final DateTime createdAt;
  OrderStatus status;
  final double subtotal;
  final double serviceCharge; // 5%
  final double discount;
  final double total;

  OrderModel({
    required this.id,
    required this.customerName,
    required this.customerId,
    required this.items,
    required this.orderType,
    required this.paymentMethod,
    this.notes = '',
    required this.createdAt,
    this.status = OrderStatus.pending,
    required this.subtotal,
    required this.serviceCharge,
    this.discount = 0.0,
    required this.total,
  });

  Map<String, dynamic> toMap() {
    final itemsSummary = items.map((i) => '${i.quantity} × ${i.menuItem.name}').join(', ');
    return {
      'id': id,
      'customer': customerName,
      'customerName': customerName,
      'customerId': customerId,
      'items': itemsSummary,
      'products': items.map((i) => i.toMap()).toList(),
      'type': orderType,
      'orderType': orderType,
      'paymentMethod': paymentMethod,
      'notes': notes,
      'status': status.label,
      'subtotal': subtotal,
      'serviceCharge': serviceCharge,
      'discount': discount,
      'total': total,
      'createdAt': createdAt.toIso8601String(),
      'time': '${createdAt.hour}:${createdAt.minute.toString().padLeft(2, '0')}',
      'date': createdAt.toIso8601String().substring(0, 10),
      'payment': 'Paid',
    };
  }

  factory OrderModel.fromMap(Map<dynamic, dynamic> map, String keyId) {
    List<CartItem> cartItems = [];
    if (map['products'] is List) {
      cartItems = (map['products'] as List)
          .whereType<Map>()
          .map((itemMap) => CartItem.fromMap(itemMap))
          .toList();
    }

    DateTime created = DateTime.now();
    if (map['createdAt'] != null) {
      created = DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now();
    }

    return OrderModel(
      id: (map['id'] ?? keyId).toString(),
      customerName: (map['customerName'] ?? map['customer'] ?? 'Guest Customer').toString(),
      customerId: (map['customerId'] ?? 'GUEST').toString(),
      items: cartItems,
      orderType: (map['orderType'] ?? map['type'] ?? 'Pickup').toString(),
      paymentMethod: (map['paymentMethod'] ?? 'Cash').toString(),
      notes: (map['notes'] ?? '').toString(),
      createdAt: created,
      status: OrderStatusExtension.fromString((map['status'] ?? 'Pending').toString()),
      subtotal: (map['subtotal'] is num) ? (map['subtotal'] as num).toDouble() : 0.0,
      serviceCharge: (map['serviceCharge'] is num) ? (map['serviceCharge'] as num).toDouble() : 0.0,
      discount: (map['discount'] is num) ? (map['discount'] as num).toDouble() : 0.0,
      total: (map['total'] is num) ? (map['total'] as num).toDouble() : 0.0,
    );
  }
}
