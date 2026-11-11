import 'menu_item.dart';

class CartItem {
  final MenuItem menuItem;
  int quantity;
  String selectedAddon;

  CartItem({
    required this.menuItem,
    this.quantity = 1,
    this.selectedAddon = 'None',
  });

  double get unitPrice {
    double addonCost = 0.0;
    if (selectedAddon.contains('Extra Rice')) addonCost = 15.0;
    if (selectedAddon.contains('Extra Egg')) addonCost = 15.0;
    if (selectedAddon.contains('Cheese Sauce')) addonCost = 20.0;
    return menuItem.price + addonCost;
  }

  double get totalPrice => unitPrice * quantity;

  Map<String, dynamic> toMap() {
    return {
      'id': menuItem.id,
      'name': menuItem.name,
      'quantity': quantity,
      'price': menuItem.price,
      'selectedAddon': selectedAddon,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
    };
  }

  factory CartItem.fromMap(Map<dynamic, dynamic> map) {
    final item = MenuItem(
      id: (map['id'] ?? map['menuItemId'] ?? 'item').toString(),
      name: (map['name'] ?? 'Item').toString(),
      category: (map['category'] ?? 'General').toString(),
      description: (map['description'] ?? '').toString(),
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
      emoji: (map['emoji'] ?? '🍽️').toString(),
    );
    return CartItem(
      menuItem: item,
      quantity: (map['quantity'] is num) ? (map['quantity'] as num).toInt() : 1,
      selectedAddon: (map['selectedAddon'] ?? 'None').toString(),
    );
  }
}
