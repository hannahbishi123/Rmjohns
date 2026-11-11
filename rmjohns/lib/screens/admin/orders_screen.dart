import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/order.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/receipt_dialog.dart';
import '../../widgets/pagination_bar.dart';
import '../../theme/app_colors.dart';

class OrdersScreen extends StatefulWidget {
  final AppState appState;

  const OrdersScreen({super.key, required this.appState});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String selectedFilter = 'All';
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final filters = ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Refunded'];

    final filteredOrders = widget.appState.orders.where((o) {
      if (selectedFilter == 'All') return true;
      return o.status.label == selectedFilter;
    }).toList();

    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedOrders = filteredOrders.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('All Orders Queue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          SizedBox(
            height: 38,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: filters.length,
              itemBuilder: (context, index) {
                final f = filters[index];
                final isSelected = selectedFilter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textDark,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    onSelected: (sel) {
                      if (sel) {
                        setState(() {
                          selectedFilter = f;
                          _currentPage = 1;
                        });
                      }
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: filteredOrders.isEmpty
                ? const Center(child: Text('No orders matching this status filter.'))
                : ListView.builder(
                    itemCount: paginatedOrders.length,
                    itemBuilder: (context, index) {
                      final order = paginatedOrders[index];
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
                                  Text('${order.id} • ${order.customerName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  StatusChip(status: order.status),
                                ],
                              ),
                              Text('Type: ${order.orderType} • Method: ${order.paymentMethod} • Date: ${order.createdAt.toString().substring(0, 16)}',
                                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              const Divider(height: 16),

                              ...order.items.map((item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('${item.quantity}x ${item.menuItem.name} ${item.selectedAddon != 'None' ? '(${item.selectedAddon})' : ''}'),
                                        Text('₱${item.totalPrice.toStringAsFixed(2)}'),
                                      ],
                                    ),
                                  )),

                              const Divider(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Total: ₱${order.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
                                  Row(
                                    children: [
                                      DropdownButton<OrderStatus>(
                                        value: order.status,
                                        underline: const SizedBox(),
                                        items: OrderStatus.values
                                            .map((s) => DropdownMenuItem(value: s, child: Text(s.label)))
                                            .toList(),
                                        onChanged: (newStatus) {
                                          if (newStatus != null) {
                                            widget.appState.updateOrderStatus(order.id, newStatus);
                                            setState(() {});
                                          }
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.receipt_long),
                                        onPressed: () {
                                          showDialog(
                                            context: context,
                                            builder: (ctx) => ReceiptDialog(order: order),
                                          );
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

          if (filteredOrders.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: filteredOrders.length,
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
