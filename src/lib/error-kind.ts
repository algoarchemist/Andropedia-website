// Decides which error screen a failure deserves. A missing URL is handled by not-found.tsx (a real 404) and never gets here;
// this is for errors thrown while a page loads or renders (error.tsx / global-error.tsx).
//
//   offline  the browser says there is no connection: nothing else can be trusted, so say that and retry on its own when it is back
//   network  the connection is up but a request or a code chunk failed mid-way (weak signal, a deploy while the tab was open)
//   server   anything else: a bug or an outage on our side

export type ErrorKind = "offline" | "network" | "server";

const NETWORK_MESSAGE = /Loading chunk|Loading CSS chunk|ChunkLoadError|Failed to fetch|NetworkError|Network request failed|Load failed|fetch failed|dynamically imported module|Importing a module script failed/i;

export function classifyError(error: { name?: string; message?: string } | null | undefined, online: boolean): ErrorKind {
  if (!online) return "offline";
  if (error?.name === "ChunkLoadError" || NETWORK_MESSAGE.test(error?.message ?? "")) return "network";
  return "server";
}

/** Whether trying again by itself, once the connection is back, makes sense. */
export const retriesOnReconnect = (kind: ErrorKind) => kind !== "server";
