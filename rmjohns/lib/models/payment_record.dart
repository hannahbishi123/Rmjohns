enum PaymentStatus {
  paid,
  pending,
  failed,
  cancelled,
  refunded,
}

class PaymentRecord {
  final String reference;
  final String orderId;
  final String customerName;
  final String paymentMethod;
  final double amount;
  final double amountTendered;
  final double change;
  final DateTime timestamp;
  PaymentStatus status;

  PaymentRecord({
    required this.reference,
    required this.orderId,
    required this.customerName,
    required this.paymentMethod,
    required this.amount,
    required this.amountTendered,
    required this.change,
    required this.timestamp,
    this.status = PaymentStatus.paid,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': reference,
      'reference': reference,
      'orderId': orderId,
      'customer': customerName,
      'customerName': customerName,
      'method': paymentMethod,
      'paymentMethod': paymentMethod,
      'amount': amount,
      'amountTendered': amountTendered,
      'change': change,
      'status': status.name,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory PaymentRecord.fromMap(Map<dynamic, dynamic> map, String keyId) {
    DateTime ts = DateTime.now();
    if (map['timestamp'] != null) {
      ts = DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now();
    }
    return PaymentRecord(
      reference: (map['reference'] ?? map['id'] ?? keyId).toString(),
      orderId: (map['orderId'] ?? 'ORD-000').toString(),
      customerName: (map['customerName'] ?? map['customer'] ?? 'Customer').toString(),
      paymentMethod: (map['paymentMethod'] ?? map['method'] ?? 'Cash').toString(),
      amount: (map['amount'] is num) ? (map['amount'] as num).toDouble() : 0.0,
      amountTendered: (map['amountTendered'] is num) ? (map['amountTendered'] as num).toDouble() : 0.0,
      change: (map['change'] is num) ? (map['change'] as num).toDouble() : 0.0,
      timestamp: ts,
      status: (map['status'] == 'refunded' || map['status'] == 'Refunded')
          ? PaymentStatus.refunded
          : PaymentStatus.paid,
    );
  }
}
