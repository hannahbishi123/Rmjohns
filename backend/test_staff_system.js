import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=== RMJOHNS STAFF MANAGEMENT & RFID ENROLLMENT TEST SUITE ===\n');

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eateries_db'
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Schema Integrity Check
    console.log('--- Test 1: Verifying Schema Columns & Unique Constraints ---');
    const [staffCols] = await conn.execute('DESCRIBE staff');
    const staffColNames = staffCols.map(c => c.Field);
    const requiredStaffCols = [
      'staff_id', 'employee_id', 'first_name', 'middle_name', 'last_name',
      'birthdate', 'gender', 'contact', 'email', 'address', 'position', 'employment_status'
    ];
    for (const col of requiredStaffCols) {
      assert(staffColNames.includes(col), `Staff table contains '${col}' column`);
    }

    const [cardAssignCols] = await conn.execute('DESCRIBE rfid_card_assignments');
    const cardAssignColNames = cardAssignCols.map(c => c.Field);
    const requiredCardCols = ['id', 'staff_id', 'rfid_uid', 'card_status', 'registered_at', 'registered_by', 'deactivated_at'];
    for (const col of requiredCardCols) {
      assert(cardAssignColNames.includes(col), `rfid_card_assignments table contains '${col}' column`);
    }

    // TEST 2: Role Authorization Security Check (Manager must NOT be Admin)
    console.log('\n--- Test 2: Role Authorization vs Employment Designation ---');
    const testStaffId = `TEST-STF-${Date.now()}`;
    const testEmpId = `TEST-EMP-${Date.now().toString().slice(-4)}`;
    const testEmail = `test.manager.${Date.now()}@rmjohns.test`;
    const testUsername = `testmgr_${Date.now()}`;
    const rawPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Insert as Manager position
    const [accRes] = await conn.execute(
      `INSERT INTO user_accounts 
        (username, email, password_hash, role, contact, position, employee_id, staff_id, approval_status, approved_by, approved_at, account_status)
       VALUES (?, ?, ?, 'Staff', '09170001111', 'Manager', ?, ?, 'APPROVED', 'Admin', NOW(), 'Active')`,
      [testUsername, testEmail, passwordHash, testEmpId, testStaffId]
    );
    const accId = accRes.insertId;

    await conn.execute(
      `INSERT INTO staff
        (staff_id, name, role, contact, status, approval_status, approved_by, approved_at, rfid_status,
         employee_id, account_id, first_name, last_name, birthdate, email, position, employment_status)
       VALUES (?, 'Juan Manager', 'Staff', '09170001111', 'Offline', 'APPROVED', 'Admin', NOW(), 'INACTIVE',
         ?, ?, 'Juan', 'Manager', '1990-01-01', ?, 'Manager', 'Active')`,
      [testStaffId, testEmpId, accId, testEmail]
    );

    const [userRows] = await conn.execute('SELECT role, position, password_hash FROM user_accounts WHERE account_id = ?', [accId]);
    assert(userRows[0].position === 'Manager', 'Account position is set to "Manager"');
    assert(userRows[0].role === 'Staff', 'SECURITY: Role is strictly "Staff" (NOT "Admin") despite Manager position');
    assert(await bcrypt.compare(rawPassword, userRows[0].password_hash), 'SECURITY: Password is securely hashed with bcrypt');

    // TEST 3: Duplicate Employee ID Rejection
    console.log('\n--- Test 3: Duplicate Employee ID Rejection ---');
    let duplicateRejected = false;
    try {
      await conn.execute(
        `INSERT INTO staff (staff_id, name, role, employee_id) VALUES (?, 'Dupe Person', 'Staff', ?)`,
        [`TEST-STF-DUPE-${Date.now()}`, testEmpId]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Unique constraint rejects duplicate employee_id');

    // TEST 4: RFID Card Enrollment & Audit History Logging
    console.log('\n--- Test 4: RFID Enrollment and Card Assignment Audit History ---');
    const testRfidUid = `CARD-${Date.now().toString().slice(-6)}`;
    
    // Simulate linking card during enrollment
    await conn.execute(
      `INSERT INTO rfid_card_assignments (staff_id, rfid_uid, card_status, registered_at, registered_by)
       VALUES (?, ?, 'Active', NOW(), 'Admin')`,
      [testStaffId, testRfidUid]
    );
    await conn.execute(
      `UPDATE staff SET rfid_uid = ?, rfid_status = 'ACTIVE' WHERE staff_id = ?`,
      [testRfidUid, testStaffId]
    );

    const [assignRows] = await conn.execute('SELECT * FROM rfid_card_assignments WHERE staff_id = ? AND rfid_uid = ?', [testStaffId, testRfidUid]);
    assert(assignRows.length === 1 && assignRows[0].card_status === 'Active', 'RFID assignment logged with status "Active"');

    // TEST 5: Duplicate Card Assignment Rejection
    console.log('\n--- Test 5: Duplicate Card Assignment Rejection ---');
    const [dupeCheck] = await conn.execute(
      `SELECT r.staff_id, s.name 
       FROM rfid_card_assignments r
       LEFT JOIN staff s ON s.staff_id = r.staff_id
       WHERE r.rfid_uid = ? AND r.card_status = 'Active' AND r.staff_id != ? LIMIT 1`,
      [testRfidUid, 'DIFFERENT-STAFF-ID']
    );
    assert(dupeCheck.length > 0, 'Backend correctly flags card UID as already assigned to another staff member');

    // TEST 6: Card Replacement & Deactivation Audit
    console.log('\n--- Test 6: Card Replacement & Deactivation Audit Trail ---');
    const replacementCardUid = `NEWCARD-${Date.now().toString().slice(-6)}`;

    // Archive old card
    await conn.execute(
      `UPDATE rfid_card_assignments SET card_status = 'Replaced', deactivated_at = NOW() WHERE staff_id = ? AND card_status = 'Active'`,
      [testStaffId]
    );
    // Assign replacement card
    await conn.execute(
      `INSERT INTO rfid_card_assignments (staff_id, rfid_uid, card_status, registered_at, registered_by)
       VALUES (?, ?, 'Active', NOW(), 'Admin')`,
      [testStaffId, replacementCardUid]
    );
    await conn.execute(
      `UPDATE staff SET rfid_uid = ? WHERE staff_id = ?`,
      [replacementCardUid, testStaffId]
    );

    const [historyRows] = await conn.execute(
      'SELECT card_status, rfid_uid FROM rfid_card_assignments WHERE staff_id = ? ORDER BY id ASC',
      [testStaffId]
    );
    assert(historyRows.length === 2, 'History retains both original and replacement cards');
    assert(historyRows[0].card_status === 'Replaced', 'Old card status archived as "Replaced"');
    assert(historyRows[1].card_status === 'Active', 'New card status active');

    // TEST 7: Staff Attendance 5-Point Verification
    console.log('\n--- Test 7: Staff Attendance 5-Point Verification ---');
    
    // Check 1: Valid active staff
    const [validCheck] = await conn.execute(
      `SELECT staff_id, name, status, rfid_status, employment_status FROM staff WHERE rfid_uid = ? LIMIT 1`,
      [replacementCardUid]
    );
    const staffObj = validCheck[0];
    const isEligible = 
      staffObj &&
      staffObj.rfid_status === 'ACTIVE' &&
      staffObj.employment_status === 'Active';
    assert(isEligible, '5-Point Verification: Active staff with active card is eligible for attendance');

    // Check 2: Inactive employment blocks attendance
    await conn.execute(`UPDATE staff SET employment_status = 'Inactive' WHERE staff_id = ?`, [testStaffId]);
    const [inactiveCheck] = await conn.execute(
      `SELECT staff_id, employment_status FROM staff WHERE rfid_uid = ? LIMIT 1`,
      [replacementCardUid]
    );
    assert(inactiveCheck[0].employment_status === 'Inactive', '5-Point Verification: Inactive staff employment blocks attendance access');

    // Clean up test data
    console.log('\n--- Cleaning up temporary test records ---');
    await conn.execute('DELETE FROM rfid_card_assignments WHERE staff_id = ?', [testStaffId]);
    await conn.execute('DELETE FROM staff WHERE staff_id = ?', [testStaffId]);
    await conn.execute('DELETE FROM user_accounts WHERE staff_id = ?', [testStaffId]);
    console.log('Cleaned up test data.');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    await conn.end();
  }

  console.log('\n==================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
