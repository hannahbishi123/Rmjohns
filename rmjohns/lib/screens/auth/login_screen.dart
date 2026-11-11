import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/user_role.dart';
import '../../theme/app_colors.dart';
import '../../utils/validators.dart';
import 'signup_dialog.dart';

class LoginScreen extends StatefulWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const LoginScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController(text: 'customer@gmail.com');
  final _passwordController = TextEditingController(text: 'pass1234');
  String? _errorMessage;

  void _handleLogin() {
    setState(() => _errorMessage = null);

    final idErr = AppValidators.validateLoginIdentifier(_identifierController.text);
    if (idErr != null) {
      setState(() => _errorMessage = idErr);
      return;
    }

    final passErr = AppValidators.validatePassword(_passwordController.text);
    if (passErr != null) {
      setState(() => _errorMessage = passErr);
      return;
    }

    final success = widget.appState.login(_identifierController.text.trim(), _passwordController.text);
    if (success) {
      if (widget.appState.currentRole == UserRole.admin) {
        widget.onNavigate('overview');
      } else if (widget.appState.currentRole == UserRole.staff) {
        widget.onNavigate('staff_dashboard');
      } else {
        widget.onNavigate('customer_home');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            elevation: 3,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.storefront, size: 54, color: AppColors.primary),
                  const SizedBox(height: 12),
                  const Text(
                    "RMJohn's Sign In",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const Text(
                    'Integrated Eateries System',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 24),

                  if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade300),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: Colors.red.shade800, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  TextField(
                    controller: _identifierController,
                    decoration: const InputDecoration(
                      labelText: 'Email or Username',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: _handleLogin,
                    child: const Text('Sign In'),
                  ),

                  const SizedBox(height: 12),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Forgot Password'),
                              content: const Text('Password reset instructions have been sent to your email.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('OK'),
                                ),
                              ],
                            ),
                          );
                        },
                        child: const Text('Forgot password?'),
                      ),
                      TextButton(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => SignUpDialog(
                              appState: widget.appState,
                              onSuccess: () {
                                widget.onNavigate('customer_home');
                              },
                            ),
                          );
                        },
                        child: const Text('Sign Up'),
                      ),
                    ],
                  ),

                  const Divider(height: 32),
                  const Text(
                    'Or Demo Quick Sign In:',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.admin_panel_settings, size: 16, color: Colors.purple),
                        label: const Text('Admin Demo'),
                        onPressed: () {
                          widget.appState.login('admin', 'admin123');
                          widget.onNavigate('overview');
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.badge, size: 16, color: Colors.blue),
                        label: const Text('Staff Demo'),
                        onPressed: () {
                          widget.appState.login('staff', 'staff123');
                          widget.onNavigate('staff_dashboard');
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.person, size: 16, color: AppColors.secondary),
                        label: const Text('Customer Demo'),
                        onPressed: () {
                          widget.appState.login('customer', 'cust123');
                          widget.onNavigate('customer_home');
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
