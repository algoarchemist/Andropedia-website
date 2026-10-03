import { describe, expect, it } from 'vitest';
import { linkParts, serviceFor } from './links';

describe('link tiles (APP-04-R1)', () => {
  it('detects GitHub, Drive or Docs and LinkedIn, anything else is a plain link', () => {
    expect(serviceFor('github.com')).toBe('github');
    expect(serviceFor('gist.github.com')).toBe('github');
    expect(serviceFor('drive.google.com')).toBe('drive');
    expect(serviceFor('docs.google.com')).toBe('drive');
    expect(serviceFor('www.linkedin.com')).toBe('linkedin');
    expect(serviceFor('notgithub.com')).toBe('link');
    expect(serviceFor('example.dev')).toBe('link');
  });

  it('shows the hostname without www and a shortened path', () => {
    expect(linkParts('https://www.github.com/asha/')).toEqual({ service: 'github', host: 'github.com', path: '/asha' });
    const long = linkParts('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv')!;
    expect(long.path.length).toBe(24);
    expect(long.path.endsWith('…')).toBe(true);
    expect(linkParts('https://asha.dev')).toEqual({ service: 'link', host: 'asha.dev', path: '' });
  });

  it('returns undefined for something that is not a URL', () => {
    expect(linkParts('not a link')).toBeUndefined();
  });
});
