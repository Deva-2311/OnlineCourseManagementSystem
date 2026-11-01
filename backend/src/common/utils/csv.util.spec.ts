/* eslint-disable */
import { escapeCsvValue, buildCsvString } from './csv.util';

describe('escapeCsvValue()', () => {
  it('wraps a plain string in double-quotes', () => {
    expect(escapeCsvValue('hello')).toBe('"hello"');
  });

  it('escapes internal double-quotes by doubling them', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });

  it('replaces newlines with a space to prevent row injection', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1 line2"');
    expect(escapeCsvValue('line1\r\nline2')).toBe('"line1  line2"');
  });

  it('prefixes formula-injection characters with a single quote', () => {
    expect(escapeCsvValue('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(escapeCsvValue('+CMD')).toBe('"\'+ CMD"'.replace(' ', ''));
    expect(escapeCsvValue('-evil')).toBe('"\'-evil"');
    expect(escapeCsvValue('@formula')).toBe('"\'@formula"');
  });

  it('handles null and undefined as empty strings', () => {
    expect(escapeCsvValue(null)).toBe('""');
    expect(escapeCsvValue(undefined)).toBe('""');
  });

  it('converts numbers to strings', () => {
    expect(escapeCsvValue(123)).toBe('"123"');
    expect(escapeCsvValue(0)).toBe('"0"');
  });

  it('handles empty string', () => {
    expect(escapeCsvValue('')).toBe('""');
  });
});

describe('buildCsvString()', () => {
  const headers = [
    { label: 'Name', key: 'name' as const },
    { label: 'Amount', key: 'amount' as const },
  ];

  it('produces a header row and one data row', () => {
    const rows = [{ name: 'Alice', amount: 100 }];
    const csv = buildCsvString(headers, rows as any);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('"Name","Amount"');
    expect(lines[1]).toBe('"Alice","100"');
  });

  it('produces only a header row for empty data', () => {
    const csv = buildCsvString(headers, []);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('"Name","Amount"');
  });

  it('escapes formula-injection values inside data rows', () => {
    const rows = [{ name: '=DANGEROUS()', amount: 0 }];
    const csv = buildCsvString(headers, rows as any);
    expect(csv).toContain("'=DANGEROUS()");
  });
});
