// In production, API is served from same origin with /api prefix
// In development, API is on localhost:3001 without prefix
const API_BASE = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001';

export async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
