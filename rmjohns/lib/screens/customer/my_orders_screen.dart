import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/user_role.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/receipt_dialog.dart';
import '../../widgets/pagination_bar.dart';
import '../../theme/app_colors.dart';

class MyOrdersScreen extends StatefulWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const MyOrdersScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 4;

  @override
  Widget build(BuildContext context) {
    final customerOrders = widget.appState.orders
        .where((o) => o.customerId == (widget.appState.currentUser?.id ?? 'CUST-001') || widget.appState.currentRole == UserRole.customer)
        .toList();

    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedOrders = customerOrders.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My Orders & Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),

          Expanded(
            child: customerOrders.isEmpty
                ? const Center(
                    child: Text('You have no placed orders yet.'),
                  )
                : ListView.builder(
                    itemCount: paginatedOrders.length,
                    itemBuilder: (context, index) {
                      final order = paginatedOrders[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    order.id,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  StatusChip(status: order.status),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Type: ${order.orderType} • Method: ${order.paymentMethod}',
                                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              ),
                              const Divider(height: 16),

                              ...order.items.map((item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${item.quantity}x ${item.menuItem.name} ${item.selectedAddon != 'None' ? '(${item.selectedAddon})' : ''}',
                                            style: const TextStyle(fontSize: 13),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '₱${item.totalPrice.toStringAsFixed(2)}',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  )),

                              const Divider(height: 16),
                              Wrap(
                                alignment: WrapAlignment.spaceBetween,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 10,
                                runSpacing: 8,
                                children: [
                                  Text(
                                    'Total: ₱${order.total.toStringAsFixed(2)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                  ),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                        onPressed: () {
                                          for (var item in order.items) {
                                            widget.appState.addToCart(item.menuItem, quantity: item.quantity, addon: item.selectedAddon);
                                          }
                                          widget.onNavigate('cart');
                                        },
                                        icon: const Icon(Icons.refresh, size: 14),
                                        label: const Text('Reorder', style: TextStyle(fontSize: 12)),
                                      ),
                                      const SizedBox(width: 6),
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                        onPressed: () {
                                          showDialog(
                                            context: context,
                                            builder: (ctx) => ReceiptDialog(order: order),
                                          );
                                        },
                                        icon: const Icon(Icons.receipt_long, size: 14),
                                        label: const Text('Receipt', style: TextStyle(fontSize: 12)),
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

          if (customerOrders.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: customerOrders.length,
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
