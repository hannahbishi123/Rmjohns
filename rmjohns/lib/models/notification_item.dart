enum NotificationAudience {
  all,
  customer,
  staff,
  admin,
}

class NotificationItem {
  final String id;
  final String title;
  final String detail;
  final DateTime timestamp;
  final NotificationAudience audience;
  bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.detail,
    required this.timestamp,
    required this.audience,
    this.isRead = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'detail': detail,
      'timestamp': timestamp.toIso8601String(),
      'time': '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}',
      'read': isRead,
      'audience': audience.name,
    };
  }

  factory NotificationItem.fromMap(Map<dynamic, dynamic> map, String keyId) {
    DateTime ts = DateTime.now();
    if (map['timestamp'] != null) {
      ts = DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now();
    }
    return NotificationItem(
      id: (map['id'] ?? keyId).toString(),
      title: (map['title'] ?? 'Notification').toString(),
      detail: (map['detail'] ?? '').toString(),
      timestamp: ts,
      audience: NotificationAudience.all,
      isRead: map['read'] == true,
    );
  }
}
