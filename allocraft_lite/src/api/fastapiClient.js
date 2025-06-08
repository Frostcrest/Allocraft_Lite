const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5173";

export async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("allocraft_token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function fetchFromAPI(endpoint, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5173";
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}