// Where the API lives, from VITE_API_URL in .env.
const API_URL = import.meta.env.VITE_API_URL;

// Fetches JSON from the API, e.g. getJson('/posts').
// If the API answers with an error, this throws an error that carries the
// status code (like 404), so pages can show the right message.
export async function getJson(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const error = new Error(`Request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}
