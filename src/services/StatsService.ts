import { TransactionType } from '../types/enums.js';
import type { Category } from '../types/enums.js';
import type { Account } from '../models/Account.js';
import type { IEnvelopeStatus, ISafeToSpend } from '../types/interfaces.js';
import { addDays, currentMonthKey, dateRange, daysLeftInMonth, todayIso } from '../utils/date.js';

const SPARK_DAYS = 14;

export class StatsService {
  public safeToSpend(account: Account): ISafeToSpend {
    const daysLeft = daysLeftInMonth();
    const balanceMinor = account.balanceMinor;
    const available = Math.max(balanceMinor, 0);

    return {
      balanceMinor,
      daysLeft,
      perDayMinor: Math.floor(available / daysLeft),
    };
  }

  public envelopes(account: Account, month: string = currentMonthKey()): IEnvelopeStatus[] {
    const spent = account.spentByCategory(month);
    const result: IEnvelopeStatus[] = [];

    for (const [category, limitMinor] of account.limits) {
      if (limitMinor <= 0) {
        continue;
      }

      const spentMinor = spent.get(category) ?? 0;
      result.push({
        category,
        limitMinor,
        spentMinor,
        remainingMinor: limitMinor - spentMinor,
        usedRatio: spentMinor / limitMinor,
      });
    }

    return result.sort((a, b) => b.usedRatio - a.usedRatio);
  }

  public dailyExpenses(account: Account, days: number = SPARK_DAYS): number[] {
    const end = todayIso();
    const start = addDays(end, -(days - 1));
    const dates = dateRange(start, end);
    const byDate = new Map<string, number>();
    for (const date of dates) {
      byDate.set(date, 0);
    }

    for (const tx of account.transactions) {
      if (tx.type !== TransactionType.Expense) {
        continue;
      }

      const current = byDate.get(tx.date);
      if (current !== undefined) {
        byDate.set(tx.date, current + tx.amountMinor);
      }
    }

    return dates.map((date) => byDate.get(date) ?? 0);
  }

  public overspentCategories(account: Account, month: string = currentMonthKey()): Category[] {
    return this.envelopes(account, month)
      .filter((envelope) => envelope.remainingMinor < 0)
      .map((envelope) => envelope.category);
  }
}