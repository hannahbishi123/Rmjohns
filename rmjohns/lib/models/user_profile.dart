import 'user_role.dart';

class UserProfile {
  final String id;
  String name;
  String email;
  String phone;
  UserRole role;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
  });

  UserProfile copyWith({
    String? name,
    String? email,
    String? phone,
    UserRole? role,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'contact': phone,
      'phone': phone,
      'role': role.label,
    };
  }

  factory UserProfile.fromMap(Map<dynamic, dynamic> map, String keyId) {
    final roleStr = (map['role'] ?? 'Customer').toString().toLowerCase();
    UserRole r = UserRole.customer;
    if (roleStr.contains('admin')) r = UserRole.admin;
    if (roleStr.contains('staff')) r = UserRole.staff;

    return UserProfile(
      id: (map['id'] ?? keyId).toString(),
      name: (map['name'] ?? 'User').toString(),
      email: (map['email'] ?? '').toString(),
      phone: (map['phone'] ?? map['contact'] ?? '').toString(),
      role: r,
    );
  }
}
