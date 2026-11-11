import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/order.dart';
import '../../widgets/pagination_bar.dart';

class SalesScreen extends StatefulWidget {
  final AppState appState;

  const SalesScreen({super.key, required this.appState});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    double totalRevenue = widget.appState.orders.fold(0.0, (s, o) => s + (o.status != OrderStatus.cancelled && o.status != OrderStatus.refunded ? o.total : 0.0));
    int validOrders = widget.appState.orders.where((o) => o.status != OrderStatus.cancelled && o.status != OrderStatus.refunded).length;
    double avgValue = validOrders > 0 ? totalRevenue / validOrders : 0.0;

    final orderList = widget.appState.orders;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedOrders = orderList.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Sales Analytics & Revenue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),

          LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 500) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _card('Total Revenue', '₱${totalRevenue.toStringAsFixed(2)}', AppColors.primary)),
                        const SizedBox(width: 8),
                        Expanded(child: _card('Valid Orders', '$validOrders', AppColors.secondary)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _card('Avg Order Value', '₱${avgValue.toStringAsFixed(2)}', Colors.blue),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(child: _card('Total Revenue', '₱${totalRevenue.toStringAsFixed(2)}', AppColors.primary)),
                  const SizedBox(width: 8),
                  Expanded(child: _card('Valid Orders', '$validOrders', AppColors.secondary)),
                  const SizedBox(width: 8),
                  Expanded(child: _card('Avg Order Value', '₱${avgValue.toStringAsFixed(2)}', Colors.blue)),
                ],
              );
            },
          ),

          const SizedBox(height: 20),
          const Text('Transaction Breakdown', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          Expanded(
            child: Card(
              child: ListView.separated(
                itemCount: paginatedOrders.length,
                separatorBuilder: (ctx, i) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final o = paginatedOrders[index];
                  return ListTile(
                    dense: true,
                    title: Text('${o.id} - ${o.customerName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
                    subtitle: Text('${o.orderType} • ${o.paymentMethod}', style: const TextStyle(fontSize: 11)),
                    trailing: Text('₱${o.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14)),
                  );
                },
              ),
            ),
          ),

          if (orderList.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: orderList.length,
              itemsPerPage: _itemsPerPage,
              onPageChanged: (newPage) {
                setState(() => _currentPage = newPage);
              },
            ),
        ],
      ),
    );
  }

  Widget _card(String t, String v, Color c) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Text(t, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(v, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: c)),
            ),
          ],
        ),
      ),
    );
  }
}
