import 'package:flutter/material.dart';
import '../../state/app_state.dart';
import '../staff/attendance_screen.dart';

class MonitoringScreen extends StatelessWidget {
  final AppState appState;

  const MonitoringScreen({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    return AttendanceScreen(appState: appState);
  }
}
