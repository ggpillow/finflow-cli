import { describe, expect, it } from 'vitest';
import { escapeCell, sanitizeFileName } from '../src/services/CsvExporter.js';

describe('escapeCell', () => {
  it('оборачивает значение в кавычки', () => {
    expect(escapeCell('Продукты')).toBe('"Продукты"');
  });

  it('удваивает внутренние кавычки по RFC 4180', () => {
    expect(escapeCell('он сказал "привет"')).toBe('"он сказал ""привет"""');
  });

  it('не ломается от запятой внутри значения', () => {
    expect(escapeCell('хлеб, молоко, сыр')).toBe('"хлеб, молоко, сыр"');
  });

  it('нормально переносит перевод строки', () => {
    expect(escapeCell('первая\nвторая')).toBe('"первая\nвторая"');
  });
});

describe('sanitizeFileName', () => {
  it('убирает пробелы и спецсимволы', () => {
    expect(sanitizeFileName('Мой счёт')).toBe('мой-счёт');
    expect(sanitizeFileName('Карта / 2026')).toBe('карта-2026');
  });

  it('не оставляет пустое имя', () => {
    expect(sanitizeFileName('///')).toBe('account');
  });
});