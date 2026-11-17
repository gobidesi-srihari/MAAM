
const API_BASE_URL = "http://localhost:8000";

export async function apiRequest(endpoint, options = {}) {
  // Get JWT token after login
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Handle HTTP 204 - successful response without body
  if (response.status === 204) {
    return null;
  }

  // Read JSON response
  const data = await response.json().catch(() => ({}));

  // Handle API errors
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.message || "API request failed"
    );
  }

  return data;
}
