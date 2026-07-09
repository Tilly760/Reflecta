const API_BASE = import.meta.env.DEV
  ? "/api"
  : "https://reflecta-m99u.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email, password, name) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export function getMe() {
  return request("/me");
}

export function getEntries() {
  return request("/entries");
}

export function createEntry(entry) {
  return request("/entries", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export function updateEntry(id, data) {
  return request(`/entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEntry(id) {
  return request(`/entries/${id}`, {
    method: "DELETE",
  });
}
