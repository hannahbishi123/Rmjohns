import 'package:flutter/material.dart';
import '../../state/app_state.dart';

class ReportsScreen extends StatelessWidget {
  final AppState appState;

  const ReportsScreen({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'System Reports & Audit',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => appState.showToast('Report exported successfully!'),
                icon: const Icon(Icons.file_download, size: 16),
                label: const Text('Export', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.assessment, color: Colors.blue),
              title: const Text('Sales & Order Volume Report', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: const Text('Generated for today\'s transactions', style: TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
        ],
      ),
    );
  }
}
