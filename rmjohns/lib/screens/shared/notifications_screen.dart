import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../widgets/pagination_bar.dart';

class NotificationsScreen extends StatefulWidget {
  final AppState appState;

  const NotificationsScreen({super.key, required this.appState});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final list = widget.appState.filteredNotifications;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedList = list.skip(startIndex).take(_itemsPerPage).toList();

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
                  'Notifications Feed',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton.icon(
                onPressed: widget.appState.markAllNotificationsRead,
                icon: const Icon(Icons.done_all, size: 16),
                label: const Text('Mark Read', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          Expanded(
            child: list.isEmpty
                ? const Center(child: Text('No notifications right now.'))
                : ListView.builder(
                    itemCount: paginatedList.length,
                    itemBuilder: (context, index) {
                      final notif = paginatedList[index];
                      return Card(
                        color: notif.isRead ? Colors.white : Colors.amber.shade50,
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Icon(
                            notif.isRead ? Icons.notifications_none : Icons.notifications_active,
                            color: notif.isRead ? Colors.grey : Colors.amber.shade800,
                          ),
                          title: Text(
                            notif.title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            '${notif.detail}\n${notif.timestamp.toString().substring(0, 16)}',
                            style: const TextStyle(fontSize: 12),
                          ),
                          isThreeLine: true,
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
