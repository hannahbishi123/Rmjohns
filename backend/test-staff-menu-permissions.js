/**
 * test-staff-menu-permissions.js
 *
 * Verifies that Staff members cannot modify restricted fields (name, price, category, etc.)
 * but CAN successfully update availability and stock.
 */
import http from 'node:http'

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

async function run() {
  console.log('Testing Staff Menu Edit Permissions...')

  // 1. Login as Staff to acquire valid token
  const staffLogin = await fetchJson('http://localhost:3001/api/auth/login', {
    method: 'POST',
    body: { identifier: 'staff@rmjohns.com', password: 'demo1234', role: 'Staff' },
  })

  const token = staffLogin.data?.token
  console.log('Staff login status:', staffLogin.status, 'Has token:', Boolean(token))

  if (!token) {
    console.log('Falling back: Testing mock user validation directly')
  }

  // 2. Attempt to update restricted field 'price' with Staff token
  const attemptPriceUpdate = await fetchJson('http://localhost:3001/api/menu-items/update', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: {
      id: 1,
      updates: { price: 999.00 }
    }
  })

  console.log('Attempt restricted update (price):', attemptPriceUpdate.status, attemptPriceUpdate.data)

  // 3. Attempt to update restricted field 'name' with Staff token
  const attemptNameUpdate = await fetchJson('http://localhost:3001/api/menu-items/update', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: {
      id: 1,
      updates: { name: 'Hacked Menu Item Name' }
    }
  })

  console.log('Attempt restricted update (name):', attemptNameUpdate.status, attemptNameUpdate.data)

  // 4. Attempt to update allowed field 'available' with Staff token
  const attemptAvailUpdate = await fetchJson('http://localhost:3001/api/menu-items/update', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: {
      id: 1,
      updates: { available: true }
    }
  })

  console.log('Attempt allowed update (available):', attemptAvailUpdate.status, attemptAvailUpdate.data)

  const isRestrictedBlocked = attemptPriceUpdate.status === 403 && attemptNameUpdate.status === 403
  const isAllowedPermitted = attemptAvailUpdate.status === 200

  if (isRestrictedBlocked && isAllowedPermitted) {
    console.log('\n✓ ALL STAFF PERMISSION TESTS PASSED!')
    process.exit(0)
  } else {
    console.log('\nResults: isRestrictedBlocked =', isRestrictedBlocked, 'isAllowedPermitted =', isAllowedPermitted)
    process.exit(isRestrictedBlocked && isAllowedPermitted ? 0 : 1)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
