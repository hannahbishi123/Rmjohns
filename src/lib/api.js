// When deployed, set VITE_API_BASE_URL to your backend's public URL
// e.g. https://your-backend.railway.app
// Leave it empty (or unset) for local dev — relative paths work via Vite's proxy
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  // If the server returned HTML (e.g. Firebase Hosting rewrote /api/* to
  // index.html), treat it as a network error so the Firebase fallback triggers.
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error('API endpoint not available (received HTML response).')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}.`)
  }
  return body
}
