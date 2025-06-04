import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000"; // Update if your FastAPI runs elsewhere

export async function fetchFromAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}