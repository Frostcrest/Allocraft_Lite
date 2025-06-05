const API_BASE_URL = "https://api.allocraft.app"; // Update if your FastAPI runs elsewhere

export async function fetchFromAPI(endpoint, options = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}