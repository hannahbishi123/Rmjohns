import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../utils/validators.dart';
import '../../widgets/receipt_dialog.dart';

class CheckoutScreen extends StatefulWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const CheckoutScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Order fields
  late TextEditingController _nameController;
  final _notesController = TextEditingController();
  String selectedOrderType = 'Pickup';
  String selectedPaymentMethod = 'Cash';

  // Reservation fields
  DateTime selectedDate = DateTime.now();
  String selectedTime = '18:00';
  int guestCount = 2;

  final List<String> orderTypes = ['Pickup', 'Dine in', 'Takeout', 'Online'];
  final List<String> paymentMethods = ['Cash', 'GCash', 'Maya', 'Card', 'QR Payment'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _nameController = TextEditingController(text: widget.appState.currentUser?.name ?? 'Juan Customer');
  }

  void _submitOrder() {
    final nameErr = AppValidators.validateName(_nameController.text);
    if (nameErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(nameErr)));
      return;
    }

    final notesErr = AppValidators.validateOrderNotes(_notesController.text);
    if (notesErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(notesErr)));
      return;
    }

    final newOrder = widget.appState.placeOrder(
      name: _nameController.text.trim(),
      orderType: selectedOrderType,
      paymentMethod: selectedPaymentMethod,
      notes: _notesController.text.trim(),
    );

    if (newOrder != null) {
      showDialog(
        context: context,
        builder: (ctx) => ReceiptDialog(order: newOrder),
      );
      widget.onNavigate('my_orders');
    }
  }

  void _submitReservation() {
    final nameErr = AppValidators.validateName(_nameController.text);
    if (nameErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(nameErr)));
      return;
    }

    final dateErr = AppValidators.validateReservationDate(selectedDate);
    if (dateErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(dateErr)));
      return;
    }

    if (guestCount < 1 || guestCount > 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Guest count must be between 1 and 20.')),
      );
      return;
    }

    widget.appState.createReservation(
      name: _nameController.text.trim(),
      date: selectedDate,
      time: selectedTime,
      guestCount: guestCount,
    );

    widget.onNavigate('my_orders');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout & Reservations'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.shopping_bag_outlined), text: 'Pickup / Delivery Order'),
            Tab(icon: Icon(Icons.event_seat_outlined), text: 'Table Reservation'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ORDER TAB
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Customer Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Your Name (Min 2 chars)'),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Order Type', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            initialValue: selectedOrderType,
                            items: orderTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => selectedOrderType = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            initialValue: selectedPaymentMethod,
                            items: paymentMethods.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => selectedPaymentMethod = val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),
                TextField(
                  controller: _notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Order Notes / Instructions (Max 500 chars)',
                    hintText: 'e.g., Extra spicy, less oil, call upon arrival',
                  ),
                ),

                const SizedBox(height: 24),
                Card(
                  color: AppColors.primaryLight,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Subtotal:'),
                            Text('₱${widget.appState.cartSubtotal.toStringAsFixed(2)}'),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Service Charge (5%):'),
                            Text('₱${widget.appState.cartServiceCharge.toStringAsFixed(2)}'),
                          ],
                        ),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL PAYABLE:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            Text(
                              '₱${widget.appState.cartTotal.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppColors.primaryDark),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: widget.appState.cart.isEmpty ? null : _submitOrder,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Place Order'),
                  ),
                ),
              ],
            ),
          ),

          // RESERVATION TAB
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Reserve a Table', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ListTile(
                  title: const Text('Reservation Date'),
                  subtitle: Text(selectedDate.toString().substring(0, 10)),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                    if (picked != null) setState(() => selectedDate = picked);
                  },
                ),
                const Divider(),
                ListTile(
                  title: const Text('Reservation Time'),
                  subtitle: Text(selectedTime),
                  trailing: const Icon(Icons.access_time),
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: const TimeOfDay(hour: 18, minute: 0),
                    );
                    if (time != null) {
                      setState(() {
                        selectedTime = '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
                      });
                    }
                  },
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Number of Guests (1-20)', style: TextStyle(fontSize: 15)),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: guestCount > 1 ? () => setState(() => guestCount--) : null,
                        ),
                        Text('$guestCount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: guestCount < 20 ? () => setState(() => guestCount++) : null,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _submitReservation,
                    icon: const Icon(Icons.bookmark_add),
                    label: const Text('Confirm Table Reservation'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
