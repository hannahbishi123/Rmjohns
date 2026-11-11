import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../../models/staff_member.dart';
import '../../theme/app_colors.dart';
import '../../widgets/pagination_bar.dart';

class AttendanceScreen extends StatefulWidget {
  final AppState appState;

  const AttendanceScreen({super.key, required this.appState});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  int _currentPage = 1;
  static const int _itemsPerPage = 5;

  @override
  Widget build(BuildContext context) {
    final logs = widget.appState.scanEvents;
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final paginatedLogs = logs.skip(startIndex).take(_itemsPerPage).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // RFID Device Status
          Card(
            color: widget.appState.rfidReaderConnected ? Colors.green.shade50 : Colors.red.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    widget.appState.rfidReaderConnected ? Icons.sensors : Icons.sensors_off,
                    color: widget.appState.rfidReaderConnected ? Colors.green.shade800 : Colors.red.shade800,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.appState.rfidReaderConnected ? 'ESP32 RFID Reader Connected' : 'ESP32 Reader Disconnected',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: widget.appState.rfidReaderConnected ? Colors.green.shade900 : Colors.red.shade900,
                          ),
                        ),
                        const Text('Hardware scanner simulator for employee clock in/out.'),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: widget.appState.toggleRFIDReader,
                    child: Text(widget.appState.rfidReaderConnected ? 'Disconnect' : 'Connect'),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          const Text('Staff Roster & Time Clock', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          ...widget.appState.staffMembers.map((staff) {
            final isPresent = staff.attendanceStatus == AttendanceStatus.present;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isPresent ? Colors.green.shade100 : Colors.grey.shade200,
                  child: Icon(
                    Icons.person,
                    color: isPresent ? Colors.green.shade800 : Colors.grey,
                  ),
                ),
                title: Text(staff.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${staff.position} • ID: ${staff.id} ${staff.timeIn != null ? '• In: ${staff.timeIn}' : ''}'),
                trailing: ElevatedButton.icon(
                  onPressed: () => widget.appState.simulateRFIDScan(staff),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isPresent ? Colors.red.shade700 : AppColors.secondary,
                  ),
                  icon: const Icon(Icons.nfc, size: 18),
                  label: Text(isPresent ? 'Time Out' : 'Time In'),
                ),
              ),
            );
          }),

          const SizedBox(height: 24),
          const Text('Recent Scan Logs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          Card(
            child: Column(
              children: [
                logs.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No RFID scan events logged today.'),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: paginatedLogs.length,
                        separatorBuilder: (ctx, i) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final evt = paginatedLogs[index];
                          return ListTile(
                            leading: const Icon(Icons.history_toggle_off),
                            title: Text('${evt.staffName} (${evt.action})'),
                            subtitle: Text('Staff ID: ${evt.staffId}'),
                            trailing: Text(evt.time, style: const TextStyle(fontWeight: FontWeight.bold)),
                          );
                        },
                      ),
                if (logs.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: PaginationBar(
                      currentPage: _currentPage,
                      totalItems: logs.length,
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
