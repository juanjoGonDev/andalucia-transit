const MONTH_FIRST_LANGUAGES: ReadonlySet<string> = new Set(['en']);

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0');

export function formatShortNumericDate(date: Date, language: string): string {
  const day = padTwoDigits(date.getDate());
  const month = padTwoDigits(date.getMonth() + 1);
  const year = date.getFullYear();

  if (MONTH_FIRST_LANGUAGES.has(language)) {
    return `${month}/${day}/${year}`;
  }

  return `${day}/${month}/${year}`;
}
