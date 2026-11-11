import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../widgets/pagination_bar.dart';

class CustomersScreen extends StatefulWidget {
  final AppState appState;

  const CustomersScreen({super.key, required this.appState});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final list = widget.appState.customers;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedList = list.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Customer Directory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),

          Expanded(
            child: ListView.builder(
              itemCount: paginatedList.length,
              itemBuilder: (context, index) {
                final c = paginatedList[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(c.name.substring(0, 1)),
                    ),
                    title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${c.email} • ${c.phone}\nID: ${c.id}'),
                    isThreeLine: true,
                    trailing: Chip(
                      label: Text('${widget.appState.customerPoints} PTS'),
                      backgroundColor: Colors.amber.shade100,
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
