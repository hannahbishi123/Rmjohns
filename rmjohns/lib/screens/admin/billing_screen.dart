import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../widgets/receipt_dialog.dart';
import '../../widgets/pagination_bar.dart';

class BillingScreen extends StatefulWidget {
  final AppState appState;

  const BillingScreen({super.key, required this.appState});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final list = widget.appState.orders;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedList = list.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Billing & Receipts Audit', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Expanded(
            child: ListView.builder(
              itemCount: paginatedList.length,
              itemBuilder: (context, index) {
                final o = paginatedList[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${o.id} - ${o.customerName}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (ctx) => ReceiptDialog(order: o),
                                );
                              },
                              child: const Text('View Bill', style: TextStyle(fontSize: 11)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Subtotal: ₱${o.subtotal.toStringAsFixed(2)} • Service Charge (5%): ₱${o.serviceCharge.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (list.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: list.length,
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
