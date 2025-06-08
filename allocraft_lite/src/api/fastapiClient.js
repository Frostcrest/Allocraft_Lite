const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    const opts = {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        credentials: "include",
        ...options,
    };
    // Remove Content-Type for FormData
    if (opts.body instanceof FormData) {
        delete opts.headers["Content-Type"];
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}