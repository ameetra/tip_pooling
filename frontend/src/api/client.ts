import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Each venue (first URL segment) keeps its own login, so a token from one venue is never used on another.
export const venueFromPath = (pathname: string) => pathname.split('/')[1] ?? '';
export const tokenKey = (venue: string) => `jwt:${venue}`;

// The API rejects a token whose venue differs from X-Venue.
api.interceptors.request.use((config) => {
  const venue = venueFromPath(window.location.pathname);
  const token = localStorage.getItem(tokenKey(venue));
  config.headers['X-Venue'] = venue;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { success, data } envelope; surface the API's error message on both
// envelope errors (2xx with success:false) and HTTP errors (4xx/5xx).
function apiError(payload: any, fallback: Error) {
  const e = payload?.error;
  if (!e?.message) return fallback;
  const err = new Error(e.message);
  (err as any).code = e.code;
  (err as any).details = e.details;
  return err;
}

api.interceptors.response.use(
  (res) => {
    if (res.data?.success === false) throw apiError(res.data, new Error('Request failed'));
    return res.data.data;
  },
  (error) => {
    throw apiError(error.response?.data, error);
  },
);

export default api;

// Typed helpers (axios interceptor returns unwrapped data)
export const get = <T>(url: string) => api.get(url) as unknown as Promise<T>;
export const post = <T>(url: string, data?: unknown) => api.post(url, data) as unknown as Promise<T>;
export const patch = <T>(url: string, data?: unknown) => api.patch(url, data) as unknown as Promise<T>;
export const put = <T>(url: string, data?: unknown) => api.put(url, data) as unknown as Promise<T>;
export const del = <T = void>(url: string, data?: unknown) => api.delete(url, { data }) as unknown as Promise<T>;
