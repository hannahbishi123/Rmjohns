import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/order.dart';
import '../../theme/app_colors.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/pagination_bar.dart';

class KitchenScreen extends StatefulWidget {
  final AppState appState;

  const KitchenScreen({super.key, required this.appState});

  @override
  State<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends State<KitchenScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 4;

  @override
  Widget build(BuildContext context) {
    final activeOrders = widget.appState.orders.where((o) =>
      o.status == OrderStatus.pending ||
      o.status == OrderStatus.confirmed ||
      o.status == OrderStatus.preparing ||
      o.status == OrderStatus.ready
    ).toList();

    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedActive = activeOrders.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Kitchen Queue Board', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Text('${activeOrders.length} active tickets', style: const TextStyle(color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 12),

          Expanded(
            child: activeOrders.isEmpty
                ? const Center(
                    child: Text('All kitchen orders completed! Great job team. 🎉'),
                  )
                : ListView.builder(
                    itemCount: paginatedActive.length,
                    itemBuilder: (context, index) {
                      final order = paginatedActive[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${order.id} • ${order.orderType}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  StatusChip(status: order.status),
                                ],
                              ),
                              Text('Customer: ${order.customerName}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              const Divider(height: 16),

                              ...order.items.map((item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2),
                                    child: Text('• ${item.quantity}x ${item.menuItem.name} ${item.selectedAddon != 'None' ? '(${item.selectedAddon})' : ''}'),
                                  )),

                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (order.status == OrderStatus.pending || order.status == OrderStatus.confirmed)
                                    ElevatedButton.icon(
                                      onPressed: () => widget.appState.updateOrderStatus(order.id, OrderStatus.preparing),
                                      icon: const Icon(Icons.play_arrow),
                                      label: const Text('Start Preparing'),
                                    )
                                  else if (order.status == OrderStatus.preparing)
                                    ElevatedButton.icon(
                                      onPressed: () => widget.appState.updateOrderStatus(order.id, OrderStatus.ready),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusReady),
                                      icon: const Icon(Icons.check_circle_outline),
                                      label: const Text('Mark Ready'),
                                    )
                                  else if (order.status == OrderStatus.ready)
                                    ElevatedButton.icon(
                                      onPressed: () => widget.appState.updateOrderStatus(order.id, OrderStatus.completed),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
                                      icon: const Icon(Icons.done_all),
                                      label: const Text('Complete Order'),
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

          if (activeOrders.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: activeOrders.length,
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
