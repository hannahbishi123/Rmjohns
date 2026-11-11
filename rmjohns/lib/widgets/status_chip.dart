import 'package:flutter/material.dart';
import '../models/order.dart';
import '../theme/app_colors.dart';

class StatusChip extends StatelessWidget {
  final OrderStatus status;

  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color textColor;
    Color bgColor;

    switch (status) {
      case OrderStatus.pending:
        textColor = AppColors.statusPending;
        bgColor = AppColors.statusPendingBg;
        break;
      case OrderStatus.confirmed:
        textColor = AppColors.statusPending;
        bgColor = AppColors.statusPendingBg;
        break;
      case OrderStatus.preparing:
        textColor = AppColors.statusPreparing;
        bgColor = AppColors.statusPreparingBg;
        break;
      case OrderStatus.ready:
        textColor = AppColors.statusReady;
        bgColor = AppColors.statusReadyBg;
        break;
      case OrderStatus.completed:
        textColor = AppColors.forest;
        bgColor = AppColors.primaryLight;
        break;
      case OrderStatus.cancelled:
      case OrderStatus.refunded:
        textColor = AppColors.statusCancelled;
        bgColor = AppColors.statusCancelledBg;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: textColor.withOpacity(0.3), width: 1),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
