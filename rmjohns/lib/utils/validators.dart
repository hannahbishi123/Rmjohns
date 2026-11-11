class AppValidators {
  /// Validates full name: required, min 2 chars, max 80 chars.
  static String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Name is required and cannot be left blank.';
    }
    final trimmed = value.trim();
    if (trimmed.length < 2) {
      return 'Name must be at least 2 characters long.';
    }
    if (trimmed.length > 80) {
      return 'Name cannot exceed 80 characters.';
    }
    return null;
  }

  /// Validates email format.
  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email address is required.';
    }
    final trimmed = value.trim();
    final emailRegex = RegExp(r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+");
    if (!emailRegex.hasMatch(trimmed)) {
      return 'Please enter a valid email address (e.g. name@example.com).';
    }
    return null;
  }

  /// Validates phone number (Philippine mobile format or 10-13 digits).
  static String? validatePhone(String? value, {bool required = false}) {
    if (value == null || value.trim().isEmpty) {
      if (required) return 'Phone number is required.';
      return null;
    }
    final trimmed = value.trim().replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final phoneRegex = RegExp(r'^(09|\+639)\d{9}$');
    if (!phoneRegex.hasMatch(trimmed) && (trimmed.length < 10 || trimmed.length > 13)) {
      return 'Enter a valid Philippine phone number (e.g. 09171234567).';
    }
    return null;
  }

  /// Validates password length: required, 4 to 64 characters.
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required.';
    }
    if (value.length < 4 || value.length > 64) {
      return 'Password must be between 4 and 64 characters long.';
    }
    return null;
  }

  /// Validates login identifier (can be email or username).
  static String? validateLoginIdentifier(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email or username is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length < 3) {
      return 'Identifier must be at least 3 characters.';
    }
    if (trimmed.contains('@') && !trimmed.contains('.')) {
      return 'Please enter a valid email or username.';
    }
    return null;
  }

  /// Validates food name: required, min 2 chars, max 80 chars.
  static String? validateFoodName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Food name is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      return 'Food name must be between 2 and 80 characters.';
    }
    return null;
  }

  /// Validates food description: required, min 10 chars, max 300 chars.
  static String? validateFoodDescription(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Description is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length < 10) {
      return 'Description must be at least 10 characters.';
    }
    if (trimmed.length > 300) {
      return 'Description cannot exceed 300 characters.';
    }
    return null;
  }

  /// Validates price: required number between 1 and 1,000,000.
  static String? validatePrice(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Price is required.';
    }
    final number = double.tryParse(value.trim());
    if (number == null) {
      return 'Please enter a valid price amount.';
    }
    if (number < 1 || number > 1000000) {
      return 'Price must be between ₱1 and ₱1,000,000.';
    }
    return null;
  }

  /// Validates order notes limit: max 500 characters.
  static String? validateOrderNotes(String? value) {
    if (value != null && value.length > 500) {
      return 'Order notes cannot exceed 500 characters.';
    }
    return null;
  }

  /// Validates cash tendered vs total due.
  static String? validateCashTendered(String? value, double totalPayable) {
    if (value == null || value.trim().isEmpty) {
      return 'Cash tendered amount is required.';
    }
    final amount = double.tryParse(value.trim());
    if (amount == null) {
      return 'Please enter a valid cash amount.';
    }
    if (amount < 0 || amount > 10000000) {
      return 'Cash tendered must be between ₱0 and ₱10,000,000.';
    }
    if (amount < totalPayable) {
      return 'Tendered amount (₱${amount.toStringAsFixed(2)}) must cover total due (₱${totalPayable.toStringAsFixed(2)}).';
    }
    return null;
  }

  /// Validates reservation date (must be today or future).
  static String? validateReservationDate(DateTime date) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final selectedStart = DateTime(date.year, date.month, date.day);
    if (selectedStart.isBefore(todayStart)) {
      return 'Reservation date cannot be in the past.';
    }
    return null;
  }
}
