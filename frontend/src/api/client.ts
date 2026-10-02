import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Each venue (first URL segment) keeps its own login, so a sign-in at one venue is never used on another.
export const venueFromPath = (pathname: string) => pathname.split('/')[1] ?? '';
export const userKey = (venue: string) => `user:${venue}`;
const currentVenue = () => venueFromPath(window.location.pathname);

// The login token travels as an httpOnly cookie; X-Venue tells the API which venue's cookie to use.
api.interceptors.request.use((config) => {
  config.headers['X-Venue'] = currentVenue();
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
    // Signed in per the UI but the cookie is gone or expired: forget the user so the route guards send them to sign in.
    const key = userKey(currentVenue());
    if (error.response?.status === 401 && localStorage.getItem(key)) {
      localStorage.removeItem(key);
      window.location.reload();
    }
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
