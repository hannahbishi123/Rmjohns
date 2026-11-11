import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../models/user_role.dart';
import '../../utils/validators.dart';
import '../../widgets/sweet_alert.dart';

class ProfileScreen extends StatefulWidget {
  final AppState appState;
  final Function(String) onNavigate;

  const ProfileScreen({
    super.key,
    required this.appState,
    required this.onNavigate,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.appState.currentUser?.name ?? '');
    _emailController = TextEditingController(text: widget.appState.currentUser?.email ?? '');
    _phoneController = TextEditingController(text: widget.appState.currentUser?.phone ?? '');
  }

  void _saveProfile() {
    final nameErr = AppValidators.validateName(_nameController.text);
    if (nameErr != null) {
      widget.appState.showToast(nameErr);
      return;
    }

    final emailErr = AppValidators.validateEmail(_emailController.text);
    if (emailErr != null) {
      widget.appState.showToast(emailErr);
      return;
    }

    final phoneErr = AppValidators.validatePhone(_phoneController.text, required: false);
    if (phoneErr != null) {
      widget.appState.showToast(phoneErr);
      return;
    }

    if (widget.appState.currentUser != null) {
      widget.appState.currentUser!.name = _nameController.text.trim();
      widget.appState.currentUser!.email = _emailController.text.trim();
      widget.appState.currentUser!.phone = _phoneController.text.trim();
      widget.appState.showToast('Profile changes saved successfully!');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    widget.appState.currentUser?.name.substring(0, 1) ?? 'U',
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.appState.currentUser?.name ?? 'Guest User',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Text(
                  widget.appState.currentRole.label,
                  style: const TextStyle(color: AppColors.textMuted),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          const Text('Account Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Full Name (Min 2 chars)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email Address'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone Number (e.g. 09171234567)'),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saveProfile,
              icon: const Icon(Icons.save),
              label: const Text('Save Profile Changes'),
            ),
          ),

          const SizedBox(height: 24),
          const Divider(),

          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sign Out', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            onTap: () async {
              final confirm = await SweetAlert.showConfirm(
                context,
                title: 'Confirm Sign Out',
                message: 'Are you sure you want to sign out of your account?',
                confirmText: 'Confirm Sign Out',
                cancelText: 'Cancel',
                kind: SweetAlertKind.warning,
              );
              if (confirm) {
                widget.appState.logout();
                widget.onNavigate('landing');
              }
            },
          ),
        ],
      ),
    );
  }
}
