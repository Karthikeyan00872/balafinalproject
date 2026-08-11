const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const demoToken = () => localStorage.getItem('tnuwwb_token');
export const setDemoToken = (token) => localStorage.setItem('tnuwwb_token', token);
export const clearToken = () => localStorage.removeItem('tnuwwb_token');

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(demoToken() ? { Authorization: `Bearer ${demoToken()}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
