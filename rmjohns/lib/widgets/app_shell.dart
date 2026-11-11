import 'package:flutter/material.dart';
import '../models/user_role.dart';
import '../state/app_state.dart';
import '../theme/app_colors.dart';
import 'role_badge.dart';
import 'sweet_alert.dart';

class AppShell extends StatelessWidget {
  final AppState appState;
  final String activeRoute;
  final Function(String) onNavigate;
  final Widget child;

  const AppShell({
    super.key,
    required this.appState,
    required this.activeRoute,
    required this.onNavigate,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final unreadCount = appState.filteredNotifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 4,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.forest,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Text(
                  'RM',
                  style: TextStyle(
                    color: AppColors.lime,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Text(
                    "RMJohn's",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.forest),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'EATERY',
                    style: TextStyle(fontSize: 9, color: AppColors.muted, fontWeight: FontWeight.w600, letterSpacing: 1.2),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Firebase Live Connection Status Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: appState.isFirebaseConnected
                  ? AppColors.statusReadyBg
                  : AppColors.statusPendingBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: appState.isFirebaseConnected
                    ? AppColors.statusReady.withOpacity(0.3)
                    : AppColors.statusPending.withOpacity(0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: appState.isFirebaseConnected
                        ? AppColors.statusReady
                        : AppColors.statusPending,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  appState.isFirebaseConnected ? 'Firebase Connected' : 'Offline Sync',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: appState.isFirebaseConnected
                        ? AppColors.statusReady
                        : AppColors.statusPending,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: RoleBadge(role: appState.currentRole),
          ),
          const SizedBox(width: 4),

          // Cart badge for customer
          if (appState.currentRole == UserRole.customer)
            Stack(
              alignment: Alignment.center,
              children: [
                IconButton(
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.shopping_cart_outlined, size: 20, color: AppColors.ink),
                  onPressed: () => onNavigate('cart'),
                ),
                if (appState.cartCount > 0)
                  Positioned(
                    right: 2,
                    top: 6,
                    child: CircleAvatar(
                      radius: 8,
                      backgroundColor: AppColors.forest,
                      child: Text(
                        '${appState.cartCount}',
                        style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),

          // Notifications icon
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                padding: const EdgeInsets.all(8),
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.notifications_none, size: 20, color: AppColors.ink),
                onPressed: () => onNavigate('notifications'),
              ),
              if (unreadCount > 0)
                Positioned(
                  right: 2,
                  top: 6,
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: AppColors.statusCancelled,
                    child: Text(
                      '$unreadCount',
                      style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),

          // Profile or Login
          if (appState.currentRole == UserRole.public)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: TextButton(
                onPressed: () => onNavigate('login'),
                child: const Text('Login', style: TextStyle(fontSize: 12, color: AppColors.forest, fontWeight: FontWeight.bold)),
              ),
            )
          else
            IconButton(
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(),
              icon: const Icon(Icons.account_circle_outlined, size: 22, color: AppColors.forest),
              onPressed: () => onNavigate('profile'),
            ),
          const SizedBox(width: 6),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: AppColors.forest),
              accountName: Text(
                appState.currentUser?.name ?? "RMJohn's Eatery",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                overflow: TextOverflow.ellipsis,
              ),
              accountEmail: Text(
                appState.currentUser?.email ?? 'Integrated Restaurant System',
                style: const TextStyle(fontSize: 12, color: AppColors.sageLight),
                overflow: TextOverflow.ellipsis,
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: AppColors.lime,
                child: Text(
                  appState.currentUser?.name.substring(0, 1).toUpperCase() ?? 'R',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.forestDeep,
                  ),
                ),
              ),
            ),

            // NAV ITEMS BY ROLE
            if (appState.currentRole == UserRole.public) ...[
              _navTile(context, 'landing', 'Home Landing', Icons.home_outlined),
              _navTile(context, 'login', 'Sign In', Icons.login),
            ],

            if (appState.currentRole == UserRole.customer) ...[
              _navTile(context, 'customer_home', 'Home', Icons.home_outlined),
              _navTile(context, 'menu', 'Browse Menu', Icons.restaurant_menu),
              _navTile(context, 'cart', 'My Cart (${appState.cartCount})', Icons.shopping_cart_outlined),
              _navTile(context, 'my_orders', 'My Orders', Icons.receipt_long),
              _navTile(context, 'loyalty', 'Loyalty Rewards (${appState.customerPoints} pts)', Icons.stars),
              _navTile(context, 'notifications', 'Notifications', Icons.notifications_none),
              _navTile(context, 'profile', 'Profile', Icons.person_outline),
            ],

            if (appState.currentRole == UserRole.staff) ...[
              _navTile(context, 'staff_dashboard', 'Staff Dashboard', Icons.dashboard_outlined),
              _navTile(context, 'kitchen', 'Kitchen Board', Icons.soup_kitchen_outlined),
              _navTile(context, 'orders', 'Orders Queue', Icons.list_alt),
              _navTile(context, 'attendance', 'Attendance & Shifts', Icons.access_time),
              _navTile(context, 'notifications', 'Notifications', Icons.notifications_none),
              _navTile(context, 'profile', 'Profile', Icons.person_outline),
            ],

            if (appState.currentRole == UserRole.admin) ...[
              _navTile(context, 'overview', 'Overview Dashboard', Icons.dashboard_outlined),
              _navTile(context, 'orders', 'All Orders', Icons.receipt_long),
              _navTile(context, 'kitchen', 'Kitchen Queue', Icons.soup_kitchen_outlined),
              _navTile(context, 'pos', 'POS Cashier', Icons.point_of_sale),
              _navTile(context, 'sales', 'Sales Reports', Icons.bar_chart),
              _navTile(context, 'menu', 'Menu Management', Icons.restaurant_menu),
              _navTile(context, 'customers', 'Customers List', Icons.people_outline),
              _navTile(context, 'staff_mgmt', 'Staff Management', Icons.badge_outlined),
              _navTile(context, 'monitoring', 'Device Reader Sync', Icons.sensors),
              _navTile(context, 'loyalty_mgmt', 'Loyalty & Points', Icons.stars_outlined),
              _navTile(context, 'reports', 'Printable Reports', Icons.assessment_outlined),
              _navTile(context, 'billing', 'Billing & Receipts', Icons.description_outlined),
              _navTile(context, 'payments', 'Payment Ledger', Icons.payments_outlined),
              _navTile(context, 'promotions', 'Promotions', Icons.campaign_outlined),
              _navTile(context, 'settings', 'System Settings', Icons.settings_outlined),
            ],

            const Divider(),

            if (appState.currentRole != UserRole.public)
              ListTile(
                leading: const Icon(Icons.logout, color: AppColors.statusCancelled),
                title: const Text('Sign Out', style: TextStyle(color: AppColors.statusCancelled, fontWeight: FontWeight.bold)),
                onTap: () async {
                  Navigator.pop(context);
                  final confirm = await SweetAlert.showConfirm(
                    context,
                    title: 'Confirm Sign Out',
                    message: 'Are you sure you want to sign out of your account?',
                    confirmText: 'Confirm Sign Out',
                    cancelText: 'Cancel',
                    kind: SweetAlertKind.warning,
                  );
                  if (confirm) {
                    appState.logout();
                    onNavigate('landing');
                  }
                },
              ),
          ],
        ),
      ),
      body: child,
    );
  }

  Widget _navTile(BuildContext context, String route, String title, IconData icon) {
    final isSelected = activeRoute == route;
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppColors.forest : AppColors.muted,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? AppColors.forest : AppColors.ink,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      selectedTileColor: AppColors.primaryLight,
      onTap: () {
        Navigator.pop(context);
        onNavigate(route);
      },
    );
  }
}
