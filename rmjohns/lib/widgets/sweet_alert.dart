import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum SweetAlertKind {
  success,
  error,
  warning,
  info,
}

class SweetAlert {
  /// Shows a top-center SweetAlert toast notification that automatically dismisses.
  static void showToast(
    BuildContext context, {
    required String title,
    String? message,
    SweetAlertKind kind = SweetAlertKind.success,
    Duration duration = const Duration(milliseconds: 2600),
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    IconData iconData;
    Color iconColor;
    Color borderColor;

    switch (kind) {
      case SweetAlertKind.success:
        iconData = Icons.check_circle_outline;
        iconColor = AppColors.statusReady;
        borderColor = AppColors.statusReady;
        break;
      case SweetAlertKind.error:
        iconData = Icons.error_outline;
        iconColor = AppColors.statusCancelled;
        borderColor = AppColors.statusCancelled;
        break;
      case SweetAlertKind.warning:
        iconData = Icons.warning_amber_outlined;
        iconColor = AppColors.statusPending;
        borderColor = AppColors.statusPending;
        break;
      case SweetAlertKind.info:
        iconData = Icons.info_outline;
        iconColor = AppColors.statusPreparing;
        borderColor = AppColors.statusPreparing;
        break;
    }

    entry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 12,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: borderColor, width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(iconData, color: iconColor, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.textDark,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (message != null && message.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            message,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      if (entry.mounted) entry.remove();
                    },
                    child: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    overlay.insert(entry);
    Future.delayed(duration, () {
      if (entry.mounted) {
        entry.remove();
      }
    });
  }

  /// Shows a SweetAlert modal confirmation dialog centered exactly in the middle of the screen.
  static Future<bool> showConfirm(
    BuildContext context, {
    required String title,
    required String message,
    String confirmText = 'Confirm',
    String cancelText = 'Cancel',
    SweetAlertKind kind = SweetAlertKind.warning,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        IconData iconData = Icons.help_outline;
        Color iconColor = AppColors.statusPending;

        if (kind == SweetAlertKind.error) {
          iconData = Icons.delete_outline;
          iconColor = AppColors.statusCancelled;
        } else if (kind == SweetAlertKind.warning) {
          iconData = Icons.warning_amber_outlined;
          iconColor = AppColors.statusPending;
        }

        return Dialog(
          alignment: Alignment.center,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(20),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: iconColor.withOpacity(0.15),
                    child: Icon(iconData, color: iconColor, size: 32),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textDark),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: Text(cancelText),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kind == SweetAlertKind.error ? AppColors.statusCancelled : AppColors.primary,
                          ),
                          onPressed: () => Navigator.pop(ctx, true),
                          child: Text(confirmText),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    return result ?? false;
  }
}
