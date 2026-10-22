import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateRange,
  formatDateShort,
  isValidIsoDate,
  shiftMonth,
  toDayNumber,
} from '../src/utils/date.js';

describe('isValidIsoDate', () => {
  it('принимает реальные даты', () => {
    expect(isValidIsoDate('2026-02-14')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  it('отклоняет несуществующие и кривой формат', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2025-02-29')).toBe(false);
    expect(isValidIsoDate('14.02.2026')).toBe(false);
    expect(isValidIsoDate('2026-2-4')).toBe(false);
  });
});

describe('addDays', () => {
  it('переходит через границу месяца и года', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('возвращает исходное значение для невалидной даты', () => {
    expect(addDays('не дата', 5)).toBe('не дата');
  });
});

describe('dateRange', () => {
  it('включает обе границы', () => {
    expect(dateRange('2026-02-27', '2026-03-01')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });

  it('возвращает пусто, если конец раньше начала', () => {
    expect(dateRange('2026-03-01', '2026-02-01')).toEqual([]);
  });

  it('не уходит в бесконечный цикл на огромном диапазоне', () => {
    expect(dateRange('2000-01-01', '2099-12-31').length).toBeLessThanOrEqual(3661);
  });
});

describe('shiftMonth', () => {
  it('сдвигает месяц в обе стороны через год', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-02', 0)).toBe('2026-02');
  });
});

describe('toDayNumber', () => {
  it('даёт разницу в 1 день между соседними датами', () => {
    const first = toDayNumber('2026-02-14');
    const second = toDayNumber('2026-02-15');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect((second ?? 0) - (first ?? 0)).toBe(1);
  });

  it('возвращает null для мусора', () => {
    expect(toDayNumber('abc')).toBeNull();
  });
});

describe('formatDateShort', () => {
  it('форматирует по-русски', () => {
    expect(formatDateShort('2026-02-14')).toBe('14 фев');
  });
});