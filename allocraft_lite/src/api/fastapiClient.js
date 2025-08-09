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

// Auth helpers
export function logout() {
    try { sessionStorage.removeItem("allocraft_token"); } catch { }
    window.location.href = "/login";
}

export async function getMe() {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const token = sessionStorage.getItem("allocraft_token");
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

// Wheel cycles & events API
export const wheelApi = {
    async listCycles() {
        const res = await apiFetch('/wheels/wheel-cycles');
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async createCycle(data) {
        const res = await apiFetch('/wheels/wheel-cycles', { method: 'POST', body: JSON.stringify(data) });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async updateCycle(id, data) {
        const res = await apiFetch(`/wheels/wheel-cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async deleteCycle(id) {
        const res = await apiFetch(`/wheels/wheel-cycles/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async listEvents(cycleId) {
        const url = cycleId ? `/wheels/wheel-events?cycle_id=${cycleId}` : '/wheels/wheel-events';
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async createEvent(data) {
        const res = await apiFetch('/wheels/wheel-events', { method: 'POST', body: JSON.stringify(data) });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async updateEvent(id, data) {
        const res = await apiFetch(`/wheels/wheel-events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async deleteEvent(id) {
        const res = await apiFetch(`/wheels/wheel-events/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async metrics(cycleId) {
        const res = await apiFetch(`/wheels/wheel-metrics/${cycleId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};