CREATE DATABASE IF NOT EXISTS `eateries_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `eateries_db`;

CREATE TABLE IF NOT EXISTS `menu_items` (
  `menu_item_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `description` VARCHAR(300) NOT NULL DEFAULT '',
  `emoji` VARCHAR(16) NOT NULL DEFAULT '',
  `tone` VARCHAR(32) NOT NULL DEFAULT 'moss',
  `available` TINYINT(1) NOT NULL DEFAULT 1,
  `image_url` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`menu_item_id`),
  KEY `idx_menu_category_available` (`category`, `available`),
  KEY `idx_menu_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `customer_id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(254) DEFAULT NULL,
  `contact` VARCHAR(80) DEFAULT NULL,
  `orders_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_spend` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `points` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(24) NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  KEY `idx_customers_name` (`name`),
  KEY `idx_customers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff` (
  `staff_id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `role` VARCHAR(80) NOT NULL,
  `contact` VARCHAR(254) DEFAULT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'Offline',
  `time_in` VARCHAR(32) NOT NULL DEFAULT '—',
  `time_out` VARCHAR(32) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  KEY `idx_staff_status` (`status`),
  KEY `idx_staff_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_accounts` (
  `account_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(254) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(24) NOT NULL,
  `contact` VARCHAR(80) DEFAULT NULL,
  `customer_id` VARCHAR(32) DEFAULT NULL,
  `firebase_uid` VARCHAR(128) DEFAULT NULL COMMENT 'Firebase Authentication UID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_user_accounts_username` (`username`),
  UNIQUE KEY `uq_user_accounts_email` (`email`),
  UNIQUE KEY `uq_user_accounts_firebase_uid` (`firebase_uid`),
  KEY `idx_user_accounts_role` (`role`),
  CONSTRAINT `fk_user_accounts_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `order_number` VARCHAR(32) NOT NULL,
  `customer_id` VARCHAR(32) DEFAULT NULL,
  `customer_name` VARCHAR(120) NOT NULL,
  `items_summary` TEXT NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `service_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `order_type` VARCHAR(32) NOT NULL,
  `pickup_location` VARCHAR(200) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `payment_status` VARCHAR(24) NOT NULL DEFAULT 'Pending',
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'Cash',
  `status` VARCHAR(24) NOT NULL DEFAULT 'Pending',
  `time_label` VARCHAR(32) NOT NULL DEFAULT '',
  `order_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_number`),
  KEY `idx_orders_customer_date` (`customer_id`, `order_date`),
  KEY `idx_orders_status_date` (`status`, `order_date`),
  KEY `idx_orders_payment_status` (`payment_status`),
  CONSTRAINT `fk_orders_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(32) NOT NULL,
  `line_number` SMALLINT UNSIGNED NOT NULL,
  `menu_item_id` INT UNSIGNED DEFAULT NULL,
  `item_name` VARCHAR(120) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `addons` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_item_id`),
  UNIQUE KEY `uq_order_items_order_line` (`order_number`, `line_number`),
  KEY `idx_order_items_menu_item` (`menu_item_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_number`) REFERENCES `orders` (`order_number`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_menu_item`
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `payment_number` VARCHAR(32) NOT NULL,
  `order_number` VARCHAR(32) NOT NULL,
  `method` VARCHAR(32) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `amount_paid` DECIMAL(12,2) DEFAULT NULL,
  `change_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(24) NOT NULL DEFAULT 'Pending',
  `reference` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_number`),
  UNIQUE KEY `uq_payments_reference` (`reference`),
  KEY `idx_payments_order_status` (`order_number`, `status`),
  KEY `idx_payments_created_at` (`created_at`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_number`) REFERENCES `orders` (`order_number`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rewards` (
  `reward_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(250) NOT NULL,
  `points_required` INT UNSIGNED NOT NULL,
  `available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reward_id`),
  KEY `idx_rewards_available_points` (`available`, `points_required`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotions` (
  `promotion_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `detail` VARCHAR(250) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'Scheduled',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  KEY `idx_promotions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_transactions` (
  `transaction_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` VARCHAR(32) DEFAULT NULL,
  `detail` VARCHAR(255) NOT NULL,
  `points_delta` INT NOT NULL,
  `date_label` VARCHAR(32) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_loyalty_customer_date` (`customer_id`, `created_at`),
  CONSTRAINT `fk_loyalty_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `detail` TEXT NOT NULL,
  `audience` VARCHAR(24) NOT NULL DEFAULT 'all',
  `time_label` VARCHAR(32) NOT NULL DEFAULT '',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_audience_read` (`audience`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_events` (
  `event_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `staff_id` VARCHAR(32) DEFAULT NULL,
  `staff_name` VARCHAR(120) NOT NULL,
  `event_time` VARCHAR(32) NOT NULL,
  `action` VARCHAR(24) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_attendance_staff_created` (`staff_id`, `created_at`),
  CONSTRAINT `fk_attendance_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_profiles` (
  `profile_id` TINYINT UNSIGNED NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `phone` VARCHAR(80) NOT NULL DEFAULT '',
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_app_profiles_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_state` (
  `state_key` VARCHAR(64) NOT NULL,
  `state_value` JSON DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`state_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
