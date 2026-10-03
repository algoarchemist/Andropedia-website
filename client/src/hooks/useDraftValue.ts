// Binds a control to one key of the application draft (SHL-04). Every change is autosaved by DraftProvider.
import { useCallback } from 'react';
import { useDraft, type DraftData } from '../state/draft';

type StringKey = { [K in keyof DraftData]-?: DraftData[K] extends string | undefined ? K : never }[keyof DraftData];

/** Text value for `key` ('' when unset) and a setter. */
export function useDraftText(key: StringKey): [string, (value: string) => void] {
  const { data, setData } = useDraft();
  const set = useCallback((value: string) => setData({ [key]: value }), [key, setData]);
  return [data[key] ?? '', set];
}
