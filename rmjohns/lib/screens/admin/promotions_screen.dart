import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../widgets/pagination_bar.dart';
import '../../widgets/sweet_alert.dart';

class PromotionsScreen extends StatefulWidget {
  final AppState appState;

  const PromotionsScreen({super.key, required this.appState});

  @override
  State<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends State<PromotionsScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final list = widget.appState.promotions;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedList = list.skip(startIndex).take(_itemsPerPage).toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Promotions Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),

          Expanded(
            child: ListView.builder(
              itemCount: paginatedList.length,
              itemBuilder: (context, index) {
                final promo = paginatedList[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(promo.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(promo.detail),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () async {
                        final confirm = await SweetAlert.showConfirm(
                          context,
                          title: 'Delete Promotion?',
                          message: 'Are you sure you want to delete "${promo.name}"?',
                          confirmText: 'Delete',
                          kind: SweetAlertKind.error,
                        );
                        if (confirm) {
                          widget.appState.deletePromotion(promo.id);
                          setState(() {});
                        }
                      },
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
