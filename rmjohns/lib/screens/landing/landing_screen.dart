import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';

class LandingScreen extends StatelessWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const LandingScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.primaryDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    "RMJohn's Mini Grocery & Eatery",
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Integrated Eateries System',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, height: 1.2),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Streamlined online ordering, point-of-sale, inventory, staff attendance, and customer loyalty rewards in one unified mobile platform.',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () => onNavigate('login'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.primary,
                      ),
                      icon: const Icon(Icons.login, size: 18),
                      label: const Text('Sign In / Get Started'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => onNavigate('menu'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white, width: 1.5),
                      ),
                      icon: const Icon(Icons.restaurant_menu, size: 18),
                      label: const Text('Browse Menu'),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          const Text(
            'System Capabilities',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),

          // Feature Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.05,
            children: [
              _featureCard('Online Ordering', 'Browse silog meals & solo orders with custom add-ons', Icons.shopping_bag_outlined),
              _featureCard('POS Cashier', 'Fast counter checkout with service charge & discounts', Icons.point_of_sale),
              _featureCard('Staff Attendance', 'ESP32 RFID device simulator for clock in/out', Icons.badge_outlined),
              _featureCard('Loyalty Rewards', 'Earn points per order & redeem complimentary items', Icons.stars_outlined),
              _featureCard('Kitchen Board', 'Real-time order stage queue (Pending, Prep, Ready)', Icons.soup_kitchen_outlined),
              _featureCard('Sales Analytics', 'Detailed revenue, billing ledger & refund tracking', Icons.bar_chart),
            ],
          ),

          const SizedBox(height: 24),
          // Quick Demo Role Sign In
          Card(
            color: AppColors.primaryLight,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Quick Demo Sign-In',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                  ),
                  const SizedBox(height: 4),
                  const Text('Select a role to test the app features immediately:', style: TextStyle(fontSize: 12)),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          appState.login('admin', 'admin123');
                          onNavigate('overview');
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.purple.shade700),
                        child: const Text('Admin'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          appState.login('staff', 'staff123');
                          onNavigate('staff_dashboard');
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade700),
                        child: const Text('Staff'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          appState.login('customer', 'cust123');
                          onNavigate('customer_home');
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
                        child: const Text('Customer'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _featureCard(String title, String desc, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.primary, size: 26),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Expanded(
              child: Text(
                desc,
                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
