import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/cart_item.dart';
import '../../theme/app_colors.dart';
import '../../utils/validators.dart';
import '../../widgets/receipt_dialog.dart';

class POSScreen extends StatefulWidget {
  final AppState appState;

  const POSScreen({super.key, required this.appState});

  @override
  State<POSScreen> createState() => _POSScreenState();
}

class _POSScreenState extends State<POSScreen> {
  List<CartItem> posCart = [];
  double discountPercent = 0.0; // 0, 5, 10, 20
  String paymentMethod = 'Cash';
  final _cashTenderedController = TextEditingController(text: '500');

  void _addItemToPOS(dynamic item) {
    setState(() {
      final idx = posCart.indexWhere((c) => c.menuItem.id == item.id);
      if (idx >= 0) {
        posCart[idx].quantity++;
      } else {
        posCart.add(CartItem(menuItem: item, quantity: 1));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    double subtotal = posCart.fold(0.0, (sum, i) => sum + i.totalPrice);
    double serviceCharge = subtotal * 0.05;
    double discount = subtotal * (discountPercent / 100.0);
    double total = subtotal + serviceCharge - discount;
    double cashTendered = double.tryParse(_cashTenderedController.text) ?? 0.0;
    double change = paymentMethod == 'Cash' ? (cashTendered - total) : 0.0;

    String? cashErr;
    if (paymentMethod == 'Cash' && posCart.isNotEmpty) {
      cashErr = AppValidators.validateCashTendered(_cashTenderedController.text, total);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        bool isNarrow = constraints.maxWidth < 600;

        Widget menuSection = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('POS Quick Select Menu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Expanded(
              child: GridView.builder(
                itemCount: widget.appState.menuItems.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isNarrow ? 2 : 2,
                  childAspectRatio: 0.88,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemBuilder: (context, index) {
                  final item = widget.appState.menuItems[index];
                  return Card(
                    child: InkWell(
                      onTap: () => _addItemToPOS(item),
                      child: Padding(
                        padding: const EdgeInsets.all(6),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(item.emoji, style: const TextStyle(fontSize: 28)),
                            const SizedBox(height: 2),
                            Text(
                              item.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text('₱${item.price.toStringAsFixed(0)}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );

        Widget ticketSection = Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Current Ticket', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.delete_sweep, color: Colors.red, size: 22),
                      onPressed: () => setState(() => posCart.clear()),
                    ),
                  ],
                ),
                const Divider(),

                Expanded(
                  child: posCart.isEmpty
                      ? const Center(child: Text('Tap items from the left menu to add', style: TextStyle(fontSize: 12)))
                      : ListView.builder(
                          itemCount: posCart.length,
                          itemBuilder: (context, index) {
                            final c = posCart[index];
                            return ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(c.menuItem.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), overflow: TextOverflow.ellipsis),
                              subtitle: Text('₱${c.unitPrice.toStringAsFixed(2)} x ${c.quantity}', style: const TextStyle(fontSize: 11)),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                                    onPressed: () {
                                      setState(() {
                                        c.quantity--;
                                        if (c.quantity <= 0) posCart.removeAt(index);
                                      });
                                    },
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    child: Text('${c.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ),
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(Icons.add_circle_outline, size: 20),
                                    onPressed: () {
                                      setState(() => c.quantity++);
                                    },
                                  ),
                                  const SizedBox(width: 6),
                                  Text('₱${c.totalPrice.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                ],
                              ),
                            );
                          },
                        ),
                ),

                const Divider(),

                // Discounts & Payment Controls
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      const Text('Discount: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ...[0.0, 5.0, 10.0, 20.0].map((d) {
                        final sel = discountPercent == d;
                        return Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: ChoiceChip(
                            label: Text('${d.toInt()}%', style: const TextStyle(fontSize: 11)),
                            selected: sel,
                            onSelected: (s) => setState(() => discountPercent = d),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 6),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    DropdownButton<String>(
                      value: paymentMethod,
                      isDense: true,
                      style: const TextStyle(fontSize: 13, color: AppColors.textDark),
                      items: ['Cash', 'GCash', 'Maya', 'Card', 'QR Payment']
                          .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => paymentMethod = val);
                      },
                    ),
                    if (paymentMethod == 'Cash')
                      SizedBox(
                        width: 100,
                        child: TextField(
                          controller: _cashTenderedController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 13),
                          onChanged: (v) => setState(() {}),
                          decoration: InputDecoration(
                            labelText: 'Tendered (₱)',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                            errorText: cashErr != null ? '' : null,
                          ),
                        ),
                      ),
                  ],
                ),

                if (cashErr != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(cashErr, style: const TextStyle(color: Colors.red, fontSize: 10)),
                  ),

                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('TOTAL PAYABLE:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('₱${total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                  ],
                ),
                if (paymentMethod == 'Cash')
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Change:', style: TextStyle(fontSize: 12)),
                      Text(
                        '₱${change.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: change < 0 ? Colors.red : Colors.green.shade800,
                        ),
                      ),
                    ],
                  ),

                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: posCart.isEmpty || cashErr != null
                        ? null
                        : () {
                            final posOrder = widget.appState.completePOSSale(
                              posItems: List.from(posCart),
                              paymentMethod: paymentMethod,
                              discountPercent: discountPercent,
                              cashTendered: cashTendered,
                            );
                            if (posOrder != null) {
                              setState(() => posCart.clear());
                              showDialog(
                                context: context,
                                builder: (ctx) => ReceiptDialog(order: posOrder),
                              );
                            }
                          },
                    icon: const Icon(Icons.check_circle, size: 18),
                    label: const Text('Complete Sale & Print', style: TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        );

        if (isNarrow) {
          return Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: [
                Expanded(flex: 3, child: menuSection),
                const SizedBox(height: 8),
                Expanded(flex: 4, child: ticketSection),
              ],
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 3, child: menuSection),
              const SizedBox(width: 12),
              Expanded(flex: 4, child: ticketSection),
            ],
          ),
        );
      },
    );
  }
}
