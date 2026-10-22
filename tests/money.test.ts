import { describe, expect, it } from 'vitest';
import { formatAmount, parseMoneyInput, toMinor } from '../src/utils/money.js';

describe('toMinor', () => {
  it('переводит рубли в копейки', () => {
    expect(toMinor(420.5)).toBe(42_050);
    expect(toMinor(0)).toBe(0);
  });

  it('не теряет копейку на реальных суммах', () => {
    expect(toMinor(1.15)).toBe(115);
    expect(toMinor(19.99)).toBe(1999);
    expect(toMinor(1234.56)).toBe(123_456);
    expect(toMinor(0.1 + 0.2)).toBe(30);
  });

  it('три знака после запятой отсекаются ещё на вводе, а не при округлении', () => {
    expect(toMinor(1.005)).toBe(100);
    expect(parseMoneyInput('1.005')).toBeNull();
    expect(parseMoneyInput('1,005')).toBeNull();
  });
});

describe('parseMoneyInput', () => {
  it('принимает запятую, точку и пробелы', () => {
    expect(parseMoneyInput('1234,56')).toBe(1234.56);
    expect(parseMoneyInput('1234.56')).toBe(1234.56);
    expect(parseMoneyInput('1 234,56')).toBe(1234.56);
    expect(parseMoneyInput('1 234')).toBe(1234);
  });

  it('отклоняет мусор', () => {
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('12.345')).toBeNull();
    expect(parseMoneyInput('-5')).toBeNull();
    expect(parseMoneyInput('')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('разделяет тысячи и показывает две цифры после запятой', () => {
    const formatted = formatAmount(123_456).replace(/\u00A0/g, ' ');

    expect(formatted).toBe('1 234,56');
  });

  it('не добавляет разделитель к сумме меньше тысячи', () => {
    expect(formatAmount(999_00).replace(/\u00A0/g, ' ')).toBe('999,00');
  });
});