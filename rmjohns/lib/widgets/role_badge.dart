import 'package:flutter/material.dart';
import '../models/user_role.dart';
import '../theme/app_colors.dart';

class RoleBadge extends StatelessWidget {
  final UserRole role;

  const RoleBadge({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    Color bg = AppColors.forest;
    Color fg = Colors.white;

    if (role == UserRole.admin) {
      bg = AppColors.forest;
      fg = AppColors.lime;
    } else if (role == UserRole.staff) {
      bg = AppColors.statusPreparing;
      fg = Colors.white;
    } else if (role == UserRole.customer) {
      bg = AppColors.sage;
      fg = Colors.white;
    } else {
      bg = AppColors.line;
      fg = AppColors.ink;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        role.label,
        style: TextStyle(
          color: fg,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
