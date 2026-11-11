import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/order.dart';
import '../../models/staff_member.dart';
import '../../widgets/status_chip.dart';

class OverviewScreen extends StatelessWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const OverviewScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    double todaySales = appState.orders.fold(0.0, (sum, o) => sum + (o.status != OrderStatus.cancelled && o.status != OrderStatus.refunded ? o.total : 0.0));
    int pendingCount = appState.orders.where((o) => o.status == OrderStatus.pending).length;
    int staffPresent = appState.staffMembers.where((s) => s.attendanceStatus == AttendanceStatus.present).length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Admin Dashboard', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                    Text("RMJohn's Integrated System", style: TextStyle(color: AppColors.textMuted, fontSize: 11), overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => onNavigate('pos'),
                icon: const Icon(Icons.point_of_sale, size: 18),
                label: const Text('Open POS'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Metric cards
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.15,
            children: [
              _metricTile('Today Sales', '₱${todaySales.toStringAsFixed(2)}', Icons.monetization_on, AppColors.primary),
              _metricTile('Orders Today', '${appState.orders.length}', Icons.receipt_long, Colors.blue),
              _metricTile('Pending Orders', '$pendingCount', Icons.pending_actions, AppColors.statusPending),
              _metricTile('Staff Present', '$staffPresent / ${appState.staffMembers.length}', Icons.badge, AppColors.secondary),
            ],
          ),

          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Recent Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              TextButton(
                onPressed: () => onNavigate('orders'),
                child: const Text('View All Queue'),
              ),
            ],
          ),
          const SizedBox(height: 6),

          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: appState.orders.take(5).length,
              separatorBuilder: (ctx, i) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final o = appState.orders[index];
                return ListTile(
                  title: Text('${o.id} - ${o.customerName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), overflow: TextOverflow.ellipsis),
                  subtitle: Text('${o.orderType} • ₱${o.total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12)),
                  trailing: StatusChip(status: o.status),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _metricTile(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            ),
          ],
        ),
      ),
    );
  }
}
