/**
 * Allocraft Frontend API Client
 *
 * What this file does (explained like you're 10):
 * - Figures out where our backend API is running (local computer for development, or on the internet for production)
 * - Sends HTTP requests to the backend (like asking a waiter for food)
 * - Adds a secret token to requests when you're logged in (so the server knows it's you)
 *
 * Why we structure it this way (best practice):
 * - One place to decide the API base URL (so we don't repeat ourselves)
 * - Small helper functions to keep UI pages simple and fast
 * - Clear names and comments so future you (or a new teammate) can fix things easily
 */
function resolveApiBase() {
    try {
        if (typeof window !== "undefined") {
            const { protocol, hostname, port } = window.location;
            const origin = `${protocol}//${hostname}:${port}`;
            // Force local API when running Vite dev server
            if (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") {
                return "http://localhost:8000";
            }
        }
    } catch { }
    // Otherwise use configured API base or fallback to local
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
}

export const API_BASE = resolveApiBase();

export function isDevBackend() {
    try {
        const u = new URL(API_BASE);
        return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

/**
 * apiFetch
 *
 * A tiny wrapper around fetch() that always
 * - Pre-pends the API base URL
 * - Adds your login token (if you have one)
 * - Ensures JSON Content-Type by default
 *
 * Usage example:
 *   const res = await apiFetch('/wheels/wheel-cycles');
 *   const data = await res.json();
 */
export async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem("allocraft_token");
    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
    };
    return fetch(`${API_BASE}${path}`, { ...options, headers });
}

/**
 * fetchJson
 *
 * Calls apiFetch and returns parsed JSON or throws a helpful Error with server text.
 */
export async function fetchJson(path, options = {}) {
    const res = await apiFetch(path, options);
    let bodyText = null;
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            try { sessionStorage.removeItem("allocraft_token"); } catch { }
            // Redirect to login for auth errors
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        try { bodyText = await res.text(); } catch { }
        let message = bodyText || `Request failed with ${res.status}`;
        try {
            const maybeJson = JSON.parse(bodyText);
            message = maybeJson.detail || maybeJson.error || message;
        } catch { }
        throw new Error(message);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
}

/**
 * fetchFromAPI
 *
 * A more generic helper that accepts full URLs too.
 * Useful when calling external endpoints or when a function needs
 * to pass an absolute URL; otherwise prefer apiFetch for internal API calls.
 */
export async function fetchFromAPI(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
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
/**
 * logout
 *
 * Clears your token (so you are logged out) and moves you to the login page.
 */
export function logout() {
    try { sessionStorage.removeItem("allocraft_token"); } catch { }
    window.location.href = "/login";
}

/**
 * getMe
 *
 * Asks the server: "Who am I?" using your token.
 * Returns your user info when logged in.
 */
export async function getMe() {
    const token = sessionStorage.getItem("allocraft_token");
    if (!token) throw new Error("Not authenticated");
    return fetchJson('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
}

// Wheel cycles & events API
/**
 * wheelApi
 *
 * A collection of tiny functions that talk to the backend about
 * wheel cycles, events, and lots. Each one does one small job.
 */
export const wheelApi = {
    async listCycles() {
        return fetchJson('/wheels/wheel-cycles');
    },
    async createCycle(data) {
        return fetchJson('/wheels/wheel-cycles', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateCycle(id, data) {
        return fetchJson(`/wheels/wheel-cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteCycle(id) {
        return fetchJson(`/wheels/wheel-cycles/${id}`, { method: 'DELETE' });
    },
    async listEvents(cycleId) {
        const url = cycleId ? `/wheels/wheel-events?cycle_id=${cycleId}` : '/wheels/wheel-events';
        return fetchJson(url);
    },
    async createEvent(data) {
        return fetchJson('/wheels/wheel-events', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateEvent(id, data) {
        return fetchJson(`/wheels/wheel-events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteEvent(id) {
        return fetchJson(`/wheels/wheel-events/${id}`, { method: 'DELETE' });
    },
    async metrics(cycleId) {
        return fetchJson(`/wheels/wheel-metrics/${cycleId}`);
    },
    // Lots
    async listLots(cycleId, params = {}) {
        const qs = new URLSearchParams(params).toString();
        return fetchJson(`/wheels/cycles/${cycleId}/lots${qs ? `?${qs}` : ''}`);
    },
    async getLot(lotId) {
        return fetchJson(`/wheels/lots/${lotId}`);
    },
    async lotMetrics(lotId) {
        return fetchJson(`/wheels/lots/${lotId}/metrics`);
    },
    async getLotLinks(lotId) {
        return fetchJson(`/wheels/lots/${lotId}/links`);
    },
    async rebuildLots(cycleId) {
        return fetchJson(`/wheels/lots/rebuild?cycle_id=${cycleId}`, { method: 'POST' });
    },
    async bindCall(lotId, optionEventId) {
        return fetchJson(`/wheels/lots/${lotId}/bind-call`, { method: 'POST', body: JSON.stringify({ option_event_id: optionEventId }) });
    },
    async unbindCall(lotId) {
        return fetchJson(`/wheels/lots/${lotId}/unbind-call`, { method: 'POST' });
    }
};