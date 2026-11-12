import { auth } from './firebase.ts';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error) message = errData.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchPdfBlobUrl(pdfId: number): Promise<string> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/pdfs/${pdfId}/file`, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to load PDF file.');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
