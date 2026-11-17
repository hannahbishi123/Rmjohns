/**
 * test-web-integration.js
 *
 * Automated Web & API Integration Test Suite for Rmjohns Eateries
 * Verifies runtime behavior across Vite web server, Express backend, MySQL, and Role Auth.
 */

import http from 'node:http'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ status: res.statusCode, data: json, headers: res.headers })
        } catch {
          resolve({ status: res.statusCode, raw: data, headers: res.headers })
        }
      })
    })

    req.on('error', reject)
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    }
    req.end()
  })
}

async function runWebIntegrationTests() {
  console.log('===============================================================')
  console.log(' REACT WEB & EXPRESS BACKEND INTEGRATION TEST SUITE')
  console.log('===============================================================\n')

  try {
    // 1. Health & Service Connectivity
    console.log('[1. Express Backend & MySQL Health Check]')
    const health = await fetchJson('http://localhost:3001/api/health')
    assert(health.status === 200, 'Health endpoint responds with HTTP 200')
    assert(health.data.status === 'ok', 'System status is "ok"')
    assert(health.data.mysql.connected === true, 'MySQL database connection verified (eateries_db)')
    assert(health.data.firebase.connected === true, 'Firebase RTDB connection verified')

    // 2. Bootstrap Data Shape
    console.log('\n[2. Bootstrap Data Delivery]')
    const boot = await fetchJson('http://localhost:3001/api/bootstrap')
    assert(boot.status === 200, 'Bootstrap endpoint responds with HTTP 200')
    assert(Array.isArray(boot.data.menu) && boot.data.menu.length > 0, `Menu items loaded: ${boot.data.menu?.length} items`)
    assert(Array.isArray(boot.data.orders), `Orders loaded: ${boot.data.orders?.length} existing orders`)
    assert(Array.isArray(boot.data.customers), `Customers loaded: ${boot.data.customers?.length} customers`)
    assert(Array.isArray(boot.data.staff), `Staff records loaded: ${boot.data.staff?.length} staff members`)

    // Verify first menu item structure
    const sampleItem = boot.data.menu[0]
    assert(Boolean(sampleItem.id && sampleItem.name && sampleItem.price != null), `Menu item schema valid: "${sampleItem.name}" (₱${sampleItem.price})`)

    // 3. Role-Based Login
    console.log('\n[3. Role-Based Authentication]')
    // Admin
    const adminLogin = await fetchJson('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: { identifier: 'manager@rmjohns.com', password: 'RmjohnsAdmin2026!', role: 'Admin' },
    })
    assert(adminLogin.status === 200, 'Admin login succeeds with HTTP 200')
    assert(adminLogin.data.account.role === 'Admin', 'Admin account role returned as "Admin"')

    // Staff
    const staffLogin = await fetchJson('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: { identifier: 'staff@rmjohns.com', password: 'demo1234', role: 'Staff' },
    })
    assert(staffLogin.status === 200, 'Staff login succeeds with HTTP 200')
    assert(staffLogin.data.account.role === 'Staff', 'Staff account role returned as "Staff"')

    // Customer
    const custLogin = await fetchJson('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: { identifier: 'maureen.santos@email.com', password: 'demo1234', role: 'Customer' },
    })
    assert(custLogin.status === 200, 'Customer login succeeds with HTTP 200')
    assert(custLogin.data.account.role === 'Customer', 'Customer account role returned as "Customer"')

    // Invalid Credentials
    const badLogin = await fetchJson('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@rmjohns.com', password: 'WrongPassword999!', role: 'Admin' },
    })
    assert(badLogin.status === 401, 'Invalid password correctly rejected with HTTP 401')

    // 4. Role Authorization Locks
    console.log('\n[4. Role-Based API Endpoint Authorization]')
    // Unauthenticated access to admin-only endpoint
    const unauthFlush = await fetchJson('http://localhost:3001/api/sync/flush', { method: 'POST' })
    assert(unauthFlush.status === 401, 'Unauthenticated sync flush rejected with HTTP 401')

    const unauthSetRole = await fetchJson('http://localhost:3001/api/auth/set-role', { method: 'POST', body: { uid: '123', role: 'Admin' } })
    assert(unauthSetRole.status === 401, 'Unauthenticated role modification rejected with HTTP 401')

    // 5. Vite Web Server Asset Delivery
    console.log('\n[5. Vite Frontend Server Asset Delivery]')
    const webHome = await fetchJson('http://localhost:5173')
    assert(webHome.status === 200, 'Vite dev server responds with HTTP 200 on port 5173')
    assert(typeof webHome.raw === 'string' && webHome.raw.includes('<div id="root"></div>'), 'HTML shell contains React root element')
    assert(webHome.raw.includes('/src/main.jsx'), 'HTML shell references Vite main entry point')

  } catch (err) {
    console.error('Web integration test error:', err)
    failed++
  }

  console.log('\n===============================================================')
  console.log(` WEB INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('===============================================================\n')

  if (failed > 0) process.exit(1)
  else process.exit(0)
}

runWebIntegrationTests()
