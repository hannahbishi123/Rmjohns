import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/menu_item.dart';
import 'item_detail_dialog.dart';

class CustomerMenuScreen extends StatefulWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const CustomerMenuScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  State<CustomerMenuScreen> createState() => _CustomerMenuScreenState();
}

class _CustomerMenuScreenState extends State<CustomerMenuScreen> {
  final _searchController = TextEditingController();
  String selectedCat = 'All';

  final List<String> menuCategories = [
    'All',
    'SILOG MEALS',
    'SOLO ORDERS',
    'ULAM + KANIN',
    'EXTRAS',
    'COLD DRINKS',
    'HOT DRINKS',
    'DESSERTS',
  ];

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();

    // Group available items by category
    final Map<String, List<MenuItem>> groupedItems = {};
    for (var cat in menuCategories.where((c) => c != 'All')) {
      groupedItems[cat] = [];
    }

    for (var item in widget.appState.menuItems) {
      final matchesCat = selectedCat == 'All' || item.category == selectedCat;
      final matchesSearch = query.isEmpty ||
          item.name.toLowerCase().contains(query) ||
          item.description.toLowerCase().contains(query);

      if (matchesCat && matchesSearch) {
        groupedItems.putIfAbsent(item.category, () => []);
        groupedItems[item.category]!.add(item);
      }
    }

    final activeCategories = groupedItems.entries.where((e) => e.value.isNotEmpty).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header / Search Bar
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Search RmJohn\'s menu...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 10),

          // Category Pills Selector
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: menuCategories.length,
              itemBuilder: (context, index) {
                final cat = menuCategories[index];
                final isSelected = selectedCat == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(cat),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textDark,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (sel) {
                      if (sel) setState(() => selectedCat = cat);
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          // Menu Content Organized by Category
          Expanded(
            child: activeCategories.isEmpty
                ? const Center(
                    child: Text('No menu items found matching your filter.'),
                  )
                : ListView.builder(
                    itemCount: activeCategories.length,
                    itemBuilder: (context, catIdx) {
                      final categoryName = activeCategories[catIdx].key;
                      final items = activeCategories[catIdx].value;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category Section Header Banner
                          Container(
                            margin: const EdgeInsets.only(top: 6, bottom: 10),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(_getCategoryIcon(categoryName), color: Colors.white, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    categoryName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white24,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '${items.length} items',
                                    style: const TextStyle(color: Colors.white, fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Items Grid for this Category with generous height ratio to prevent ANY overflow
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: items.length,
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.70,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                            ),
                            itemBuilder: (context, itemIdx) {
                              final item = items[itemIdx];
                              return Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Center(
                                        child: Text(item.emoji, style: const TextStyle(fontSize: 32)),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Expanded(
                                        child: Text(
                                          item.description,
                                          style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Flexible(
                                            child: Text(
                                              '₱${item.price.toStringAsFixed(2)}',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.primary,
                                                fontSize: 14,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          InkWell(
                                            onTap: item.isAvailable
                                                ? () {
                                                    showDialog(
                                                      context: context,
                                                      builder: (ctx) => ItemDetailDialog(
                                                        menuItem: item,
                                                        appState: widget.appState,
                                                      ),
                                                    );
                                                  }
                                                : null,
                                            child: Container(
                                              padding: const EdgeInsets.all(6),
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryLight,
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: const Icon(
                                                Icons.add_shopping_cart,
                                                color: AppColors.primary,
                                                size: 18,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'SILOG MEALS':
        return Icons.egg_outlined;
      case 'SOLO ORDERS':
        return Icons.dinner_dining;
      case 'ULAM + KANIN':
        return Icons.rice_bowl;
      case 'EXTRAS':
        return Icons.add_circle_outline;
      case 'COLD DRINKS':
        return Icons.local_drink;
      case 'HOT DRINKS':
        return Icons.coffee;
      case 'DESSERTS':
        return Icons.icecream_outlined;
      default:
        return Icons.restaurant;
    }
  }
}
