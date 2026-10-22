import { AccountManager } from '../managers/AccountManager.js';
import { JsonStorage } from '../services/JsonStorage.js';
import { Category, Currency, TransactionType } from '../types/enums.js';
import type { IPersistedState } from '../types/interfaces.js';
import { addDays, shiftMonth, todayIso } from '../utils/date.js';
import { toMinor } from '../utils/money.js';

const STATE_VERSION = 2;
const day = (monthKey: string, value: number): string =>
  `${monthKey}-${String(value).padStart(2, '0')}`;

const main = async (): Promise<void> => {
  const manager = new AccountManager();
  const primary = manager.create('Основной', Currency.RUB);
  const savings = manager.create('Копилка', Currency.RUB);

  const current = todayIso();
  const previousMonth = shiftMonth(current.slice(0, 7), -1);

  manager.addTransaction(primary.id, {
    type: TransactionType.Income,
    amountMinor: toMinor(32_000),
    category: Category.Other,
    date: day(previousMonth, 10),
    note: 'Стипендия',
  });
  manager.addTransaction(primary.id, {
    type: TransactionType.Income,
    amountMinor: toMinor(15_000),
    category: Category.Other,
    date: day(previousMonth, 25),
    note: 'Подработка',
  });
  manager.addTransaction(savings.id, {
    type: TransactionType.Income,
    amountMinor: toMinor(3_000),
    category: Category.Other,
    date: day(previousMonth, 11),
    note: 'Перевод в копилку',
  });

  const previousExpenses: readonly (readonly [Category, number, number, string])[] = [
    [Category.Housing, 6_000, 3, 'Общежитие'],
    [Category.Food, 1_200, 5, 'Продукты'],
    [Category.Food, 890, 9, 'Столовая'],
    [Category.Transport, 620, 12, 'Проездной'],
    [Category.Study, 1_450, 15, 'Учебники'],
    [Category.Fun, 700, 18, 'Кино'],
    [Category.Food, 1_340, 22, 'Продукты'],
    [Category.Health, 950, 27, 'Аптека'],
  ];

  for (const [category, amount, date, note] of previousExpenses) {
    manager.addTransaction(primary.id, {
      type: TransactionType.Expense,
      amountMinor: toMinor(amount),
      category,
      date: day(previousMonth, date),
      note,
    });
  }

  manager.addTransaction(primary.id, {
    type: TransactionType.Income,
    amountMinor: toMinor(32_000),
    category: Category.Other,
    date: current,
    note: 'Стипендия',
  });

  const recentExpenses: readonly (readonly [Category, number, number, string])[] = [
    [Category.Food, 780, 1, 'Продукты'],
    [Category.Food, 420, 2, 'Столовая'],
    [Category.Transport, 620, 3, 'Проездной'],
    [Category.Food, 1_150, 4, 'Продукты'],
    [Category.Fun, 590, 5, 'Кино'],
    [Category.Food, 340, 6, 'Кофе'],
    [Category.Study, 1_200, 7, 'Печать курсовой'],
    [Category.Food, 1_680, 8, 'Продукты'],
    [Category.Housing, 6_000, 9, 'Общежитие'],
  ];

  for (const [category, amount, daysAgo, note] of recentExpenses) {
    manager.addTransaction(primary.id, {
      type: TransactionType.Expense,
      amountMinor: toMinor(amount),
      category,
      date: addDays(current, -daysAgo),
      note,
    });
  }

  primary.setLimit(Category.Food, toMinor(8_000));
  primary.setLimit(Category.Transport, toMinor(2_000));
  primary.setLimit(Category.Study, toMinor(4_000));
  primary.setLimit(Category.Fun, toMinor(3_000));
  savings.setLimit(Category.Other, toMinor(5_000));

  const state: IPersistedState = {
    version: STATE_VERSION,
    savedAt: new Date().toISOString(),
    selectedAccountId: primary.id,
    accounts: manager.toJSON(),
    gamification: {},
  };

  await new JsonStorage().save(state);

  const totalTransactions = manager
    .getAll()
    .reduce((sum, account) => sum + account.transactions.length, 0);

  console.log(
    `Демо-данные записаны: ${manager.getAll().length} счёта, ${totalTransactions} операций.`,
  );
  console.log(`Файл: data/state.json · дата: ${current}`);
  console.log('Запусти приложение командой: npm run dev');
};

main().catch((error: unknown) => {
  console.error('Не удалось записать демо-данные:', error);
  process.exitCode = 1;
});