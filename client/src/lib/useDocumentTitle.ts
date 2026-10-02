import { useEffect } from 'react';

/** Sets document.title while the calling screen is shown (SHL-06). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
