import type { Account } from '../../../src/models/Account.js';
import { buildCsv, sanitizeFileName } from '../../../src/services/csvBuilder.js';

export const downloadCsv = (account: Account): void => {
  const blob = new Blob([buildCsv(account)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeFileName(account.name)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};