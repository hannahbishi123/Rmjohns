import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../theme/app_colors.dart';
import '../../widgets/pagination_bar.dart';

class CustomerLoyaltyScreen extends StatefulWidget {
  final AppState appState;

  const CustomerLoyaltyScreen({
    super.key,
    required this.appState,
  });

  @override
  State<CustomerLoyaltyScreen> createState() => _CustomerLoyaltyScreenState();
}

class _CustomerLoyaltyScreenState extends State<CustomerLoyaltyScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 4;

  @override
  Widget build(BuildContext context) {
    final historyList = widget.appState.loyaltyHistory;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedHistory = historyList.skip(startIndex).take(_itemsPerPage).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Points Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.secondary, Color(0xFF132B1F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text('RMJohn\'s Loyalty Card', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    Icon(Icons.stars, color: AppColors.accent, size: 28),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  '${widget.appState.customerPoints} PTS',
                  style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Earn ~1 point for every ₱100 spent on silog meals & solo orders.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          const Text('Rewards Catalog', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          ...widget.appState.rewards.map((reward) {
            final canAfford = widget.appState.customerPoints >= reward.pointsRequired;
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: canAfford ? AppColors.primaryLight : Colors.grey.shade200,
                  child: Icon(
                    Icons.card_giftcard,
                    color: canAfford ? AppColors.primary : Colors.grey,
                  ),
                ),
                title: Text(reward.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${reward.description}\nRequired: ${reward.pointsRequired} pts'),
                trailing: ElevatedButton(
                  onPressed: canAfford ? () => widget.appState.redeemReward(reward) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: canAfford ? AppColors.primary : Colors.grey,
                  ),
                  child: const Text('Redeem'),
                ),
              ),
            );
          }),

          const SizedBox(height: 24),
          const Text('Points Activity History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          Card(
            child: Column(
              children: [
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: paginatedHistory.length,
                  separatorBuilder: (ctx, i) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final h = paginatedHistory[index];
                    return ListTile(
                      leading: Icon(
                        h.isEarned ? Icons.arrow_upward : Icons.arrow_downward,
                        color: h.isEarned ? Colors.green : Colors.red,
                      ),
                      title: Text(h.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      subtitle: Text(h.timestamp.toString().substring(0, 16)),
                      trailing: Text(
                        '${h.isEarned ? '+' : '-'}${h.points} pts',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: h.isEarned ? Colors.green.shade700 : Colors.red.shade700,
                        ),
                      ),
                    );
                  },
                ),
                if (historyList.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: PaginationBar(
                      currentPage: _currentPage,
                      totalItems: historyList.length,
                      itemsPerPage: _itemsPerPage,
                      onPageChanged: (newPage) {
                        setState(() => _currentPage = newPage);
                      },
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
