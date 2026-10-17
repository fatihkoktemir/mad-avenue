// GDT-style calendar: 7-day weeks, 4 weeks per month, 12 months per year.
export const DAYS_PER_WEEK = 7;
export const WEEKS_PER_MONTH = 4;
export const DAYS_PER_MONTH = DAYS_PER_WEEK * WEEKS_PER_MONTH;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * 12;
export const START_YEAR = 1970;

export interface DateParts {
  year: number;
  month: number; // 1-12
  week: number; // 1-4
}

export function dateOf(day: number): DateParts {
  return {
    year: START_YEAR + Math.floor(day / DAYS_PER_YEAR),
    month: (Math.floor(day / DAYS_PER_MONTH) % 12) + 1,
    week: (Math.floor(day / DAYS_PER_WEEK) % WEEKS_PER_MONTH) + 1,
  };
}

export function formatDate(day: number): string {
  const d = dateOf(day);
  return `Y${d.year} M${d.month} W${d.week}`;
}

export function yearsSinceStart(day: number): number {
  return day / DAYS_PER_YEAR;
}

// Prices and fees grow with a simple inflation curve (~5% a year in the 70s).
export function inflation(day: number): number {
  return Math.pow(1.05, yearsSinceStart(day));
}
