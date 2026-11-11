import 'package:flutter/material.dart';
import '../../models/menu_item.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';

class ItemDetailDialog extends StatefulWidget {
  final MenuItem menuItem;
  final AppState appState;

  const ItemDetailDialog({
    super.key,
    required this.menuItem,
    required this.appState,
  });

  @override
  State<ItemDetailDialog> createState() => _ItemDetailDialogState();
}

class _ItemDetailDialogState extends State<ItemDetailDialog> {
  int quantity = 1;
  String selectedAddon = 'None';

  final List<String> addons = [
    'None',
    'Extra Rice (+₱15)',
    'Extra Egg (+₱15)',
    'Cheese Sauce (+₱20)',
  ];

  @override
  Widget build(BuildContext context) {
    double addonCost = 0.0;
    if (selectedAddon.contains('Extra Rice')) addonCost = 15.0;
    if (selectedAddon.contains('Extra Egg')) addonCost = 15.0;
    if (selectedAddon.contains('Cheese Sauce')) addonCost = 20.0;

    double itemTotal = (widget.menuItem.price + addonCost) * quantity;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(widget.menuItem.emoji, style: const TextStyle(fontSize: 54)),
              ),
              const SizedBox(height: 8),
              Text(
                widget.menuItem.name,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Text(
                widget.menuItem.category,
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
              const SizedBox(height: 6),
              Text(widget.menuItem.description, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 14),
              const Text('Customize Add-ons', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: selectedAddon,
                decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                items: addons.map((a) => DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => selectedAddon = val);
                },
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Quantity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: quantity > 1 ? () => setState(() => quantity--) : null,
                      ),
                      Text('$quantity', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => setState(() => quantity++),
                      ),
                    ],
                  ),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Price:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(
                    '₱${itemTotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    widget.appState.addToCart(
                      widget.menuItem,
                      quantity: quantity,
                      addon: selectedAddon,
                    );
                    Navigator.pop(context);
                  },
                  icon: const Icon(Icons.add_shopping_cart, size: 18),
                  label: const Text('Add to Cart'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
