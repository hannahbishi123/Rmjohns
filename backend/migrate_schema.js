import mysql from 'mysql2/promise';

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eateries_db'
  });

  console.log('Connected to eateries_db.');

  // Helper to check if column exists
  async function hasColumn(table, column) {
    const [rows] = await conn.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'eateries_db' AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return rows[0].count > 0;
  }

  // 1. Staff table alterations
  const staffColsToAdd = [
    { name: 'employee_id', type: 'VARCHAR(64) NULL' },
    { name: 'account_id', type: 'BIGINT UNSIGNED NULL' },
    { name: 'first_name', type: 'VARCHAR(100) NULL' },
    { name: 'middle_name', type: 'VARCHAR(100) NULL' },
    { name: 'last_name', type: 'VARCHAR(100) NULL' },
    { name: 'birthdate', type: 'VARCHAR(32) NULL' },
    { name: 'gender', type: 'VARCHAR(32) NULL' },
    { name: 'email', type: 'VARCHAR(255) NULL' },
    { name: 'address', type: 'TEXT NULL' },
    { name: 'position', type: 'VARCHAR(64) NULL' },
    { name: 'date_hired', type: 'VARCHAR(32) NULL' },
    { name: 'employment_status', type: "VARCHAR(32) DEFAULT 'Active'" }
  ];

  for (const col of staffColsToAdd) {
    if (!(await hasColumn('staff', col.name))) {
      console.log(`Adding ${col.name} to staff...`);
      await conn.execute(`ALTER TABLE staff ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // Backfill existing staff
  const [existingStaff] = await conn.execute('SELECT staff_id, name, role, contact, rfid_uid, employee_id, position FROM staff');
  let empCounter = 1;
  for (const s of existingStaff) {
    const parts = (s.name || '').trim().split(' ');
    const firstName = parts[0] || 'Staff';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Member';
    const empId = s.employee_id || `EMP-${String(empCounter).padStart(4, '0')}`;
    const pos = s.position || s.role || 'Staff';
    const emailVal = s.contact && s.contact.includes('@') ? s.contact : null;

    await conn.execute(
      `UPDATE staff SET 
        employee_id = COALESCE(employee_id, ?),
        first_name = COALESCE(first_name, ?),
        last_name = COALESCE(last_name, ?),
        position = COALESCE(position, ?),
        employment_status = COALESCE(employment_status, 'Active'),
        date_hired = COALESCE(date_hired, DATE_FORMAT(NOW(), '%Y-%m-%d')),
        email = COALESCE(email, ?)
      WHERE staff_id = ?`,
      [empId, firstName, lastName, pos, emailVal, s.staff_id]
    );
    empCounter++;
  }

  // Check unique key on staff.employee_id
  const [indexes] = await conn.execute(`SHOW INDEX FROM staff WHERE Key_name = 'uniq_staff_employee_id'`);
  if (indexes.length === 0) {
    try {
      await conn.execute(`ALTER TABLE staff ADD UNIQUE KEY uniq_staff_employee_id (employee_id)`);
      console.log('Added unique key uniq_staff_employee_id');
    } catch (e) {
      console.warn('Could not add unique key on employee_id:', e.message);
    }
  }

  // 2. user_accounts alterations
  const userColsToAdd = [
    { name: 'employee_id', type: 'VARCHAR(64) NULL' },
    { name: 'staff_id', type: 'VARCHAR(32) NULL' },
    { name: 'account_status', type: "VARCHAR(32) DEFAULT 'Active'" }
  ];

  for (const col of userColsToAdd) {
    if (!(await hasColumn('user_accounts', col.name))) {
      console.log(`Adding ${col.name} to user_accounts...`);
      await conn.execute(`ALTER TABLE user_accounts ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // Link existing staff to user_accounts where email / username matches
  await conn.execute(`
    UPDATE user_accounts ua
    JOIN staff s ON (ua.email = s.contact OR ua.email = s.email OR ua.username = s.name)
    SET ua.staff_id = s.staff_id, ua.employee_id = s.employee_id
    WHERE ua.staff_id IS NULL
  `);

  // 3. Create rfid_card_assignments table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS rfid_card_assignments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      staff_id VARCHAR(32) NOT NULL,
      rfid_uid VARCHAR(64) NOT NULL,
      card_status ENUM('Active', 'Deactivated', 'Replaced') DEFAULT 'Active',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      registered_by VARCHAR(64) DEFAULT 'Admin',
      deactivated_at DATETIME NULL,
      INDEX idx_staff_id (staff_id),
      INDEX idx_rfid_uid (rfid_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Verified rfid_card_assignments table.');

  // Backfill existing active RFID assignments
  for (const s of existingStaff) {
    if (s.rfid_uid) {
      const cleanUid = String(s.rfid_uid).trim().toUpperCase();
      const [existingAss] = await conn.execute(
        `SELECT id FROM rfid_card_assignments WHERE staff_id = ? AND rfid_uid = ? LIMIT 1`,
        [s.staff_id, cleanUid]
      );
      if (existingAss.length === 0) {
        await conn.execute(
          `INSERT INTO rfid_card_assignments (staff_id, rfid_uid, card_status, registered_at, registered_by)
           VALUES (?, ?, 'Active', NOW(), 'Admin')`,
          [s.staff_id, cleanUid]
        );
        console.log(`Created RFID assignment for staff ${s.staff_id} with UID ${cleanUid}`);
      }
    }
  }

  console.log('Migration completed successfully!');
  await conn.end();
}

migrate().catch(console.error);
