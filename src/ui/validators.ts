import { daysUntil, isValidIsoDate } from '../utils/date.js';
import { parseMoneyInput } from '../utils/money.js';
export type ValidationResult = true | string;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 40;
const MAX_AMOUNT = 100_000_000;
const MAX_NOTE_LENGTH = 120;

export const validateAccountName = (value: string): ValidationResult => {
  const trimmed = value.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    return `Название должно быть не короче ${NAME_MIN_LENGTH} символов`;
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Название должно быть не длиннее ${NAME_MAX_LENGTH} символов`;
  }
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return 'Название должно содержать хотя бы одну букву или цифру';
  }

  return true;
};

export const validateAmount = (value: string): ValidationResult => {
  const parsed = parseMoneyInput(value);

  if (parsed === null) {
    return 'Введите сумму числом, например 1250,50';
  }
  if (parsed <= 0) {
    return 'Сумма должна быть больше нуля';
  }
  if (parsed > MAX_AMOUNT) {
    return 'Слишком большая сумма';
  }

  return true;
};

export const validateTransactionDate = (value: string): ValidationResult => {
  const trimmed = value.trim();

  if (!isValidIsoDate(trimmed)) {
    return 'Введите реальную дату в формате ГГГГ-ММ-ДД, например 2026-02-14';
  }
  if (daysUntil(trimmed) > 0) {
    return 'Дата не может быть в будущем';
  }

  return true;
};

export const validateNote = (value: string): ValidationResult => {
  if (value.trim().length > MAX_NOTE_LENGTH) {
    return `Комментарий не длиннее ${MAX_NOTE_LENGTH} символов`;
  }

  return true;
};