enum UserRole {
  public,
  admin,
  staff,
  customer,
}

extension UserRoleExtension on UserRole {
  String get label {
    switch (this) {
      case UserRole.admin:
        return 'Admin';
      case UserRole.staff:
        return 'Staff';
      case UserRole.customer:
        return 'Customer';
      case UserRole.public:
        return 'Guest';
    }
  }
}
