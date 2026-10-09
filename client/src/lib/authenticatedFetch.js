import { getToken } from './auth'

/**
 * Attaches the bearer token to dashboard API calls.
 *
 * Why this exists
 * ---------------
 * The HR dashboard reaches its API from roughly forty separate `fetch` calls
 * spread across ten pages and components, each written by hand. Most of them
 * do not name an Authorization header, which was harmless while those routes
 * were open - and became a bug the moment the API started enforcing
 * permissions, because a request from a signed-in HR Admin would be answered
 * with "Authentication required".
 *
 * Adding the header in forty places is forty chances to miss one, and a missed
 * one is a broken screen that looks like a permission problem. So there is one
 * place instead.
 *
 * What it will and will not do
 * ----------------------------
 * It only ever *adds* an Authorization header. It never removes one, never
 * changes a method, body or response, and never retries.
 *
 * It only applies to the dashboard's own API paths, and only when the request
 * targets this site or the local development API server. A request to any other
 * origin is passed through untouched, so the token cannot be sent somewhere it
 * does not belong. A call that already set Authorization keeps its own value.
 *
 * Nothing here is a security boundary. The server decides what a token may do;
 * this only ensures the token arrives.
 */

const AUTH_PATH_PREFIXES = ['/api/hr-manager', '/api/announcements']

// The dashboard normally calls relative paths and lets the dev server proxy
// them. Some pages still hold an absolute development URL, so those origins are
// recognised explicitly rather than by string matching, which is what keeps a
// lookalike origin from receiving the token.
const DEV_API_ORIGINS = ['http://localhost:4000', 'http://127.0.0.1:4000']

function resolveTarget(input) {
  try {
    if (typeof input === 'string') return new URL(input, window.location.origin)
    if (typeof URL !== 'undefined' && input instanceof URL) return input
    if (typeof Request !== 'undefined' && input instanceof Request) {
      return new URL(input.url, window.location.origin)
    }
  } catch {
    // A URL that cannot be parsed is not one we should attach a token to.
  }
  return null
}

function isOwnApi(target) {
  if (!target) return false

  const originIsTrusted =
    target.origin === window.location.origin || DEV_API_ORIGINS.includes(target.origin)

  if (!originIsTrusted) return false

  return AUTH_PATH_PREFIXES.some((prefix) => target.pathname.startsWith(prefix))
}

export function installAuthenticatedFetch() {
  if (typeof window === 'undefined' || window.__authenticatedFetchInstalled) return

  const nativeFetch = window.fetch.bind(window)

  window.fetch = function authenticatedFetch(input, init) {
    const token = getToken()
    const options = init || {}

    const handleResponse = (res) => {
      if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      return res
    }

    if (!token || !isOwnApi(resolveTarget(input))) {
      return nativeFetch(input, options).then(handleResponse)
    }

    // A Request instance carries its own headers; clone it so the caller's
    // object is not mutated.
    if (typeof Request !== 'undefined' && input instanceof Request) {
      if (input.headers.has('Authorization')) return nativeFetch(input, options).then(handleResponse)
      const request = input.clone()
      request.headers.set('Authorization', `Bearer ${token}`)
      return nativeFetch(request, options).then(handleResponse)
    }

    const headers = new Headers(options.headers || {})
    if (headers.has('Authorization')) return nativeFetch(input, options).then(handleResponse)

    headers.set('Authorization', `Bearer ${token}`)
    return nativeFetch(input, { ...options, headers }).then(handleResponse)
  }

  window.__authenticatedFetchInstalled = true
}

export default installAuthenticatedFetch
