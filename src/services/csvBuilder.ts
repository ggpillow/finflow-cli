import type { Account } from '../models/Account.js';
import { formatAmount } from '../utils/money.js';

const BOM = '\uFEFF';
const LINE_ENDING = '\r\n';
const HEADER = ['Дата', 'Тип', 'Категория', 'Сумма', 'Комментарий', 'Счёт', 'ID'] as const;

export const escapeCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const sanitizeFileName = (name: string): string =>
  name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'account';

export const buildCsv = (account: Account): string => {
  const rows: string[] = [HEADER.map((cell) => escapeCell(cell)).join(',')];

  for (const tx of account.getTransactionsSorted()) {
    rows.push(
      [
        tx.date,
        tx.isIncome() ? 'доход' : 'расход',
        tx.category,
        formatAmount(tx.amountMinor),
        tx.note,
        account.name,
        tx.id,
      ]
        .map((cell) => escapeCell(cell))
        .join(','),
    );
  }

  return BOM + rows.join(LINE_ENDING) + LINE_ENDING;
};