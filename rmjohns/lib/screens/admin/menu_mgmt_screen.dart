import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/menu_item.dart';
import '../../theme/app_colors.dart';
import '../../utils/validators.dart';
import '../../widgets/pagination_bar.dart';
import '../../widgets/sweet_alert.dart';

class MenuMgmtScreen extends StatefulWidget {
  final AppState appState;

  const MenuMgmtScreen({super.key, required this.appState});

  @override
  State<MenuMgmtScreen> createState() => _MenuMgmtScreenState();
}

class _MenuMgmtScreenState extends State<MenuMgmtScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  void _openItemDialog([MenuItem? existingItem]) {
    final nameCtrl = TextEditingController(text: existingItem?.name ?? '');
    final categoryCtrl = TextEditingController(text: existingItem?.category ?? 'SILOG MEALS');
    final descCtrl = TextEditingController(text: existingItem?.description ?? '');
    final priceCtrl = TextEditingController(text: existingItem?.price.toString() ?? '120');
    final emojiCtrl = TextEditingController(text: existingItem?.emoji ?? '🍲');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existingItem == null ? 'Add New Menu Item' : 'Edit Menu Item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Food Name (2-80 chars)')),
              const SizedBox(height: 8),
              TextField(controller: categoryCtrl, decoration: const InputDecoration(labelText: 'Category')),
              const SizedBox(height: 8),
              TextField(controller: descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Description (10-300 chars)')),
              const SizedBox(height: 8),
              TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price (₱1 - ₱1,000,000)')),
              const SizedBox(height: 8),
              TextField(controller: emojiCtrl, decoration: const InputDecoration(labelText: 'Emoji Icon')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final nameErr = AppValidators.validateFoodName(nameCtrl.text);
              if (nameErr != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(nameErr)));
                return;
              }

              final descErr = AppValidators.validateFoodDescription(descCtrl.text);
              if (descErr != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(descErr)));
                return;
              }

              final priceErr = AppValidators.validatePrice(priceCtrl.text);
              if (priceErr != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(priceErr)));
                return;
              }

              final item = MenuItem(
                id: existingItem?.id ?? 'm-${DateTime.now().millisecondsSinceEpoch}',
                name: nameCtrl.text.trim(),
                category: categoryCtrl.text.trim().isEmpty ? 'SILOG MEALS' : categoryCtrl.text.trim(),
                description: descCtrl.text.trim(),
                price: double.parse(priceCtrl.text.trim()),
                emoji: emojiCtrl.text.trim().isEmpty ? '🍲' : emojiCtrl.text.trim(),
                isAvailable: existingItem?.isAvailable ?? true,
              );

              widget.appState.saveMenuItem(item);
              Navigator.pop(ctx);
              setState(() {});
            },
            child: const Text('Save Item'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allItems = widget.appState.menuItems;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedItems = allItems.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Menu Management',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => _openItemDialog(),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add Item', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          Expanded(
            child: ListView.builder(
              itemCount: paginatedItems.length,
              itemBuilder: (context, index) {
                final item = paginatedItems[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(item.emoji, style: const TextStyle(fontSize: 28)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    '${item.category} • ₱${item.price.toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.description,
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Available: ', style: TextStyle(fontSize: 12)),
                                Switch(
                                  value: item.isAvailable,
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  onChanged: (val) {
                                    widget.appState.toggleItemAvailability(item.id);
                                    setState(() {});
                                  },
                                ),
                              ],
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  icon: const Icon(Icons.edit, color: Colors.blue, size: 20),
                                  onPressed: () => _openItemDialog(item),
                                ),
                                const SizedBox(width: 12),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                                  onPressed: () async {
                                    final confirm = await SweetAlert.showConfirm(
                                      context,
                                      title: 'Delete Menu Item?',
                                      message: 'Are you sure you want to delete "${item.name}"?',
                                      confirmText: 'Delete',
                                      kind: SweetAlertKind.error,
                                    );
                                    if (confirm) {
                                      widget.appState.deleteMenuItem(item.id);
                                      setState(() {});
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (allItems.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: allItems.length,
              itemsPerPage: _itemsPerPage,
              onPageChanged: (newPage) {
                setState(() => _currentPage = newPage);
              },
            ),
        ],
      ),
    );
  }
}
