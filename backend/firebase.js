import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { config } from './config.js'

const require = createRequire(import.meta.url)

// Use the canonical path from config (which reads FIREBASE_SERVICE_ACCOUNT from .env,
// or defaults to backend/firebase-service-account.json next to this file).
const serviceAccountPath = config.firebase.serviceAccountPath
const DATABASE_URL = config.firebase.databaseURL

let db = null
let firestoreDb = null
let adminAuth = null
export let firebaseReady = false

export function getFirestoreDb() {
  if (firestoreDb) return firestoreDb
  try {
    const admin = require('firebase-admin')
    if (admin.apps.length) {
      firestoreDb = admin.firestore()
      return firestoreDb
    }
  } catch {}
  return null
}

export function getRealtimeDb() {
  if (db) return db
  try {
    const admin = require('firebase-admin')
    if (admin.apps.length) {
      db = admin.database()
      return db
    }
  } catch {}
  return null
}

export function getAdminAuth() {
  return adminAuth
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function initFirebase() {
  const admin = require('firebase-admin')
  let credential = null

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      credential = admin.credential.cert(parsed)
    } catch (e) {
      console.warn('[firebase] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message)
    }
  } else if (existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath)
      credential = admin.credential.cert(serviceAccount)
    } catch (e) {
      console.warn('[firebase] Error reading service account file:', e.message)
    }
  }

  if (!credential) {
    console.warn('[firebase] Service account not found - Firebase sync disabled.')
    return false
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential,
        databaseURL: DATABASE_URL,
      })
    }
    db = admin.database()
    firestoreDb = admin.firestore()
    adminAuth = admin.auth()
    await db.ref('.info/connected').once('value')
    firebaseReady = true
    console.log('[firebase] Connected to Realtime Database: ' + DATABASE_URL)
    return true
  } catch (error) {
    console.error('[firebase] Connection failed:', error.message)
    return false
  }
}

// ── Firebase Auth helpers (Admin SDK) ─────────────────────────────────────────

/**
 * Verify a Firebase ID token and return the decoded claims.
 * Returns null if the token is invalid or Firebase is not ready.
 */
export async function verifyIdToken(idToken) {
  if (!adminAuth) return null
  try {
    return await adminAuth.verifyIdToken(idToken)
  } catch {
    return null
  }
}

/**
 * Set a custom role claim on a Firebase Auth user.
 * This is used to store the app role (Admin/Staff/Customer) in the token.
 */
export async function setUserRole(uid, role) {
  if (!adminAuth) return
  try {
    await adminAuth.setCustomUserClaims(uid, { role })
  } catch (error) {
    console.error('[firebase] setCustomUserClaims failed:', error.message)
  }
}

/**
 * Create or update a Firebase Auth user.
 * Used during seeding to ensure demo accounts exist in Firebase Auth.
 * Returns the user record, or null on failure.
 */
