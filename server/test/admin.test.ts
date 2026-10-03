import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, admissionYear, csvCell } from '../src/lib/csv';
import { ADMIN_TOKEN, makeTestApp, seedPhoto, validPayload } from './helpers';

/** Minimal RFC 4180 parser so the tests read the CSV the way Excel would. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* skip, \n ends the row */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  return rows;
}

describe('csvCell', () => {
  it.each([
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+919876543210', "'+919876543210"],
    ['-2+3', "'-2+3"],
    ['@cmd', "'@cmd"],
    ['\t=x', "'\t=x"],
    ['plain', 'plain'],
    ['a=b', 'a=b'],
    [undefined, ''],
  ])('%j becomes %j', (input, expected) => expect(csvCell(input)).toBe(expected));

  it('quotes cells with commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises a formula even when it also needs quoting', () => {
    expect(csvCell('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });
});

describe('admissionYear', () => {
  it('is 20 plus the two digits after RA', () => {
    expect(admissionYear('RA2211003010123')).toBe('2022');
    expect(admissionYear('RA2311003010123')).toBe('2023');
  });
});

describe('GET /api/admin/applications.csv (ADM-01)', () => {
  const auth = { Authorization: `Bearer ${ADMIN_TOKEN}` };

  it('401 without a token, with a wrong token, and with a wrong scheme', async () => {
    const { app } = makeTestApp();
    await request(app).get('/api/admin/applications.csv').expect(401);
    await request(app).get('/api/admin/applications.csv').set('Authorization', `Bearer ${'b'.repeat(40)}`).expect(401);
    await request(app).get('/api/admin/applications.csv').set('Authorization', `Basic ${ADMIN_TOKEN}`).expect(401);
  });

  it('401 for everyone when no token is configured', async () => {
    const { app } = makeTestApp({ adminExportToken: undefined });
    await request(app).get('/api/admin/applications.csv').set('Authorization', 'Bearer undefined').expect(401);
    await request(app).get('/api/admin/applications.csv').set('Authorization', 'Bearer ').expect(401);
  });

  it('exports header, columns in order, derived admissionYear and an absolute photo URL', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(photoId, { achievements: [{ title: 'One', description: 'First' }, { title: 'Two', description: 'Second, with comma' }] }))
      .expect(201);

    const res = await request(ctx.app).get('/api/admin/applications.csv').set(auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.text.startsWith('﻿')).toBe(true);

    const [header, row] = parseCsv(res.text.slice(1));
    expect(header).toEqual([...CSV_COLUMNS]);
    expect(header!.slice(0, 7)).toEqual(['id', 'createdAt', 'status', 'name', 'registerNumber', 'email', 'phone']);
    expect(header!.at(-1)).toBe('admissionYear');

    const get = (col: (typeof CSV_COLUMNS)[number]) => row![CSV_COLUMNS.indexOf(col)];
    expect(get('registerNumber')).toBe('RA2211003010123');
    expect(get('admissionYear')).toBe('2022');
    expect(get('techStack')).toBe('React; Node');
    expect(get('achievements')).toBe('One: First | Two: Second, with comma');
    expect(get('photoUrl')).toMatch(new RegExp(`^http://127\\.0\\.0\\.1:\\d+/uploads/${photoId}\\.webp$`));
    expect(get('inOtherClub')).toBe('no');
    expect(row).toHaveLength(CSV_COLUMNS.length);
  });

  it('escapes cells starting with = + - @ in real exported rows', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(photoId, {
        skills: '=cmd|calc!A1 is how I flex',
        aboutYou: '-1+1 is my favourite sum, honestly',
        whyDomain: '@SUM(A1:A2) is a function I know',
        outsideAcademics: '+5 hours of sketching every week',
      }))
      .expect(201);

    const res = await request(ctx.app).get('/api/admin/applications.csv').set(auth);
    const [, row] = parseCsv(res.text.slice(1));
    const get = (col: (typeof CSV_COLUMNS)[number]) => row![CSV_COLUMNS.indexOf(col)];
    expect(get('skills')).toBe("'=cmd|calc!A1 is how I flex");
    expect(get('aboutYou')).toBe("'-1+1 is my favourite sum, honestly");
    expect(get('whyDomain')).toBe("'@SUM(A1:A2) is a function I know");
    expect(get('outsideAcademics')).toBe("'+5 hours of sketching every week");
    // The +91 phone is escaped too, as ADM-01 requires.
    expect(get('phone')).toBe("'+919876543210");
  });

  it('round-trips multi-line, quoted and non-ASCII answers as one row each (opens cleanly in Excel and Sheets)', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const aboutYou = 'Line one, still me.\r\nLine two says "hello".\nLine three.';
    const whyAndropedia = 'தமிழ் and café people, naïve plans';
    await request(ctx.app).post('/api/applications').send(validPayload(photoId, { aboutYou, whyAndropedia })).expect(201);

    const res = await request(ctx.app).get('/api/admin/applications.csv').set(auth);
    expect(res.text.endsWith('\r\n')).toBe(true);
    const rows = parseCsv(res.text.slice(1));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.length === CSV_COLUMNS.length)).toBe(true);
    const get = (col: (typeof CSV_COLUMNS)[number]) => rows[1]![CSV_COLUMNS.indexOf(col)];
    expect(get('aboutYou')).toBe(aboutYou);
    expect(get('whyAndropedia')).toBe(whyAndropedia);
  });

  it('returns just the header when there are no applications', async () => {
    const res = await request(makeTestApp().app).get('/api/admin/applications.csv').set(auth);
    expect(res.status).toBe(200);
    expect(parseCsv(res.text.slice(1))).toEqual([[...CSV_COLUMNS]]);
  });
});
