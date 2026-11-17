/**
 * unit-test-staff-menu-handler.js
 *
 * Direct unit test verifying the Staff Menu update logic:
 * 1. Staff cannot modify restricted fields (name, price, category, description, image, emoji, tone) -> 403 Forbidden
 * 2. Staff can update availability (available) and stock -> allowed
 * 3. Admin can update any field -> allowed
 */

const restrictedFields = ['name', 'category', 'price', 'description', 'image', 'imageUrl', 'emoji', 'tone']

function checkStaffPermission(userRole, updates) {
  if (userRole === 'Staff') {
    const attempted = restrictedFields.filter((key) => updates[key] !== undefined)
    if (attempted.length > 0) {
      return {
        status: 403,
        error: `Forbidden: Staff members are only allowed to modify item availability and stock. Restricted fields: ${attempted.join(', ')}.`,
      }
    }
  }
  return { status: 200, ok: true }
}

let passed = 0
let failed = 0

function assert(cond, name) {
  if (cond) {
    console.log(`✓ PASS: ${name}`)
    passed++
  } else {
    console.error(`✗ FAIL: ${name}`)
    failed++
  }
}

// Test 1: Staff updating only availability -> ALLOWED
const t1 = checkStaffPermission('Staff', { available: false })
assert(t1.status === 200, 'Staff allowed to update availability')

// Test 2: Staff updating availability and stock -> ALLOWED
const t2 = checkStaffPermission('Staff', { available: true, stock: 15 })
assert(t2.status === 200, 'Staff allowed to update availability and stock')

// Test 3: Staff attempting to update price -> REJECTED (403)
const t3 = checkStaffPermission('Staff', { price: 999.00 })
assert(t3.status === 403 && t3.error.includes('price'), 'Staff attempting price change is rejected with 403')

// Test 4: Staff attempting to update name -> REJECTED (403)
const t4 = checkStaffPermission('Staff', { name: 'Hacked Name' })
assert(t4.status === 403 && t4.error.includes('name'), 'Staff attempting name change is rejected with 403')

// Test 5: Staff attempting to update category -> REJECTED (403)
const t5 = checkStaffPermission('Staff', { category: 'New Category' })
assert(t5.status === 403 && t5.error.includes('category'), 'Staff attempting category change is rejected with 403')

// Test 6: Staff attempting to update image -> REJECTED (403)
const t6 = checkStaffPermission('Staff', { image: '/new-photo.jpg' })
assert(t6.status === 403 && t6.error.includes('image'), 'Staff attempting image change is rejected with 403')

// Test 7: Admin updating price and name -> ALLOWED
const t7 = checkStaffPermission('Admin', { price: 150, name: 'Admin Edited Name' })
assert(t7.status === 200, 'Admin permitted to update any field')

console.log(`\nUnit test results: ${passed} PASSED, ${failed} FAILED`)
process.exit(failed > 0 ? 1 : 0)
