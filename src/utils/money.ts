import { Currency } from '../types/enums.js';

export const toMinor = (amount: number): number => Math.round(amount * 100);

export const toMajor = (amountMinor: number): number => amountMinor / 100;

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  [Currency.RUB]: 'ru-RU',
  [Currency.USD]: 'en-US',
  [Currency.EUR]: 'de-DE',
};

export const formatMoney = (
  amountMinor: number,
  currency: Currency = Currency.RUB,
): string =>
  new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

export const formatAmount = (amountMinor: number): string =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

export const parseMoneyInput = (raw: string): number | null => {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};