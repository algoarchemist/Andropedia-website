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

/** API-02. Wired into step 01's Next in Phase 5. */
export function checkDuplicate(registerNumber: string, email: string): Promise<TakenFlags> {
  return request<TakenFlags>('/api/applications/check', postJson({ registerNumber, email }));
}
