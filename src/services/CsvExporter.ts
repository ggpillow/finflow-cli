import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Account } from '../models/Account.js';
import { buildCsv, escapeCell, sanitizeFileName } from './csvBuilder.js';

const EXPORT_DIR = 'exports';

export { buildCsv, escapeCell, sanitizeFileName };

export class CsvExporter {
  public async exportAccount(account: Account): Promise<string> {
    const content = buildCsv(account);
    await mkdir(EXPORT_DIR, { recursive: true });

    const fileName = `${sanitizeFileName(account.name)}-${this.timestamp()}.csv`;
    const filePath = join(EXPORT_DIR, fileName);
    await writeFile(filePath, content, 'utf8');

    return filePath;
  }

  private timestamp(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${date}-${hours}${minutes}`;
  }
}