class LoyaltyReward {
  final String id;
  String name;
  String description;
  int pointsRequired;
  bool isAvailable;

  LoyaltyReward({
    required this.id,
    required this.name,
    required this.description,
    required this.pointsRequired,
    this.isAvailable = true,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'points': pointsRequired,
      'available': isAvailable,
    };
  }

  factory LoyaltyReward.fromMap(Map<dynamic, dynamic> map, String keyId) {
    return LoyaltyReward(
      id: (map['id'] ?? keyId).toString(),
      name: (map['name'] ?? 'Reward').toString(),
      description: (map['description'] ?? '').toString(),
      pointsRequired: (map['points'] is num) ? (map['points'] as num).toInt() : 200,
      isAvailable: map['available'] == true,
    );
  }
}

class LoyaltyHistoryItem {
  final String id;
  final String title;
  final int points;
  final bool isEarned;
  final DateTime timestamp;

  LoyaltyHistoryItem({
    required this.id,
    required this.title,
    required this.points,
    required this.isEarned,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'points': points,
      'isEarned': isEarned,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory LoyaltyHistoryItem.fromMap(Map<dynamic, dynamic> map, String keyId) {
    DateTime ts = DateTime.now();
    if (map['timestamp'] != null) {
      ts = DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now();
    }
    return LoyaltyHistoryItem(
      id: (map['id'] ?? keyId).toString(),
      title: (map['title'] ?? map['detail'] ?? 'Points Update').toString(),
      points: (map['points'] is num) ? (map['points'] as num).toInt() : 0,
      isEarned: map['isEarned'] == true || ((map['delta'] is num) && (map['delta'] as num) > 0),
      timestamp: ts,
    );
  }
}
