import 'package:flutter/material.dart';
import '../../state/app_state.dart';

class SettingsScreen extends StatefulWidget {
  final AppState appState;

  const SettingsScreen({super.key, required this.appState});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late bool orderUpdates;
  late bool attendanceAlerts;
  late bool loyaltyUpdates;
  late bool receiptCopies;

  @override
  void initState() {
    super.initState();
    orderUpdates = widget.appState.orderUpdatesPref;
    attendanceAlerts = widget.appState.attendanceAlertsPref;
    loyaltyUpdates = widget.appState.loyaltyUpdatesPref;
    receiptCopies = widget.appState.receiptCopiesPref;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('System Preferences & Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          SwitchListTile(
            title: const Text('Order Status Updates Notification'),
            subtitle: const Text('Notify customer when order stage changes'),
            value: orderUpdates,
            onChanged: (val) => setState(() => orderUpdates = val),
          ),
          SwitchListTile(
            title: const Text('Attendance RFID Sync Alerts'),
            subtitle: const Text('Alert admin on staff clock-in / clock-out events'),
            value: attendanceAlerts,
            onChanged: (val) => setState(() => attendanceAlerts = val),
          ),
          SwitchListTile(
            title: const Text('Loyalty Point Earned Updates'),
            subtitle: const Text('Send notification when customer earns or redeems points'),
            value: loyaltyUpdates,
            onChanged: (val) => setState(() => loyaltyUpdates = val),
          ),
          SwitchListTile(
            title: const Text('Auto-print Receipt Copies'),
            subtitle: const Text('Automatically print kitchen duplicate copy on POS sale'),
            value: receiptCopies,
            onChanged: (val) => setState(() => receiptCopies = val),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              widget.appState.saveSettings(
                orderUpdates: orderUpdates,
                attendanceAlerts: attendanceAlerts,
                loyaltyUpdates: loyaltyUpdates,
                receiptCopies: receiptCopies,
              );
            },
            icon: const Icon(Icons.save),
            label: const Text('Save System Preferences'),
          ),
        ],
      ),
    );
  }
}
