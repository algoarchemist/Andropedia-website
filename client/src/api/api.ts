// Thin fetch wrappers for API-01 and API-02. Errors arrive as {errors:[{path,message}]} (PRD 11).
import { copy } from '@andropedia/shared';

export type PublicConfig = { recruitmentOpen: boolean; whatsappUrl: string };
export type TakenFlags = { registerNumberTaken: boolean; emailTaken: boolean };
export type ApiFieldError = { path: string; message: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const TIMEOUT_MS = 10_000;
const CONFIG_TIMEOUT_MS = 4000;

/** status 0 means the request never reached the server. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errors: ApiFieldError[],
  ) {
    super(errors[0]?.message ?? copy.err.server);
    this.name = 'ApiError';
  }
}

function errorsFrom(body: unknown, status: number): ApiFieldError[] {
  const errors = (body as { errors?: unknown } | undefined)?.errors;
  if (Array.isArray(errors) && errors.length) return errors as ApiFieldError[];
  return [{ path: '', message: status === 429 ? copy.err.rateLimit : copy.err.server }];
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ApiError(0, [{ path: '', message: copy.err.network }]);
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, errorsFrom(body, res.status));
  return body as T;
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** API-01 */
export async function getConfig(): Promise<PublicConfig> {
  const body = await request<Partial<PublicConfig>>('/api/config', {}, CONFIG_TIMEOUT_MS);
  if (typeof body?.recruitmentOpen !== 'boolean') throw new ApiError(500, errorsFrom(undefined, 500));
  return { recruitmentOpen: body.recruitmentOpen, whatsappUrl: typeof body.whatsappUrl === 'string' ? body.whatsappUrl : '' };
}

/** API-02, called by step 01's Next (APP-01-R1). */
export function checkDuplicate(registerNumber: string, email: string): Promise<TakenFlags> {
  return request<TakenFlags>('/api/applications/check', postJson({ registerNumber, email }));
}

/**
 * API-04. Statuses the caller handles (APP-06-R2): 201 `{ id }`, 400 field errors, 403 closed, 409 duplicate,
 * 429 rate limited, 0 network failure. All but 201 arrive as an ApiError.
 */
export async function submitApplication(payload: Record<string, unknown>): Promise<{ id: string }> {
  const body = await request<{ id?: unknown }>('/api/applications', postJson(payload));
  if (typeof body?.id !== 'string') throw new ApiError(500, errorsFrom(undefined, 500));
  return { id: body.id };
}

export type UploadedPhoto = { photoId: string; url: string };

const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * API-03. XMLHttpRequest rather than fetch, because fetch cannot report upload progress (APP-04-R4).
 * `onProgress` gets 0 to 100. Abort with the signal when the user replaces or removes the photo mid-upload.
 */
export function uploadPhoto(photo: Blob, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<UploadedPhoto> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/uploads/photo`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    const networkError = () => reject(new ApiError(0, [{ path: '', message: copy.err.network }]));
    xhr.onerror = networkError;
    xhr.ontimeout = networkError;
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    xhr.onload = () => {
      const body: unknown = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300) {
        const { photoId, url } = (body ?? {}) as Partial<UploadedPhoto>;
        if (typeof photoId === 'string' && typeof url === 'string') resolve({ photoId, url });
        else reject(new ApiError(500, errorsFrom(undefined, 500)));
      } else {
        reject(new ApiError(xhr.status, errorsFrom(body, xhr.status)));
      }
    };
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    const form = new FormData();
    // The server sniffs the real type from the bytes; the name only helps logs and debugging.
    form.append('photo', photo, photo instanceof File ? photo.name : 'photo.jpg');
    xhr.send(form);
  });
}
