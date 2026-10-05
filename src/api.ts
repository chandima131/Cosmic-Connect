import { useCallback, useEffect, useState } from 'react';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to complete your request.');
  return data;
}
export function useApi<T>(path: string) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => { const controller = new AbortController(); api<T>(path, { signal: controller.signal }).then(data => setState({ data, loading: false })).catch(error => { if (error.name !== 'AbortError') setState({ error: error.message, loading: false }); }); return () => controller.abort(); }, [path, revision]);
  return { ...state, refresh };
}
