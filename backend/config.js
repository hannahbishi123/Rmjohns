import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')

// Resolve service account path relative to the project root so it works
// regardless of what directory `node backend/index.js` is run from.
function resolveServiceAccount() {
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT
  if (envPath) {
    // If the .env value is an absolute path, use it directly.
    // Otherwise resolve relative to the project root.
    return path.isAbsolute(envPath) ? envPath : path.resolve(projectRoot, envPath)
  }
  // Default: backend/firebase-service-account.json next to this file
  return path.resolve(serverDirectory, 'firebase-service-account.json')
}

export const config = {
  database: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    name:     process.env.DB_NAME     || 'eateries_db',
  },
  apiPort: Number(process.env.API_PORT || 3001),
  firebase: {
    databaseURL:        process.env.FIREBASE_DATABASE_URL || 'https://rmjohns-eateries-default-rtdb.firebaseio.com',
    serviceAccountPath: resolveServiceAccount(),
    enabled:            process.env.FIREBASE_ENABLED !== 'false',
  },
}
