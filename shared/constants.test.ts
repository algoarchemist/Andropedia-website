import { describe, expect, it } from 'vitest';
import {
  DEPARTMENTS,
  DOMAINS,
  LIMITS,
  NAME_REGEX,
  PHONE_IN_REGEX,
  PROGRESS_STAGES,
  REG_NO_REGEX,
  SECTION_REGEX,
} from './constants';

describe('REG_NO_REGEX', () => {
  it('accepts RA followed by 13 digits', () => {
    expect(REG_NO_REGEX.test('RA2211003010123')).toBe(true);
  });
  it.each(['RA221100301012', 'RA22110030101234', 'ra2211003010123', 'XX2211003010123', 'RA22110030101AB'])(
    'rejects %s',
    (v) => expect(REG_NO_REGEX.test(v)).toBe(false),
  );
});

describe('PHONE_IN_REGEX', () => {
  it.each(['6000000000', '9876543210'])('accepts %s', (v) => expect(PHONE_IN_REGEX.test(v)).toBe(true));
  it.each(['5876543210', '987654321', '98765432100', '+919876543210', '98765 43210'])('rejects %s', (v) =>
    expect(PHONE_IN_REGEX.test(v)).toBe(false),
  );
});

describe('SECTION_REGEX', () => {
  it.each(['A', 'A1', 'B12', 'AB12'])('accepts %s', (v) => expect(SECTION_REGEX.test(v)).toBe(true));
  it.each(['', 'ABCDE', 'a', 'A-1'])('rejects "%s"', (v) => expect(SECTION_REGEX.test(v)).toBe(false));
});

describe('NAME_REGEX', () => {
  it.each(['Ab', 'Nithin Kumar', "O'Brien", 'Anne-Marie', 'J. R. Ward', 'Åsa Müller'])('accepts %s', (v) =>
    expect(NAME_REGEX.test(v)).toBe(true),
  );
  it.each(['A', '', 'R2D2', 'x'.repeat(81)])('rejects "%s"', (v) => expect(NAME_REGEX.test(v)).toBe(false));
});

describe('enums and limits', () => {
  it('has six domains with unique ids', () => {
    expect(DOMAINS).toHaveLength(6);
    expect(new Set(DOMAINS.map((d) => d.id)).size).toBe(6);
  });
  it('has 17 departments with unique ids', () => {
    expect(DEPARTMENTS).toHaveLength(17);
    expect(new Set(DEPARTMENTS.map((d) => d.id)).size).toBe(17);
  });
  it('has five progress stages covering six routes', () => {
    expect(PROGRESS_STAGES).toHaveLength(5);
    expect(PROGRESS_STAGES.flatMap((s) => s.routes)).toHaveLength(6);
  });
  it('limits are sane', () => {
    expect(LIMITS.photoMaxBytes).toBe(8 * 1024 * 1024);
    expect(LIMITS.longTextCounterFrom).toBeLessThan(LIMITS.longTextMax);
    expect(LIMITS.rememberWordsMax).toBe(30);
  });
});
