-- ═══════════════════════════════════════════════════════════════════════════════
--  RMJohn's Eatery — Full MySQL Database
--  Includes: schema + Firebase sync columns + seed data
--  Compatible: MySQL 5.7 / 8.x / MariaDB 10.3+
--  Import: phpMyAdmin → Import → choose this file  OR
--          mysql -u root -p < eateries_db_full.sql
-- ═══════════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ─────────────────────────────────────────────────────────────────────────────
-- DATABASE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `eateries_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `eateries_db`;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: menu_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `menu_items` (
  `menu_item_id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(80)  NOT NULL,
  `category`            VARCHAR(80)  NOT NULL,
  `price`               DECIMAL(10,2) NOT NULL,
  `description`         VARCHAR(300) NOT NULL DEFAULT '',
  `tone`                VARCHAR(32)  NOT NULL DEFAULT 'moss',
  `available`           TINYINT(1)   NOT NULL DEFAULT 1,
  `image_url`           TEXT         NULL DEFAULT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`menu_item_id`),
  KEY `idx_menu_category_available` (`category`, `available`),
  KEY `idx_menu_name`               (`name`),
  KEY `idx_menu_sync_status`        (`firebase_sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: customers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `customers` (
  `customer_id`         VARCHAR(32)  NOT NULL,
  `name`                VARCHAR(120) NOT NULL,
  `email`               VARCHAR(254) DEFAULT NULL,
  `contact`             VARCHAR(80)  DEFAULT NULL,
  `orders_count`        INT UNSIGNED NOT NULL DEFAULT 0,
  `total_spend`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `points`              INT          NOT NULL DEFAULT 0,
  `status`              VARCHAR(24)  NOT NULL DEFAULT 'Active',
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customers_email`   (`email`),
  KEY `idx_customers_name`          (`name`),
  KEY `idx_customers_status`        (`status`),
  KEY `idx_customers_sync_status`   (`firebase_sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: staff
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff` (
  `staff_id`            VARCHAR(32)  NOT NULL,
  `name`                VARCHAR(120) NOT NULL,
  `role`                VARCHAR(80)  NOT NULL,
  `contact`             VARCHAR(254) DEFAULT NULL,
  `status`              VARCHAR(24)  NOT NULL DEFAULT 'Offline',
  `time_in`             VARCHAR(32)  NOT NULL DEFAULT '—',
  `time_out`            VARCHAR(32)  DEFAULT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`staff_id`),
  KEY `idx_staff_status`            (`status`),
  KEY `idx_staff_name`              (`name`),
  KEY `idx_staff_sync_status`       (`firebase_sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: user_accounts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_accounts` (
  `account_id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`            VARCHAR(254) NOT NULL,
  `email`               VARCHAR(254) NOT NULL,
  `password_hash`       VARCHAR(255) NOT NULL,
  `role`                VARCHAR(24)  NOT NULL,
  `contact`             VARCHAR(80)  DEFAULT NULL,
  `customer_id`         VARCHAR(32)  DEFAULT NULL,
  `firebase_uid`        VARCHAR(128) DEFAULT NULL COMMENT 'Firebase Authentication UID',
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `uq_user_accounts_username`     (`username`),
  UNIQUE KEY `uq_user_accounts_email`        (`email`),
  UNIQUE KEY `uq_user_accounts_firebase_uid` (`firebase_uid`),
  KEY `idx_user_accounts_role`               (`role`),
  CONSTRAINT `fk_user_accounts_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `order_number`        VARCHAR(32)  NOT NULL,
  `customer_id`         VARCHAR(32)  DEFAULT NULL,
  `customer_name`       VARCHAR(120) NOT NULL,
  `items_summary`       TEXT         NOT NULL,
  `subtotal`            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `service_charge`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount`            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total`               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `order_type`          VARCHAR(32)  NOT NULL,
  `pickup_location`     VARCHAR(200) DEFAULT NULL,
  `notes`               TEXT         DEFAULT NULL,
  `payment_status`      VARCHAR(24)  NOT NULL DEFAULT 'Pending',
  `payment_method`      VARCHAR(32)  NOT NULL DEFAULT 'Cash',
  `status`              VARCHAR(24)  NOT NULL DEFAULT 'Pending',
  `time_label`          VARCHAR(32)  NOT NULL DEFAULT '',
  `order_date`          DATE         NOT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`order_number`),
  KEY `idx_orders_customer_date`    (`customer_id`, `order_date`),
  KEY `idx_orders_status_date`      (`status`, `order_date`),
  KEY `idx_orders_payment_status`   (`payment_status`),
  KEY `idx_orders_sync_status`      (`firebase_sync_status`),
  CONSTRAINT `fk_orders_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: order_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number`        VARCHAR(32)  NOT NULL,
  `line_number`         SMALLINT UNSIGNED NOT NULL,
  `menu_item_id`        INT UNSIGNED DEFAULT NULL,
  `item_name`           VARCHAR(120) NOT NULL,
  `quantity`            INT UNSIGNED NOT NULL,
  `unit_price`          DECIMAL(10,2) NOT NULL,
  `addons`              JSON         DEFAULT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_item_id`),
  UNIQUE KEY `uq_order_items_order_line` (`order_number`, `line_number`),
  KEY `idx_order_items_menu_item`        (`menu_item_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_number`) REFERENCES `orders` (`order_number`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_menu_item`
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: payments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_number`      VARCHAR(32)  NOT NULL,
  `order_number`        VARCHAR(32)  NOT NULL,
  `method`              VARCHAR(32)  NOT NULL,
  `amount`              DECIMAL(12,2) NOT NULL,
  `amount_paid`         DECIMAL(12,2) DEFAULT NULL,
  `change_amount`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`              VARCHAR(24)  NOT NULL DEFAULT 'Pending',
  `reference`           VARCHAR(64)  NOT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`payment_number`),
  UNIQUE KEY `uq_payments_reference`      (`reference`),
  KEY `idx_payments_order_status`         (`order_number`, `status`),
  KEY `idx_payments_created_at`           (`created_at`),
  KEY `idx_payments_sync_status`          (`firebase_sync_status`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_number`) REFERENCES `orders` (`order_number`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: rewards
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `rewards` (
  `reward_id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(80)  NOT NULL,
  `description`         VARCHAR(250) NOT NULL,
  `points_required`     INT UNSIGNED NOT NULL,
  `available`           TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reward_id`),
  KEY `idx_rewards_available_points` (`available`, `points_required`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: promotions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `promotions` (
  `promotion_id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(80)  NOT NULL,
  `detail`              VARCHAR(250) NOT NULL,
  `status`              VARCHAR(24)  NOT NULL DEFAULT 'Scheduled',
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  KEY `idx_promotions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: loyalty_transactions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `loyalty_transactions` (
  `transaction_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id`         VARCHAR(32)  DEFAULT NULL,
  `detail`              VARCHAR(255) NOT NULL,
  `points_delta`        INT          NOT NULL,
  `date_label`          VARCHAR(32)  NOT NULL DEFAULT '',
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_loyalty_customer_date` (`customer_id`, `created_at`),
  CONSTRAINT `fk_loyalty_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`               VARCHAR(160) NOT NULL,
  `detail`              TEXT         NOT NULL,
  `audience`            VARCHAR(24)  NOT NULL DEFAULT 'all',
  `time_label`          VARCHAR(32)  NOT NULL DEFAULT '',
  `is_read`             TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_audience_read` (`audience`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: attendance_events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `attendance_events` (
  `event_id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `staff_id`            VARCHAR(32)  DEFAULT NULL,
  `staff_name`          VARCHAR(120) NOT NULL,
  `event_time`          VARCHAR(32)  NOT NULL,
  `action`              VARCHAR(24)  NOT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `firebase_sync_status` ENUM('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `firebase_synced_at`  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `idx_attendance_staff_created` (`staff_id`, `created_at`),
  CONSTRAINT `fk_attendance_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: app_profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `app_profiles` (
  `profile_id`          TINYINT UNSIGNED NOT NULL,
  `name`                VARCHAR(120) NOT NULL,
  `email`               VARCHAR(254) NOT NULL,
  `phone`               VARCHAR(80)  NOT NULL DEFAULT '',
  `loyalty_points`      INT          NOT NULL DEFAULT 0,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_app_profiles_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: app_state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `app_state` (
  `state_key`           VARCHAR(64)  NOT NULL,
  `state_value`         JSON         DEFAULT NULL,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`state_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: firebase_sync_queue
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `firebase_sync_queue` (
  `queue_id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type`         VARCHAR(64)  NOT NULL COMMENT 'e.g. orders, menu_items, payments',
  `entity_id`           VARCHAR(64)  NOT NULL COMMENT 'Primary key of the MySQL record',
  `operation`           ENUM('upsert','delete') NOT NULL DEFAULT 'upsert',
  `payload`             JSON         NOT NULL  COMMENT 'Serialised record to push',
  `status`              ENUM('pending','retrying','synced','failed') NOT NULL DEFAULT 'pending',
  `attempt`             TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `last_error`          TEXT         DEFAULT NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `synced_at`           TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (`queue_id`),
  KEY `idx_sync_status`   (`status`),
  KEY `idx_sync_entity`   (`entity_type`, `entity_id`),
  KEY `idx_sync_created`  (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Records queued for Firebase Realtime DB sync';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: menu_items  (30 items — matches mockData.js exactly)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `menu_items` (`menu_item_id`, `name`, `category`, `price`, `description`, `tone`, `available`) VALUES
-- Silog Meals
(1,  'Lechon Kawali Silog',             'Silog Meals',  135.00, 'Crispy pork, garlic rice, and egg',               'clay',   1),
(2,  'Liempo Silog',                    'Silog Meals',  135.00, 'Grilled liempo with garlic rice and egg',         'moss',   1),
(3,  'Hungarian Silog',                 'Silog Meals',  115.00, 'Savory sausage, garlic rice, and egg',            'olive',  1),
(4,  'Burger Silog',                    'Silog Meals',   75.00, 'Burger patty, garlic rice, and egg',              'citrus', 1),
(5,  'Shanghai Silog',                  'Silog Meals',   75.00, 'Shanghai-style meat, garlic rice, and egg',       'moss',   1),
(6,  'Skinless Silog',                  'Silog Meals',   75.00, 'Lean pork, garlic rice, and egg',                 'lime',   1),
(7,  'Tapsilog Pork',                   'Silog Meals',  115.00, 'Tapa-style pork with garlic rice and egg',        'clay',   1),
(8,  'Tapsilog Beef',                   'Silog Meals',  135.00, 'Beef tapa, garlic rice, and egg',                 'berry',  1),
(9,  'Hamsilog',                        'Silog Meals',   75.00, 'Ham, garlic rice, and egg',                       'olive',  1),
(10, 'Tocilog',                         'Silog Meals',  115.00, 'Cured beef tocino with garlic rice and egg',      'citrus', 1),
(11, 'Hotsilog',                        'Silog Meals',   75.00, 'Hotdog, garlic rice, and egg',                    'lime',   1),
-- Solo Orders
(12, 'Beef Pares w/ Rice',              'Solo Orders',   75.00, 'Tender beef pares with steamed rice',             'clay',   1),
(13, 'Goto w/ Rice',                    'Solo Orders',   75.00, 'Classic goto with rice and savory broth',         'moss',   1),
(14, 'Sweet & Spicy Pork Ribs w/ Rice', 'Solo Orders',  135.00, 'Sweet and spicy pork ribs with rice',             'berry',  1),
-- Ulam + Kanin
(15, 'Meat + Rice',                     'Ulam + Kanin',  85.00, 'Choice meat with steamed rice',                   'olive',  1),
(16, 'Veggies + Rice',                  'Ulam + Kanin',  65.00, 'Fresh vegetables and rice',                       'lime',   1),
(17, 'Fish + Rice',                     'Ulam + Kanin',  75.00, 'Fillet fish with steamed rice',                   'citrus', 1),
-- Extras
(18, 'Platter of Rice',                 'Extras',       150.00, 'Large serving for sharing',                       'moss',   1),
(19, 'Cup of Rice',                     'Extras',        15.00, 'Small rice cup',                                  'olive',  1),
-- Cold Drinks
(20, 'Calamansi',                       'Cold Drinks',   30.00, 'Fresh calamansi drink',                           'citrus', 1),
(21, 'Cucumber',                        'Cold Drinks',   30.00, 'Refreshing cucumber cooler',                      'lime',   1),
(22, 'Pineapple',                       'Cold Drinks',   30.00, 'Sweet pineapple refreshment',                     'citrus', 1),
(23, 'Iced Tea',                        'Cold Drinks',   25.00, 'Chilled iced tea',                                'olive',  1),
(24, 'Lemonade',                        'Cold Drinks',   30.00, 'Classic lemonade',                                'citrus', 1),
-- Hot Drinks
(25, 'Coffee',                          'Hot Drinks',    20.00, 'Classic hot coffee',                              'clay',   1),
(26, 'Choco / Milo',                    'Hot Drinks',    25.00, 'Warm chocolate drink',                            'berry',  1),
(27, 'Milk',                            'Hot Drinks',    25.00, 'Comforting hot milk',                             'moss',   1),
-- Desserts
(28, 'Halo Halo',                       'Desserts',      85.00, 'Mixed dessert treat with shaved ice',             'berry',  1),
(29, 'Mais con Yelo',                   'Desserts',      45.00, 'Sweet corn dessert with ice',                     'citrus', 1),
(30, 'Buko Salad',                      'Desserts',      50.00, 'Coconut salad',                                   'lime',   1)
ON DUPLICATE KEY UPDATE
  `name`        = VALUES(`name`),
  `price`       = VALUES(`price`),
  `description` = VALUES(`description`),
  `tone`        = VALUES(`tone`),
  `available`   = VALUES(`available`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: customers
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `customers` (`customer_id`, `name`, `email`, `contact`, `orders_count`, `total_spend`, `points`, `status`) VALUES
('CU-1042', 'Mia Santos',   'mia.santos@email.com',  '+63 917 555 0142', 28, 12840.00, 340, 'Active'),
('CU-1038', 'Luca Reyes',   'luca.r@email.com',       '+63 917 555 0138', 16,  7460.00, 182, 'Active'),
('CU-1024', 'Nina Cruz',    'nina.cruz@email.com',    '+63 917 555 0124', 12,  5890.00,  96, 'Active'),
('CU-1019', 'Noah Garcia',  'noah.g@email.com',       '+63 917 555 0119',  9,  4120.00,  74, 'Active')
ON DUPLICATE KEY UPDATE
  `name`         = VALUES(`name`),
  `orders_count` = VALUES(`orders_count`),
  `total_spend`  = VALUES(`total_spend`),
  `points`       = VALUES(`points`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: staff
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `staff` (`staff_id`, `name`, `role`, `status`, `time_in`) VALUES
('ST-014', 'Ava Mendoza',    'Head chef',    'Present',  '8:02 AM'),
('ST-021', 'Theo Lim',       'Service crew', 'Present',  '8:16 AM'),
('ST-008', 'Iris Dela Cruz', 'Service crew', 'On break', '8:24 AM'),
('ST-019', 'Marco Uy',       'Service crew', 'Offline',  '—')
ON DUPLICATE KEY UPDATE
  `name`   = VALUES(`name`),
  `role`   = VALUES(`role`),
  `status` = VALUES(`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: user_accounts
-- Passwords are bcrypt hashes of:
--   admin   → Admin2026!
--   staff   → Staff2026!
--   maureen → Customer2026!
-- Change these hashes before going live.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `user_accounts` (`username`, `email`, `password_hash`, `role`, `customer_id`) VALUES
('admin',   'admin@rmjohns.com',           '$2b$10$kQWX9Z1oWvLfQX8nB2mR4uOjG7pT3cN5dY6hJ8wK1eM4vF2sI0aAC', 'Admin',    NULL),
('staff',   'staff@rmjohns.com',           '$2b$10$mT3pL8vN2xK5jH7cB9dY6uOiG4wR1eM8fA0kJ3sQ5nW7vX2tC4bDE', 'Staff',    NULL),
('maureen', 'maureen.santos@email.com',    '$2b$10$nV5qM2wO4yL8kI6jB3dX7rPiH1sG9eA5tC0fK4mN6bW8xR3uE7gFH', 'Customer', 'CU-1042')
ON DUPLICATE KEY UPDATE
  `role` = VALUES(`role`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: orders
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `orders` (`order_number`, `customer_id`, `customer_name`, `items_summary`, `subtotal`, `service_charge`, `discount`, `total`, `order_type`, `payment_status`, `payment_method`, `status`, `time_label`, `order_date`) VALUES
('VK-2841', 'CU-1042', 'Mia Santos',  '2 × Liempo Silog, 1 × Calamansi',           300.00,  0.00, 0.00, 300.00, 'Pickup',  'Paid',    'GCash', 'Preparing', '10:42 AM', '2026-09-29'),
('VK-2840', 'CU-1038', 'Luca Reyes',  '1 × Tapsilog Beef',                          135.00,  0.00, 0.00, 135.00, 'Dine in', 'Paid',    'Cash',  'Ready',     '10:35 AM', '2026-09-29'),
('VK-2839', 'CU-1024', 'Nina Cruz',   '1 × Beef Pares w/ Rice, 1 × Halo Halo',     160.00,  0.00, 0.00, 160.00, 'Online',  'Pending', 'Cash',  'Pending',   '10:28 AM', '2026-09-29'),
('VK-2838', 'CU-1019', 'Noah Garcia', '2 × Lechon Kawali Silog',                    270.00,  0.00, 0.00, 270.00, 'Dine in', 'Paid',    'Card',  'Completed', '10:16 AM', '2026-09-28')
ON DUPLICATE KEY UPDATE
  `status`         = VALUES(`status`),
  `payment_status` = VALUES(`payment_status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: order_items
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `order_items` (`order_number`, `line_number`, `menu_item_id`, `item_name`, `quantity`, `unit_price`) VALUES
('VK-2841', 1, 2,  'Liempo Silog',          2, 135.00),
('VK-2841', 2, 20, 'Calamansi',             1,  30.00),
('VK-2840', 1, 8,  'Tapsilog Beef',         1, 135.00),
('VK-2839', 1, 12, 'Beef Pares w/ Rice',    1,  75.00),
('VK-2839', 2, 28, 'Halo Halo',             1,  85.00),
('VK-2838', 1, 1,  'Lechon Kawali Silog',   2, 135.00)
ON DUPLICATE KEY UPDATE
  `quantity`   = VALUES(`quantity`),
  `unit_price` = VALUES(`unit_price`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: payments
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `payments` (`payment_number`, `order_number`, `method`, `amount`, `status`, `reference`) VALUES
('PAY-00001', 'VK-2841', 'GCash', 300.00, 'Paid',    'VD-002841'),
('PAY-00002', 'VK-2840', 'Cash',  135.00, 'Paid',    'VD-002840'),
('PAY-00003', 'VK-2839', 'Cash',  160.00, 'Pending', 'VD-002839'),
('PAY-00004', 'VK-2838', 'Card',  270.00, 'Paid',    'VD-002838')
ON DUPLICATE KEY UPDATE
  `status` = VALUES(`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: rewards
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `rewards` (`reward_id`, `name`, `description`, `points_required`, `available`) VALUES
(1, 'Complimentary dessert', 'One sweet thing, on us',        200, 1),
(2, 'Free house drink',      'A little afternoon pick-me-up', 350, 1)
ON DUPLICATE KEY UPDATE
  `name`             = VALUES(`name`),
  `points_required`  = VALUES(`points_required`),
  `available`        = VALUES(`available`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: promotions
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `promotions` (`promotion_id`, `name`, `detail`, `status`) VALUES
(1, 'Silog Special',   'Double points on all Silog Meals',    'Active'),
(2, 'Sweet September', 'Complimentary dessert at 200 points', 'Scheduled')
ON DUPLICATE KEY UPDATE
  `name`   = VALUES(`name`),
  `detail` = VALUES(`detail`),
  `status` = VALUES(`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: notifications
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `notifications` (`title`, `detail`, `audience`, `time_label`, `is_read`) VALUES
('New order received',  'Online order VK-2841 from Mia Santos is preparing.',      'all',   '10:42 AM',  0),
('Attendance recorded', 'Ava Mendoza checked in using the demo RFID reader.',       'admin', '10:18 AM',  0),
('Low availability',    'Ube panna cotta is running low. 4 portions remain.',       'admin', 'Yesterday', 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: attendance_events
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `attendance_events` (`staff_id`, `staff_name`, `event_time`, `action`) VALUES
('ST-014', 'Ava Mendoza', '10:42 AM', 'Time in');

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: app_profiles  (default customer profile row)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `app_profiles` (`profile_id`, `name`, `email`, `phone`, `loyalty_points`) VALUES
(1, 'Maureen Santos', 'maureen.santos@email.com', '+63 917 555 0142', 120)
ON DUPLICATE KEY UPDATE
  `name`           = VALUES(`name`),
  `loyalty_points` = VALUES(`loyalty_points`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: app_state  (preference defaults)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `app_state` (`state_key`, `state_value`) VALUES
('preferences', JSON_OBJECT(
  'orders',     true,
  'attendance', true,
  'loyalty',    false,
  'receipts',   true
))
ON DUPLICATE KEY UPDATE `state_value` = VALUES(`state_value`);


SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════════════════════
SELECT 'eateries_db_full.sql imported successfully.' AS result;
-- ═══════════════════════════════════════════════════════════════════════════════
