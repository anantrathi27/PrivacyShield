
export const API = "http://127.0.0.1:8000";

// Store JWT token in memory
let accessToken = null;

// Save or clear token
export function setAccessToken(token) {
  accessToken = token;
}

// Get currently stored token
export function getAccessToken() {
  return accessToken;
}

// Make authenticated API requests
export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  // Attach JWT token
  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  // Handle expired or invalid tokens
  if (response.status === 401 && accessToken) {
    window.dispatchEvent(
      new Event("privacyshield:unauthorized")
    );
  }

  return response;
}
