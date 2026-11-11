import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/order.dart';

class StaffDashboardScreen extends StatelessWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const StaffDashboardScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final pendingCount = appState.orders.where((o) => o.status == OrderStatus.pending).length;
    final preparingCount = appState.orders.where((o) => o.status == OrderStatus.preparing).length;
    final readyCount = appState.orders.where((o) => o.status == OrderStatus.ready).length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            color: AppColors.primaryLight,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Staff Dashboard (${appState.currentUser?.name ?? "Staff"})',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                        ),
                        const SizedBox(height: 4),
                        const Text('Shift active • Shift Time-In: 08:15 AM'),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => onNavigate('attendance'),
                    icon: const Icon(Icons.access_time),
                    label: const Text('Time In/Out'),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          const Text('Kitchen Queue Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(child: _metricCard('Pending Orders', '$pendingCount', AppColors.statusPending, Icons.hourglass_top)),
              const SizedBox(width: 8),
              Expanded(child: _metricCard('Preparing', '$preparingCount', AppColors.statusPreparing, Icons.soup_kitchen)),
              const SizedBox(width: 8),
              Expanded(child: _metricCard('Ready for Pickup', '$readyCount', AppColors.statusReady, Icons.check_circle)),
            ],
          ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => onNavigate('kitchen'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              icon: const Icon(Icons.soup_kitchen, size: 24),
              label: const Text('Open Kitchen Preparation Queue', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _metricCard(String title, String value, Color color, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textMuted), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
