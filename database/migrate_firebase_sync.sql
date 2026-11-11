-- ─────────────────────────────────────────────────────────────────────────────
-- Firebase Sync Migration  (v3 — MySQL 5.7 compatible)
-- Run this ONCE in phpMyAdmin against eateries_db.
-- Safe to re-run: every statement uses information_schema checks.
-- Does NOT remove, rename, or change any existing column or table.
--
-- Tables that have  updated_at  → sync columns added AFTER updated_at
-- Tables that only have  created_at  → sync columns added AFTER created_at
-- ─────────────────────────────────────────────────────────────────────────────

USE `eateries_db`;

-- ── 1. Sync queue (append-only log of records waiting to reach Firebase) ──────
CREATE TABLE IF NOT EXISTS `firebase_sync_queue` (
  `queue_id`    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(64)      NOT NULL COMMENT 'e.g. orders, menu_items, payments',
  `entity_id`   VARCHAR(64)      NOT NULL COMMENT 'Primary key of the MySQL record',
  `operation`   ENUM('upsert','delete') NOT NULL DEFAULT 'upsert',
  `payload`     JSON             NOT NULL  COMMENT 'Serialised record to push',
  `status`      ENUM('pending','retrying','synced','failed') NOT NULL DEFAULT 'pending',
  `attempt`     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `last_error`  TEXT             DEFAULT NULL,
  `created_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `synced_at`   TIMESTAMP        NULL     DEFAULT NULL,
  PRIMARY KEY (`queue_id`),
  KEY `idx_sync_status`  (`status`),
  KEY `idx_sync_entity`  (`entity_type`, `entity_id`),
  KEY `idx_sync_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Records queued for Firebase Realtime DB sync';

-- ── 2. firebase_uid column on user_accounts ───────────────────────────────────
--    Links a MySQL account to its Firebase Auth UID (set on first sign-in).
--    Uses information_schema so this is safe to re-run on MySQL 5.7+.
SET @exist_uid_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'user_accounts'
    AND COLUMN_NAME  = 'firebase_uid'
);
SET @sql_uid_col := IF(
  @exist_uid_col = 0,
  'ALTER TABLE `user_accounts`
     ADD COLUMN `firebase_uid` VARCHAR(128) DEFAULT NULL
       COMMENT ''Firebase Authentication UID''
       AFTER `customer_id`',
  'SELECT ''firebase_uid column already exists'' AS msg'
);
PREPARE stmt FROM @sql_uid_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique index for firebase_uid
SET @exist_uid_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'user_accounts'
    AND INDEX_NAME   = 'uq_user_accounts_firebase_uid'
);
SET @sql_uid_idx := IF(
  @exist_uid_idx = 0,
  'ALTER TABLE `user_accounts` ADD UNIQUE KEY `uq_user_accounts_firebase_uid` (`firebase_uid`)',
  'SELECT ''uq_user_accounts_firebase_uid already exists'' AS msg'
);
PREPARE stmt FROM @sql_uid_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3. Sync columns on  orders  (has updated_at) ─────────────────────────────
SET @exist_orders_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'orders'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_orders_status := IF(
  @exist_orders_status = 0,
  'ALTER TABLE `orders`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending''
       COMMENT ''Firebase sync state'' AFTER `updated_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL
       COMMENT ''Last successful Firebase push'' AFTER `firebase_sync_status`',
  'SELECT ''orders sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_orders_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_orders_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'orders'
    AND INDEX_NAME   = 'idx_orders_sync_status'
);
SET @sql_orders_idx := IF(
  @exist_orders_idx = 0,
  'ALTER TABLE `orders` ADD KEY `idx_orders_sync_status` (`firebase_sync_status`)',
  'SELECT ''idx_orders_sync_status already exists'' AS msg'
);
PREPARE stmt FROM @sql_orders_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 4. Sync columns on  payments  (has updated_at) ───────────────────────────
SET @exist_pay_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'payments'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_pay_status := IF(
  @exist_pay_status = 0,
  'ALTER TABLE `payments`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `updated_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''payments sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_pay_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_pay_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'payments'
    AND INDEX_NAME   = 'idx_payments_sync_status'
);
SET @sql_pay_idx := IF(
  @exist_pay_idx = 0,
  'ALTER TABLE `payments` ADD KEY `idx_payments_sync_status` (`firebase_sync_status`)',
  'SELECT ''idx_payments_sync_status already exists'' AS msg'
);
PREPARE stmt FROM @sql_pay_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 5. Sync columns on  menu_items  (has updated_at) ─────────────────────────
SET @exist_menu_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'menu_items'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_menu_status := IF(
  @exist_menu_status = 0,
  'ALTER TABLE `menu_items`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `updated_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''menu_items sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_menu_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_menu_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'menu_items'
    AND INDEX_NAME   = 'idx_menu_sync_status'
);
SET @sql_menu_idx := IF(
  @exist_menu_idx = 0,
  'ALTER TABLE `menu_items` ADD KEY `idx_menu_sync_status` (`firebase_sync_status`)',
  'SELECT ''idx_menu_sync_status already exists'' AS msg'
);
PREPARE stmt FROM @sql_menu_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 6. Sync columns on  customers  (has updated_at) ──────────────────────────
SET @exist_cust_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'customers'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_cust_status := IF(
  @exist_cust_status = 0,
  'ALTER TABLE `customers`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `updated_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''customers sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_cust_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_cust_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'customers'
    AND INDEX_NAME   = 'idx_customers_sync_status'
);
SET @sql_cust_idx := IF(
  @exist_cust_idx = 0,
  'ALTER TABLE `customers` ADD KEY `idx_customers_sync_status` (`firebase_sync_status`)',
  'SELECT ''idx_customers_sync_status already exists'' AS msg'
);
PREPARE stmt FROM @sql_cust_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 7. Sync columns on  staff  (has updated_at) ──────────────────────────────
SET @exist_staff_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'staff'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_staff_status := IF(
  @exist_staff_status = 0,
  'ALTER TABLE `staff`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `updated_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''staff sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_staff_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist_staff_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'staff'
    AND INDEX_NAME   = 'idx_staff_sync_status'
);
SET @sql_staff_idx := IF(
  @exist_staff_idx = 0,
  'ALTER TABLE `staff` ADD KEY `idx_staff_sync_status` (`firebase_sync_status`)',
  'SELECT ''idx_staff_sync_status already exists'' AS msg'
);
PREPARE stmt FROM @sql_staff_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 8. Sync columns on  notifications  (only has created_at) ─────────────────
SET @exist_notif_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'notifications'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_notif_status := IF(
  @exist_notif_status = 0,
  'ALTER TABLE `notifications`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `created_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''notifications sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_notif_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 9. Sync columns on  attendance_events  (only has created_at) ─────────────
SET @exist_attend_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'attendance_events'
    AND COLUMN_NAME  = 'firebase_sync_status'
);
SET @sql_attend_status := IF(
  @exist_attend_status = 0,
  'ALTER TABLE `attendance_events`
     ADD COLUMN `firebase_sync_status`
       ENUM(''pending'',''synced'',''failed'') NOT NULL DEFAULT ''pending'' AFTER `created_at`,
     ADD COLUMN `firebase_synced_at`
       TIMESTAMP NULL DEFAULT NULL AFTER `firebase_sync_status`',
  'SELECT ''attendance_events sync columns already exist'' AS msg'
);
PREPARE stmt FROM @sql_attend_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Done ──────────────────────────────────────────────────────────────────────
SELECT 'Firebase sync migration v3 applied successfully.' AS result;