export async function upsertFirebaseUser(email, password, displayName) {
  if (!adminAuth) return null
  try {
    // Try to find the existing user first
    try {
      const existing = await adminAuth.getUserByEmail(email)
      await adminAuth.updateUser(existing.uid, { displayName, password })
      return existing
    } catch {
      // User doesn't exist — create them
      const created = await adminAuth.createUser({ email, password, displayName })
      return created
    }
  } catch (error) {
    console.error(`[firebase] upsertFirebaseUser(${email}) failed:`, error.message)
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString()
}

function arrayToObject(arr) {
  if (!Array.isArray(arr)) return arr || {}
  const obj = {}
  arr.forEach(function(item, index) {
    const raw = item.id != null ? item.id : index
    const key = String(raw).replace(/[.#$[\]/]/g, '_')
    obj[key] = item
  })
  return obj
}

function toArray(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.values(obj)
}

// ── Sync full snapshot (called on every PUT /api/state) ───────────────────────
export async function syncSnapshot(snapshot) {
  if (!firebaseReady || !db) return
  try {
    const ts = timestamp()
    const live = {
      menu:           arrayToObject(snapshot.menu || []),
      orders:         arrayToObject(snapshot.orders || []),
      customers:      arrayToObject(snapshot.customers || []),
      staff:          arrayToObject(snapshot.staff || []),
      payments:       arrayToObject(snapshot.payments || []),
      rewards:        arrayToObject(snapshot.rewards || []),
      promotions:     arrayToObject(snapshot.promotions || []),
      notifications:  arrayToObject(snapshot.notifications || []),
      loyaltyHistory: arrayToObject(snapshot.loyaltyHistory || []),
      scanEvents:     arrayToObject(snapshot.scanEvents || []),
      profile:        snapshot.profile || {},
      points:         snapshot.points || 0,
      reservation:    snapshot.reservation || null,
      preferences:    snapshot.preferences || {},
      _syncedAt:      ts,
    }

    // Write live node — always latest state
    await db.ref('live').set(live)

    // Write daily backup keyed by date e.g. "2026-10-05"
    const dateKey = ts.slice(0, 10)
    await db.ref('backups/' + dateKey).set(Object.assign({}, live, { _backedUpAt: ts }))

    console.log('[firebase] Synced at ' + ts)
  } catch (error) {
    console.error('[firebase] syncSnapshot failed:', error.message)
    // Never throw — Firebase failure must not affect the MySQL response
  }
}

// ── Sync a single collection ──────────────────────────────────────────────────
export async function syncCollection(name, data) {
  if (!firebaseReady || !db) return
  try {
    const payload = Array.isArray(data) ? arrayToObject(data) : data
    await db.ref('live/' + name).set(payload)
  } catch (error) {
    console.error('[firebase] syncCollection(' + name + ') failed:', error.message)
  }
}

// ── Read live state from Firebase ─────────────────────────────────────────────
export async function readFromFirebase() {
  if (!firebaseReady || !db) return null
  try {
    const snap = await db.ref('live').once('value')
    const data = snap.val()
    if (!data) return null
    return {
      menu:           toArray(data.menu),
      orders:         toArray(data.orders),
      customers:      toArray(data.customers),
      staff:          toArray(data.staff),
      payments:       toArray(data.payments),
      rewards:        toArray(data.rewards),
      promotions:     toArray(data.promotions),
      notifications:  toArray(data.notifications),
      loyaltyHistory: toArray(data.loyaltyHistory),
      scanEvents:     toArray(data.scanEvents),
      profile:        data.profile || {},
      points:         data.points || 0,
      reservation:    data.reservation || null,
      preferences:    data.preferences || {},
    }
  } catch (error) {
    console.error('[firebase] readFromFirebase failed:', error.message)
    return null
  }
}

// ── Status ────────────────────────────────────────────────────────────────────
export function getFirebaseStatus() {
  return { ready: firebaseReady, databaseURL: DATABASE_URL, auth: adminAuth !== null, firestore: firestoreDb !== null }
}

/**
 * Write (or merge) a user profile and role document into Cloud Firestore
 * at `users/{uid}` so Firestore always holds the canonical user profile and role.
 */
export async function writeFirestoreUserRecord(uid, record) {
  if (!firestoreDb || !uid) return false
  try {
    const normalizedRole = record.role || 'Customer'
    await firestoreDb.collection('users').doc(String(uid)).set(
      {
        id:        String(uid),
        uid:       String(uid),
        username:  record.username || (record.email ? record.email.split('@')[0] : ''),
        email:     record.email || '',
        name:      record.name || record.username || '',
        phone:     record.phone || record.contact || '',
        role:      normalizedRole,
        title:     normalizedRole === 'Admin' ? 'Manager' : normalizedRole,
        status:    record.status || 'Active',
        updatedAt: timestamp(),
      },
      { merge: true },
    )
    return true
  } catch (error) {
    console.error('[firebase] writeFirestoreUserRecord failed:', error.message)
    return false
  }
}

/**
 * Read a user profile and role document from Cloud Firestore (`users/{uid}`).
 */
export async function readFirestoreUserRecord(uid) {
  if (!firestoreDb || !uid) return null
  try {
    const snap = await firestoreDb.collection('users').doc(String(uid)).get()
    return snap.exists ? snap.data() : null
  } catch {
    return null
  }
}

/**
 * Write (or overwrite) a single user account record at
 * eateries/user_accounts/{uid} in the Realtime Database AND users/{uid} in Firestore.
 * This is the role source-of-truth that the browser reads after sign-in.
 * Safe to call fire-and-forget — never throws.
 */
export async function writeUserAccountRecord(uid, record) {
  if (!firebaseReady || !db) return
  try {
    await db.ref(`eateries/user_accounts/${uid}`).set({ ...record, _syncedAt: timestamp() })
    await writeFirestoreUserRecord(uid, record)
  } catch (error) {
    console.error('[firebase] writeUserAccountRecord failed:', error.message)
  }
}
