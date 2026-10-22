import { describe, expect, it } from 'vitest';
import { Account } from '../src/models/Account.js';
import { Transaction } from '../src/models/Transaction.js';
import { AccountManager } from '../src/managers/AccountManager.js';
import { StatsService } from '../src/services/StatsService.js';
import { GamificationService } from '../src/services/GamificationService.js';
import { escapeCell } from '../src/services/CsvExporter.js';
import { parseStateJson, STATE_VERSION } from '../src/services/stateCodec.js';
import { Category, Currency, TransactionType } from '../src/types/enums.js';
import type { IAccountSnapshot, ITransactionDraft } from '../src/types/interfaces.js';

const stats = new StatsService();
const gamification = new GamificationService();

const draft = (overrides: Partial<ITransactionDraft> = {}): ITransactionDraft => ({
  type: TransactionType.Expense,
  amountMinor: 1_000,
  category: Category.Food,
  date: '2026-02-10',
  note: '',
  ...overrides,
});

describe('Требование: четыре класса с точными именами', () => {
  it('ApplicationController, AccountManager, Account, Transaction существуют', () => {
    expect(typeof AccountManager).toBe('function');
    expect(typeof Account).toBe('function');
    expect(typeof Transaction).toBe('function');
  });

  it('AccountManager реализует интерфейс: create/getAll/findById/remove', () => {
    const manager = new AccountManager();
    expect(typeof manager.create).toBe('function');
    expect(typeof manager.getAll).toBe('function');
    expect(typeof manager.findById).toBe('function');
    expect(typeof manager.remove).toBe('function');
  });
});

describe('Требование: счёт с уникальным ID', () => {
  it('генерирует разные ID для 100 счетов', () => {
    const manager = new AccountManager();
    const ids = new Set<string>();

    for (let index = 0; index < 100; index += 1) {
      ids.add(manager.create(`Счёт ${index}`, Currency.RUB).id);
    }

    expect(ids.size).toBe(100);
  });

  it('ID читаемый и с префиксом acc_', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    expect(account.id.startsWith('acc_')).toBe(true);
  });

  it('не даёт создать счёт с пустым или слишком коротким названием', () => {
    const manager = new AccountManager();
    expect(() => manager.create('a', Currency.RUB)).toThrow();
    expect(() => manager.create('   ', Currency.RUB)).toThrow();
  });

  it('не даёт создать счёт с названием длиннее 40 символов', () => {
    const manager = new AccountManager();
    expect(() => manager.create('я'.repeat(41), Currency.RUB)).toThrow();
  });
});

describe('Требование: удаление счёта вместе с операциями', () => {
  it('каскадно удаляет операции и убирает счёт из списка', () => {
    const manager = new AccountManager();
    const account = manager.create('Временный', Currency.RUB);
    manager.addTransaction(account.id, draft());
    manager.addTransaction(account.id, draft());

    expect(manager.countTransactions(account.id)).toBe(2);

    const removed = manager.remove(account.id);

    expect(removed?.transactions.length).toBe(2);
    expect(manager.findById(account.id)).toBeUndefined();
    expect(manager.getAll()).toHaveLength(0);
  });

  it('возвращает undefined для несуществующего счёта', () => {
    const manager = new AccountManager();
    expect(manager.remove('acc_нет')).toBeUndefined();
  });
});

describe('Требование: баланс счёта', () => {
  it('складывает начальный остаток, доходы и вычитает расходы', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);

    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 32_000_00 }));
    manager.addTransaction(account.id, draft({ amountMinor: 2_500_00 }));

    expect(account.balanceMinor).toBe(29_500_00);
    expect(manager.getTotalBalanceMinor()).toBe(29_500_00);
  });

  it('баланс может стать отрицательным — это не ошибка', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    manager.addTransaction(account.id, draft({ amountMinor: 500_00 }));

    expect(account.balanceMinor).toBe(-500_00);
  });
});

describe('Требование: операции невозможно создать некорректными', () => {
  const base = {
    id: 'txn_1',
    accountId: 'acc_1',
    type: TransactionType.Expense,
    amountMinor: 1_000,
    category: Category.Food,
    date: '2026-02-10',
    note: '',
  };

  it('отклоняет нулевую и отрицательную сумму', () => {
    expect(() => new Transaction({ ...base, amountMinor: 0 })).toThrow();
    expect(() => new Transaction({ ...base, amountMinor: -1 })).toThrow();
  });

  it('отклоняет дробные копейки', () => {
    expect(() => new Transaction({ ...base, amountMinor: 10.5 })).toThrow();
  });

  it('отклоняет дату не в формате ISO', () => {
    expect(() => new Transaction({ ...base, date: '10.02.2026' })).toThrow();
    expect(() => new Transaction({ ...base, date: '2026-2-4' })).toThrow();
  });

  it('не принимает операцию в чужой счёт', () => {
    const account = new Account({
      id: 'acc_1',
      name: 'Мой',
      currency: Currency.RUB,
      createdAt: '2026-01-01T00:00:00.000Z',
      openingBalanceMinor: 0,
    });
    const foreign = new Transaction({ ...base, accountId: 'acc_другой' });

    expect(() => account.addTransaction(foreign)).toThrow();
  });

  it('обрезает пробелы в комментарии', () => {
    const transaction = new Transaction({ ...base, note: '  обед  ' });
    expect(transaction.note).toBe('обед');
  });
});

