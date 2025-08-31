/**
 * Allocraft Frontend API Client
 *
 * What this file does (explained like you're 10):
 * - Figuexport async function fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const opts: RequestInit = {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        credentials: "include" as RequestCredentials,
        ...options,
    };
    // Remove Content-Type for FormData
    if (opts.body instanceof FormData && opts.headers && typeof opts.headers === 'object' && !Array.isArray(opts.headers)) {
        delete (opts.headers as Record<string, string>)["Content-Type"];
    }
    const res = await fetch(url, opts);e our backend API is running (local computer for development, or on the internet for production)
 * - Sends HTTP requests to the backend (like asking a waiter for food)
 * - Adds a secret token to requests when you're logged in (so the server knows it's you)
 *
 * Why we structure it this way (best practice):
 * - One place to decide the API base URL (so we don't repeat ourselves)
 * - Small helper functions to keep UI pages simple and fast
 * - Clear names and comments so future you (or a new teammate) can fix things easily
 */

function resolveApiBase(): string {
    try {
        if (typeof window !== "undefined") {
            const { protocol, hostname } = window.location;
            // If we're on localhost (any port), target the local backend.
            if (hostname === "localhost" || hostname === "127.0.0.1") {
                return `${protocol}//localhost:8000`;
            }
        }
    } catch { }
    // Otherwise use configured API base or fallback to local
    return (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
}

export const API_BASE: string = resolveApiBase();

export function isDevBackend(): boolean {
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
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
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
export async function fetchJson(path: string, options: RequestInit = {}): Promise<any> {
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
            if (bodyText) {
                const maybeJson = JSON.parse(bodyText);
                if (Array.isArray(maybeJson.detail)) {
                    // FastAPI validation errors
                    message = maybeJson.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('\n');
                } else {
                    message = maybeJson.detail || maybeJson.error || message;
                }
            }
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
export async function fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const opts: RequestInit = {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        credentials: "include" as RequestCredentials,
        ...options,
    };
    // Remove Content-Type for FormData
    if (opts.body instanceof FormData && opts.headers && typeof opts.headers === 'object' && !Array.isArray(opts.headers)) {
        delete (opts.headers as Record<string, string>)["Content-Type"];
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
    async createCycle(data: any) {
        return fetchJson('/wheels/wheel-cycles', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateCycle(id: number, data: any) {
        return fetchJson(`/wheels/wheel-cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteCycle(id: number) {
        return fetchJson(`/wheels/wheel-cycles/${id}`, { method: 'DELETE' });
    },
    async listEvents(cycleId: number) {
        const url = cycleId ? `/wheels/wheel-events?cycle_id=${cycleId}` : '/wheels/wheel-events';
        return fetchJson(url);
    },
    async createEvent(data: any) {
        return fetchJson('/wheels/wheel-events', { method: 'POST', body: JSON.stringify(data) });
    },
    async updateEvent(id: number, data: any) {
        return fetchJson(`/wheels/wheel-events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteEvent(id: number) {
        return fetchJson(`/wheels/wheel-events/${id}`, { method: 'DELETE' });
    },
    async metrics(cycleId: number) {
        return fetchJson(`/wheels/wheel-metrics/${cycleId}`);
    },
    // Lots
    async listLots(cycleId: number, params: Record<string, any> = {}) {
        const qs = new URLSearchParams(params).toString();
        return fetchJson(`/wheels/cycles/${cycleId}/lots${qs ? `?${qs}` : ''}`);
    },
    async getLot(lotId: number) {
        return fetchJson(`/wheels/lots/${lotId}`);
    },
    async lotMetrics(lotId: number) {
        return fetchJson(`/wheels/lots/${lotId}/metrics`);
    },
    async getLotLinks(lotId: number) {
        return fetchJson(`/wheels/lots/${lotId}/links`);
    },
    async rebuildLots(cycleId: number) {
        return fetchJson(`/wheels/lots/rebuild?cycle_id=${cycleId}`, { method: 'POST' });
    },
    async bindCall(lotId: number, optionEventId: number) {
        return fetchJson(`/wheels/lots/${lotId}/bind-call`, { method: 'POST', body: JSON.stringify({ option_event_id: optionEventId }) });
    },
    async unbindCall(lotId: number) {
        return fetchJson(`/wheels/lots/${lotId}/unbind-call`, { method: 'POST' });
    }
};

// === SCHWAB INTEGRATION ===

export const schwabApi = {
    // Get stored positions from database with optional fresh sync
    async getStoredPositions(fresh: boolean = false) {
        return fetchJson(`/schwab/positions?fresh=${fresh}`);
    },
    
    // Manually trigger position synchronization
    async syncPositions(force: boolean = false) {
        return fetchJson(`/schwab/sync?force=${force}`, { method: 'POST' });
    },
    
    // Get synchronization status for all accounts
    async getSyncStatus() {
        return fetchJson(`/schwab/sync-status`);
    },
    
    // Get account summaries from database with optional refresh
    async getAccounts(refresh: boolean = false) {
        return fetchJson(`/schwab/accounts?refresh=${refresh}`);
    },
    
    // Legacy API endpoints (for backwards compatibility)
    async getAccountSummaries() {
        return fetchJson(`/schwab/account-summaries`);
    },
    
    async getAccountPositions(accountHash: string) {
        return fetchJson(`/schwab/account-positions/${accountHash}`);
    }
};