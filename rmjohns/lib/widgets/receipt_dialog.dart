import 'package:flutter/material.dart';
import '../models/order.dart';
import '../theme/app_colors.dart';

class ReceiptDialog extends StatelessWidget {
  final OrderModel order;

  const ReceiptDialog({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 400),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(Icons.storefront, size: 48, color: AppColors.primary),
              const SizedBox(height: 8),
              const Text(
                "RMJohn's Mini Grocery",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              ),
              const Text(
                'Integrated Eateries System',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
              const Divider(height: 32),
              Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order ID: ${order.id}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('Customer: ${order.customerName}'),
                    Text('Order Type: ${order.orderType}'),
                    Text('Payment: ${order.paymentMethod}'),
                    Text('Date: ${order.createdAt.toString().substring(0, 16)}'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Divider(),
              const Text('ITEMS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1)),
              const SizedBox(height: 8),
              ...order.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${item.quantity}x ${item.menuItem.name} ${item.selectedAddon != 'None' ? '(${item.selectedAddon})' : ''}',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      Text('₱${item.totalPrice.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                );
              }),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal'),
                  Text('₱${order.subtotal.toStringAsFixed(2)}'),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Service Charge (5%)'),
                  Text('₱${order.serviceCharge.toStringAsFixed(2)}'),
                ],
              ),
              if (order.discount > 0) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Discount'),
                    Text('-₱${order.discount.toStringAsFixed(2)}', style: const TextStyle(color: Colors.red)),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('TOTAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(
                    '₱${order.total.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Receipt sent to printer / downloaded!')),
                    );
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.print),
                  label: const Text('Print Receipt'),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
