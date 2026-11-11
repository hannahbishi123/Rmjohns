import 'package:flutter/material.dart';
import '../../state/app_state.dart';

class LoyaltyMgmtScreen extends StatelessWidget {
  final AppState appState;

  const LoyaltyMgmtScreen({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Loyalty & Points Overrides', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Customer Loyalty Balance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Current Test Balance: ${appState.customerPoints} PTS'),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => appState.adjustCustomerPoints('CUST-001', 50),
                        child: const Text('+50 Points Bonus'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => appState.adjustCustomerPoints('CUST-001', -50),
                        child: const Text('-50 Points Penalty'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
