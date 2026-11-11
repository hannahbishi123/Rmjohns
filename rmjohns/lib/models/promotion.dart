enum PromotionStatus {
  active,
  scheduled,
  paused,
}

class Promotion {
  final String id;
  String name;
  String detail;
  PromotionStatus status;

  Promotion({
    required this.id,
    required this.name,
    required this.detail,
    this.status = PromotionStatus.active,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'detail': detail,
      'status': status.name[0].toUpperCase() + status.name.substring(1),
    };
  }

  factory Promotion.fromMap(Map<dynamic, dynamic> map, String keyId) {
    final statusStr = (map['status'] ?? 'Active').toString().toLowerCase();
    PromotionStatus st = PromotionStatus.active;
    if (statusStr.contains('sched')) st = PromotionStatus.scheduled;
    if (statusStr.contains('pause')) st = PromotionStatus.paused;

    return Promotion(
      id: (map['id'] ?? keyId).toString(),
      name: (map['name'] ?? 'Promotion').toString(),
      detail: (map['detail'] ?? '').toString(),
      status: st,
    );
  }
}
