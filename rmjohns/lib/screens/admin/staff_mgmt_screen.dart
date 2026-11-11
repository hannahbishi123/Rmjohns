import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../widgets/pagination_bar.dart';

class StaffMgmtScreen extends StatefulWidget {
  final AppState appState;

  const StaffMgmtScreen({super.key, required this.appState});

  @override
  State<StaffMgmtScreen> createState() => _StaffMgmtScreenState();
}

class _StaffMgmtScreenState extends State<StaffMgmtScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final list = widget.appState.staffMembers;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedList = list.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Staff Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),

          Expanded(
            child: ListView.builder(
              itemCount: paginatedList.length,
              itemBuilder: (context, index) {
                final s = paginatedList[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const CircleAvatar(child: Icon(Icons.badge)),
                    title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Role: ${s.position} • Contact: ${s.contact}\nStatus: ${s.attendanceStatus.name}'),
                    isThreeLine: true,
                    trailing: OutlinedButton(
                      onPressed: () {
                        widget.appState.showToast('Updated staff profile for ${s.name}');
                      },
                      child: const Text('Edit'),
                    ),
                  ),
                );
              },
            ),
          ),

          if (list.isNotEmpty)
            PaginationBar(
              currentPage: _currentPage,
              totalItems: list.length,
              itemsPerPage: _itemsPerPage,
              onPageChanged: (newPage) {
                setState(() => _currentPage = newPage);
              },
            ),
        ],
      ),
    );
  }
}
