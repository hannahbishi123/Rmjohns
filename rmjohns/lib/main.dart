import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'state/app_state.dart';
import 'models/user_role.dart';
import 'widgets/app_shell.dart';
import 'widgets/sweet_alert.dart';

// Screens
import 'screens/landing/landing_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/customer/customer_home_screen.dart';
import 'screens/customer/customer_menu_screen.dart';
import 'screens/customer/cart_screen.dart';
import 'screens/customer/checkout_screen.dart';
import 'screens/customer/my_orders_screen.dart';
import 'screens/customer/customer_loyalty_screen.dart';
import 'screens/staff/staff_dashboard_screen.dart';
import 'screens/staff/kitchen_screen.dart';
import 'screens/staff/attendance_screen.dart';
import 'screens/admin/overview_screen.dart';
import 'screens/admin/pos_screen.dart';
import 'screens/admin/orders_screen.dart';
import 'screens/admin/sales_screen.dart';
import 'screens/admin/menu_mgmt_screen.dart';
import 'screens/admin/customers_screen.dart';
import 'screens/admin/staff_mgmt_screen.dart';
import 'screens/admin/monitoring_screen.dart';
import 'screens/admin/loyalty_mgmt_screen.dart';
import 'screens/admin/reports_screen.dart';
import 'screens/admin/billing_screen.dart';
import 'screens/admin/payments_screen.dart';
import 'screens/admin/promotions_screen.dart';
import 'screens/admin/settings_screen.dart';
import 'screens/shared/notifications_screen.dart';
import 'screens/shared/profile_screen.dart';

void main() {
  runApp(const RMJohnsApp());
}

class RMJohnsApp extends StatefulWidget {
  const RMJohnsApp({super.key});

  @override
  State<RMJohnsApp> createState() => _RMJohnsAppState();
}

class _RMJohnsAppState extends State<RMJohnsApp> {
  late final AppState appState;
  String activeRoute = 'landing';
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    appState = AppState();
    appState.addListener(_onStateChange);
  }

  @override
  void dispose() {
    appState.removeListener(_onStateChange);
    appState.dispose();
    super.dispose();
  }

  void _onStateChange() {
    if (appState.toastMessage != null) {
      final msg = appState.toastMessage!;
      appState.clearToast();
      final ctx = _navigatorKey.currentContext;
      if (ctx != null) {
        SweetAlertKind kind = SweetAlertKind.success;
        if (msg.toLowerCase().contains('invalid') ||
            msg.toLowerCase().contains('error') ||
            msg.toLowerCase().contains('required') ||
            msg.toLowerCase().contains('insufficient') ||
            msg.toLowerCase().contains('deleted') ||
            msg.toLowerCase().contains('cannot')) {
          kind = msg.toLowerCase().contains('deleted') ? SweetAlertKind.warning : SweetAlertKind.error;
        }

        SweetAlert.showToast(
          ctx,
          title: msg,
          kind: kind,
        );
      }
    }
    setState(() {});
  }

  void navigateTo(String route) {
    setState(() {
      activeRoute = route;
    });
  }

  Widget _buildBody() {
    switch (activeRoute) {
      case 'landing':
        return LandingScreen(appState: appState, onNavigate: navigateTo);
      case 'login':
        return LoginScreen(appState: appState, onNavigate: navigateTo);
      case 'customer_home':
        return CustomerHomeScreen(appState: appState, onNavigate: navigateTo);
      case 'menu':
        if (appState.currentRole == UserRole.admin) {
          return MenuMgmtScreen(appState: appState);
        }
        return CustomerMenuScreen(appState: appState, onNavigate: navigateTo);
      case 'cart':
        return CartScreen(appState: appState, onNavigate: navigateTo);
      case 'checkout':
        return CheckoutScreen(appState: appState, onNavigate: navigateTo);
      case 'my_orders':
        return MyOrdersScreen(appState: appState, onNavigate: navigateTo);
      case 'loyalty':
        if (appState.currentRole == UserRole.admin) {
          return LoyaltyMgmtScreen(appState: appState);
        }
        return CustomerLoyaltyScreen(appState: appState);
      case 'staff_dashboard':
        return StaffDashboardScreen(appState: appState, onNavigate: navigateTo);
      case 'kitchen':
        return KitchenScreen(appState: appState);
      case 'attendance':
        return AttendanceScreen(appState: appState);
      case 'overview':
        return OverviewScreen(appState: appState, onNavigate: navigateTo);
      case 'pos':
        return POSScreen(appState: appState);
      case 'orders':
        return OrdersScreen(appState: appState);
      case 'sales':
        return SalesScreen(appState: appState);
      case 'customers':
        return CustomersScreen(appState: appState);
      case 'staff_mgmt':
        return StaffMgmtScreen(appState: appState);
      case 'monitoring':
        return MonitoringScreen(appState: appState);
      case 'loyalty_mgmt':
        return LoyaltyMgmtScreen(appState: appState);
      case 'reports':
        return ReportsScreen(appState: appState);
      case 'billing':
        return BillingScreen(appState: appState);
      case 'payments':
        return PaymentsScreen(appState: appState);
      case 'promotions':
        return PromotionsScreen(appState: appState);
      case 'settings':
        return SettingsScreen(appState: appState);
      case 'notifications':
        return NotificationsScreen(appState: appState);
      case 'profile':
        return ProfileScreen(appState: appState, onNavigate: navigateTo);
      default:
        return LandingScreen(appState: appState, onNavigate: navigateTo);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: "RMJohn's Mini Grocery & Eatery",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: Builder(
        builder: (context) => AppShell(
          appState: appState,
          activeRoute: activeRoute,
          onNavigate: navigateTo,
          child: _buildBody(),
        ),
      ),
    );
  }
}
