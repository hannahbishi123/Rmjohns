enum ReservationStatus {
  confirmed,
  cancelled,
  notBooked,
}

class ReservationModel {
  final String id;
  final String customerName;
  final String customerId;
  final DateTime date;
  final String time; // e.g. "18:30"
  final int guestCount;
  ReservationStatus status;

  ReservationModel({
    required this.id,
    required this.customerName,
    required this.customerId,
    required this.date,
    required this.time,
    required this.guestCount,
    this.status = ReservationStatus.confirmed,
  });
}
