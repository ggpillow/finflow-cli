import chalk from 'chalk';
import Table from 'cli-table3';
import { Currency, TransactionType } from '../types/enums.js';
import type { Account } from '../models/Account.js';
import type { AccountManager } from '../managers/AccountManager.js';
import type {
  IEnvelopeStatus,
  ISafeToSpend,
  ISession,
  ITransaction,
} from '../types/interfaces.js';
import type { IProgressSummary } from '../types/gamification.js';
import { CATEGORY_LABELS } from './labels.js';
import { formatMoney } from '../utils/money.js';
import {
  currentMonthKey,
  formatDateRu,
  formatDateShort,
  formatMonthRu,
  todayIso,
} from '../utils/date.js';

const WIDTH = 52;
const LABEL_COLUMN = 16;
const BAR_WIDTH = 12;
const LEVEL_BAR_WIDTH = 20;
const TABLE_ROWS_LIMIT = 15;
const SPARK_LEVELS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

export const theme = {
  title: chalk.bold.white,
  label: chalk.gray,
  accent: chalk.cyan,
  muted: chalk.gray,
  success: chalk.green,
  warning: chalk.yellow,
  danger: chalk.red,
  money: chalk.bold.white,
} as const;

export const clearScreen = (): void => {
  console.clear();
};

export const rule = (): void => {
  console.log(theme.muted('─'.repeat(WIDTH)));
};

export const renderHeader = (title: string, subtitle = ''): void => {
  const gap = Math.max(WIDTH - title.length - subtitle.length, 1);
  console.log(theme.title(title) + ' '.repeat(gap) + theme.muted(subtitle));
  rule();
};

export const renderRow = (label: string, value: string): void => {
  console.log(theme.label(label.padEnd(LABEL_COLUMN)) + value);
};

export const renderGap = (): void => {
  console.log('');
};

export const renderNotice = (message: string): void => {
  console.log(`\n${theme.warning('!  ' + message)}\n`);
};

export const renderSuccess = (message: string): void => {
  console.log(`\n${theme.success('ok  ' + message)}\n`);
};

export const renderError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`\n${theme.danger('!  ' + message)}\n`);
};

export const colorMoney = (amountMinor: number, currency: Currency = Currency.RUB): string => {
  const text = formatMoney(amountMinor, currency);

  if (amountMinor < 0) {
    return theme.danger(text);
  }
  if (amountMinor > 0) {
    return theme.success(text);
  }

  return theme.money(text);
};

