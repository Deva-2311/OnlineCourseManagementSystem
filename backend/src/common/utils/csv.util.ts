/**
 * Escapes a value for safe inclusion in a CSV cell.
 *
 * Rules:
 * - Values are always wrapped in double-quotes.
 * - Internal double-quotes are doubled ("").
 * - Newlines and carriage returns are replaced with a space.
 * - Values starting with formula-injection characters (=, +, -, @, TAB, CR)
 *   are prefixed with a single quote to prevent Excel formula execution.
 *
 * @param value The raw value to escape (will be coerced to string).
 */
export function escapeCsvValue(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value);

  // Replace newlines to prevent CSV row injection
  str = str.replace(/[\r\n]/g, ' ');

  // Prevent spreadsheet formula injection
  const dangerousStart = /^[=+\-@\t\r]/;
  if (dangerousStart.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double-quotes and wrap
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Converts an array of objects to a CSV string.
 * @param headers Array of { label, key } descriptors.
 * @param rows    Array of row objects.
 */
export function buildCsvString<T extends Record<string, unknown>>(
  headers: { label: string; key: keyof T }[],
  rows: T[],
): string {
  const headerLine = headers.map((h) => escapeCsvValue(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h.key])).join(','),
  );
  return [headerLine, ...dataLines].join('\r\n');
}
