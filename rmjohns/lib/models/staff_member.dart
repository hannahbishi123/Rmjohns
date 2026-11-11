enum AttendanceStatus {
  present,
  onBreak,
  offline,
  inactive,
}

class StaffMember {
  final String id;
  String name;
  String position;
  String contact;
  AttendanceStatus attendanceStatus;
  String? timeIn;
  String? timeOut;

  StaffMember({
    required this.id,
    required this.name,
    required this.position,
    required this.contact,
    this.attendanceStatus = AttendanceStatus.offline,
    this.timeIn,
    this.timeOut,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'position': position,
      'role': position,
      'contact': contact,
      'status': attendanceStatus == AttendanceStatus.present ? 'Present' : 'Offline',
      'timeIn': timeIn,
      'timeOut': timeOut,
      'time': timeIn ?? '—',
    };
  }

  factory StaffMember.fromMap(Map<dynamic, dynamic> map, String keyId) {
    final statusStr = (map['status'] ?? '').toString().toLowerCase();
    AttendanceStatus attStatus = AttendanceStatus.offline;
    if (statusStr.contains('pres')) attStatus = AttendanceStatus.present;
    if (statusStr.contains('break')) attStatus = AttendanceStatus.onBreak;

    return StaffMember(
      id: (map['id'] ?? keyId).toString(),
      name: (map['name'] ?? 'Staff Member').toString(),
      position: (map['position'] ?? map['role'] ?? 'Service Crew').toString(),
      contact: (map['contact'] ?? '').toString(),
      attendanceStatus: attStatus,
      timeIn: (map['timeIn'] ?? map['time'] ?? '').toString(),
      timeOut: (map['timeOut'] ?? '').toString(),
    );
  }
}

class ScanEvent {
  final String id;
  final String staffName;
  final String staffId;
  final String time;
  final String action; // Time In, Time Out, On Break

  ScanEvent({
    required this.id,
    required this.staffName,
    required this.staffId,
    required this.time,
    required this.action,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': staffName,
      'staffName': staffName,
      'staffId': staffId,
      'time': time,
      'action': action,
    };
  }

  factory ScanEvent.fromMap(Map<dynamic, dynamic> map, String keyId) {
    return ScanEvent(
      id: (map['id'] ?? keyId).toString(),
      staffName: (map['staffName'] ?? map['name'] ?? 'Staff').toString(),
      staffId: (map['staffId'] ?? 'ST-000').toString(),
      time: (map['time'] ?? '').toString(),
      action: (map['action'] ?? 'Time In').toString(),
    );
  }
}
