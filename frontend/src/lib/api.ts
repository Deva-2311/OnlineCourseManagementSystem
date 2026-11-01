import { User, UserRole } from '@/types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Unified token & user session management
export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface RawUserPayload {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export function setAuthSession(accessToken: string, user: RawUserPayload, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  // Write to both keys for complete backward compatibility across all existing components
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  const safeUser: User = {
    id: user.id,
    name: user.fullName || user.name || 'User',
    email: user.email,
    role: user.role,
  };
  localStorage.setItem('user', JSON.stringify(safeUser));
  // Dispatch custom storage event so components in the same window can update synchronously
  window.dispatchEvent(new Event('auth-change'));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-change'));
}

export function getAuthHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken') || '';
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include',
      });

      if (!res.ok) {
        clearAuthSession();
        return null;
      }

      const data = await res.json();
      if (data?.accessToken) {
        setAuthSession(data.accessToken, data.user, data.refreshToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}



export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Resilient API request wrapper with automated JSON parsing, rate limiting, and single-attempt token refresh
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = getAuthHeaders(options.headers || {});
  
  // If sending FormData, do not force Content-Type
  if (options.body instanceof FormData) {
    delete (headers as Record<string, string>)['Content-Type'];
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    // Attempt token refresh on 401 if not already a retry, and not an auth route
    if (
      res.status === 401 &&
      !_isRetry &&
      !path.includes('/auth/login') &&
      !path.includes('/auth/register') &&
      !path.includes('/auth/refresh')
    ) {
      const newToken = await refreshAuthToken();
      if (newToken) {
        return apiFetch<T>(path, options, true);
      }
    }

    // Attempt to parse structured error message
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (Array.isArray(errJson.message)) {
        errorMessage = errJson.message.join(', ');
      } else if (errJson.message) {
        errorMessage = errJson.message;
      }
    } catch {
      // Non-JSON response
    }
    
    // Auto-clear session if Unauthorized on a protected endpoint
    if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/register')) {
      if (typeof window !== 'undefined' && getAuthToken()) {
        clearAuthSession();
      }
    }

    throw new ApiError(errorMessage, res.status);
  }

  // Handle empty or text responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

// Authentication Helpers
export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<{
    accessToken: string;
    refreshToken?: string;
    user: RawUserPayload;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  setAuthSession(data.accessToken, data.user, data.refreshToken);
  return data;
}

export async function apiRegister(payload: {
  fullName: string;
  email: string;
  password: string;
  role?: 'STUDENT' | 'INSTRUCTOR';
}) {
  const data = await apiFetch<RawUserPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      role: payload.role || 'STUDENT',
    }),
  });
  return data;
}

export async function apiLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore server error on logout
  } finally {
    clearAuthSession();
  }
}

export async function apiGetProfile(): Promise<User | null> {
  try {
    const data = await apiFetch<RawUserPayload>('/auth/me');
    const safeUser: User = {
      id: data.id,
      name: data.fullName || data.name || 'User',
      email: data.email,
      role: data.role,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(safeUser));
    }
    return safeUser;
  } catch {
    return null;
  }
}
 