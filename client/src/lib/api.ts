const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('hcm_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json.error?.message || `HTTP error ${response.status}`;
    const error = new Error(errorMsg) as Error & { code?: string; details?: unknown; status: number };
    error.code = json.error?.code || 'UNKNOWN_ERROR';
    error.details = json.error?.details;
    error.status = response.status;
    throw error;
  }

  return (json.data ?? json) as T;
}