export const progressBar = (ratio: number, width: number = BAR_WIDTH): string => {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const filled = Math.round(clamped * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
};

export const sparkline = (values: readonly number[]): string => {
  const max = Math.max(...values, 1);

  return values
    .map((value) => {
      if (value <= 0) {
        return '·';
      }
      const index = Math.min(
        Math.floor((value / max) * (SPARK_LEVELS.length - 1)),
        SPARK_LEVELS.length - 1,
      );
      return SPARK_LEVELS[index] ?? '·';
    })
    .join('');
};

export const renderMainScreen = (
  accounts: AccountManager,
  session: ISession,
  safeToSpend: ISafeToSpend | null,
  progress: IProgressSummary | null = null,
): void => {
  renderHeader('Мои финансы', formatDateRu(todayIso()));

  const active: Account | null =
    session.selectedAccountId === null
      ? null
      : (accounts.findById(session.selectedAccountId) ?? null);

  if (active === null) {
    console.log(theme.label('активный счёт   ') + theme.warning('не выбран'));
  } else {
    renderRow('активный счёт', theme.accent(active.name));
    renderRow('баланс', colorMoney(active.balanceMinor, active.currency));
  }

  if (safeToSpend !== null) {
    renderRow(
      'можно в день',
      `${theme.money(formatMoney(safeToSpend.perDayMinor))} ${theme.muted(`· ${safeToSpend.daysLeft} дн.`)}`,
    );
  }

  if (progress !== null) {
    renderRow(
      'уровень',
      `${theme.accent(String(progress.level))} ${theme.muted(`· ${progress.xp} XP · ${progress.unlockedCount}/${progress.totalCount}`)}`,
    );
  }

  renderGap();
  renderRow('всего по счетам', colorMoney(accounts.getTotalBalanceMinor()));
  renderGap();
};

export const renderAccountsScreen = (
  accounts: AccountManager,
  selectedId: string | null,
): void => {
  renderHeader('Счета', `всего ${accounts.getAll().length}`);

  const list = accounts.getAll();

  if (list.length === 0) {
    console.log(theme.muted('\nСчетов пока нет — создай первый.\n'));
    return;
  }

  const table = new Table({
    head: ['ID', 'Название', 'Операций', 'Баланс', ' '].map((head) => theme.label(head)),
    colWidths: [13, 20, 9, 15, 2],
    style: { head: [], border: ['gray'] },
  });

  for (const account of list) {
    const isActive = account.id === selectedId;
    table.push([
      theme.muted(account.id),
      isActive ? theme.accent(account.name) : account.name,
      String(account.transactions.length),
      colorMoney(account.balanceMinor, account.currency),
      isActive ? theme.success('*') : '',
    ]);
  }

  console.log(`\n${table.toString()}\n`);
};

export const renderDashboard = (
  account: Account,
  safeToSpend: ISafeToSpend,
  envelopes: readonly IEnvelopeStatus[],
  expensesSpark: readonly number[],
): void => {
  const month = currentMonthKey();
  const stats = account.statsForMonth(month);

  renderHeader(account.name, formatMonthRu(month));

  renderRow('баланс', colorMoney(account.balanceMinor, account.currency));
  renderRow('доходы', theme.success(formatMoney(stats.incomeMinor, account.currency)));
  renderRow('расходы', theme.danger(formatMoney(stats.expenseMinor, account.currency)));
  renderRow('итог месяца', colorMoney(stats.netMinor, account.currency));
  renderRow(
    'можно в день',
    `${theme.money(formatMoney(safeToSpend.perDayMinor, account.currency))} ${theme.muted(`· ${safeToSpend.daysLeft} дн. до конца месяца`)}`,
  );

  renderGap();
  console.log(theme.label('расходы за 14 дней'));
  console.log(theme.accent(sparkline(expensesSpark)));

  if (envelopes.length > 0) {
    renderGap();
    console.log(theme.label('конверты'));

    for (const envelope of envelopes) {
      const label = CATEGORY_LABELS[envelope.category].padEnd(14);
      const over = envelope.remainingMinor < 0;
      const bar = progressBar(envelope.usedRatio);
      const tail = over
        ? theme.danger(`${formatMoney(Math.abs(envelope.remainingMinor), account.currency)} сверх`)
        : theme.muted(`${formatMoney(envelope.remainingMinor, account.currency)} осталось`);

      console.log(`${theme.label(label)}${over ? theme.danger(bar) : theme.success(bar)}  ${tail}`);
    }
  } else {
    renderGap();
    console.log(theme.muted('лимитов нет — установи их в разделе «лимиты»'));
  }

  renderGap();
};

export const renderLimitsScreen = (
  account: Account,
  envelopes: readonly IEnvelopeStatus[],
): void => {
  renderHeader('Лимиты', account.name);

  if (envelopes.length === 0) {
    console.log(
      theme.muted('\nЛимитов нет. Установи хотя бы на еду — это самый частый перерасход.\n'),
    );
    return;
  }

  const table = new Table({
    head: ['Категория', 'Лимит', 'Потрачено', 'Остаток'].map((head) => theme.label(head)),
    colWidths: [15, 12, 12, 12],
    style: { head: [], border: ['gray'] },
  });

  for (const envelope of envelopes) {
    const over = envelope.remainingMinor < 0;
    table.push([
      CATEGORY_LABELS[envelope.category],
      formatMoney(envelope.limitMinor, account.currency),
      formatMoney(envelope.spentMinor, account.currency),
      over
        ? theme.danger(`-${formatMoney(Math.abs(envelope.remainingMinor), account.currency)}`)
        : theme.success(formatMoney(envelope.remainingMinor, account.currency)),
    ]);
  }

  console.log(`\n${table.toString()}\n`);
};

export const renderTransactionsScreen = (account: Account): void => {
  renderHeader('Операции', `${account.name} · ${formatMonthRu(currentMonthKey())}`);

  const transactions = account.getTransactionsSorted();

  if (transactions.length === 0) {
    console.log(theme.muted('\nОпераций пока нет.\n'));
    return;
  }

  const table = new Table({
    head: ['Дата', 'Категория', 'Комментарий', 'Сумма'].map((head) => theme.label(head)),
    colWidths: [9, 15, 18, 14],
    style: { head: [], border: ['gray'] },
  });

  for (const tx of transactions.slice(0, TABLE_ROWS_LIMIT)) {
    table.push([
      theme.muted(formatDateShort(tx.date)),
      CATEGORY_LABELS[tx.category],
      tx.note.length > 0 ? tx.note : theme.muted('—'),
      tx.isIncome()
        ? theme.success(`+${formatMoney(tx.amountMinor, account.currency)}`)
        : theme.danger(`-${formatMoney(tx.amountMinor, account.currency)}`),
    ]);
  }

  console.log(`\n${table.toString()}`);

  if (transactions.length > TABLE_ROWS_LIMIT) {
    console.log(
      theme.muted(`… и ещё ${transactions.length - TABLE_ROWS_LIMIT}. Полный список — в CSV.\n`),
    );
  } else {
    console.log('');
  }

  renderRow('операций', String(transactions.length));
  renderRow('баланс', colorMoney(account.balanceMinor, account.currency));
  renderGap();
};

export const renderProfileScreen = (progress: IProgressSummary): void => {
  renderHeader('Профиль', `уровень ${progress.level}`);

  renderRow(
    'опыт',
    `${theme.money(`${progress.xp} XP`)} ${theme.muted(`· ${progress.unlockedCount}/${progress.totalCount} достижений`)}`,
  );

  const ratio =
    progress.xpForNextLevel === 0 ? 0 : progress.xpInLevel / progress.xpForNextLevel;

  renderRow(
    'до уровня',
    `${theme.accent(progressBar(ratio, LEVEL_BAR_WIDTH))}  ${theme.muted(`${progress.xpInLevel} / ${progress.xpForNextLevel} XP`)}`,
  );

  renderGap();
  console.log(theme.label('достижения'));

  for (const achievement of progress.achievements) {
    if (achievement.unlocked) {
      console.log(
        `${theme.success('+')} ${theme.title(achievement.title)} ${theme.muted(`· ${achievement.xp} XP`)}`,
      );
    } else {
      console.log(`${theme.muted('·')} ${theme.muted(achievement.title)}`);
      console.log(`  ${theme.muted(achievement.description)}`);
    }
  }

  renderGap();
};

export const describeTransaction = (transaction: ITransaction): string => {
  const sign = transaction.type === TransactionType.Income ? '+' : '-';
  const note = transaction.note.length > 0 ? ` · ${transaction.note}` : '';
  return `${formatDateShort(transaction.date)} · ${CATEGORY_LABELS[transaction.category]} · ${sign}${formatMoney(transaction.amountMinor)}${note}`;
};