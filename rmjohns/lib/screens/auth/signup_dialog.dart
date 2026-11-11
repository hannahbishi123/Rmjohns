import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../utils/validators.dart';

class SignUpDialog extends StatefulWidget {
  final AppState appState;
  final VoidCallback onSuccess;

  const SignUpDialog({
    super.key,
    required this.appState,
    required this.onSuccess,
  });

  @override
  State<SignUpDialog> createState() => _SignUpDialogState();
}

class _SignUpDialogState extends State<SignUpDialog> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _error;

  void _submit() {
    setState(() => _error = null);

    final nameErr = AppValidators.validateName(_nameController.text);
    if (nameErr != null) {
      setState(() => _error = nameErr);
      return;
    }

    final emailErr = AppValidators.validateEmail(_emailController.text);
    if (emailErr != null) {
      setState(() => _error = emailErr);
      return;
    }

    final phoneErr = AppValidators.validatePhone(_phoneController.text, required: false);
    if (phoneErr != null) {
      setState(() => _error = phoneErr);
      return;
    }

    final passErr = AppValidators.validatePassword(_passwordController.text);
    if (passErr != null) {
      setState(() => _error = passErr);
      return;
    }

    final phone = _phoneController.text.trim().isEmpty ? '09170000000' : _phoneController.text.trim();
    widget.appState.signUpCustomer(_nameController.text.trim(), _emailController.text.trim(), phone, _passwordController.text);
    Navigator.pop(context);
    widget.onSuccess();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create Customer Account',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade300),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(color: Colors.red.shade800, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full Name (Min 2 chars)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email Address'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone Number (e.g. 09171234567)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password (4-64 chars)'),
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: _submit,
                child: const Text('Register & Sign In'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
