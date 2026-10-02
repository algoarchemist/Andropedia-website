import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { copy } from '@andropedia/shared';

export type ApiError = { path: string; message: string };

/** Throw from any handler to send `{ errors: [...] }` with the given status. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: ApiError[],
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(errors[0]?.message ?? 'Request failed');
  }
}

export const apiError = (path: string, message: string): ApiError => ({ path, message });

/** One error per field path: the first message zod produced for it. */
export function zodToErrors(error: ZodError): ApiError[] {
  const seen = new Map<string, ApiError>();
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!seen.has(path)) seen.set(path, apiError(path, issue.message));
  }
  return [...seen.values()];
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ errors: [apiError('', copy.notfound.body)] });
};

// Express 4 style signature (4 args) is what marks this as an error handler.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ ...err.extra, errors: err.errors });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ errors: zodToErrors(err) });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? copy.err.photoSize : copy.err.photoType;
    res.status(400).json({ errors: [apiError(err.field ?? 'photo', message)] });
    return;
  }
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.too.large') {
    res.status(413).json({ errors: [apiError('', copy.err.server)] });
    return;
  }
  if (type === 'entity.parse.failed') {
    res.status(400).json({ errors: [apiError('', copy.err.required)] });
    return;
  }
  // SEC-02: never log bodies or personal data. The error name is enough to debug.
  console.error(`unhandled error: ${err instanceof Error ? err.name : typeof err}`);
  res.status(500).json({ errors: [apiError('', copy.err.server)] });
};
