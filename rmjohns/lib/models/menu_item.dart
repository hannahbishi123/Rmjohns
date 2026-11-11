class MenuItem {
  final String id;
  String name;
  String category;
  String description;
  double price;
  String emoji;
  String tone;
  bool isAvailable;

  MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.price,
    required this.emoji,
    this.tone = 'moss',
    this.isAvailable = true,
  });

  MenuItem copyWith({
    String? name,
    String? category,
    String? description,
    double? price,
    String? emoji,
    String? tone,
    bool? isAvailable,
  }) {
    return MenuItem(
      id: id,
      name: name ?? this.name,
      category: category ?? this.category,
      description: description ?? this.description,
      price: price ?? this.price,
      emoji: emoji ?? this.emoji,
      tone: tone ?? this.tone,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'description': description,
      'price': price,
      'emoji': emoji,
      'tone': tone,
      'available': isAvailable,
    };
  }

  factory MenuItem.fromMap(Map<dynamic, dynamic> map, String keyId) {
    return MenuItem(
      id: (map['id'] ?? keyId).toString(),
      name: (map['name'] ?? 'Untitled Item').toString(),
      category: (map['category'] ?? 'General').toString(),
      description: (map['description'] ?? '').toString(),
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
      emoji: (map['emoji'] ?? '🍽️').toString(),
      tone: (map['tone'] ?? 'moss').toString(),
      isAvailable: map['available'] == true || map['isAvailable'] == true,
    );
  }
}
