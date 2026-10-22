const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

const MONTHS_SHORT_RU = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const;

const MONTHS_FULL_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
] as const;

const MS_IN_DAY = 86_400_000;
const MAX_RANGE_DAYS = 3660;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export interface IIsoDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export const parseIsoDate = (iso: string): IIsoDateParts | null => {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (match === null) {
    return null;
  }

  const [, yearPart, monthPart, dayPart] = match;
  if (yearPart === undefined || monthPart === undefined || dayPart === undefined) {
    return null;
  }

  return {
    year: Number(yearPart),
    month: Number(monthPart),
    day: Number(dayPart),
  };
};

export const todayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const currentMonthKey = (): string => todayIso().slice(0, 7);
export const monthKeyOf = (iso: string): string => iso.slice(0, 7);

export const isValidIsoDate = (value: string): boolean => {
  const parts = parseIsoDate(value);
  if (parts === null) {
    return false;
  }

  const probe = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return (
    probe.getUTCFullYear() === parts.year &&
    probe.getUTCMonth() === parts.month - 1 &&
    probe.getUTCDate() === parts.day
  );
};

export const formatDateRu = (iso: string): string => {
  const parts = parseIsoDate(iso);
  if (parts === null) {
    return iso;
  }
  const monthName = MONTHS_RU[parts.month - 1] ?? '?';
  return `${parts.day} ${monthName} ${parts.year}`;
};

export const formatDateShort = (iso: string): string => {
  const parts = parseIsoDate(iso);
  if (parts === null) {
    return iso;
  }
  const monthName = MONTHS_SHORT_RU[parts.month - 1] ?? '?';
  return `${parts.day} ${monthName}`;
};

export const formatMonthRu = (monthKey: string): string => {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (match === null) {
    return monthKey;
  }
  const [, yearPart, monthPart] = match;
  if (yearPart === undefined || monthPart === undefined) {
    return monthKey;
  }
  const monthName = MONTHS_FULL_RU[Number(monthPart) - 1] ?? '?';
  return `${monthName} ${yearPart}`;
};

export const toDayNumber = (iso: string): number | null => {
  const parts = parseIsoDate(iso);
  if (parts === null) {
    return null;
  }
  return Date.UTC(parts.year, parts.month - 1, parts.day) / MS_IN_DAY;
};

const fromDayNumber = (dayNumber: number): string => {
  const date = new Date(dayNumber * MS_IN_DAY);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const daysUntil = (iso: string): number => {
  const target = toDayNumber(iso);
  const today = toDayNumber(todayIso());
  if (target === null || today === null) {
    return 0;
  }
  return Math.round(target - today);
};

export const addDays = (iso: string, days: number): string => {
  const dayNumber = toDayNumber(iso);
  if (dayNumber === null) {
    return iso;
  }
  return fromDayNumber(dayNumber + days);
};

export const dateRange = (from: string, to: string): string[] => {
  const startDay = toDayNumber(from);
  const endDay = toDayNumber(to);
  if (startDay === null || endDay === null || endDay < startDay) {
    return [];
  }

  const limit = Math.min(endDay - startDay, MAX_RANGE_DAYS);
  const result: string[] = [];

  for (let offset = 0; offset <= limit; offset += 1) {
    result.push(fromDayNumber(startDay + offset));
  }

  return result;
};

export const daysInMonth = (monthKey: string): number => {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (match === null) {
    return 0;
  }
  const [, yearPart, monthPart] = match;
  if (yearPart === undefined || monthPart === undefined) {
    return 0;
  }
  return new Date(Number(yearPart), Number(monthPart), 0).getDate();
};

export const daysLeftInMonth = (): number => {
  const total = daysInMonth(currentMonthKey());
  const today = Number(todayIso().slice(8, 10));
  return Math.max(total - today + 1, 1);
};

export const shiftMonth = (monthKey: string, delta: number): string => {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (match === null) {
    return monthKey;
  }
  const [, yearPart, monthPart] = match;
  if (yearPart === undefined || monthPart === undefined) {
    return monthKey;
  }

  const total = Number(yearPart) * 12 + (Number(monthPart) - 1) + delta;
  const year = Math.floor(total / 12);
  const month = String(((total % 12) + 12) % 12 + 1).padStart(2, '0');
  return `${year}-${month}`;
};