describe('Требование: удаление операции', () => {
  it('возвращает удалённую операцию и не находит её повторно', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    const created = manager.addTransaction(account.id, draft());

    const removed = manager.removeTransaction(account.id, created.id);

    expect(removed?.id).toBe(created.id);
    expect(manager.removeTransaction(account.id, created.id)).toBeUndefined();
    expect(manager.countTransactions(account.id)).toBe(0);
  });

  it('не ломается при удалении из несуществующего счёта', () => {
    const manager = new AccountManager();
    expect(manager.removeTransaction('acc_нет', 'txn_нет')).toBeUndefined();
  });
});

describe('Требование: статистика не смешивает месяцы', () => {
  it('считает доходы и расходы только за запрошенный месяц', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);

    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 30_000, date: '2026-02-01' }));
    manager.addTransaction(account.id, draft({ amountMinor: 5_000, date: '2026-02-28' }));
    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 99_000, date: '2026-03-01' }));
    manager.addTransaction(account.id, draft({ amountMinor: 77_000, date: '2026-01-31' }));

    const february = account.statsForMonth('2026-02');

    expect(february.incomeMinor).toBe(30_000);
    expect(february.expenseMinor).toBe(5_000);
    expect(february.netMinor).toBe(25_000);
    expect(february.count).toBe(2);
  });

  it('расходы по категориям берут только расход и только месяц', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);

    manager.addTransaction(account.id, draft({ amountMinor: 1_000, category: Category.Food, date: '2026-02-05' }));
    manager.addTransaction(account.id, draft({ amountMinor: 500, category: Category.Food, date: '2026-02-20' }));
    manager.addTransaction(account.id, draft({ amountMinor: 9_000, category: Category.Food, date: '2026-03-05' }));
    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 7_000, category: Category.Food, date: '2026-02-06' }));

    expect(account.spentByCategory('2026-02').get(Category.Food)).toBe(1_500);
  });
});

describe('Требование: лимиты по конвертам', () => {
  it('не принимает отрицательный и дробный лимит', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);

    expect(() => account.setLimit(Category.Food, -1)).toThrow();
    expect(() => account.setLimit(Category.Food, 10.5)).toThrow();
    expect(() => account.setLimit(Category.Food, 0)).not.toThrow();
  });

  it('снятие лимита возвращает true один раз', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    account.setLimit(Category.Food, 8_000);

    expect(account.removeLimit(Category.Food)).toBe(true);
    expect(account.removeLimit(Category.Food)).toBe(false);
    expect(account.limits.size).toBe(0);
  });

  it('конверт считает остаток и перерасход', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    account.setLimit(Category.Fun, 1_000);
    manager.addTransaction(account.id, draft({ amountMinor: 1_800, category: Category.Fun, date: '2026-02-05' }));

    const [envelope] = stats.envelopes(account, '2026-02');

    expect(envelope?.remainingMinor).toBe(-800);
    expect(stats.overspentCategories(account, '2026-02')).toEqual([Category.Fun]);
  });

  it('дневной лимит трат не превышает баланс за остаток месяца', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 10_000_00 }));

    const safe = stats.safeToSpend(account);

    expect(safe.perDayMinor * safe.daysLeft).toBeLessThanOrEqual(safe.balanceMinor);
    expect(safe.daysLeft).toBeGreaterThanOrEqual(1);
  });
});

describe('Требование: экспорт CSV', () => {
  it('экранирует кавычки, запятые и перевод строки', () => {
    expect(escapeCell('обычный')).toBe('"обычный"');
    expect(escapeCell('он сказал "да"')).toBe('"он сказал ""да"""');
    expect(escapeCell('хлеб, молоко')).toBe('"хлеб, молоко"');
    expect(escapeCell('строка1\nстрока2')).toBe('"строка1\nстрока2"');
  });

  it('кириллица не портится', () => {
    expect(escapeCell('Продукты')).toBe('"Продукты"');
  });
});

