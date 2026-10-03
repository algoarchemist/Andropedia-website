// DSN-07 PhotoTile (APP-04 F4, R1, R4, R5): a polaroid with the applicant's first name as caption.
// Picking uses accept="image/*" with no capture attribute, so phones offer both camera and gallery.
// States: empty (dashed prompt), uploading (progress), failed (message and retry), done (replace and remove).
// Actions and messages sit under the tile, straight. Only photoId and url reach the draft; the picked file
// lives in memory for a retry only (CLAUDE.md).
import { useEffect, useRef, useState } from 'react';
import { copy, fmt } from '@andropedia/shared';
import { ApiError, uploadPhoto, type UploadedPhoto } from '../api/api';
import { AlertIcon } from '../icons/ui';
import { checkPhoto, downscalePhoto } from '../lib/photo';
import { EmptyTile, WallSlot } from './WallTile';

type Upload =
  | { state: 'idle' }
  | { state: 'uploading'; percent: number; preview: string }
  | { state: 'failed'; message: string; retry?: { blob: Blob; preview: string } };

type PhotoTileProps = {
  index: number;
  fresh: boolean;
  /** Schema error for photoId, shown after a failed Next. */
  error?: string;
  url: string | undefined;
  firstName: string;
  onUploaded: (photo: UploadedPhoto) => void;
  onRemoved: () => void;
};

const SMALL_BUTTON = 'min-h-[44px] rounded-sm border-2 border-ink bg-paper px-3 font-semibold';

export function PhotoTile({ index, fresh, error, url, firstName, onUploaded, onRemoved }: PhotoTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload>({ state: 'idle' });
  const abort = useRef<AbortController | null>(null);

  // Object URLs for local previews are released when replaced and on unmount.
  const previewRef = useRef<string | undefined>(undefined);
  const makePreview = (blob: Blob) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(blob);
    return previewRef.current;
  };
  useEffect(
    () => () => {
      abort.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  async function send(blob: Blob, preview: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setUpload({ state: 'uploading', percent: 0, preview });
    try {
      const photo = await uploadPhoto(blob, (percent) => setUpload({ state: 'uploading', percent, preview }), controller.signal);
      onUploaded(photo);
      setUpload({ state: 'idle' });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof ApiError ? err.message : copy.err.network;
      setUpload({ state: 'failed', message, retry: { blob, preview } });
    }
  }

  async function onPick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''; // picking the same file again still fires change
    if (!file) return;
    const problem = checkPhoto(file);
    if (problem) {
      setUpload({ state: 'failed', message: problem });
      return;
    }
    const blob = await downscalePhoto(file);
    await send(blob, makePreview(blob));
  }

  const pick = () => inputRef.current?.click();
  const remove = () => {
    abort.current?.abort();
    setUpload({ state: 'idle' });
    onRemoved();
  };

  const preview =
    upload.state === 'uploading' ? upload.preview : upload.state === 'failed' && upload.retry ? upload.retry.preview : url;
  const failure = upload.state === 'failed' ? upload.message : undefined;

  const below = (
    <>
      {failure && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-semibold text-error">
          <AlertIcon className="mt-[3px] h-4 w-4 shrink-0" />
          <span>{failure}</span>
        </p>
      )}
      {preview && (
        <div className="mt-3 flex flex-wrap gap-2">
          {upload.state === 'failed' && upload.retry && (
            <button type="button" onClick={() => void send(upload.retry!.blob, upload.retry!.preview)} className={SMALL_BUTTON}>
              {copy.work.retry}
            </button>
          )}
          {upload.state !== 'uploading' && (
            <button type="button" onClick={pick} className={SMALL_BUTTON}>
              {copy.work.replace}
            </button>
          )}
          <button type="button" onClick={remove} className={SMALL_BUTTON}>
            {copy.work.removePhoto}
          </button>
        </div>
      )}
      {/* Last, so a failed Next focuses the visible tile or its buttons, never this hidden input. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="photo-input"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
    </>
  );

  return (
    <WallSlot index={index} field="photoId" fresh={fresh} error={failure ? undefined : error} below={below}>
      {preview ? (
        <figure className="m-0 rounded-sm border-2 border-ink bg-paper p-3 pb-4">
          <div className="relative">
            <img
              src={preview}
              alt={fmt(copy.work.photoAlt, { name: firstName })}
              className="aspect-square w-full border-2 border-ink object-cover"
            />
            {upload.state === 'uploading' && (
              <div className="absolute inset-x-0 bottom-0 border-t-2 border-ink bg-paper p-2">
                <div
                  role="progressbar"
                  aria-label={copy.work.photo}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={upload.percent}
                  className="h-3 w-full border-2 border-ink"
                >
                  <div className="h-full bg-green" style={{ width: `${upload.percent}%` }} />
                </div>
                <p className="mt-1 text-sm font-semibold">{fmt(copy.work.uploading, { n: String(upload.percent) })}</p>
              </div>
            )}
          </div>
          <figcaption className="mt-3 text-center font-display text-2xl leading-none">{firstName}</figcaption>
        </figure>
      ) : (
        <EmptyTile prompt={copy.work.empty.photo} hint={copy.work.photo} onOpen={pick} />
      )}
    </WallSlot>
  );
}
