import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getDatabase, ref, set, get, update, onValue, off } from 'firebase/database'
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize once
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db      = getDatabase(firebaseApp)
const auth    = getAuth(firebaseApp)
const storage = getStorage(firebaseApp)

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Sign in with email + password via Firebase Auth.
 * Returns the Firebase User object.
 */
export async function firebaseSignIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Create a new Firebase Auth account.
 * Returns the Firebase User object.
 */
export async function firebaseRegister(email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Sign out the current Firebase Auth user.
 */
export async function firebaseSignOut() {
  await signOut(auth)
}

/**
 * Get the current user's ID token (JWT) for backend verification.
 * Returns null if no user is signed in.
 */
export async function getIdToken() {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Subscribe to Firebase Auth state changes.
 * Calls callback(user) on sign-in and callback(null) on sign-out.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

/**
 * Send a password reset email via Firebase Auth.
 */
export async function firebaseSendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email)
}

// ── Realtime Database helpers ─────────────────────────────────────────────────

/** Write a value to a Realtime DB path. */
export async function firebaseSet(path, data) {
  try {
    await set(ref(db, path), data)
  } catch (error) {
    console.error('[firebase] write failed:', error.message)
  }
}

/**
 * Atomic multi-path update on the Realtime DB root.
 * Pass an object whose keys are absolute paths (e.g. 'eateries/orders/VK-001')
 * and whose values are the data to write.  A single round-trip to Firebase.
 * Throws on failure so callers can detect the error.
 */
export async function firebaseUpdate(updates) {
  try {
    await update(ref(db), updates)
  } catch (error) {
    // Surface the error so the caller can decide whether to show it,
    // but never let an uncaught rejection crash the whole app.
    console.error('[firebase] update failed:', error.code || error.message)
    throw error
  }
}

/** Read a value once from a Realtime DB path. */
export async function firebaseGet(path) {
  try {
    const snap = await get(ref(db, path))
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error('[firebase] read failed:', error.message)
    return null
  }
}

/**
 * Subscribe to real-time updates on a path.
 * Returns an unsubscribe function.
 */
export function firebaseListen(path, callback) {
  const dbRef = ref(db, path)
  onValue(dbRef, (snap) => {
    callback(snap.exists() ? snap.val() : null)
  })
  return () => off(dbRef)
}

/**
 * Subscribe to Firebase connection state (.info/connected).
 * Calls callback(true) when connected and callback(false) when disconnected.
 * Returns an unsubscribe function.
 */
export function firebaseListenConnection(callback) {
  const connRef = ref(db, '.info/connected')
  onValue(connRef, (snap) => {
    callback(snap.val() === true)
  })
  return () => off(connRef)
}

// ── Firebase Storage helpers ──────────────────────────────────────────────────

/**
 * Compress and resize an image File in the browser using a canvas,
 * then return a new Blob ready for upload.
 *
 * - Max dimension: 800 × 800 px (menu card images don't need more)
 * - Quality: 0.80 JPEG (looks great, ~80% smaller than originals)
 * - Skips GIF (canvas can't animate them — keep as-is)
 *
 * @param {File} file - Original file from <input type="file">
 * @returns {Promise<Blob>} Compressed image blob
 */
function compressImage(file) {
  return new Promise((resolve) => {
    // GIF can't be reasonably re-encoded — upload as-is
    if (file.type === 'image/gif') { resolve(file); return }

    const MAX_DIM = 800
    const QUALITY = 0.80

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Downscale proportionally if larger than MAX_DIM
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width)
          width  = MAX_DIM
        } else {
          width  = Math.round((width  * MAX_DIM) / height)
          height = MAX_DIM
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Output as JPEG for best compression (WebP if supported)
      const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
      canvas.toBlob(
        (blob) => resolve(blob || file),
        outputType,
        QUALITY,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/**
 * Upload a menu item image to Firebase Storage.
 * The image is automatically compressed before upload for speed.
 *
 * Path: menu_images/{itemId}_{timestamp}.jpg
 *
 * @param {File}             file       - File from <input type="file">
 * @param {string|number}    itemId     - Menu item id (path prefix)
 * @param {function}         onProgress - Optional callback(percent:number)
 * @returns {Promise<string>}            Firebase Storage download URL
 */
export async function uploadMenuImage(file, itemId, onProgress) {
  // Compress first — this is what makes uploads fast
  const compressed = await compressImage(file)

  return new Promise((resolve, reject) => {
    const ext  = file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `menu_images/${itemId}_${Date.now()}.${ext}`
    const sRef = storageRef(storage, path)

    const task = uploadBytesResumable(sRef, compressed, {
      contentType: file.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
      cacheControl: 'public, max-age=31536000',   // 1-year CDN cache
    })

    task.on(
      'state_changed',
      (snap) => {
        if (onProgress) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
        }
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      },
    )
  })
}

/**
 * Delete an image from Firebase Storage by its download URL.
 * Silently ignores errors (e.g. image already deleted, wrong origin).
 *
 * @param {string} downloadURL - The https:// URL returned by getDownloadURL
 */
export async function deleteMenuImage(downloadURL) {
  if (!downloadURL) return
  try {
    // Firebase download URLs contain the encoded path after /o/
    const urlObj  = new URL(downloadURL)
    const encoded = urlObj.pathname.split('/o/')[1]
    if (!encoded) return
    const path = decodeURIComponent(encoded.split('?')[0])
    const sRef = storageRef(storage, path)
    await deleteObject(sRef)
  } catch {
    // Non-critical — ignore (image may not exist in Storage)
  }
}

export { db, auth, storage, firebaseApp }