describe('Требование: устойчивость к повреждённым данным', () => {
  const validSnapshot: IAccountSnapshot = {
    id: 'acc_1',
    name: 'Основной',
    currency: Currency.RUB,
    createdAt: '2026-01-01T00:00:00.000Z',
    openingBalanceMinor: 0,
    transactions: [
      {
        id: 'txn_1',
        accountId: 'acc_1',
        type: TransactionType.Expense,
        amountMinor: 1_000,
        category: Category.Food,
        date: '2026-02-10',
        note: 'обед',
      },
    ],
    balanceMinor: -1_000,
    limits: { [Category.Food]: 8_000 },
  };

  it('возвращает null на мусоре вместо исключения', () => {
    expect(parseStateJson('{{{')).toBeNull();
    expect(parseStateJson('null')).toBeNull();
    expect(parseStateJson('[]')).toBeNull();
    expect(parseStateJson('')).toBeNull();
  });

  it('отклоняет неизвестную версию формата', () => {
    expect(parseStateJson(JSON.stringify({ version: 99, accounts: [] }))).toBeNull();
  });

  it('читает корректное состояние и сохраняет операции и лимиты', () => {
    const payload = {
      version: STATE_VERSION,
      savedAt: '2026-02-14T10:00:00.000Z',
      selectedAccountId: 'acc_1',
      accounts: [validSnapshot],
      gamification: {},
    };

    const state = parseStateJson(JSON.stringify(payload));

    expect(state?.accounts).toHaveLength(1);
    expect(state?.accounts[0]?.transactions).toHaveLength(1);
    expect(state?.accounts[0]?.limits[Category.Food]).toBe(8_000);
    expect(state?.selectedAccountId).toBe('acc_1');
  });

  it('выбрасывает битые операции, но сохраняет счёт', () => {
    const payload = {
      version: STATE_VERSION,
      accounts: [
        {
          ...validSnapshot,
          transactions: [validSnapshot.transactions[0], { id: 42 }, null],
        },
      ],
    };

    const state = parseStateJson(JSON.stringify(payload));

    expect(state?.accounts[0]?.transactions).toHaveLength(1);
  });

  it('читает файл версии 1 (обратная совместимость)', () => {
    const payload = {
      version: 1,
      accounts: [validSnapshot],
      selectedAccountId: null,
      gamification: {},
    };

    expect(parseStateJson(JSON.stringify(payload))?.accounts).toHaveLength(1);
  });

  it('восстанавливает счёт из состояния без потери данных', () => {
    const manager = new AccountManager();
    manager.restore([validSnapshot]);

    const restored = manager.findById('acc_1');

    expect(restored?.balanceMinor).toBe(-1_000);
    expect(restored?.getLimit(Category.Food)).toBe(8_000);
    expect(restored?.transactions).toHaveLength(1);
  });
});

describe('Требование: геймификация детерминирована', () => {
  it('два прогона на одних данных дают одинаковый XP', () => {
    const manager = new AccountManager();
    const account = manager.create('Основной', Currency.RUB);
    manager.addTransaction(account.id, draft({ type: TransactionType.Income, amountMinor: 30_000 }));
    manager.addTransaction(account.id, draft({ amountMinor: 5_000 }));
    account.setLimit(Category.Food, 8_000);

    const first = gamification.evaluate(manager.getAll(), {});
    const second = gamification.evaluate(manager.getAll(), {});

    expect(first.xp).toBe(second.xp);
    expect(first.level).toBe(second.level);
  });

  it('пустое приложение даёт уровень 1 и ноль XP', () => {
    const progress = gamification.evaluate([], {});
    expect(progress.xp).toBe(0);
    expect(progress.level).toBe(1);
    expect(progress.unlockedCount).toBe(0);
  });

  it('за создание счёта открывается первое достижение', () => {
    const manager = new AccountManager();
    manager.create('Основной', Currency.RUB);

    const progress = gamification.evaluate(manager.getAll(), {});
    const first = progress.achievements.find((item) => item.code === 'first-account');

    expect(first?.unlocked).toBe(true);
  });

  it('XP не растёт от больших сумм — только от привычек', () => {
    const small = new AccountManager();
    const big = new AccountManager();

    const smallAccount = small.create('Малый', Currency.RUB);
    const bigAccount = big.create('Большой', Currency.RUB);

    small.addTransaction(smallAccount.id, draft({ type: TransactionType.Income, amountMinor: 100 }));
    big.addTransaction(bigAccount.id, draft({ type: TransactionType.Income, amountMinor: 100_000_000 }));

    expect(gamification.evaluate(big.getAll(), {}).xp).toBe(
      gamification.evaluate(small.getAll(), {}).xp,
    );
  });
});