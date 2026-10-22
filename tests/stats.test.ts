import { describe, expect, it } from 'vitest';
import { StatsService } from '../src/services/StatsService.js';
import { Category } from '../src/types/enums.js';
import { createAccount, expense, income } from './helpers.js';

const service = new StatsService();
const MONTH = '2026-02';

describe('envelopes', () => {
  it('не учитывает лимиты вне запрошенного месяца', () => {
    const account = createAccount();
    account.setLimit(Category.Food, 8_000);
    expense(account, 2_500, Category.Food, `${MONTH}-10`);
    expense(account, 9_999, Category.Food, '2026-03-10');

    const [envelope] = service.envelopes(account, MONTH);
    expect(envelope?.spentMinor).toBe(2_500);
    expect(envelope?.remainingMinor).toBe(5_500);
  });

  it('показывает отрицательный остаток при перерасходе', () => {
    const account = createAccount();
    account.setLimit(Category.Fun, 1_000);
    expense(account, 1_800, Category.Fun, `${MONTH}-05`);

    const [envelope] = service.envelopes(account, MONTH);
    expect(envelope?.remainingMinor).toBe(-800);
    expect(envelope?.usedRatio).toBeCloseTo(1.8, 5);
  });

  it('игнорирует категории без лимита', () => {
    const account = createAccount();
    expense(account, 500, Category.Food, `${MONTH}-05`);
    expect(service.envelopes(account, MONTH)).toEqual([]);
  });

  it('сортирует по убыванию израсходованной доли', () => {
    const account = createAccount();
    account.setLimit(Category.Food, 10_000);
    account.setLimit(Category.Fun, 1_000);
    expense(account, 1_000, Category.Food, `${MONTH}-05`);
    expense(account, 900, Category.Fun, `${MONTH}-05`);

    const envelopes = service.envelopes(account, MONTH);
    expect(envelopes[0]?.category).toBe(Category.Fun);
  });
});

describe('overspentCategories', () => {
  it('возвращает только превышенные категории', () => {
    const account = createAccount();
    account.setLimit(Category.Food, 10_000);
    account.setLimit(Category.Fun, 1_000);
    expense(account, 12_000, Category.Food, `${MONTH}-05`);
    expense(account, 200, Category.Fun, `${MONTH}-05`);

    expect(service.overspentCategories(account, MONTH)).toEqual([Category.Food]);
  });
});

describe('safeToSpend', () => {
  it('не уходит в минус при отрицательном балансе', () => {
    const account = createAccount();
    expense(account, 5_000, Category.Food, `${MONTH}-05`);

    const result = service.safeToSpend(account);
    expect(result.perDayMinor).toBe(0);
    expect(result.daysLeft).toBeGreaterThanOrEqual(1);
  });

  it('дневной лимит не превышает баланс за весь остаток месяца', () => {
    const account = createAccount(100_000);

    const result = service.safeToSpend(account);
    expect(result.perDayMinor * result.daysLeft).toBeLessThanOrEqual(result.balanceMinor);
    expect(result.perDayMinor).toBeGreaterThan(0);
  });
});

describe('баланс счёта', () => {
  it('учитывает доходы, расходы и начальный остаток', () => {
    const account = createAccount(10_000);
    income(account, 32_000, `${MONTH}-01`);
    expense(account, 2_000, Category.Food, `${MONTH}-02`);

    expect(account.balanceMinor).toBe(40_000);
  });
});